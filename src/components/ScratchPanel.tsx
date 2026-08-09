import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { DateOption } from "../data/dateOptions";

/** How long the reveal animation plays before we navigate to the route. */
const REVEAL_DELAY_MS = 550;

interface ScratchPanelProps {
  option: DateOption;
}

/**
 * One scratch-off slot on the main ticket. Tapping it plays a short
 * "scratched" animation in place, then navigates to /date/:id where the
 * full (or fallback) content lives.
 */
export default function ScratchPanel({ option }: ScratchPanelProps) {
  const navigate = useNavigate();
  const [revealing, setRevealing] = useState(false);

  function handleTap() {
    if (revealing) return;
    setRevealing(true);
    window.setTimeout(() => {
      navigate(`/date/${option.id}`);
    }, REVEAL_DELAY_MS);
  }

  return (
    <button
      type="button"
      className={`scratch-panel${revealing ? " is-revealing" : ""}`}
      onClick={handleTap}
      aria-label={`Scratch off: ${option.teaser}`}
    >
      <span className="scratch-panel__foil" aria-hidden="true">
        <span className="scratch-panel__shimmer" />
      </span>
      <span className="scratch-panel__content">
        <span className="scratch-panel__icon" aria-hidden="true">
          {option.icon}
        </span>
        <span className="scratch-panel__teaser">{option.teaser}</span>
      </span>
    </button>
  );
}
