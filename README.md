# How Votes Flow

A one-page educational simulator that shows how ranked-choice voting works — by letting you watch it happen.

Allocate 100 votes across four fictional candidates, then watch the count: round 1 is framed the way winner-take-all would call it, and each elimination round sends the lowest candidate's votes streaming to their voters' next choices — with the count pinned to every transfer — until someone crosses the majority line. The verdict card always names the winner under both systems, and whether ranked-choice changed the result.

Built for civic-curious adults, students, and classroom demos. The cast is fictional and party-neutral; the counting rules follow real single-winner instant-runoff practice (majority of votes still counting; when two candidates remain, the leader wins; deterministic tie-break, disclosed on screen when it fires — real jurisdictions often draw lots instead).

## Run it

```bash
npm install
npm run dev      # local dev server
npm test         # 167 tests: counting engine, scenarios, board, a11y
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Scenarios

Four authored presets (each teaches something different) plus a blank custom slate and a Surprise Me randomizer — every number editable on the board itself:

- **The Spoiler** — ranked-choice flips the winner-take-all result
- **The Comeback** — an early trailer consolidates and wins
- **Status Quo Confirmed** — ranked-choice agrees with the plurality leader
- **Nail-Biter** — a disclosed elimination tie and exhausted ballots

## Deploying (Cloudflare Pages)

The site is a static client-only build — any static host works. Current setup targets Cloudflare Pages connected to this repository:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → select this repo.
2. Build settings: framework **Vite** (or build command `npm run build`, build output directory `dist`). Node version is pinned via `.node-version`.
3. **Custom domains → Set up custom domain** → `vote.graydonwasil.com`. Cloudflare adds the DNS record and certificate automatically when the zone is in the same account.

## Project records

- `PRODUCT.md` — product truth (users, constraints, principles)
- `DESIGN.md` + `.impeccable/design.json` — the built design system (Arena Board world)
- `docs/ultron/` — scoping brief, design brief, plan, research record, production log

No analytics, no backend, no accounts — the app runs entirely in the browser.
