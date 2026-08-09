import martini from "../assets/espresso-martini.png";

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
  /**
   * Optional per-event override for the confirmation page's sticker
   * (see src/components/MascotSticker.tsx). Falls back to the default
   * mascot-sticker.png when omitted. To use one, `import` a roughly-
   * square image from "../assets/" at the top of this file (same
   * pattern as MascotSticker's own default import) and set this to
   * that import, e.g.:
   *   import pizzaSticker from "../assets/pizza-sticker.png";
   *   ...
   *   { id: "cook-together", ..., sticker: pizzaSticker }
   */
  sticker?: string;
}

export const dateOptions: DateOption[] = [
  {
    id: "chihuly-night",
    status: "ready",
    title: "Chihuly Evening",
    description:
      "Grappa or Tolouse, then meandering among the glass as the sun goes down, perhaps a drink afterwards.",
    sticker: martini
  },
  {
    id: "err-1",
    status: "pending",
  },
  {
    id: "mystery-drive",
    status: "pending",
  },
  {
    id: "game-night",
    status: "pending",
  },
  {
    id: "cook-together",
    status: "pending",
  },
  {
    id: "stargazing",
    status: "pending",
  },
];

export function getDateOption(id: string): DateOption | undefined {
  return dateOptions.find((option) => option.id === id);
}

/**
 * A stable, purely-decorative "ticket serial number" for an option,
 * e.g. "No. 000003". Derived from its position in the array, so it
 * shifts if you reorder dateOptions — that's fine, it's flavor text,
 * not an identifier (id is the identifier).
 */
export function getSerialNumber(id: string): string {
  const index = dateOptions.findIndex((option) => option.id === id);
  const n = index === -1 ? 0 : index + 1;
  return `No. ${String(n).padStart(6, "0")}`;
}
