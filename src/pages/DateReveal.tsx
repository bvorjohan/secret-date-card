import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { getDateOption, getSerialNumber } from "../data/dateOptions";
import type { DateOption } from "../data/dateOptions";
import MascotSticker from "../components/MascotSticker";
import StampSeal from "../components/StampSeal";
import noBueno from "../assets/no-bueno.png";

interface DateRevealProps {
  /**
   * For a "ready" date: marks it scratched (so the ticket shows it
   * revealed if you navigate back) and, the first time it's revealed
   * this session, triggers the scratch-notification email (see
   * src/lib/notifyScratched.ts). Pending dates are reported here too
   * but deliberately don't stick — see App.tsx's markRevealed. Takes
   * the full option (not just the id) because both of those decisions
   * need `status`.
   */
  onReveal: (option: DateOption) => void;
}

/**
 * The reveal route: /date/:id
 *
 * Three possible outcomes, based on the looked-up DateOption:
 *  - no match for :id            -> redirect to the 404 page
 *  - match with status "pending" -> "No Bueno" fallback (see below):
 *    dates are meant to be scratched off in order, so a not-yet-written
 *    slot always reads as "too early," not "broken" or "coming soon."
 *  - match with status "ready"   -> full title/description reveal
 */
export default function DateReveal({ onReveal }: DateRevealProps) {
  const { id } = useParams<{ id: string }>();
  const option = id ? getDateOption(id) : undefined;

  useEffect(() => {
    if (option) {
      onReveal(option);
    }
    // Still called for pending ids — onReveal (App.tsx) is what
    // decides pending doesn't stick on the home ticket; this route
    // doesn't need to know that, it just reports what was visited.
  }, [option, onReveal]);

  if (!option) {
    return <Navigate to="/not-found" replace />;
  }

  const isReady = option.status === "ready";

  return (
    <main className="reveal-page">
      <div className="reveal-card">
        <StampSeal
          text={
            isReady ? (
              <>
                WINNER
                <br />✓
              </>
            ) : (
              <>
                DENIED
                <br />✗
              </>
            )
          }
          tone={isReady ? "accent" : "muted"}
          className="reveal-card__stamp"
        />

        {isReady ? (
          <>
            <MascotSticker
              size="lg"
              className="reveal-card__mascot"
              src={option.sticker}
            />
            <p className="reveal-card__eyebrow">You scratched off</p>
            {/*
              Plain text, not ArcText: unlike the ticket's hand-authored
              headline, option.title is arbitrary content-file data (see
              src/data/dateOptions.ts) with no length limit. ArcText
              runs are forced nowrap (see .arc-text in index.css) so a
              long title would just overflow the card instead of
              wrapping — fine for a fixed short string, not for this.
            */}
            <h1 className="reveal-card__title">{option.title}</h1>
            <p className="reveal-card__description">{option.description}</p>
          </>
        ) : (
          <>
            <img src={noBueno} alt="No bueno" className="reveal-card__no-bueno" />
            <p className="reveal-card__eyebrow">You scratched off</p>
            <h1 className="reveal-card__title">No Bueno</h1>
            <p className="reveal-card__description">
              These come off in order — this one's not up yet. Go back
              and try an earlier scratch first.
            </p>
          </>
        )}

        <p className="reveal-card__serial" aria-hidden="true">
          {getSerialNumber(option.id)}
        </p>

        <Link to="/" className="reveal-card__back">
          ← Back to the ticket
        </Link>
      </div>
    </main>
  );
}
