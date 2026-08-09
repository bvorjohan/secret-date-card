# Spec: secret-date-card

Status: living document. Update this whenever behavior, routes, or the
data model change — this should always describe the app as it currently
works, not as it was originally planned.

## Concept

A mobile-first web app styled like a scratch-off lottery ticket. The
root page ("the ticket") shows a grid of scratch-off panels, one per
possible date. Tapping a panel plays a short reveal animation in place,
then navigates to a dedicated route for that date, which shows it as
already "scratched off."

## Data model

Defined in [`src/data/dateOptions.ts`](../src/data/dateOptions.ts).
This array is the single source of truth for what's on the ticket —
adding a slot means adding an entry here, nothing else.

```ts
interface DateOption {
  id: string;              // URL-safe, unique, used as /date/:id
  teaser: string;          // shown on the un-scratched panel
  icon: string;             // emoji shown on the panel and reveal card
  status: "ready" | "pending";
  title?: string;           // required if status === "ready"
  description?: string;     // required if status === "ready"
}
```

- `status: "ready"` — the date is fully planned. The reveal page shows
  `title` and `description`.
- `status: "pending"` — the slot exists on the ticket (so the ticket
  doesn't look sparse/incomplete) but the date itself isn't planned
  yet. The reveal page shows the **ComingSoon fallback** instead of
  real content: a "still cooking, check back soon" message. This is
  the mechanism for shipping the ticket before every date is decided.

`teaser` and `icon` are the only things shown before a panel is
scratched — keep `teaser` vague/playful, it's meant to *not* give away
what's behind it, ready or not.

## Routes

| Path         | Behavior |
|--------------|----------|
| `/`          | Renders the ticket: header + a panel per entry in `dateOptions`, in array order. |
| `/date/:id`  | Looks up `:id` in `dateOptions`. **No match** → redirect to `/not-found`. **Match, `status: "pending"`** → render ComingSoon fallback. **Match, `status: "ready"`** → render `title` + `description`. |
| `/not-found` | Explicit 404 content, linked back to `/`. |
| `*`          | Same NotFound component, catches any other unknown path. |

There is currently no way to distinguish "this id never existed" from
"this id was removed" — both just 404. That's fine for now since the
data file is the only source of truth and there's no persistence.

## Interaction: the scratch panel

Implemented in
[`src/components/ScratchPanel.tsx`](../src/components/ScratchPanel.tsx).

This is a **tap-to-reveal animation**, not a real drag-to-erase canvas
scratch effect (that was considered and explicitly deprioritized in
favor of simplicity — see decision log below).

Sequence on tap:
1. Panel enters `is-revealing` state (CSS class toggle).
2. Foil overlay scales up, rotates slightly, and fades out (0.5s).
3. Panel content (icon + teaser) pops in underneath.
4. After `REVEAL_DELAY_MS` (550ms, defined in the component), the app
   navigates to `/date/:id`.

The delay exists purely so the animation is visible before navigation;
if the animation timing changes, keep the constant and the CSS
transition durations roughly in sync.

## Visual language

Old-timey raffle-ticket / punchcard aesthetic: aged cream paper (with a
subtle grain texture), a thin gold double-border, a dashed-and-dotted
"perforation" divider, and notched stub edges on the main ticket. Two
Google Fonts loaded in `index.html` carry the vintage feel — Playfair
Display (`--font-display`) for headings, Special Elite (`--font-stamp`,
a typewriter face) for eyebrows, fineprint, and small labels. Un-scratched
panels use a diagonal-stripe "foil" pattern with a looping shimmer sweep.
All defined in [`src/index.css`](../src/index.css) — there's no CSS
framework or component library, so new UI should extend the existing
custom properties (`--color-*`, `--radius-*`, `--font-*`) rather than
introducing new patterns.

Two small reusable decorative components live in `src/components/`:

- **`MascotSticker`** — a circular "wax seal" badge built from
  `src/assets/mascot-sticker.png` (a cropped personal photo/bitmoji).
  Used small on the ticket (`size="sm"`) and larger on reveal pages
  (`size="lg"`). Swap the picture by replacing that PNG with another
  roughly-square image; no component changes needed.
- **`StampSeal`** — a rotated ink-stamp badge (e.g. "Confirmed ✓",
  "Pending", "Void") shown on reveal/not-found pages. It's
  `aria-hidden` because the state it echoes is always stated in real
  text elsewhere on the page — it's flavor, not the source of truth.

Advertising/flavor copy (what the card is, in ticket-fineprint voice)
lives inline in `Home.tsx` as `.ticket__fineprint` — short, uppercase,
typewriter-styled, e.g. "Good for one (1) date · redeemable anytime, in
person · no cash value." Edit that paragraph directly to change the
pitch; it's plain JSX text, not pulled from the data file.

## Explicit non-goals (current phase)

- No backend/persistence — content is static, baked into the JS bundle
  at build time. Editing a date after deploy means editing the data
  file and redeploying.
- No real canvas-based scratch-to-erase interaction.
- No auth/gating — anyone with the link can view any route.

## Decision log

- **Tap animation over real scratch-off canvas**: chosen for
  simplicity and reliable mobile touch behavior; revisit only if the
  "physicality" of a real scratch turns out to matter a lot.
- **Fixed ticket = array order, no padding logic**: the ticket renders
  exactly what's in `dateOptions`, in order. If you want empty-looking
  "unclaimed" slots, add explicit `pending` entries rather than adding
  padding logic to Home.
- **Vite pinned to `^6`, oxlint pinned to `1.14.0`**: see
  [CLAUDE.md](../CLAUDE.md) — Node 20.16 on the dev machine predates
  what their latest majors require for native bindings.
- **Old-timey raffle-ticket/punchcard look, not the original
  purple/rounded style**: chosen to feel like a physical vintage
  ticket rather than a generic app card. Playfair Display + Special
  Elite loaded from Google Fonts (a real network request at runtime —
  fine for a Netlify-hosted app; note it if this ever needs to work
  fully offline).
