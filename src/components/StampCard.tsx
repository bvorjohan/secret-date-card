import { stampDates } from "../data/stampDates";
import stampMascotSrc from "../assets/stamp.png";

/**
 * The loyalty stamp card itself — shared by /stamp-card-study (a bare
 * preview page) and Home's loyalty modal (see Home.tsx's "Check your
 * loyalty card" button). Renders directly from stampDates (see
 * src/data/stampDates.ts) — earned stamps show their reward text
 * stamped inside the circle, unearned ones stay a dashed outline.
 *
 * Renamed from PunchCard/"punch card" to StampCard/"stamp card" —
 * same physical-card-with-circles idea, just a naming/content change:
 * this version's stamps carry their own individual reward text
 * instead of icons and a collective "10th one's free" mechanic.
 *
 * Reference: docs/reference/punch-stamp-rewards-card-design-guide.png
 * ("Punch/Stamp Rewards Card Design Guide" — kraft paper, hand-stamped
 * ink look). File kept its original name since it's still the same
 * source image; only this component's own naming changed.
 *
 * src/assets/stamp.png (the bitmoji mid-stamp with a heart) is printed
 * *onto* the card itself as a faded background watermark (see
 * .stamp-card__watermark in index.css) — deliberately not a floating
 * corner sticker/badge like MascotSticker's ticket treatment. A real
 * wallet loyalty card's personalization is part of the print, not a
 * decal stuck on top of it; a first pass here did the sticker version
 * and it read as pasted-on rather than belonging to the card.
 */
interface StampCardProps {
  className?: string;
}

export default function StampCard({ className = "" }: StampCardProps) {
  return (
    <div className={`stamp-card ${className}`}>
      <img
        src={stampMascotSrc}
        alt=""
        aria-hidden="true"
        className="stamp-card__watermark"
      />
      <header className="stamp-card__header">
        <span className="stamp-card__heart" aria-hidden="true">♥</span>
        <h1 className="stamp-card__title">Rewards Just for You!</h1>
        <span className="stamp-card__heart" aria-hidden="true">♥</span>
      </header>
      <p className="stamp-card__value-prop">
        Earn a reward after every redeemed date, and a bigger reward after
        every 10 and 100 dates.
      </p>
      <div className="stamp-card__grid">
        {stampDates.map((stamp) => (
          <span
            key={stamp.id}
            className={`stamp-card__stamp${stamp.earned ? " is-earned" : ""}`}
          >
            {stamp.earned && (
              <span className="stamp-card__reward">{stamp.reward}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
