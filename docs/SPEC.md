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
| `/ticket-study` | Standalone fidelity study, not linked from nav — see "Lotto reference board: fidelity study" below. |

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

**One-time manual setup step (not in code, can't be):** in the Netlify
dashboard, *Site settings → Forms → Form notifications → Add
notification → Email notification*, enter the destination address.
Netlify Forms won't send anything until that's configured, no matter
how correct the code above is.

Deployed at **https://secret-date-card.netlify.app/**. One gotcha hit
during setup, worth knowing if form submissions ever mysteriously
404 again: Netlify's *Post-processing → Form detection* setting has to
be on for the build to scan the HTML and register the form at all —
it was off by default for this site, so the very first deploy's form
submissions failed (404) until it was enabled *and* a fresh deploy was
triggered (enabling the setting doesn't retroactively reprocess an
already-published deploy).

## Share link preview

Open Graph + Twitter Card meta tags live in
[`index.html`](../index.html)'s `<head>` — this is what iMessage,
Slack, Discord, etc. actually read to build a rich link-preview card
when the URL is shared; the `<title>` tag alone isn't enough for any
of them to show an image.

- `og:image` points to `public/og-image.jpg` (1200×630, the standard
  social-preview size) — a **dedicated share-card image**, not a
  screenshot of the actual (tall, mobile-first) ticket page. Currently:
  a dark, starry "secret at night" design built around
  `src/assets/shhhh.png` (a personal Bitmoji, shushing) with the
  headline "Secret Date Nite?" — a deliberately different mood from
  the rest of the site's bright lottery-ticket look, by request ("I
  would like to do something custom"). `og:title` / `twitter:title`
  match the image's own headline text.
- `src/assets/shhhh.png` **is kept in the repo despite not being
  imported by any component** — it's the source crop used to generate
  `og-image.jpg`, kept so the card can be regenerated without
  re-cropping from the original download. Don't delete it as "unused";
  check whether it's referenced by an OG-card build step (there isn't
  one yet — see below) before assuming that.
- **How the image was made** (so it can be regenerated if this changes
  again): a standalone HTML file, styled with the same CSS custom
  properties as `src/index.css`, laying out `shhhh.png` and the
  headline; screenshotted at 2400×1260 via Playwright
  (`deviceScaleFactor: 2`, for crisp text) and downscaled to 1200×630.
  That intermediate HTML wasn't kept in the repo (only the source
  image was) — it's small enough to redo from scratch by copying the
  relevant tokens out of `index.css`. The PNG screenshot was converted
  to JPEG (quality 88) since a mostly-dark/gradient image compresses
  far smaller as JPEG than PNG (~70KB vs several hundred KB) with no
  visible quality loss at this size. There is no build-time script for
  this — it's a manual, occasional regeneration, not CI'd.
- `og:image` must be an **absolute** URL
  (`https://secret-date-card.netlify.app/og-image.jpg`) — crawlers
  fetch it directly and won't resolve a relative path against the
  page. If the Netlify domain ever changes, this has to be updated by
  hand; it's not derived from anything at build time.
- **The share-card title ("Secret Date Nite?") intentionally differs
  from the actual page headline ("Secret Date Blowout" on the ticket
  itself — see "Visual language" below).** This is a deliberate
  teaser/reveal split, not copy drifting out of sync: what shows in
  the text message is a different hook from what shows once you
  actually open the link. Don't "fix" this by making them match unless
  asked.
