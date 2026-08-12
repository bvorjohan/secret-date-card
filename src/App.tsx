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
 * ScratchDate's waitDaysAfterPrevious gate — a deliberately new key,
 * not a migration, so old array-shaped data left over from before this
 * change can't be misread as the new shape; loadRevealedDates's
 * Array.isArray guard below would reject it anyway, but a fresh key
 * makes that not even come up. Per CLAUDE.md "Built for one person":
 * losing previously-revealed state on this one upgrade is a
 * non-issue, not something worth writing a migration for.
 */
const REVEALED_DATES_STORAGE_KEY = "secret-date-card:revealedDates";

function loadRevealedDates(): RevealedDates {
  try {
    const raw = localStorage.getItem(REVEALED_DATES_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const result: RevealedDates = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "string") result[id] = value;
    }
    return result;
  } catch {
    // Private browsing, storage disabled, corrupt JSON, whatever —
    // fall back to "nothing remembered" rather than crash the app
    // over a purely cosmetic feature.
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
