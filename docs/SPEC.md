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
  yet. The reveal page shows the **"No Bueno" fallback** instead of
  real content — a rejection, not a "coming soon": the framing is that
  dates are meant to be scratched off in order, so this one just isn't
  "up yet," full stop, no promise of when. This is the mechanism for
  shipping the ticket before every date is decided.
  - This is flavor/framing only — there's no actual enforcement of
    scratch order (no session state, no tracking of which tabs have
    been visited). Every `pending` id shows the same "No Bueno"
    fallback regardless of which other ids have been viewed. If real
    sequential gating is ever wanted, that's a materially bigger
    feature (needs persisted state, e.g. localStorage) — don't assume
    it's already there.

`teaser` and `icon` are the only things shown before a panel is
scratched — keep `teaser` vague/playful, it's meant to *not* give away
what's behind it, ready or not.

## Routes

| Path         | Behavior |
|--------------|----------|
| `/`          | Renders the ticket: header + a panel per entry in `dateOptions`, in array order. |
| `/date/:id`  | Looks up `:id` in `dateOptions`. **No match** → redirect to `/not-found`. **Match, `status: "pending"`** → render "No Bueno" fallback (see data model above). **Match, `status: "ready"`** → render `title` + `description`. |
| `/not-found` | Explicit 404 content, linked back to `/`. |
| `*`          | Same NotFound component, catches any other unknown path. |

There is currently no way to distinguish "this id never existed" from
"this id was removed" — both just 404. That's fine for now since the
data file is the only source of truth and there's no persistence.

## Session state: "already scratched" tabs

`App.tsx` holds `revealedIds: Set<string>` (plain `useState`, no
context library, no storage API) and a `markRevealed(id)` setter,
passed down to `Home` and `DateReveal` as props — not lifted into a
context, since the prop-drilling depth here is exactly one level each
way and a context would be pure ceremony.

- `DateReveal` calls `onReveal(option.id)` in a `useEffect` whenever a
  valid `:id` is visited — **for both `ready` and `pending` outcomes**.
  A "No Bueno" is still a scratch; the tab doesn't go back to looking
  unscratched just because there was nothing to win.
- `Home` passes `revealed={revealedIds.has(option.id)}` to each
  `ScratchPanel`. A panel with `revealed=true` renders straight into
  the post-scratch visual (no foil, no tap delay) and, if tapped again,
  navigates immediately instead of replaying the reveal animation —
  there's nothing left to reveal.

**This is deliberately in-memory only.** It survives client-side
navigation (this is an SPA; routing between `/` and `/date/:id` never
unmounts `App`), but a hard page reload resets `revealedIds` to empty
and every tab looks unscratched again, even for dates you'd already
seen. That's an accepted, discussed tradeoff for a no-backend project,
not a bug — see the non-goals below. If that gap ever needs closing,
the fix is persisting `revealedIds` to `localStorage` (read on init,
write on every `markRevealed`), which is a small change *given this
structure* — but don't add it speculatively; it wasn't asked for.

## Scratch notification email

When a `status: "ready"` date is revealed for the first time in a
session (never for a `pending` "No Bueno"), the app silently submits a
[Netlify Form](https://docs.netlify.com/forms/setup/) via `fetch()` —
see [`src/lib/notifyScratched.ts`](../src/lib/notifyScratched.ts),
triggered from inside `App.tsx`'s `markRevealed` updater (same
first-time-only check that drives the "already scratched" tab state
above — this is a side effect of that same state transition, not a
separate mechanism).

**Why Netlify Forms and not a "send email" API call:** there's no
generic "send an arbitrary email" endpoint in the Netlify platform.
Netlify Forms is the built-in feature that gets you email notifications
without standing up a serverless function or signing up for a
third-party transactional-email service (Resend, SendGrid, etc.) and
managing an API key. The tradeoff is less control over the email's
appearance — it uses Netlify's own notification template, not custom
HTML/copy. If that ever matters, swap `notifyScratched` for a call to
a Netlify Function that calls an email API directly; the trigger site
(`App.tsx`) doesn't need to change, just the function's body.

**The mechanics, since they're easy to break by "cleaning up" what
looks like dead code:**

- A hidden, static `<form name="scratch-reveal" data-netlify="true">`
  lives directly in [`index.html`](../index.html), *outside* `#root`.
  It has to be there, specifically — Netlify registers forms by
  parsing the built HTML at deploy time, before any JavaScript runs,
  so a form that only exists because React rendered it would never be
  discovered. This form is never actually submitted by a real browser
  form-submit; it exists purely so Netlify's build step knows the
  `scratch-reveal` form (and its fields) exists.
- At runtime, `notifyScratched()` POSTs a matching
  `application/x-www-form-urlencoded` body (with `form-name:
  scratch-reveal`) to `/` via `fetch()`. Netlify's edge intercepts POST
  requests containing a recognized `form-name` field regardless of
  which path they're sent to.
- The field names in `index.html`'s hidden inputs and the
  `URLSearchParams` keys in `notifyScratched.ts` have to match exactly
  — there's no type-checking across that boundary.
