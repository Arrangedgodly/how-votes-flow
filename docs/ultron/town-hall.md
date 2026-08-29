# Town Hall — Ranked-Choice Voting Simulator

Status: **approved by user** (final record confirmed 2026-08-28; all clusters individually signed off in grilling rounds)
Run: ultron-supreme, phase 1. Date: 2026-08-28.

## Problem statement

Winner-take-all (plurality) elections can crown a candidate most voters opposed, and ranked-choice voting's mechanics stay opaque when explained in words alone. Watching votes physically move between candidates is the fastest way to make elimination rounds intuitive.

## Target users

- Civics-curious adults encountering RCV in news or ballots.
- Students learning electoral systems.
- Educators demoing the concept in class (projector-friendly).

Outcome: after five minutes of playing, a user can explain elimination rounds, vote transfers, and why/when the winner changes.

## MVP (approved, lean core)

One-page client-only web app:

1. **Setup — presets + editable.** Six starting points: four authored scenarios — *The Spoiler* (RCV flips the plurality result), *The Comeback*, *Status Quo Confirmed* (RCV agrees with plurality), *Nail-Biter* (tight race, tie-break drama) — plus *Custom* (blank slate) and *Surprise Me* (randomizer). Every preset's numbers are editable; totals constrained to exactly 100 votes.
2. **Fixed cast of four fictional candidates** — names, colors, one-line personas — used across all presets and custom setups. The app's brand identity.
3. **Rankings.** Ballots rank 1st/2nd/3rd across the four candidates (the ballot model is full ranked blocs; presets express them, the custom editor edits them).
4. **Count + dramatic reveal.** Round 1 is narrated as "what winner-take-all would do." Animated elimination rounds follow: lowest performer's votes visibly flow to their next still-active choice, until someone crosses the majority threshold. Final summary card always states the plurality winner vs. the RCV winner with a changed-or-same verdict.
5. **Playback: auto + controls.** Rounds auto-advance; pause/resume, skip round, skip to result, replay. No speed slider in v1.
6. **Domain defaults** (verified non-blocking by research): majority threshold over votes still counting; if down to the final two with ballots exhausted, the leader wins; deterministic tie-break for elimination, disclosed on screen when it fires.

## Non-goals (explicit)

Other voting systems (Condorcet, approval, STAR), multi-winner STV, real election data, accounts, telemetry, backend, localStorage persistence, i18n, embed mode, scenario sharing, playback speed control.

## Primary journeys & states

- **First visit → aha:** land on setup → pick preset (1 click) → watch (or skip) → summary card. ≤2 clicks from preset to result.
- **Tweak loop:** after a result, edit numbers → rerun → compare. The sandbox identity; must be frictionless.
- **States:** setup → round-1 narration (plurality framing) → animated rounds (with pause/skip) → summary → (back to setup or replay).
- Every elimination/transfer is both animated and written as text narration (also the accessibility path).

## Success measures & acceptance criteria (approved)

1. Preset → result in ≤2 clicks.
2. Every elimination/transfer shown in animation AND written text narration.
3. Final card always states plurality winner vs. RCV winner, changed-or-same.
4. Counting engine unit-tested, including elimination ties and exhausted ballots.
5. Reduced-motion mode and keyboard-operable controls.

Educational efficacy is judged by humans after shipping; no measurement in v1.

## Constraints, assumptions, dependencies, risks

- **Stack:** Vite + React + Tailwind, client-only static build; modern evergreen browsers; **mobile-first parity** — small screens get equal design effort (user decision, overriding desktop-first recommendation).
- No backend, no data collection, no accounts.
- Deployment/publishing deferred; user decides at the end (halt-list item for the coordinator).
- Risks: preset anchoring (mitigated by Custom + Surprise Me + easy editing); mobile animation complexity for vote-flow visuals (design phase must address); RCV rule fidelity (research-verified defaults behind a unit-tested engine); authoring four pedagogically distinct scenarios (content task in production).

## Role Perspectives

