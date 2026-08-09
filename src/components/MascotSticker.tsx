import mascotSrc from "../assets/mascot-sticker.png";

interface MascotStickerProps {
  /** "sm" for the ticket corner badge, "lg" for the reveal-page seal. */
  size?: "sm" | "lg";
  caption?: string;
  className?: string;
}

/**
 * The personal touch: a cropped bitmoji shown as a circular wax-seal-style
 * sticker. To swap the picture, replace src/assets/mascot-sticker.png with
 * another roughly-square image — nothing else needs to change.
 */
export default function MascotSticker({
  size = "sm",
  caption,
  className = "",
}: MascotStickerProps) {
  return (
    <div className={`mascot-sticker mascot-sticker--${size} ${className}`}>
      <span className="mascot-sticker__ring">
        <img src={mascotSrc} alt="" className="mascot-sticker__image" />
      </span>
      {caption && <span className="mascot-sticker__caption">{caption}</span>}
    </div>
  );
}
