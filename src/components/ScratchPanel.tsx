import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { ScratchDate } from "../data/scratchDates";
import scratchCatIcon from "../assets/scratch-cat-icon.png";

/** How long the reveal animation plays before we navigate to the route. */
const REVEAL_DELAY_MS = 550;

interface ScratchPanelProps {
  option: ScratchDate;
  /** 1-based position on the sheet — the "CHANCE #n" tab label, and
   *  (via nth-child in CSS) which color the tab cycles to. */
  piece: number;
  /** Already visited via /date/:id this session — render pre-scratched, no animation/delay. */
  revealed?: boolean;
  /**
   * Whether this entry is actually scratchable right now — see
   * isScratchDateAvailable in src/data/scratchDates.ts. Governs
   * whether tapping plays the local "reveal" animation at all (see
   * handleTap): that animation pops `option.title` in on this row,
   * in place, before navigating — fine when the tap is genuinely
   * about to open a real reveal, but a real content leak for a
   * pending/out-of-order/still-time-gated entry, since it would show
   * the title regardless of the gate `/date/:id` is about to enforce
   * anyway. Required (not defaulted to true) so every call site has
   * to make an explicit gating decision rather than silently trusting
   * a fallback.
   */
  available: boolean;
}

/**
 * One scratch-off "chance" row on the ticket. Tapping it plays a
 * short "scratched" animation in place, then navigates to /date/:id
 * where the full (or fallback) content lives.
 *
 * Row layout (not a square grid tile — see docs/SPEC.md "Lotto
 * reference board" for the mockup this followed): a colored numbered
 * tab on the left (`.scratch-row__tab`, color cycles per row via
 * nth-child in index.css), then the scratch foil/content filling the
 * rest of the row. Unscratched, the foil shows "Scratch" / the cat
 * watermark / "Here" side by side, filling the row's width instead of
 * a single centered icon with empty space on either side.
 *
 * If `revealed` is already true (this id was visited earlier this
 * session — see App.tsx's revealedDates), the row renders straight into
 * the post-scratch visual with no delay: tapping it just re-navigates
 * immediately, there's nothing left to "reveal."
 *
 * No per-row rotation here (unlike the old grid tiles) — these rows
 * are meant to read as a neat, aligned ticket stub list, not a loose
 * sheet of cut-apart pieces. That also means the shimmer's animated
 * gradient can live directly on `.scratch-row__foil` with no rotated-
 * wrapper workaround; that workaround existed only to dodge a GPU
 * rasterization seam that appeared when the same element was both
 * rotated *and* had the animated gradient — with no rotation, there's
 * nothing for that bug to trigger on.
 *
 * `available` gates the local reveal animation itself, not just what
 * happens after navigating: tapping a not-yet-available entry
 * navigates straight to /date/:id with no in-place animation, so
 * `option.title` (in `.scratch-row__teaser`/the aria-label below)
 * never renders on this row at all unless the tap was actually going
 * to open a real reveal. Found live: without this guard, tapping any
 * row — including a still-time-gated or out-of-order one — popped its
 * real title in on the ticket itself for the ~550ms before the
 * subsequent /date/:id navigation corrected it with the vague
 * fallback, defeating the entire point of the gate for that ~550ms.
 */
export default function ScratchPanel({
  option,
  piece,
  revealed = false,
  available,
}: ScratchPanelProps) {
  const navigate = useNavigate();
  const [revealing, setRevealing] = useState(false);

  function handleTap() {
    if (revealed) {
      navigate(`/date/${option.id}`);
      return;
    }
    if (!available) {
      // Not actually scratchable yet — skip the local "you won!"
      // animation entirely (see this component's own doc comment for
      // why) and let /date/:id show the vague fallback instead.
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
    <button
      type="button"
      className={`scratch-row${showScratched ? " is-revealing" : ""}`}
      onClick={handleTap}
      aria-label={
        revealed
          ? `View: ${option.title}`
          : available
            ? `Scratch off: ${option.title}`
            : `Scratch off: Chance #${piece}`
      }
    >
      <span className="scratch-row__tab" aria-hidden="true">
        <span className="scratch-row__tab-star">★</span>
        CHANCE
        <span className="scratch-row__tab-num">#{piece}</span>
      </span>
      <span className="scratch-row__body">
        <span className="scratch-row__foil" aria-hidden="true">
          <span className="scratch-row__grain" />
          <span className="scratch-row__foil-word">Scratch</span>
          <img
            src={scratchCatIcon}
            alt=""
            className="scratch-row__watermark"
          />
          <span className="scratch-row__foil-word">Here</span>
        </span>
        <span className="scratch-row__content">
          <span className="scratch-row__teaser">{option.title}</span>
        </span>
      </span>
    </button>
  );
}
