import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useCallback, useState } from "react";
import Home from "./pages/Home";
import DateReveal from "./pages/DateReveal";
import NotFound from "./pages/NotFound";
import type { DateOption } from "./data/dateOptions";
import { notifyScratched } from "./lib/notifyScratched";

function App() {
  // Which date ids have been visited via /date/:id this session, so the
  // ticket can show them as already scratched off when you navigate back
  // to it. Deliberately in-memory only, not persisted (localStorage etc)
  // — resets on a full page reload. That's an accepted tradeoff for now,
  // not an oversight; see docs/SPEC.md.
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const markRevealed = useCallback((option: DateOption) => {
    // The "is this actually new" check happens *inside* the setState
    // updater, not before calling it, so a normal render doesn't ever
    // double-fire the notification. Verified against the production
    // build (`vite build` + `vite preview`): exactly one POST per
    // reveal, zero for a "No Bueno."
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
      if (option.status === "ready") {
        notifyScratched(option);
      }
      return new Set(prev).add(option.id);
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home revealedIds={revealedIds} />} />
        <Route
          path="/date/:id"
          element={<DateReveal onReveal={markRevealed} />}
        />
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