- `notifyScratched()` fails silently (`.catch(() => {})`) — a blocked
  or failed request must never break the reveal page. There is
  currently no user-visible confirmation that the email fired; that's
  intentional (the recipient's inbox is the confirmation).

**One-time manual setup step (not in code, can't be):** after the site
is actually deployed on Netlify, someone has to go to *Site settings →
Forms → Form notifications → Add notification → Email notification*
and enter the destination address. Netlify Forms won't send anything
until that's configured, no matter how correct the code above is. This
repo has never been connected to a Netlify site as of this writing —
see the deploy note in [CLAUDE.md](../CLAUDE.md).

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

The ticket reads as a **cheap, glossy gas-station scratch-off card** —
a fast-food game-piece sheet or instant-lottery ticket, not an elegant
vintage ticket or a tasteful deli punch card. Two earlier drafts leaned
"admit one" and then "tasteful printed promo sheet" respectively; both
were explicitly steered away from as too refined. This is the third,
current direction — lean all the way into tacky. Concretely:

- Saturated candy-color palette (hot pink, gold, teal, purple) instead
  of anything muted/sepia. See the `--color-*` tokens at the top of
  `index.css`.
- Chunky comic-style display type: **Luckiest Guy** (`--font-display`)
  with a heavy `-webkit-text-stroke` outline + hard-offset drop shadow
  on every headline, for that bubble-letter "WIN BIG" look. Special
  Elite (`--font-stamp`) is kept, but demoted to only the tiny
  legal-disclaimer-style text (serial numbers, fineprint) — real
  cheap scratchers pair flashy headline type with tiny printed fine
  print, and that contrast is the point.
- A full-bleed diagonal-striped banner (`.ticket__banner`, pink/gold)
  across the top, like a printed game-show header strip.
- A glossy diagonal sheen (`--gloss`) and a scattered gold/pink
  sparkle texture (`--sparkle`) layered into the card background,
  replacing the earlier aged-paper grain — this card is laminated
  plastic-cheap, not aged paper.
- Each date option is its own scratch **tab** — a small bordered
  rectangle (portrait, `aspect-ratio: 4/5`) with a pastel-holographic
  foil (multiple translucent color layers over the diagonal stripe
  pattern) and a slight alternating rotation per tab
  (`nth-child(odd/even)`), so the sheet reads as loosely-printed
  cut-apart pieces rather than a precise grid.
- **The mascot sticker is deliberately huge and bursts off the card
  edge** — `size="sm"` is 112px (was 50px in the tasteful draft),
  positioned with negative offsets so it visually pops off the
  top-right corner. This is why `.ticket` is `overflow: visible`
  instead of `hidden`; `.ticket__banner` rounds its own top corners
  (`border-radius`) instead of relying on the card to clip it. See
  the "gotcha" note below before changing either of these.
- `.ticket__header` carries `padding-right` to keep the title/subtitle
  clear of the mascot's footprint — if the mascot's size or position
  changes, that padding likely needs to change with it.

Two Google Fonts loaded in `index.html`: Luckiest Guy (`--font-display`)
and Special Elite (`--font-stamp`). All styling lives in
[`src/index.css`](../src/index.css) — there's no CSS framework or
component library, so new UI should extend the existing custom
properties (`--color-*`, `--radius-*`, `--font-*`) rather than
introducing new patterns.

**Overflow/clipping gotcha:** `.ticket` is `overflow: visible` so the
mascot can burst past its edge. That means any other child that needs
to be clipped to the card's rounded corners (like `.ticket__banner`)
must round its own corners rather than depending on the parent — check
this if you add new full-bleed elements.

**Stacking order gotcha:** `ScratchPanel`'s foil overlay and its content
are both `position: absolute; inset: 0` siblings — the foil needs
`z-index: 2` and the content `z-index: 1` or the (later-in-DOM) content
paints on top and shows through the "unscratched" foil. Caught this by
actually screenshotting the rendered page — worth re-checking visually
after any change to that component's DOM order.

**Shimmer implementation — history and why it's simple now:** the foil
shimmer went through several broken iterations worth knowing about so
they don't get reintroduced:

1. First version: a separate absolutely-positioned shimmer element,
   layered on top of a two-layer foil background (a static color wash
   *and* a `repeating-linear-gradient` stripe texture), animating
   `background-position` in one direction on `infinite` loop. This had
   a real, measurable snap once per cycle — confirmed by
   screen-recording the page and diffing consecutive frames, which
   showed an isolated frame-diff spike recurring at exactly the
   animation's duration. Root cause: CSS resolves a background-position
   percentage as `(elementSize - tileSize) * (percent/100)`, which does
   **not** scale 1:1 with the background-size percentage, so the
   travel distance didn't actually equal one tile-width — the maths
   were fixed twice (once wrong, once right) but the fix only ever
   addressed the *loop-restart* jump.
2. Separately, a hairline seam appeared *within* a cycle (not at the
   loop boundary) — visible on a real device, never reproducible in
   this machine's headless-Chromium screenshots. Two targeted,
   unverified fixes were tried (GPU-layer promotion via
   `translateZ(0)`; unifying the three gradient layers' angles) and
   made it *worse* per direct user feedback with a screenshot.
3. The actual fix was to stop patching that construction and replace
   it with the standard, boring shimmer/skeleton-loading pattern used
   all over the web: **one** gradient layer, animated with
   `animation-direction: alternate` instead of loop-forward-forever.
   Alternate reverses instead of jumping back to the start, so there
   is no wrap-around point at all — nothing for a tiling seam to
   appear at, by construction, regardless of GPU/browser quirks. This
   also meant deleting the separate color-wash layer, the
   `repeating-linear-gradient` stripe layer, and the separate shimmer
   child element entirely — `.scratch-panel__foil` is now the only
   element involved, with one `linear-gradient` and one `@keyframes`.

**Lesson embedded in the code, not just here:** if a visual effect
needs hand-derived tile-size arithmetic or multiple overlapping
gradient layers to look right, prefer redesigning it around a simpler,
well-established CSS pattern over debugging the complex one further.
The complexity was the bug.

**Rotation still lives on a wrapper, not on `.scratch-panel` itself**
(`.scratch-panel-slot` in the grid, `.scratch-panel` inside it) — that
separation predates the single-gradient fix and is unrelated to it,
but there's no strong reason to collapse them back into one element
either.

Two small reusable decorative components live in `src/components/`:

- **`MascotSticker`** — a big circular die-cut-sticker badge built from
  `src/assets/mascot-sticker.png` (a cropped personal photo/bitmoji).
  `size="sm"` (112px) is used on the ticket, bursting off the top-right
  corner; `size="lg"` (176px) is used centered on reveal pages. Swap
  the picture by replacing that PNG with another roughly-square image;
  no component changes needed. Deliberately large — see "Visual
  language" above.
- **`StampSeal`** — a rotated ink-stamp badge (e.g. "Confirmed ✓",
  "Denied", "Void") shown on reveal/not-found pages. It's
  `aria-hidden` because the state it echoes is always stated in real
  text elsewhere on the page — it's flavor, not the source of truth.

Each scratch tab's foil face also shows a small icon watermark —
`src/assets/scratch-cat-icon.png` (cropped from a personal
Bitmoji-with-cat image) sits above the "★ SCRATCH ★" label, styled via
`.scratch-panel__watermark` in `ScratchPanel.tsx`. This mirrors how
real scratch tickets print a mascot/symbol under the scratch coating,
not just plain foil. Swap the image file to change it; no CSS/markup
changes needed as long as the replacement is roughly square.

The `pending`-status "No Bueno" fallback on `DateReveal` shows
`src/assets/no-bueno.png` (a personal Bitmoji sticker with "NO BUENO."
already baked into the image as text) via `.reveal-card__no-bueno` —
not run through `MascotSticker`, since that component's circular
wax-seal frame would crop off the image's own text. Swap the file to
change the visual; it doesn't need to be square (this one is a wide
rectangle).

Advertising/flavor copy (what the card is, in ticket-fineprint voice)
lives inline in `Home.tsx` as `.ticket__fineprint` — short, uppercase,
typewriter-styled. Currently lists real redemption-adjacent venues
("Redeemable at Central Cinema, San Fermo, Chihuly, Atoma, and other
participating locations"). Edit that paragraph directly to change the
pitch; it's plain JSX text, not pulled from the data file.

Header copy leans into lottery-ticket voice on purpose: the banner
reads "★ Win Big! ★" and the big title is "Secret Date Blowout" (a
"game name," matching how real scratch tickets are branded) — the
subtitle ("Scratch one off to redeem a date with me") is what actually
carries the plain-language explanation of what the card does. If the
title copy changes again, keep that explanatory role somewhere visible
near the top; don't let both the title and subtitle go purely
stylistic at the same time.

## Explicit non-goals (current phase)

- No backend/persistence — content is static, baked into the JS bundle
  at build time. Editing a date after deploy means editing the data
  file and redeploying. "Already scratched" session state (above) is
  the one piece of runtime state the app has, and it's explicitly
  memory-only, not persisted.
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
  ticket rather than a generic app card.
- **Then: printed promo scratch-sheet, not a ticket stub**: still
  vintage-leaning, but restructured as a sheet of individually
  bordered game-piece tabs instead of a movie-ticket-shaped card.
- **Then: cheap glossy gas-station scratcher, not tasteful vintage at
  all**: the current direction (see "Visual language" above). Dropped
  Playfair Display for Luckiest Guy, dropped the aged-paper grain for
  gloss + sparkle, went saturated instead of sepia, and blew up the
  mascot sticker to ~2x its previous size. Each of these three passes
  was a direct response to "doesn't look right yet" feedback — if the
  look moves again, prefer editing this file's description to match
  reality over letting it go stale, since it's now on its third
  distinct identity in one afternoon.
- **Fonts loaded from Google Fonts at runtime** (Luckiest Guy, Special
  Elite): fine for a Netlify-hosted app; note it if this ever needs to
  work fully offline.
