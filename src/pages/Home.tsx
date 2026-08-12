import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { scratchDates } from "../data/scratchDates";
import type { RevealedDates } from "../data/scratchDates";
import { REVEALED_DATES_STORAGE_KEY, REVEALED_IDS_STORAGE_KEY_LEGACY } from "../App";
import ScratchPanel from "../components/ScratchPanel";
import MascotSticker from "../components/MascotSticker";
import StampSeal from "../components/StampSeal";
import ArcText from "../components/ArcText";
import Ribbon from "../components/Ribbon";
import StampCard from "../components/StampCard";

interface HomeProps {
  /** id -> when it was first revealed via /date/:id — shown pre-scratched. */
  revealedDates: RevealedDates;
  /** Secret reset — see the serial-number button further down. */
  onResetRevealed: () => void;
}

/** First-visit-only nudge: auto-opens the loyalty card once, with a
 * little "you've earned a reward!" banner, so a brand-new visitor
 * discovers the card exists rather than needing to find the "Check
 * your loyalty card" button on their own. A normal close/reopen never
 * clears this — once seen, it stays seen — but the secret reset
 * button (see handleResetRevealed below) deliberately *does* clear it,
 * since that button's whole purpose is putting the ticket back into a
 * brand-new-visitor state, and the loyalty intro is part of that
 * state. */
const LOYALTY_INTRO_SEEN_KEY = "secret-date-card:hasSeenLoyaltyIntro";

/** How long after mount the first-visit auto-open fires — long enough
 * that the ticket itself is what you see land first, short enough
 * that the loyalty card still reads as part of the same "welcome"
 * moment rather than a random later interruption. */
const LOYALTY_INTRO_DELAY_MS = 800;

/**
 * The main sheet: a vertical stack of horizontal "chance" rows, one
 * per date option.
 *
 * Structure/copy is a direct build-out of a design pass another agent
 * mocked up (ribbon banners, a jagged "BIG DATES! BIG MEMORIES!"
 * banner, colored numbered chance rows, a barcode, odds fine print) —
 * see docs/SPEC.md "Lotto reference board" for how it maps onto the
 * app's existing content model. Notably: the mockup's "revealed" state
 * showed each row's full title/description/WIN badge inline, but that
 * would spoil the /date/:id reveal page and the "must scratch in
 * order" No Bueno surprise (both established features) — so rows
 * here still only ever show the vague teaser + icon, never the title/
 * description. Scratching still navigates to /date/:id for the real
 * reveal, unchanged from before this pass.
 */
