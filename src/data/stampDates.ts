/**
 * The list of stamp slots on the loyalty stamp card (see
 * src/components/StampCard.tsx) — the "Check your loyalty card"
 * button/modal on Home, and the bare /stamp-card-study preview.
 *
 * Intentionally a separate, independent array from
 * src/data/scratchDates.ts's ScratchDate — not a shared/extended type,
 * even though the two are conceptually similar (both are "a slot with
 * some reward behind it"). Keep it that way: this card doesn't have
 * scratchDates' sequential-gating machinery (no order enforcement, no
 * wait-day/absolute-date gates, no revealedDates-style runtime
 * tracking) and isn't meant to grow it — `earned` below is just a
 * plain flag you flip by hand when editing this file, the same way
 * ScratchDate's `status` field works, not something the app writes to
 * localStorage at runtime (unlike ScratchDate's revealedDates).
 *
 * This array is the single source of truth for the stamp card's
 * content. To add, remove, or edit a stamp, edit this array only — no
 * other file needs to change.
 */
export interface StampDate {
  /** Unique. Not currently used as a route param (no per-stamp page
   * exists), just a React key — kept for consistency with ScratchDate
   * and in case that changes later. */
  id: string;
  /** Whether this stamp has been earned yet. A plain authored flag —
   * flip it by hand as rewards get earned, there's no in-app "tap to
   * earn" mechanic (yet). */
  earned: boolean;
  /**
   * Stamped onto the card once earned — the reward for having this
   * stamp. Keep it *short*: it renders centered inside a small circle
   * (see .stamp-card__stamp in index.css), so aim for 1-3 words
   * ("FREE COFFEE", "YOUR PICK", "SLEEP IN"), not a sentence.
   */
  reward: string;
}

export const stampDates: StampDate[] = [
  { id: "stamp-1", earned: true, reward: "A Thematic Crossword" },
  { id: "stamp-2", earned: false, reward: "Your Pick" },
  { id: "stamp-3", earned: false, reward: "Sleep In" },
  { id: "stamp-4", earned: false, reward: "Movie Night" },
  { id: "stamp-5", earned: false, reward: "No Chores" },
  { id: "stamp-6", earned: false, reward: "Takeout" },
  { id: "stamp-7", earned: false, reward: "Back Rub" },
  { id: "stamp-8", earned: false, reward: "Day Trip" },
  { id: "stamp-9", earned: false, reward: "Breakfast In Bed" },
  { id: "stamp-10", earned: false, reward: "Surprise" },
];

export function getStampDate(id: string): StampDate | undefined {
  return stampDates.find((entry) => entry.id === id);
}
