import martini from "../assets/espresso-martini.png";
import packing from "../assets/packing.png";
import bbq from "../assets/bbq.png";


/**
 * The list of scratch-off slots on the main ticket, in display order.
 * Order is no longer just visual — see `waitDaysAfterPrevious` below:
 * cards must now be scratched off strictly in this array's order, so
 * reordering entries changes gameplay, not just layout.
 *
 * This file is the single source of truth for ticket content. To add,
 * remove, or edit a date, edit this array only — no other file needs
 * to change. See docs/SPEC.md for the full data model contract.
 */
export interface ScratchDate {
  /** URL-safe id, used as the /date/:id route param. Must be unique. */
  id: string;
  /**
   * "ready"   -> has full content below, and *may* become scratchable
   *              once it also clears both gates below.
   * "pending" -> content not decided yet; always shows the "No Bueno"
   *              fallback regardless of the gates below — there's
   *              nothing for them to gate yet.
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
  /**
   * Sequential gate #1: minimum number of days that must pass after
   * the *previous* entry in this array was actually scratched (its
   * recorded reveal timestamp — see RevealedDates below) before this
   * one can be scratched. Ignored on the first entry (nothing
   * precedes it). Omit or 0 for "no extra cooldown, just has to wait
   * for the previous one to be revealed at all" — order is still
   * enforced either way, this only adds a wait on top.
   *
   * Both this gate and availableFrom below must be satisfied —
   * whichever one is later wins. See isScratchDateAvailable().
   */
  waitDaysAfterPrevious?: number;
  /**
   * Sequential gate #2: an absolute floor. This entry can't be
   * scratched before this date/time no matter how long ago the
   * previous entry was revealed or how short waitDaysAfterPrevious
   * is. ISO 8601 — a bare date ("2026-12-25") or a full timestamp.
   * Omit for no floor (gate #1 alone decides).
   */
  availableFrom?: string;
}

export const scratchDates: ScratchDate[] = [
  {
    id: "chihuly-night",
    status: "ready",
    title: "Chihuly Evening",
    description:
      "Grappa or Tolouse, then meandering among the glass as the sun goes down, perhaps a drink afterwards.",
    sticker: martini,
  },
  {
    id: "packing-for-la",
    status: "ready",
    title: "Help Pack",
    description: "Maybe you need a little encouragement!",
    sticker: packing,
    waitDaysAfterPrevious: 0,
    availableFrom: "2026-08-10"

  },
  {
    id: "what-is-brad-cooking-sleepover",
    status: "ready",
    title: "See What Brad's Been Cooking",
    description: "Brad's been working on food again! Maybe try some, watch a movie, even spend the night in a nice cozy bed?",
    sticker: bbq,
    waitDaysAfterPrevious: 0,
    availableFrom: "2026-08-10"

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

export function getScratchDate(id: string): ScratchDate | undefined {
  return scratchDates.find((entry) => entry.id === id);
}

/**
 * id -> ISO timestamp of when it was first scratched. Owned by
 * App.tsx (see loadRevealedDates/markRevealed there), persisted to
 * localStorage, passed down to Home and DateReveal. A plain `Record`
 * rather than a `Set<string>` (which is what this used to be, back
 * when only *whether* something had been revealed mattered) — now
 * that waitDaysAfterPrevious needs to measure time *since* a reveal,
 * the timestamp itself has to be part of the persisted state, not
 * just membership.
 */
export type RevealedDates = Record<string, string>;

/**
 * Whether `id` can currently be scratched off: its content has to be
 * decided (status "ready"), the entry immediately before it in
 * `scratchDates` has to have already been revealed (this is what
 * actually enforces "in order" — satisfying it for every entry means,
 * by induction, every earlier one was too, without needing to walk
 * the whole array), and now has to be past *both*
 * waitDaysAfterPrevious (measured from that previous entry's reveal)
 * and availableFrom (an absolute floor, independent of the previous
 * entry) — whichever of those two is later.
 *
 * A pure function of (id, revealedDates, now) — no hidden state, no
 * side effects — so it gives a consistent answer whether it's
 * deciding what to render on a first visit or re-checking an
 * already-revealed entry on a later one. That consistency matters:
 * once true for a given id, this must keep returning true forever
 * after (time only moves forward and nothing here ever re-locks) —
 * falls out naturally from being a pure function of "now" rather than
 * some separately-tracked "is this unlocked" flag that could drift.
 */
export function isScratchDateAvailable(
  id: string,
  revealedDates: RevealedDates,
  now: Date = new Date(),
): boolean {
  const index = scratchDates.findIndex((entry) => entry.id === id);
  if (index === -1) return false;

  const entry = scratchDates[index];
  if (entry.status !== "ready") return false;

  if (index > 0) {
    const previous = scratchDates[index - 1];
    const previousRevealedAt = revealedDates[previous.id];
    if (!previousRevealedAt) return false;

    const waitDays = entry.waitDaysAfterPrevious ?? 0;
    if (waitDays > 0) {
      const unlockAt = new Date(previousRevealedAt);
      unlockAt.setDate(unlockAt.getDate() + waitDays);
      if (now < unlockAt) return false;
    }
  }

  if (entry.availableFrom && now < new Date(entry.availableFrom)) {
    return false;
  }

  return true;
}

/**
 * A stable, purely-decorative "ticket serial number" for an entry,
 * e.g. "No. 000003". Derived from its position in the array, so it
 * shifts if you reorder scratchDates — that's fine, it's flavor text,
 * not an identifier (id is the identifier).
 */
export function getSerialNumber(id: string): string {
  const index = scratchDates.findIndex((entry) => entry.id === id);
  const n = index === -1 ? 0 : index + 1;
  return `No. ${String(n).padStart(6, "0")}`;
}
