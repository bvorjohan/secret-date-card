# CLAUDE.md

Agent-facing project context for secret-date-card. Keep this file
current — update it in the same commit as any change to stack,
structure, or commands.

## What this is

A mobile-first web app styled like a scratch-off lottery ticket / loyalty
card. The root page shows a "ticket" of scratch-off panels; tapping one
plays a reveal animation and navigates to a route that shows that specific
date, "scratched off."

Full behavior/data-model spec: [docs/SPEC.md](docs/SPEC.md). Read that
before changing routing, the data model, or page states.

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
  data/dateOptions.ts   # the single source of truth for ticket content
  components/            # ScratchPanel, MascotSticker, StampSeal, ArcText
  pages/                 # Home, DateReveal, NotFound — one per route
  pages/TicketStudy.tsx + ticketStudy.css  # /ticket-study: standalone reference-fidelity
                          # exercise, deliberately not using index.css tokens — see
                          # docs/SPEC.md "Lotto reference board" > fidelity study.
                          # Kept around as the fidelity reference even after its
                          # techniques were ported into production (below).
  assets/mascot-sticker.png  # personal photo/bitmoji used as a sticker badge
  lib/notifyScratched.ts # fires the Netlify Forms POST on a real reveal
  App.tsx                # router config + in-memory "already scratched" session state
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
| `/date/:id`   | DateReveal | Looks up `:id` in `dateOptions`          |
| `/not-found`  | NotFound   | Explicit 404                             |
| `*`           | NotFound   | Catch-all for unknown paths              |
| `/ticket-study` | TicketStudy | Not linked from nav; reference-fidelity exercise |

## Editing ticket content

To add, remove, or edit a date option: edit `src/data/dateOptions.ts`
only. Nothing else needs to change — Home renders whatever is in that
array, and DateReveal looks entries up by `id`. See docs/SPEC.md for the
field contract (especially the `status: "ready" | "pending"` split).
