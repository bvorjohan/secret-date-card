import defaultMascotSrc from "../assets/mascot-sticker.png";

interface MascotStickerProps {
  /** "sm" for the ticket corner badge, "lg" for the reveal-page seal. */
  size?: "sm" | "lg";
  caption?: string;
  className?: string;
  /**
   * Overrides the default bitmoji — used for a `ScratchDate`'s
   * per-event `sticker` (see src/data/scratchDates.ts). Falls back to
   * mascot-sticker.png when omitted, which is the only case on the
   * ticket itself (the corner badge always uses the default); the
   * reveal page is what actually varies this per date.
   */
  src?: string;
}

/**
 * The personal touch: a cropped bitmoji shown as a circular wax-seal-style
 * sticker. To swap the *default* picture (used everywhere `src` isn't
 * passed), replace src/assets/mascot-sticker.png with another roughly-
 * square image — nothing else needs to change. For a one-off swap on a
 * single date's reveal page instead, use `ScratchDate.sticker`, not this.
 */
export default function MascotSticker({
  size = "sm",
  caption,
  className = "",
  src = defaultMascotSrc,
}: MascotStickerProps) {
  return (
    <div className={`mascot-sticker mascot-sticker--${size} ${className}`}>
      <span className="mascot-sticker__ring">
        <img src={src} alt="" className="mascot-sticker__image" />
      </span>
      {caption && <span className="mascot-sticker__caption">{caption}</span>}
    </div>
  );
}