- No automated check confirms the preview actually renders correctly
  in iMessage/etc. — that was eyeballed manually. If you change
  `og-image.jpg` or the meta tags, a link-preview debugger (e.g.
  Facebook's Sharing Debugger, or just texting the link to yourself)
  is the only real way to verify it.

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

The ticket reads as an **actual printed scratch-off lottery ticket** —
modeled directly on one real example (see "Lotto reference board"
below), not a web card wearing lottery-flavored colors. This is the
fourth direction the visual design has been through; earlier ones
leaned "admit one" ticket, then "tasteful printed promo sheet," then
"cheap glossy gas-station scratcher" (candy colors, hot pink,
sparkle/gloss texture) — each was explicitly steered away from as
either too refined or, in the gas-station case, still not close enough
to a real ticket once there was a real one to compare against. See the
decision log at the bottom for the full sequence. Concretely, today:

- Red/orange/gold palette (`--color-*` tokens at the top of
  `index.css`) — a radial glow + `repeating-conic-gradient` sunburst
  (`--ticket-bg`) is the background on both `.ticket` and
  `.reveal-card`, not a flat or gradient fill.
- Chunky comic-style display type: **Luckiest Guy** (`--font-display`)
  for headlines, **Anton** (`--font-condensed`) for badges/kickers/
  serial numbers, both with a flat saturated fill + heavy
  `-webkit-text-stroke` + hard-offset drop shadow (not a gradient fill
  — see the fidelity-study note below for why that specific
  combination was dropped). Special Elite (`--font-stamp`) is kept for
  the tiny legal-disclaimer-style fine print — real cheap scratchers
  pair flashy headline type with tiny printed fine print, and that
  contrast is the point.
- The ticket's own fixed, short headline strings arc along a shallow
  curve (`ArcText`, `src/components/ArcText.tsx`) — the "rainbow text"
  nearly every real scratcher headline uses.
- Each date option is its own scratch **tab** — a small bordered
  rectangle (portrait, `aspect-ratio: 4/5`) with a **metallic silver**
  foil and a slight alternating rotation per tab
  (`nth-child(odd/even)`), so the sheet reads as loosely-printed
  cut-apart pieces rather than a precise grid. The whole grid sits
  inside a bordered `.ticket__playarea` frame, echoing the "PLAY AREA"
  box real tickets use to set the scratchable region apart from the
  promo copy around it.
- **The mascot sticker is deliberately huge and bursts off the card
  edge** — `size="sm"` is 112px, positioned with negative offsets so
  it visually pops off the top-right corner, standing in for the
  jagged starburst seal badge a real ticket would put there. This is
  why `.ticket` and `.reveal-card` are `overflow: visible` instead of
  `hidden` — see the "gotcha" note below before changing this.
- `.ticket__header` carries asymmetric left/right padding to keep the
  title clear of the price-tag badge (small, left) and the mascot
  (large, right) — if either badge's size or position changes, that
  padding likely needs to change with it.

Three Google Fonts loaded in `index.html`: Luckiest Guy
(`--font-display`), Anton (`--font-condensed`), and Special Elite
(`--font-stamp`). Oswald is also loaded (used only by `/ticket-study`'s
fine print, not by production CSS). All production styling lives in
[`src/index.css`](../src/index.css) — there's no CSS framework or
component library, so new UI should extend the existing custom
properties (`--color-*`, `--radius-*`, `--font-*`) rather than
introducing new patterns.

### Lotto reference board

The user had ChatGPT generate a visual-reference mood board of real
scratch-off lottery tickets and asked to move the design closer to it.
It's kept at
[`docs/reference/lotto-ticket-reference-board.jpg`](reference/lotto-ticket-reference-board.jpg)
— worth opening directly if you're touching this area, since a lot of
its guidance is easier to see than to summarize. Its explicit DO/DON'T
list is the sharpest version of the brief:

> **DO:** loud, energetic, exciting · overdesigned and dense · high
> contrast colors · multiple borders & frames · print textures &
> imperfections · make it feel like a real object · embrace the chaos
>
> **DON'T:** minimal or clean layouts · soft pastels or muted tones ·
> huge whitespace · generic web UI patterns · glassmorphism/blur ·
> overly rounded components · look like a casino website

Changes made in direct response to it (first pass — kept the app's
existing layout scaffolding, just reskinned it; **superseded by the
fidelity-study port** described further down, which replaced several
of these — `.ticket__header::before`, `.ticket__banner`, and the
gradient-fill headline are gone. Left here as history, not a
description of the current CSS):

- **Silver scratch foil, not pastel/rainbow.** The board is explicit
  that scratch coating should look like real silver-scratch texture,
  not a soft color wash — `.scratch-panel__foil`'s gradient stops were
  recolored from a rainbow pastel to metallic grays/white, and a new
  static grain layer (`.scratch-panel__grain`, a plain sibling
  element, deliberately *not* another layer on the animated gradient —
  see the shimmer history below for why that distinction matters) adds
  the speckled texture.
- **Starburst rays behind the headline** (`.ticket__header::before`,
  using the shared `--starburst` `repeating-conic-gradient` custom
  property) — the board's "Ornamentation" panel and the "MEGA MONEY"
  example both center a headline in radiating rays; this is one of the
  most visually distinctive real-ticket motifs and was completely
  missing before.
- **Halftone dot texture** (`--halftone`, a small `radial-gradient`
  tile) layered onto `.ticket__banner` — print-halftone dots are
  called out explicitly as a "Textures & Surfaces" reference and were
  otherwise absent; the rest of the card still relies on the older
  `--sparkle`/`--gloss` tokens, which read as "glossy plastic" rather
  than "printed paper" — an intentional difference (see "Cheap glossy
  gas-station" framing above), not an inconsistency to resolve by
  replacing sparkle with halftone everywhere.
- **Gradient-filled headline text** (gold → orange, via
  `background-clip: text`) instead of a flat gold fill, on both
  `.ticket__title` and `.reveal-card__title` — matches the board's
  typography examples ("MEGA MONEY," "$250,000!"), which are never a
  single flat color.
- **Double-frame border**: `.ticket` and `.reveal-card` now pair the
  existing solid black `border` with a second gold `outline` inset
  from it (`outline-offset: -10px`). "Multiple borders & frames" is a
  named DO; `outline` (not a second nested element) was chosen because
  it isn't clipped by `overflow: visible`, which `.ticket` needs for
  the mascot — see the overflow/clipping gotcha below.
- **Palette expanded**: added `--color-red`/`--color-red-dark` (a true
  red, distinct from the hot-pink `--color-accent` that existed at the
  time) and `--color-lime` (olive-green), matching the board's stated
  core palette of red/gold/olive-green/teal/purple/black more closely.
  `--color-accent`/`--color-accent-dark` were later removed outright
  (in the fidelity-study port, below) rather than kept as reserved
  palette — hot pink didn't fit the adopted red/gold/black direction
  at all, unlike `--color-teal`/`--color-purple`, which are still
  unused but genuinely reserved: treat those two specifically as
  available palette, not dead code, before removing them.

Not (yet) attempted from the board, in case it comes up again: ribbon
banner shapes (`Ornamentation` panel), a literal torn/rough-edged
reveal transition (currently a scale+fade, not a torn-paper look), and
further layout density (the board's "no empty space, information
packed in" DO is only partially embraced — the ticket is denser than
before but still has more breathing room than the reference examples).

**After that pass, the user judged it still far from the board and
asked for a fidelity exercise:** reproduce one specific example from
the board — the "Ticket Anatomy" $10 MEGA MONEY ticket — as literally
as CSS reasonably allows, on its own page, fidelity as the only goal
(not integration with the app's data model or design tokens). That
lives at `/ticket-study`
([`src/pages/TicketStudy.tsx`](../src/pages/TicketStudy.tsx),
[`src/pages/ticketStudy.css`](../src/pages/ticketStudy.css)) — a route
not linked from anywhere in the nav, kept around as the fidelity
reference even after the port below, not superseded by it. It
intentionally does **not** import `index.css` or reuse
`--color-*`/`--halftone` tokens; every value in it was picked by
eyeballing that one reference crop, not by extending the shared
system. Notable techniques, worked out there first:

- **Per-letter arc text**, promoted to a shared component
  ([`src/components/ArcText.tsx`](../src/components/ArcText.tsx)):
  CSS alone can't curve a text run, so each letter is its own
  `<span>`, rotated + vertically offset along a shallow circle in JS.
  Forced `white-space: nowrap` (`.arc-text` in index.css) — an
  arc-text run is adjacent inline-block letters with no real
  whitespace between them, so a too-wide run doesn't wrap cleanly, it
  breaks mid-word wherever it runs out of room. Nowrap makes it
  visibly overflow instead, which is at least honest, and matches how
  real ticket headlines behave (sized to fit, never wrapped). Because
  of that, `ArcText` is used for the ticket's own short, fixed
  headline strings (`.ticket__title`, `.ticket__declare`) but
  deliberately **not** for `.reveal-card__title`, which renders
  arbitrary-length data from `dateOptions.ts` — that one stays plain
  text so it can wrap normally.
- **Flat fill color beats gradient-fill for outlined display text.**
  The first attempt used `background-clip: text` combined with
  `-webkit-text-stroke` for the outline — in Chromium the opaque
  stroke dominates the paint and the gradient interior reads as
  near-solid instead of showing through. Caught by screenshotting, not
  by reading the CSS. All display headline/badge text in the app now
  uses a flat, saturated fill color + stroke + a hard offset
  `text-shadow` (no blur) for the "3D block letter" look instead.
- **Multi-point `clip-path` polygons** for the jagged sunburst seal
  badge and the five-point stars, generated with a short throwaway
  script rather than hand-picked coordinates (see git history for the
  generator) — precise and easy to regenerate at a different spike
  count if needed.
- Background is layered as three stacked CSS gradients on one
  element (`--ticket-bg` in index.css): a bottom radial glow (orange
  center → deep red edge), a `repeating-conic-gradient` sunburst on
  top of it, and a third radial-gradient scrim (transparent → black)
  over the bottom third just to keep fine print legible against the
  rays — all on one `background` property, ordered first-declared-on-top.

**Ported into production in two passes.** First pass reused the
techniques above but kept the app's existing layout scaffolding
(banner strip, perforation divider, venue fine print, mascot bursting
a corner alongside a separate seal badge) — the user's reaction was
that it still didn't look enough like `/ticket-study`, plus explicit
permission to cut copy/structure that didn't earn its place. Second
pass rebuilt `.ticket`'s markup to mirror `/ticket-study`'s DOM
structure piece for piece instead of reskinning the old one:

| `/ticket-study` | Production (`Home.tsx`) |
|---|---|
| `.tstudy-price` ("$10", top-left) | `.ticket__price` ("FREE", top-left) |
| `.tstudy-seal` ("OVER $45 MILLION...", top-right) | `MascotSticker` (top-right) — the app's own personal touch stands in for a second starburst |
| `.tstudy-mega` / `.tstudy-money` (arced 2-line headline) | `.ticket__title` × 2 ("SECRET DATE" / "BLOWOUT", arced) |
| `.tstudy-winupto` (kicker) | `.ticket__kicker` ("Scratch one off to") |
| `.tstudy-jackpot` (arced declaration) | `.ticket__declare` (arced "WIN A DATE!") |
| `.tstudy-playarea` (bordered gray box) | `.ticket__playarea` (bordered box wrapping `.ticket__grid`) |
| `.tstudy-winup20` (bold banner line) | `.ticket__banner-line` ("NEVER EXPIRES!") |
| `.tstudy-footer` (fine print + serial) | `.ticket__footer` (two joke lines + `.ticket__serial`) |

Cut entirely, since they had no equivalent in the reference and were
diluting the composition rather than adding to it: the diagonal-stripe
`.ticket__banner` strip, the dotted `.ticket__perforation` divider, and
the venue-list fine print paragraph. The "Not valid after the heat
death of the universe." joke moved from the footer's only line to a
punchline *under* a straight-faced "NEVER EXPIRES!" banner claim — a
bigger laugh from the same joke, and it fills the banner-line slot the
reference structure wants filled.
`DateReveal.tsx`/`.reveal-card` got the same background/badge/serial
treatment but kept its own layout (it has no `/ticket-study`
equivalent — it's a confirmation page, not a promo ticket).

**Critique pass against the DO/DON'T list, on Home specifically.**
After the port above, structural fidelity to `/ticket-study` was
close, but a direct re-check against the reference board's DO/DON'T
list and "Real World Examples"/"Layout & Composition Feel" strips (not
just the one Ticket Anatomy example) turned up gaps the port hadn't
caught:

- **No seal/callout badge on Home at all.** The port gave the
  starburst-badge corner to the mascot and never replaced it with
  anything — but 3 of 5 real examples on the board carry an explicit
  "X CHANCES TO WIN" / "WIN UP TO X TIMES" callout (DO: "multiple
  borders & frames"; motif "bursts"). Fixed by adding a second
  `StampSeal` badge — **"`{dateOptions.length}` CHANCES / TO WIN"**,
  computed from the actual panel count, not hardcoded — hung off
  `.ticket__playarea`'s top-right corner (`.ticket__playarea-badge` in
  index.css) instead of the card's own corner, which the mascot
  already owns. Confirmed this is the reference's own copy pattern
  (Fast Cash: "8 CHANCES TO WIN!"), not an invented style.
- **No scattered star ornaments.** `/ticket-study` had 5; none made it
  into Home. DO: motif "stars ... dots." Added `.ticket__star` (same
  five-point `clip-path` proven in `ticketStudy.css`) in two spots:
  flanking the headline inside `.ticket__header` (absolute-positioned,
  `.ticket__header-star`), and a plain in-flow `.ticket__stars-row`
  divider between the play area and the "NEVER EXPIRES!" banner line.
  The stars-row is normal flow, not fixed-pixel absolute positioning,
  on purpose — the play area's height (and therefore where the gap
  after it actually falls) depends on content, so absolute coordinates
  against `.ticket` would drift.
- **Corners read closer to a rounded web card than cut cardstock.**
  `.ticket` was `border-radius: var(--radius-lg)` (14px),
  `.ticket__playarea` was 10px — real tickets are near-sharp
  rectangles (DON'T: "overly rounded components," "generic web UI
  patterns"). Added `--radius-sm: 6px` and applied it to both,
  deliberately *not* by changing `--radius-lg` itself (that would also
  soften `.reveal-card`, out of scope for this pass) and *not* touching
  `.scratch-panel`'s own radius (already modest at 8px).
- Checked copy against the board's actual examples before touching
  any of it: the "Real World Examples" cards use very little body
  text (title + price + one "WIN UP TO X" line + the numbers grid) —
  density there comes from graphics, not verbosity. So the fix was
  the one missing callout badge above, not padding out the fine print.

**Overflow/clipping gotcha:** `.ticket` and `.reveal-card` are both
`overflow: visible` so the mascot/seal badges can burst past their
corners. Any child that needs to be clipped to the card's rounded
corners must round its own corners rather than depending on the
parent — check this if you add new full-bleed elements.

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
4. Later, a grain-texture layer was added back for the "silver scratch"
   look (see "Lotto reference board" above) — but as
   `.scratch-panel__grain`, a **plain, static, non-animated sibling
   element**, not a second layer on `.scratch-panel__foil`'s own
   animated background. That distinction is the whole point: adding it
   *inside* the animated element's `background-image` list would
   revive exactly the multi-layer-animation risk this rewrite was
   fixing. If this needs more texture later, keep new layers on their
   own static elements too.

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