- **Product/user value** — Supports: presets collapse the blank-slate barrier; dramatic reveal is the hook. Dissent: presets anchor to the author's scenarios — without visible free-form play the "simulator" identity dies. Mitigated: Custom + Surprise Me + always-editable numbers. Cost: four scenarios must each carry a distinct lesson; authoring is real work.
- **UX/UI** — Supports: one page, two phases (configure ↔ watch), no reloads. Dissent: animation pacing can kill replay value — needs skip controls (accepted into MVP). Risk: mobile-first parity makes the bucket-and-arrows visual the hardest design problem.
- **Frontend** — Supports: React + Vite + Tailwind per user choice; phase state machine; animation approach open (CSS/SVG/FLIP — production decision). Dissent: animating 100 individual tokens could be noisy; grouped flows with counter tick-up are the likely answer (production).
- **Backend/data/integrations** — None. Static client only. No dissent.
- **Quality/reliability** — Supports: deterministic counting, exhaustively testable at this scale. Dissent: edge cases (ties, exhausted ballots, majority denominator) must have defined, explainable behavior — defaults approved, engine unit-tested.
- **Security/privacy** — No surface: no backend, no PII, no telemetry. No dissent.
- **Accessibility** — Supports: text narration of every round doubles as the screen-reader story; reduced-motion mode; keyboard-operable controls. Cost: modest, folded into acceptance criteria.
- **Domain/content-accuracy** — Supports: directional check aligns with mainstream single-winner RCV (instant runoff). Concerns: majority denominator when ballots exhaust; elimination tie-break; exhaustion with only 3 rankings on 4 candidates (after two eliminations a ballot can be inactive); terminology ("winner-take-all" ≈ plurality; introduce jargon gently for general public). Resolution: defaults adopted, research verifies with citations (non-blocking).

## Open-question dispositions

| Question | Owner | Blocking? |
|---|---|---|
| RCV rule verification (majority denominator, exhaustion, tie-break conventions, terminology) | research | Non-blocking (defaults approved; engine unit-tested so contradiction = localized fix) |
| Animation technique for vote flow (grouped arcs vs tokens; mobile layout) | production (informed by design phase) | No |
| Custom editor input mechanics (bloc rows vs matrix) | production | No |
| Candidate names/personas/color palette | design phase (impeccable) | Blocks design only |
| Preset numeric recipes (each must produce its promised lesson) | production | No |

## Decisions with rationale

1. **Setup = presets + editable** (over ranked-bloc builder, transfer matrix). Lowest friction to the aha moment; editing preserved. Rejected: blank-slate-only (friction), auto-derived rankings (defeats the lesson).
2. **Comparison = dramatic reveal** (over side-by-side, mode toggle). Maximum narrative contrast; final card preserves analytical closure.
3. **Audience = general public** (over classroom, wonk). Plain language, tooltips for jargon; classroom/wonk depth is post-v1.
4. **Stack = Vite + React + Tailwind** (over single HTML file). User non-negotiable; componentized for growth.
5. **Presets = 4 authored + Custom + Surprise Me.** Randomizer conceded as near-free exploration value.
6. **Fixed cast of 4** (over per-preset casts, abstract A/B/C/D). Familiarity compounds; brand identity.
7. **MVP = lean core** (over +localStorage, +agreement stats). Tight scope; persistence and stats post-v1.
8. **Success = verifiable inspection criteria** (over quiz question, telemetry). No backend forbids measurement; quiz deferred.
9. **Playback = auto + controls** (over step-only, full player w/ speed).
10. **Domain rules = defaults + verify** (over research-blocks-production). Mainstream defaults behind a unit-tested engine; research cites sources.
11. **Delivery = static, mobile-first parity** (over desktop-first — user override of recommendation; design phase must give small screens equal effort).

## Cluster sign-offs

- Problem & users — signed off (R2, plain confirmation)
- MVP boundary & non-goals — signed off (R1, after Challenger/Advocate)
- Journeys, states, success measures — signed off (R1 measures w/ C/A; R2 playback)
- Constraints/assumptions/risks — signed off (R2)
- Open-question dispositions — signed off (R2, w/ C/A on blocking status)

## Handoff note for plan-it-out

Scope is lean and stable: counting engine (pure, unit-tested, deterministic, with the approved domain defaults) is the natural first workstream and research-independent; design phase (impeccable) runs next and must solve the mobile-first vote-flow visual; production tasks follow the plan's role organization. The counting engine consumes full ranked ballots (blocs); preset recipes and the cast's names/colors are design/content inputs. Publishing is deferred to the user (halt list).
