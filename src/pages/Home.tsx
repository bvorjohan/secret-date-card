import { useEffect, useState } from "react";
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
      if (event.key === "Escape") setShowLoyaltyCard(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showLoyaltyCard]);

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
              with it. A real <button>, not aria-hidden, since it now
              does something — but no visual change and a deliberately
              boring aria-label, so it doesn't announce itself as
              interactive to anyone not already in on it.
            */}
            <button
              type="button"
              className="ticket__serial"
              aria-label="Ticket serial number"
              onClick={onResetRevealed}
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

      <button
        type="button"
        className="loyalty-toggle"
        onClick={() => setShowLoyaltyCard(true)}
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
            onClick={() => setShowLoyaltyCard(false)}
          >
            {/* stopPropagation so tapping the card itself doesn't close
                the modal — only the dimmed backdrop or the X should. */}
            <div className="loyalty-modal" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="loyalty-modal-close"
                aria-label="Close punch card"
                onClick={() => setShowLoyaltyCard(false)}
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
