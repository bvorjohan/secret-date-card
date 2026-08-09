import "./ticketStudy.css";
import ArcText from "../components/ArcText";

/**
 * Fidelity study: a as-close-as-possible recreation of the "Ticket
 * Anatomy" example ticket ($10 MEGA MONEY) from
 * docs/reference/lotto-ticket-reference-board.jpg.
 *
 * This is NOT wired into the app's data model or navigation — it's a
 * standalone exercise at /ticket-study to calibrate how far off the
 * production ticket (Home.tsx) is from the reference, one specific
 * real example reproduced as literally as CSS reasonably allows.
 * Every string/number here is copied straight off the reference
 * image, not app content — don't hook dateOptions up to this.
 *
 * Scoped to its own stylesheet (ticketStudy.css) instead of
 * index.css on purpose, so this experiment can't drift the shared
 * design tokens the rest of the app relies on. The techniques worked
 * out here (ArcText, flat-fill-over-gradient-clip, the sunburst
 * background stack) were later ported into the real ticket/reveal
 * pages — see docs/SPEC.md "Lotto reference board" — this page is
 * kept around as the fidelity reference for that port, not superseded
 * by it.
 */
export default function TicketStudy() {
  return (
    <div className="tstudy-page">
      <div className="tstudy-ticket">
        <span className="tstudy-price" aria-hidden="true">
          $10
        </span>
        <span className="tstudy-seal" aria-hidden="true">
          <span className="tstudy-seal__text">
            OVER
            <br />
            $45 MILLION
            <br />
            IN PRIZES!
          </span>
        </span>

        <span className="tstudy-star tstudy-star--1" aria-hidden="true" />
        <span className="tstudy-star tstudy-star--2" aria-hidden="true" />
        <span className="tstudy-star tstudy-star--3" aria-hidden="true" />
        <span className="tstudy-star tstudy-star--4" aria-hidden="true" />
        <span className="tstudy-star tstudy-star--5" aria-hidden="true" />
        <span className="tstudy-spark tstudy-spark--1" aria-hidden="true" />
        <span className="tstudy-spark tstudy-spark--2" aria-hidden="true" />

        <div className="tstudy-headline">
          <h1 className="tstudy-mega">
            <ArcText text="MEGA" maxDeg={20} radius={26} />
          </h1>
          <h1 className="tstudy-money">
            <ArcText text="MONEY" maxDeg={20} radius={26} />
          </h1>
          <p className="tstudy-winupto">WIN UP TO</p>
          <p className="tstudy-jackpot">
            <ArcText text="$1,000,000!" maxDeg={12} radius={40} />
          </p>
        </div>

        <div className="tstudy-playarea">
          <p className="tstudy-playarea__label">WINNING NUMBERS</p>
          <div className="tstudy-row">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="tstudy-icon-star" aria-hidden="true" />
            ))}
          </div>
          <p className="tstudy-playarea__label">YOUR NUMBERS</p>
          <div className="tstudy-row tstudy-row--your">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="tstudy-coin" aria-hidden="true">
                $
              </span>
            ))}
          </div>
          <div className="tstudy-row tstudy-row--your">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="tstudy-coin" aria-hidden="true">
                $
              </span>
            ))}
          </div>
        </div>

        <p className="tstudy-winup20">WIN UP TO 20 TIMES!</p>

        <div className="tstudy-footer">
          <p className="tstudy-fineprint">
            Match any of YOUR NUMBERS to any WINNING NUMBER, win PRIZE shown
            for that number. Reveal a &ldquo;⊕&rdquo; symbol, win that PRIZE
            automatically. Reveal a &ldquo;10X&rdquo; symbol, win 10 TIMES
            that PRIZE automatically.
          </p>
          <span className="tstudy-serial">001</span>
        </div>
      </div>
    </div>
  );
}
