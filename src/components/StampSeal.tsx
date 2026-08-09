interface StampSealProps {
  text: string;
  /** "accent" = red ink (good news), "muted" = gray ink (pending/void). */
  tone?: "accent" | "muted";
  className?: string;
}

/**
 * A rotated ink-stamp badge, e.g. "CONFIRMED", "PENDING", "VOID". Purely
 * decorative flavor — the state it echoes is always stated in real text
 * elsewhere on the page, so this is aria-hidden.
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
      <span>{text}</span>
    </div>
  );
}
