# CLAUDE.md

Agent-facing project context for secret-date-card. Keep this file
current — update it in the same commit as any change to stack,
structure, or commands.

## What this is

A mobile-first web app styled like a scratch-off lottery ticket / loyalty
card. The root page shows a "ticket" of scratch-off rows, one "chance"
per date option; tapping one plays a reveal animation and navigates to
a route that shows that specific date, "scratched off."

Full behavior/data-model spec: [docs/SPEC.md](docs/SPEC.md). Read that
before changing routing, the data model, or page states.

## Built for one person

This is not a general-purpose product — it has exactly one intended
recipient (the person the card is for). That framing explains some
choices that would be red flags in an app meant for a broad audience;
don't "fix" these on general-engineering-hygiene grounds alone:

- No auth, no accounts, no server-side data model. `revealedIds` is
  just localStorage on one device (see App.tsx), wiped by a secret
  reset gesture (Home.tsx's serial-number button) — there's no
  multi-user state to reconcile and no reason to add one.
- Browser-API workarounds are allowed to be fragile/quirky if they
  work for the handful of real sessions on one or two known devices —
  e.g. the CSS-only forced-orientation lock in index.css (see its
  "Forced orientation lock" comment) knowingly doesn't handle every
  device/rotation-direction combination. "Doesn't scale to arbitrary
  users" generally isn't a relevant objection here.
- Copy, jokes, personal photos (the mascot bitmoji), and specific
  real-world locations in the fine print are intentional content, not
  placeholders to genericize.

## Stack

- React 19 + TypeScript, built with Vite 6
- react-router-dom v7 (`BrowserRouter`), client-side only, no backend
- Plain CSS (`src/index.css`), no CSS framework
- oxlint for linting
- Deploy target: Netlify (static build output from `npm run build`).
  Live at **https://secret-date-card.netlify.app/**, deployed from this
  repo's `main` branch. The scratch-notification email needs *Post-
  processing → Form detection* enabled in the site's Netlify settings
  (it was off by default) and an email notification configured under
  *Forms → Form notifications* — see docs/SPEC.md "Scratch notification
  email" for the full story.

**Node/tooling note:** the dev machine runs Node 20.16, which is below
what Vite 8 / oxlint 1.7x require (they need Node ^20.19 or >=22.12 for
their native rolldown/oxc bindings). Vite is pinned to `^6` and oxlint to
`1.14.0` specifically to avoid that "Cannot find native binding" failure.
If you bump either dependency, confirm `npm run build` and `npx oxlint`
still work before committing — don't jump to their latest majors without
checking Node compatibility first.

## Commands

```
npm install       # install deps
npm run dev       # local dev server (Vite)
npm run build     # type-check (tsc -b) + production build to dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

## Structure

```
src/
  data/scratchDates.ts   # the single source of truth for ticket content —
                          # the ScratchDate[] array, plus isScratchDateAvailable()
                          # (sequential/time gating — see docs/SPEC.md "Sequential
                          # gating")
  data/stampDates.ts      # the loyalty stamp card's own content — StampDate[],
                          # deliberately separate from scratchDates.ts (see its
                          # own doc comment for why), no gating/runtime state at all
  components/            # ScratchPanel (a "chance" row, not a grid tile),
                          # MascotSticker, StampSeal, ArcText, StampCard (the
                          # loyalty stamp card, see Home's "Check your loyalty
                          # card" button)
  pages/                 # Home, DateReveal, NotFound — one per route
  pages/TicketStudy.tsx + ticketStudy.css  # /ticket-study: standalone reference-fidelity
                          # exercise, deliberately not using index.css tokens — see
                          # docs/SPEC.md "Lotto reference board" > fidelity study.
                          # Kept around as the fidelity reference even after its
                          # techniques were ported into production (below).
  pages/StampCardStudy.tsx  # /stamp-card-study: bare preview of StampCard alone,
                          # not linked from nav — see docs/reference/punch-stamp-
                          # rewards-card-design-guide.png
  assets/mascot-sticker.png  # personal photo/bitmoji used as a sticker badge
  lib/notifyScratched.ts # fires the Netlify Forms POST on a real reveal
  App.tsx                # router config + "already scratched" session state
                          # (persisted to localStorage, see docs/SPEC.md
                          # "Session state")
  index.css              # all production styling — red/gold printed-lottery-ticket
                          # look modeled on /ticket-study, fonts, palette

public/og-image.jpg      # share-card image (see docs/SPEC.md "Share link preview")
docs/reference/          # design reference material (e.g. the lotto-ticket mood board),
                          # not shipped to the site — see docs/SPEC.md "Lotto reference board"
```

## Routes

| Path          | Page       | Notes                                   |
|---------------|------------|------------------------------------------|
| `/`           | Home       | The ticket grid                          |
| `/date/:id`   | DateReveal | Looks up `:id` in `scratchDates`; gated by `isScratchDateAvailable` |
| `/not-found`  | NotFound   | Explicit 404                             |
| `*`           | NotFound   | Catch-all for unknown paths              |
| `/ticket-study` | TicketStudy | Not linked from nav; reference-fidelity exercise |
| `/stamp-card-study` | StampCardStudy | Not linked from nav; bare preview of the loyalty stamp card (also reachable from Home via the "Check your loyalty card" button/modal) |

## Editing ticket content

To add, remove, or edit a date: edit `src/data/scratchDates.ts` only.
Nothing else needs to change — Home renders whatever is in the
`scratchDates` array, and DateReveal looks entries up by `id`. See
docs/SPEC.md "Data model" and "Sequential gating" for the field
contract — besides `status: "ready" | "pending"`, entries now also
carry `waitDaysAfterPrevious`/`availableFrom`, which gate *when* a
`ready` entry actually becomes scratchable (cards must be scratched
off in array order).
