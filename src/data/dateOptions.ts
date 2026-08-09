/**
 * The list of scratch-off slots on the main ticket, in display order.
 *
 * This file is the single source of truth for ticket content. To add,
 * remove, or edit a date option, edit this array only — no other file
 * needs to change. See docs/SPEC.md for the full data model contract.
 */
export interface DateOption {
  /** URL-safe id, used as the /date/:id route param. Must be unique. */
  id: string;
  /** Short teaser shown on the un-scratched panel (kept vague on purpose). */
  teaser: string;
  /** Emoji shown on the un-scratched panel. */
  icon: string;
  /**
   * "ready"   -> has full content below; reveal page shows it.
   * "pending" -> content not decided yet; reveal page shows the
   *              ComingSoon fallback instead of title/description.
   */
  status: "ready" | "pending";
  /** Required when status is "ready". Shown on the reveal page. */
  title?: string;
  /** Required when status is "ready". Shown on the reveal page. */
  description?: string;
}

export const dateOptions: DateOption[] = [
  {
    id: "coffee-crawl",
    teaser: "A cozy one",
    icon: "☕",
    status: "ready",
    title: "Coffee & Bookstore Crawl",
    description:
      "We hop between two or three local coffee shops, and browse the bookstore in between. Low key, high comfort.",
  },
  {
    id: "sunset-picnic",
    teaser: "Golden hour",
    icon: "🧺",
    status: "ready",
    title: "Sunset Picnic",
    description:
      "Blanket, snacks, and a good view of the sky doing its thing. I'll handle the snacks.",
  },
  {
    id: "mystery-drive",
    teaser: "??? miles away",
    icon: "🗺️",
    status: "pending",
  },
  {
    id: "game-night",
    teaser: "Winner picks next date",
    icon: "🎲",
    status: "pending",
  },
  {
    id: "cook-together",
    teaser: "Two cooks, one kitchen",
    icon: "🍳",
    status: "pending",
  },
  {
    id: "stargazing",
    teaser: "Bring a jacket",
    icon: "✨",
    status: "pending",
  },
];

export function getDateOption(id: string): DateOption | undefined {
  return dateOptions.find((option) => option.id === id);
}
