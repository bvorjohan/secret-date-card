import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import {
  getScratchDate,
  getSerialNumber,
  isScratchDateAvailable,
} from "../data/scratchDates";
import type { RevealedDates, ScratchDate } from "../data/scratchDates";
import MascotSticker from "../components/MascotSticker";
import StampSeal from "../components/StampSeal";
import noBueno from "../assets/no-bueno.png";

interface DateRevealProps {
  /** id -> when it was first revealed — see isScratchDateAvailable. */
  revealedDates: RevealedDates;
  /**
   * Marks a date scratched (so the ticket shows it revealed if you
   * navigate back) and, the first time, triggers the scratch-
   * notification email (see src/lib/notifyScratched.ts). Only called
   * when this route's own isScratchDateAvailable check says the date
   * is actually available right now — an undecided (status
   * "pending"), out-of-sequence, or still-time-gated visit never
   * calls this, so none of those ever stick as "revealed." Takes the
   * full ScratchDate (not just the id) because notifyScratched needs
   * `title`.
   */
  onReveal: (option: ScratchDate) => void;
}

/**
 * The reveal route: /date/:id
 *
 * Three possible outcomes, based on the looked-up ScratchDate:
 *  - no match for :id     -> redirect to the 404 page
 *  - not available        -> "No Bueno" fallback (see below). Covers
 *    three different reasons — content not decided yet (status
 *    "pending"), an earlier date in the sequence hasn't been
 *    scratched yet, or it has but waitDaysAfterPrevious/availableFrom
 *    hasn't passed — but deliberately shows the *same* vague fallback
 *    for all three (see isScratchDateAvailable in scratchDates.ts).
 *    Dates are meant to be scratched off in order and on their own
 *    schedule, so an unavailable slot always reads as "too early," no
 *    hint of which reason or when it'll change.
 *  - available             -> full title/description reveal
 */
export default function DateReveal({ revealedDates, onReveal }: DateRevealProps) {
  const { id } = useParams<{ id: string }>();
  const option = id ? getScratchDate(id) : undefined;
  const available = option ? isScratchDateAvailable(option.id, revealedDates) : false;

  useEffect(() => {
    if (option && available) {
      onReveal(option);
    }
    // Deliberately NOT called when unavailable, for any of the three
    // reasons above — see onReveal's own doc comment on DateRevealProps.
  }, [option, available, onReveal]);

  if (!option) {
    return <Navigate to="/not-found" replace />;
  }

  return (
    <main className="reveal-page">
      <div className="reveal-card">
        <StampSeal
          text={
            available ? (
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
          tone={available ? "accent" : "muted"}
          className="reveal-card__stamp"
        />

        {available ? (
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
              src/data/scratchDates.ts) with no length limit. ArcText
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
