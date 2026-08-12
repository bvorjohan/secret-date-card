import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Home from "./pages/Home";
import DateReveal from "./pages/DateReveal";
import NotFound from "./pages/NotFound";
import TicketStudy from "./pages/TicketStudy";
import StampCardStudy from "./pages/StampCardStudy";
import type { RevealedDates, ScratchDate } from "./data/scratchDates";
import { notifyScratched } from "./lib/notifyScratched";

/**
 * When each date was first revealed, persisted across page reloads —
 * see docs/SPEC.md "Session state" for the history here. localStorage
 * over a cookie: nothing server-side ever needs to read this, so
 * there's no reason to pay a cookie's per-request overhead or juggle
 * expiry — it's purely a client-side "have I seen this, and when" flag,
 * one `getItem`/`setItem` away.
 *
 * Storage key changed from `...revealedIds` (a Set-shaped key from
 * before this file was ScratchDate-based) to `...revealedDates` when
 * this went from a `Set<string>` (just membership) to a
 * `Record<id, isoTimestamp>` (membership *and* when) to support
 * ScratchDate's waitDaysAfterPrevious gate. Originally shipped as a
 * deliberately new key with no migration, which silently wiped
 * already-scratched state on the one real device that matters here.
 *
 * The first fix for that only merged from the old key when the new
 * one had *never* been written — but the buggy no-migration version
 * had already deployed and been visited once before the fix landed,
 * which persists an explicit "{}" under the new key via the effect
 * below (same as a real reset does). That made the two cases
 * indistinguishable and skipped the merge entirely — confirmed live
 * against the deployed app: revealedDates read back as "{}" while
 * revealedIds still had the real data sitting right there unread.
 *
 * Fixed properly now: loadRevealedDates always merges in any ids
 * still sitting under the legacy key (filling in gaps, never
 * overwriting anything already in the new key), and App() cleans the
 * legacy key up in an effect on mount once that merge has happened.
 * Deleting it (rather than leaving it inert) is what makes "always
 * merge" safe to keep doing forever instead of just once: without
 * that cleanup, a *real* future reset (which only clears the new key)
 * would get silently undone the next time this ran, since the same
 * legacy ids would still be sitting there to merge back in.
 */
const REVEALED_DATES_STORAGE_KEY = "secret-date-card:revealedDates";

/** The pre-rename key (see above). Only ever read by loadRevealedDates
 * (to merge) and removed by App()'s cleanup effect — nothing writes
 * to it anymore. */
const REVEALED_IDS_STORAGE_KEY_LEGACY = "secret-date-card:revealedIds";

function loadRevealedDates(): RevealedDates {
  const current: RevealedDates = {};
  try {
    const raw = localStorage.getItem(REVEALED_DATES_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        for (const [id, value] of Object.entries(parsed)) {
          if (typeof value === "string") current[id] = value;
        }
      }
    }
  } catch {
    // Private browsing, storage disabled, corrupt JSON, whatever —
    // fall back to "nothing remembered under the new key" rather than
    // crash; the legacy merge below still runs on top of this either
    // way, so a corrupt new-key value doesn't lose legacy data too.
  }

  try {
    const legacyRaw = localStorage.getItem(REVEALED_IDS_STORAGE_KEY_LEGACY);
    if (legacyRaw) {
      const legacyParsed: unknown = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed)) {
        // "Now" isn't the *real* original reveal time (the old format
        // never recorded one) — an acceptable approximation for a
        // one-time transition on a single device, not something worth
        // over-engineering further. Only fills in ids missing from
        // `current`, so this never clobbers real data already
        // recorded under the new key.
        const revealedAt = new Date().toISOString();
        for (const id of legacyParsed) {
          if (typeof id === "string" && !(id in current)) {
            current[id] = revealedAt;
          }
        }
      }
    }
  } catch {
    // Corrupt legacy value — just means nothing merges from it.
  }

  return current;
}

function App() {
  // When each date was first visited via /date/:id *and actually
  // available at the time* (see isScratchDateAvailable in
  // scratchDates.ts) — so the ticket can show it as already scratched
  // off, and so later entries can measure their own
  // waitDaysAfterPrevious gate from this timestamp. Persisted to
  // localStorage (see loadRevealedDates/the effect below), so it
  // survives a hard page reload, not just client-side navigation
  // within the SPA.
  const [revealedDates, setRevealedDates] = useState<RevealedDates>(loadRevealedDates);

  useEffect(() => {
    try {
      localStorage.setItem(REVEALED_DATES_STORAGE_KEY, JSON.stringify(revealedDates));
    } catch {
      // Same rationale as loadRevealedDates's catch — if storage isn't
      // writable, this just silently behaves like an in-memory-only
      // version instead of throwing.
    }
  }, [revealedDates]);

  // One-time legacy cleanup — see REVEALED_DATES_STORAGE_KEY's own
  // comment above for why this has to happen (removing the legacy key
  // is what makes loadRevealedDates's unconditional merge safe to run
  // on every load rather than just once). Runs after the effect above
  // has already persisted this mount's merged revealedDates under the
  // new key, so by the time this fires the legacy data's job is done.
  useEffect(() => {
    try {
      localStorage.removeItem(REVEALED_IDS_STORAGE_KEY_LEGACY);
    } catch {
      // Not writable — leaves the stale key in place. Harmless: worst
      // case, loadRevealedDates's merge (a no-op once the ids are
      // already in the new key) just keeps re-checking it every load
      // instead of only once.
    }
  }, []);

  const markRevealed = useCallback((option: ScratchDate) => {
    // Unlike the old Set<string> version, there's no status check
    // here — DateReveal is now the one deciding whether a date is
    // actually available (via isScratchDateAvailable, which already
    // covers status, sequencing, and both time gates) and only calls
    // onReveal when it is. This just needs to record *when*.
    //
    // The "is this actually new" check happens *inside* the setState
    // updater, not before calling it, so a normal render doesn't ever
    // double-fire the notification. Verified against the production
    // build (`vite build` + `vite preview`): exactly one POST per
    // reveal.
    //
    // `npm run dev` can still fire this twice — React StrictMode
    // intentionally double-invokes effects there to catch bugs, and
    // that reaches this callback before the updater from the first
    // call has committed. This is harmless in practice: dev/preview
    // never talk to Netlify's real form-processing backend (that only
    // exists once actually deployed), so a duplicate fetch() here
    // sends no real email either way. Don't "fix" this with extra
    // guards against StrictMode; it's not a production bug.
    setRevealedDates((prev) => {
      if (option.id in prev) return prev;
      notifyScratched(option);
      return { ...prev, [option.id]: new Date().toISOString() };
    });
  }, []);

  // Secret reset — see Home.tsx's serial-number button. Clearing back
  // to {} both flips every row back to unscratched (Home re-renders
  // with revealed=false for all of them) and, via the effect above,
  // overwrites the persisted localStorage copy too.
  const resetRevealed = useCallback(() => {
    setRevealedDates({});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home revealedDates={revealedDates} onResetRevealed={resetRevealed} />}
        />
        <Route
          path="/date/:id"
          element={<DateReveal revealedDates={revealedDates} onReveal={markRevealed} />}
        />
        <Route path="/ticket-study" element={<TicketStudy />} />
        <Route path="/stamp-card-study" element={<StampCardStudy />} />
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
