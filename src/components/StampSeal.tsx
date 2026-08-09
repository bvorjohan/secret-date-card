import type { ReactNode } from "react";

interface StampSealProps {
  /** Can be multi-line (e.g. `<>WIN<br />A DATE!</>`) — real ticket
   *  seals are almost always 2-3 short lines, not one long word. */
  text: ReactNode;
  /** "accent" = black-and-gold (good news), "muted" = gray (pending/void). */
  tone?: "accent" | "muted";
  className?: string;
}

/**
 * A jagged sunburst-seal badge — the "OVER $45 MILLION IN PRIZES!"
 * black starburst callout from docs/reference/lotto-ticket-reference-board.jpg,
 * generalized into a reusable component. Used both as the ticket's
 * "win big" callout (Home) and the reveal page's confirmed/denied
 * stamp (DateReveal) — same shape, different text/tone/position; the
 * position itself is owned by whatever `className` is passed in
 * (`.ticket__seal`, `.reveal-card__stamp`), not by this component.
 *
 * Purely decorative flavor — the state it echoes is always stated in
 * real text elsewhere on the page, so this is aria-hidden.
 */
export default function StampSeal({
  text,
  tone = "accent",
  className = "",
}: StampSealProps) {
  return (
    <div
      className={`stamp-seal stamp-seal--${tone} ${className}`}
      aria-hidden="true"
    >
      <span className="stamp-seal__text">{text}</span>
    </div>
  );
}
