import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Home from "./pages/Home";
import DateReveal from "./pages/DateReveal";
import NotFound from "./pages/NotFound";
import TicketStudy from "./pages/TicketStudy";
import type { DateOption } from "./data/dateOptions";
import { notifyScratched } from "./lib/notifyScratched";

/**
 * Which date ids have already been revealed, persisted across page
 * reloads — see docs/SPEC.md "Session state" for why this used to be
 * in-memory only and what changed. localStorage over a cookie: nothing
 * server-side ever needs to read this, so there's no reason to pay a
 * cookie's per-request overhead or juggle expiry — it's purely a
 * client-side "have I seen this" flag, one `getItem`/`setItem` away.
 */
const REVEALED_IDS_STORAGE_KEY = "secret-date-card:revealedIds";

function loadRevealedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(REVEALED_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    // Private browsing, storage disabled, corrupt JSON, whatever —
    // fall back to "nothing remembered" rather than crash the app
    // over a purely cosmetic feature.
    return new Set();
  }
}

function App() {
  // Which date ids have been visited via /date/:id, so the ticket can
  // show them as already scratched off when you navigate back to it —
  // now persisted to localStorage (see loadRevealedIds/the effect
  // below), so it survives a hard page reload too, not just
  // client-side navigation within the SPA.
  const [revealedIds, setRevealedIds] = useState<Set<string>>(loadRevealedIds);

  useEffect(() => {
    try {
      localStorage.setItem(REVEALED_IDS_STORAGE_KEY, JSON.stringify([...revealedIds]));
    } catch {
      // Same rationale as loadRevealedIds's catch — if storage isn't
      // writable, this just silently behaves like the old
      // in-memory-only version instead of throwing.
    }
  }, [revealedIds]);

  const markRevealed = useCallback((option: DateOption) => {
    // Pending dates don't get remembered — there's nothing actually
    // decided under them yet ("No Bueno" every time), so marking one
    // permanently "scratched" on the home ticket would just make that
    // slot look used up for no reason. Only a "ready" reveal sticks.
    if (option.status !== "ready") return;

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
    setRevealedIds((prev) => {
      if (prev.has(option.id)) return prev;
      notifyScratched(option);
      return new Set(prev).add(option.id);
    });
  }, []);

  // Secret reset — see Home.tsx's serial-number button. Clearing back
  // to an empty Set both flips every row back to unscratched (Home
  // re-renders with revealed=false for all of them) and, via the
  // effect above, overwrites the persisted localStorage copy too.
  const resetRevealed = useCallback(() => {
    setRevealedIds(new Set());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home revealedIds={revealedIds} onResetRevealed={resetRevealed} />}
        />
        <Route
          path="/date/:id"
          element={<DateReveal onReveal={markRevealed} />}
        />
        <Route path="/ticket-study" element={<TicketStudy />} />
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
