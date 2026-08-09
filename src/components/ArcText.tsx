interface ArcTextProps {
  text: string;
  /** Total angular spread across the string, in degrees. */
  maxDeg: number;
  /** How far the edge letters drop relative to the center letter, in px. */
  radius: number;
  className?: string;
}

/**
 * Renders `text` as individual letter spans arched along a shallow
 * circle (middle letters raised, edge letters lowered + rotated to
 * stay tangent to the arc) — the "rainbow" text treatment nearly
 * every real scratch-off headline uses (see
 * docs/reference/lotto-ticket-reference-board.jpg and
 * docs/SPEC.md "Lotto reference board"). Plain CSS can't curve a text
 * run, so this is done per-letter in JS; color/stroke/shadow/font
 * still come from whatever class wraps this (e.g. `.ticket__title`),
 * since those are inherited text properties.
 *
 * Originally written for the /ticket-study fidelity exercise
 * (src/pages/TicketStudy.tsx) and promoted here once the direction
 * was adopted for the real ticket/reveal headlines.
 */
export default function ArcText({ text, maxDeg, radius, className }: ArcTextProps) {
  const chars = [...text];
  const n = chars.length;
  return (
    <span className={`arc-text${className ? ` ${className}` : ""}`}>
      {chars.map((ch, i) => {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5 (left edge) .. 0.5 (right edge)
        const angleDeg = t * maxDeg;
        const rad = (angleDeg * Math.PI) / 180;
        const dip = radius * (1 - Math.cos(rad)); // 0 at center, grows toward the edges
        return (
          <span
            key={i}
            className="arc-text__char"
            style={{ transform: `rotate(${angleDeg}deg) translateY(${dip}px)` }}
          >
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </span>
  );
}
