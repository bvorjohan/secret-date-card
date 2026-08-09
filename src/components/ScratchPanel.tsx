import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { DateOption } from "../data/dateOptions";
import catIcon from "../assets/scratch-cat-icon.png";

/** How long the reveal animation plays before we navigate to the route. */
const REVEAL_DELAY_MS = 550;

interface ScratchPanelProps {
  option: DateOption;
  /** 1-based position on the sheet, used only for the "Piece n/total" flavor label. */
  piece: number;
  total: number;
  /** Already visited via /date/:id this session — render pre-scratched, no animation/delay. */
  revealed?: boolean;
}

/**
 * One scratch-off tab on the game-piece sheet. Tapping it plays a short
 * "scratched" animation in place, then navigates to /date/:id where the
 * full (or fallback) content lives.
 *
 * If `revealed` is already true (this id was visited earlier this
 * session — see App.tsx's revealedIds), the tab renders straight into
 * the post-scratch visual with no delay: tapping it just re-navigates
 * immediately, there's nothing left to "reveal."
 *
 * The foil face is a metallic-silver gradient (animated shine sweep)
 * with a static grain overlay for texture, an icon watermark (like
 * real scratch tickets print a mascot/symbol under the scratch
 * coating — see src/assets/scratch-cat-icon.png), and the "SCRATCH"
 * label.
 *
 * The slight per-tab tilt is applied to a wrapping `.scratch-panel-slot`,
 * not to `.scratch-panel` itself — see the comment on that CSS rule
 * before "simplifying" this back to one element.
 */
export default function ScratchPanel({
  option,
  piece,
  total,
  revealed = false,
}: ScratchPanelProps) {
  const navigate = useNavigate();
  const [revealing, setRevealing] = useState(false);

  function handleTap() {
    if (revealed) {
      navigate(`/date/${option.id}`);
      return;
    }
    if (revealing) return;
    setRevealing(true);
    window.setTimeout(() => {
      navigate(`/date/${option.id}`);
    }, REVEAL_DELAY_MS);
  }

  const showScratched = revealed || revealing;

  return (
    <div className="scratch-panel-slot">
      <button
        type="button"
        className={`scratch-panel${showScratched ? " is-revealing" : ""}`}
        onClick={handleTap}
        aria-label={
          revealed ? `View: ${option.teaser}` : `Scratch off: ${option.teaser}`
        }
      >
        <span className="scratch-panel__foil" aria-hidden="true">
          <span className="scratch-panel__grain" />
          <img src={catIcon} className="scratch-panel__watermark" alt="" />
        </span>
        <span className="scratch-panel__content">
          <span className="scratch-panel__icon" aria-hidden="true">
            {option.icon}
          </span>
          <span className="scratch-panel__teaser">{option.teaser}</span>
          <span className="scratch-panel__piece" aria-hidden="true">
            Piece {piece}/{total}
          </span>
        </span>
      </button>
    </div>
  );
}