export default function Home({ revealedDates, onResetRevealed }: HomeProps) {
  // Loyalty punch card modal — see the "Check your loyalty card" button
  // below the ticket — see src/components/StampCard.tsx and
  // src/data/stampDates.ts, which own the card's own content/state.
  const [showLoyaltyCard, setShowLoyaltyCard] = useState(false);

  // True only for the auto-opened first-visit instance of the modal —
  // drives the "you've earned a reward!" banner (see the JSX below).
  // Cleared on close (closeLoyaltyCard) so a *manual* re-open later,
  // even within the same session, never shows it again.
  const [showIntroBanner, setShowIntroBanner] = useState(false);

  // The little bouncing arrow over the "Check your loyalty card"
  // button — set true the moment the auto-opened intro instance gets
  // closed (see closeLoyaltyCard below), so a first-time visitor who
  // just saw the card get yanked away from them knows exactly where
  // to find it again. Cleared the moment they actually use the button,
  // reset via handleResetRevealed, or — see the IntersectionObserver
  // effect below — the real button scrolls into view on its own,
  // whichever happens first. It's a one-shot nudge toward a button
  // that isn't visible yet, not a permanent fixture that should keep
  // floating on top of the real thing once it doesn't need to point
  // at anything anymore.
  const [showLoyaltyHint, setShowLoyaltyHint] = useState(false);

  // Referenced by the IntersectionObserver effect below, to know when
  // the real button has actually scrolled into view.
  const loyaltyToggleRef = useRef<HTMLButtonElement>(null);

  // Bumped by handleResetRevealed to re-arm the auto-open effect below
  // on demand — see its own comment for why the secret reset needs to
  // do this rather than just clearing the localStorage flag alone.
  const [introArmedCount, setIntroArmedCount] = useState(0);

  const closeLoyaltyCard = useCallback(() => {
    setShowLoyaltyCard(false);
    // Only the auto-opened intro instance hands off to the hint arrow
    // — closing a card you opened yourself (you clearly already know
    // where the button is) shouldn't trigger it.
    if (showIntroBanner) setShowLoyaltyHint(true);
    setShowIntroBanner(false);
  }, [showIntroBanner]);

  useEffect(() => {
    let alreadySeen = true;
    try {
      alreadySeen = localStorage.getItem(LOYALTY_INTRO_SEEN_KEY) === "true";
    } catch {
      // Storage unreadable — treat as "already seen" so a broken
      // localStorage doesn't force-open the card on every single load.
      alreadySeen = true;
    }
    if (alreadySeen) return;

    const timer = window.setTimeout(() => {
      setShowLoyaltyCard(true);
      setShowIntroBanner(true);
      try {
        localStorage.setItem(LOYALTY_INTRO_SEEN_KEY, "true");
      } catch {
        // Best effort — if this can't persist, the intro may repeat on
        // a later load, which is harmless (same as any other
        // localStorage-disabled degradation in this app).
      }
    }, LOYALTY_INTRO_DELAY_MS);

    return () => window.clearTimeout(timer);
    // Deliberately keyed on introArmedCount, not []: a plain "once on
    // mount" effect can't be made to run again later without either
    // unmounting Home or changing one of its own dependencies — this
    // is that dependency. Under normal use it only ever fires once
    // (mount, count stays 0); the secret reset below is the one thing
    // that bumps it, to replay the intro on demand.
  }, [introArmedCount]);

  // Auto-dismisses the hint the moment the real button it's pointing
  // at actually scrolls into view — at that point it's pointing at
  // something already on screen, so it'd just be floating redundantly
  // on top of the very button it was announcing. Only attached while
  // the hint is actually showing (no point watching otherwise), and
  // torn down the instant it fires or the hint's dismissed some other
  // way (button tap, secret reset) — see showLoyaltyHint's own comment
  // above for the other paths that also clear it.
  useEffect(() => {
    if (!showLoyaltyHint) return;
    const button = loyaltyToggleRef.current;
    if (!button) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShowLoyaltyHint(false);
      },
      // 0.6: wait until the button's *mostly* on screen, not just a
      // sliver peeking in at the very edge — a hint disappearing the
      // instant one pixel of the button appears would read as
      // flickering away too early, before it's actually usable yet.
      { threshold: 0.6 },
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, [showLoyaltyHint]);

  // Temporary debug footer — see the .debug-storage block near the end
  // of this component. Legacy key is read once here (it's never
  // written to again after migration, so it can't change under us);
  // the current key's value is just revealedDates itself, already a
  // prop, no separate read needed.
  const [legacyStorageRaw] = useState(() => {
    try {
      return localStorage.getItem(REVEALED_IDS_STORAGE_KEY_LEGACY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!showLoyaltyCard) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLoyaltyCard();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showLoyaltyCard, closeLoyaltyCard]);

  useEffect(() => {
    if (!showLoyaltyCard) return;

    // Lock background scroll while the modal's open — .loyalty-modal-
    // backdrop being position: fixed stops it from scrolling *itself*,
    // but doesn't stop a touch drag from scrolling the ticket page
    // underneath it.
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [showLoyaltyCard]);

  // Wraps the plain revealedDates reset (owned by App.tsx) so the
  // secret serial-number button below also puts the loyalty card back
  // into its brand-new-visitor state — closing it if it's currently
  // open, clearing LOYALTY_INTRO_SEEN_KEY, and bumping introArmedCount
  // to replay the same delayed auto-open + banner a real first visit
  // gets. Unlike a normal close/reopen (which never brings the intro
  // back — see LOYALTY_INTRO_SEEN_KEY's own comment), this is the one
  // place that's the whole point: the reset button exists to put the
  // ticket back into "never been touched" state for testing/demoing,
  // and the loyalty card is as much a part of that first-visit
  // experience as the scratch rows are.
  const handleResetRevealed = useCallback(() => {
    onResetRevealed();
    closeLoyaltyCard();
    // closeLoyaltyCard may itself have just turned this back on (if
    // the intro modal happened to be open when reset was tapped) —
    // explicitly overriding it back off here, since the replayed
    // intro (once introArmedCount below re-triggers it) starts that
    // whole sequence fresh, hint included.
    setShowLoyaltyHint(false);
    try {
      localStorage.removeItem(LOYALTY_INTRO_SEEN_KEY);
    } catch {
      // Not writable — the intro just won't replay this time, same
      // degrade-quietly rationale as everywhere else this app touches
      // localStorage.
    }
    setIntroArmedCount((n) => n + 1);
  }, [onResetRevealed, closeLoyaltyCard]);

  return (
    <main className="ticket-page">
      <div className="ticket">
        <StampSeal text="$0.69" tone="accent" className="ticket__free-badge" />
        <MascotSticker
          size="sm"
          caption="Personally guaranteed"
          className="ticket__mascot"
        />

        <header className="ticket__header">
          <div className="ticket__headline-top">
            <span className="ticket__star ticket__header-star ticket__header-star--1" aria-hidden="true" />
            <Ribbon className="ticket__ribbon--sm ticket__ribbon--tilt-left">Secret</Ribbon>
          </div>
          <div className="ticket__headline">
            <h1 className="ticket__title ticket__title--cream">
              <ArcText text="DATE" maxDeg={10} radius={14} />
            </h1>
            <h1 className="ticket__title">
              <ArcText text="BLOWOUT!" maxDeg={14} radius={18} />
            </h1>
          </div>
          <div className="ticket__subhead">
            <p className="ticket__kicker">
              <span className="ticket__star ticket__kicker-star" aria-hidden="true" />
              Scratch one off to
            </p>
            <Ribbon className="ticket__ribbon--lg ticket__ribbon--tilt-left">Win a date!</Ribbon>
            <Ribbon className="ticket__ribbon--sm ticket__ribbon--gold ticket__ribbon--tilt-right ticket__ribbon--chances">
              ★ {scratchDates.length} chances to win ★
            </Ribbon>
          </div>
        </header>

        <div className="ticket__playarea">
          <div className="ticket__grid">
            {scratchDates.map((option, index) => (
              <ScratchPanel
                key={option.id}
                option={option}
                piece={index + 1}
                revealed={option.id in revealedDates}
              />
            ))}
          </div>
        </div>

        <div className="ticket__stars-row" aria-hidden="true">
          <span className="ticket__star" />
          <span className="ticket__star ticket__star--big" />
          <span className="ticket__star" />
        </div>

        <p className="ticket__jagged-banner">
          Big dates! Big memories!
          <br />
          Maybe even <em>big love!?</em>
        </p>

        <div className="ticket__prize-row">
          <div className="ticket__prize-box">
            <span className="ticket__prize-label">
              Win
              <br />
              up to
            </span>
            <strong className="ticket__prize-figure">100%</strong>
            <span className="ticket__prize-label">
              Of an
              <br />
              awesome
              <br />
              date
            </span>
          </div>
          <p className="ticket__no-purchase" aria-hidden="true">
            No purchase necessary, just good luck!
          </p>
        </div>

        <footer className="ticket__info-panel">
          <div className="ticket__barcode" aria-hidden="true" />
          <div className="ticket__footer-row">
            <p className="ticket__footer-tag">★ Good luck, love! ★</p>
            {/*
              Secret reset: tapping the serial number wipes revealedDates
              (App.tsx's resetRevealed) so every row goes back to
              unscratched, and clears the persisted localStorage copy
              with it — and, via handleResetRevealed, also replays the
              loyalty card's first-visit intro (see its own comment
              above). A real <button>, not aria-hidden, since it now
              does something — but no visual change and a deliberately
              boring aria-label, so it doesn't announce itself as
              interactive to anyone not already in on it.
            */}
            <button
              type="button"
              className="ticket__serial"
              aria-label="Ticket serial number"
              onClick={handleResetRevealed}
            >
              TKT 000928
            </button>
          </div>
          <p className="ticket__legal-line">
            Not a real lottery ticket &bull; For entertainment only
          </p>
          <p className="ticket__fine-print">
            Odds of winning an awesome date: {scratchDates.length} in {scratchDates.length}.
            Redeemable at Central Cinema, San Fermo, Escape Rooms, Atoma,
            Golden Gardens, Portland, and other participating locations.
          </p>
          <span
            className="ticket__star ticket__corner-star ticket__corner-star--left"
            aria-hidden="true"
          />
          <span
            className="ticket__star ticket__corner-star ticket__corner-star--right"
            aria-hidden="true"
          />
        </footer>
      </div>

      {showLoyaltyHint && (
        // One-shot nudge toward the loyalty-card button — see
        // showLoyaltyHint's own comment above for when this appears/
        // clears. position: fixed (see .loyalty-hint in index.css),
        // not a plain in-flow element sitting above .loyalty-toggle:
        // a first-time visitor who just had the card closed on them
        // is very likely still scrolled up near the top of the ticket,
        // nowhere near the button — an in-flow hint would be sitting
        // off-screen below them, invisible until they happened to
        // scroll all the way down on their own (which defeats the
        // point of a nudge). Fixed to the viewport instead, so it's
        // visible from wherever they are — but only *until* the real
        // button scrolls into view, at which point the
        // IntersectionObserver effect above dismisses it, so it never
        // ends up floating redundantly on top of the thing it was
        // pointing at.
        // aria-hidden: this is a purely visual/spatial nudge ("look
        // down there") — the button it's pointing at already has its
        // own real label reachable in normal tab/reading order, and
        // "at the bottom" only means anything to a sighted, scrolled
        // layout in the first place.
        <div className="loyalty-hint" aria-hidden="true">
          <span className="loyalty-hint__text">Check your rewards at the bottom</span>
          <span className="loyalty-hint__arrow">↓</span>
        </div>
      )}

      <button
        type="button"
        ref={loyaltyToggleRef}
        className="loyalty-toggle"
        onClick={() => {
          setShowLoyaltyCard(true);
          setShowLoyaltyHint(false);
        }}
      >
        ★ Check your loyalty card ★
      </button>

      {showLoyaltyCard &&
        createPortal(
          // Portaled straight into <body> — a sibling of #root, not a
          // descendant — deliberately. The ticket's own "always
          // portrait" lock (see index.css's "Forced orientation lock")
          // works by giving #root a CSS transform when the real
          // device is landscape; this modal has its own, completely
          // independent "always landscape" lock (below), and the two
          // are meant to never interact. Nesting the modal inside
          // #root instead used to mean this modal's position: fixed
          // depended on being "contained" by #root's transform to
          // rotate along with it — a real CSS Transforms spec rule
          // that Chromium honors but that WebKit/Safari is known not
          // to reliably honor, which is exactly the bug this portal
          // sidesteps rather than works around: living outside #root
          // entirely, this modal is structurally unaffected by
          // whatever #root's lock is doing, on any engine.
          <div
            className="loyalty-modal-backdrop"
            onClick={closeLoyaltyCard}
          >
            {/* stopPropagation so tapping the card itself doesn't close
                the modal — only the dimmed backdrop or the X should. */}
            <div className="loyalty-modal" onClick={(event) => event.stopPropagation()}>
              {showIntroBanner && (
                // First-visit-only nudge — see LOYALTY_INTRO_SEEN_KEY's
                // own comment above for the full story. role="status"
                // (not aria-hidden, unlike StampSeal's purely decorative
                // badges elsewhere) since this banner is the *only*
                // place this message appears — there's no equivalent
                // text anywhere else on the page for it to be
                // redundant with.
                <p className="loyalty-modal-intro" role="status">
                  ★ You've Earned a Reward! ★
                </p>
              )}
              <button
                type="button"
                className="loyalty-modal-close"
                aria-label="Close punch card"
                onClick={closeLoyaltyCard}
              >
                ✕
              </button>
              <StampCard />
            </div>
          </div>,
          document.body,
        )}

      {/* Temporary debug footer — raw dump of both the current and
          pre-rename localStorage keys, added to directly verify the
          "lost scratched state after deploy" fix (see App.tsx's
          migrateLegacyRevealedIds). Plainly visible, not gated behind
          the secret reset gesture like the serial-number button above
          — remove once it's no longer needed for checking real device
          state. */}
      <pre className="debug-storage">
        {`${REVEALED_DATES_STORAGE_KEY} (current):
${JSON.stringify(revealedDates, null, 2)}

${REVEALED_IDS_STORAGE_KEY_LEGACY} (legacy):
${legacyStorageRaw ?? "(not set)"}`}
      </pre>
    </main>
  );
}
