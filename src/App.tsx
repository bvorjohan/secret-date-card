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
 * deliberately new key with no migration — but that meant the very
 * first deploy of this change silently wiped whichever dates were
 * already scratched on the one real device that matters here, which
 * turned out to matter more in practice than "old array-shaped data
 * can't be misread as the new shape" mattered in theory. See
 * migrateLegacyRevealedIds below for the one-time fix.
 */
const REVEALED_DATES_STORAGE_KEY = "secret-date-card:revealedDates";

/** The pre-rename key (see above) — read-only from here on, only ever
 * consulted by migrateLegacyRevealedIds as a one-time fallback. Never
 * written to again. */
const REVEALED_IDS_STORAGE_KEY_LEGACY = "secret-date-card:revealedIds";

function loadRevealedDates(): RevealedDates {
  try {
    const raw = localStorage.getItem(REVEALED_DATES_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      const result: RevealedDates = {};
      for (const [id, value] of Object.entries(parsed)) {
        if (typeof value === "string") result[id] = value;
      }
      return result;
    }
  } catch {
    // Private browsing, storage disabled, corrupt JSON, whatever —
    // fall back to "nothing remembered" rather than crash the app
    // over a purely cosmetic feature. Deliberately *not* falling
    // through to the legacy migration below: the new key existing at
    // all (even corrupted) means this isn't a brand-new-key situation,
    // so guessing from old data here would be more likely to surprise
    // than help.
    return {};
  }

  // The new key has genuinely never been written on this device —
  // either it's brand new, or it's still running on the old
  // `revealedIds` key from before this rename. Only reachable here,
  // never when REVEALED_DATES_STORAGE_KEY is present-but-empty (e.g.
  // right after the secret reset persists an explicit "{}" — see
  // resetRevealed below), so this can't accidentally resurrect
  // cleared state.
  return migrateLegacyRevealedIds();
}

/**
 * One-time fallback for loadRevealedDates: if an older version of the
 * app left ids behind under the pre-rename `revealedIds` key (a plain
 * `string[]`, membership only — no timestamps existed yet), treat
 * each one as revealed *right now* rather than losing the fact that
 * they were scratched at all. "Now" isn't the *real* original reveal
 * time, so a waitDaysAfterPrevious gate downstream of a migrated entry
 * would measure from this moment, not whenever it actually happened —
 * an acceptable approximation for a one-time transition on a single
 * device, not something worth over-engineering further.
 */
function migrateLegacyRevealedIds(): RevealedDates {
  try {
    const legacyRaw = localStorage.getItem(REVEALED_IDS_STORAGE_KEY_LEGACY);
    if (!legacyRaw) return {};
    const legacyParsed: unknown = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyParsed)) return {};
    const revealedAt = new Date().toISOString();
    const migrated: RevealedDates = {};
    for (const id of legacyParsed) {
      if (typeof id === "string") migrated[id] = revealedAt;
    }
    return migrated;
  } catch {
    return {};
  }
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
