import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import {
  getScratchDate,
  getScratchDateGateReason,
  getSerialNumber,
} from "../data/scratchDates";
import type { RevealedDates, ScratchDate } from "../data/scratchDates";
import MascotSticker from "../components/MascotSticker";
import StampSeal from "../components/StampSeal";
import noBueno from "../assets/no-bueno.png";
import carousel from "../assets/carousel.png";

interface DateRevealProps {
  /** id -> when it was first revealed — see getScratchDateGateReason. */
  revealedDates: RevealedDates;
  /**
   * Marks a date scratched (so the ticket shows it revealed if you
   * navigate back) and, the first time, triggers the scratch-
   * notification email (see src/lib/notifyScratched.ts). Only called
   * when this route's own getScratchDateGateReason check says the date
   * is actually "available" right now — an undecided (status
   * "pending"), out-of-order, or still-time-locked visit never calls
   * this, so none of those ever stick as "revealed." Takes the full
   * ScratchDate (not just the id) because notifyScratched needs
   * `title`.
   */
  onReveal: (option: ScratchDate) => void;
}

/**
 * The reveal route: /date/:id
 *
 * Four possible outcomes, based on getScratchDateGateReason:
 *  - "not-found"                -> redirect to the 404 page
 *  - "undecided" | "out-of-order" -> "No Bueno" fallback (see below).
 *    Content not decided yet (status "pending"), or an earlier date
 *    in the sequence hasn't been scratched yet — deliberately shows
 *    the *same* vague fallback for both, so an out-of-order visit
 *    doesn't tip you off that this slot is otherwise ready. Dates are
 *    meant to be scratched off in order, so this always just reads as
 *    "not up yet," no hint of which reason.
 *  - "time-locked"               -> "Hold Your Horses" fallback: the
 *    entry *is* decided and in order, it's just not time yet
 *    (waitDaysAfterPrevious or availableFrom hasn't passed). Its own
 *    distinct page, but still just as vague about *when* — no
 *    countdown or date shown, same "come back later" non-answer as
 *    No Bueno, just a different reason to earn its own flavor.
 *  - "available"                 -> full title/description reveal
 */
export default function DateReveal({ revealedDates, onReveal }: DateRevealProps) {
  const { id } = useParams<{ id: string }>();
  const option = id ? getScratchDate(id) : undefined;
  const reason = option ? getScratchDateGateReason(option.id, revealedDates) : "not-found";
  const available = reason === "available";

  useEffect(() => {
    if (option && available) {
      onReveal(option);
    }
    // Deliberately NOT called for any unavailable reason — see
    // onReveal's own doc comment on DateRevealProps.
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
            ) : reason === "time-locked" ? (
              <>
                HOLD UP
                <br />🐎
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
        ) : reason === "time-locked" ? (
          <>
            <img
              src={carousel}
              alt="Hold your horses"
              className="reveal-card__fallback-image"
            />
            <p className="reveal-card__eyebrow">You scratched off</p>
            <h1 className="reveal-card__title">Hold Your Horses</h1>
            <p className="reveal-card__description">
              This one's already spoken for — it's just not time yet.
              Slow down and check back later.
            </p>
          </>
        ) : (
          <>
            <img src={noBueno} alt="No bueno" className="reveal-card__fallback-image" />
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
