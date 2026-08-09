import { dateOptions } from "../data/dateOptions";
import ScratchPanel from "../components/ScratchPanel";
import MascotSticker from "../components/MascotSticker";
import StampSeal from "../components/StampSeal";
import ArcText from "../components/ArcText";
import Ribbon from "../components/Ribbon";

interface HomeProps {
  /** ids already visited via /date/:id this session — shown pre-scratched. */
  revealedIds: Set<string>;
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
export default function Home({ revealedIds, onResetRevealed }: HomeProps) {
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
              ★ {dateOptions.length} chances to win ★
            </Ribbon>
          </div>
        </header>

        <div className="ticket__playarea">
          <div className="ticket__grid">
            {dateOptions.map((option, index) => (
              <ScratchPanel
                key={option.id}
                option={option}
                piece={index + 1}
                revealed={revealedIds.has(option.id)}
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
              Secret reset: tapping the serial number wipes revealedIds
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
            Odds of winning an awesome date: {dateOptions.length} in {dateOptions.length}.
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
    </main>
  );
}
