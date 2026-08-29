# Plan — How Votes Flow

Run: ultron-supreme. Inputs: `town-hall.md` (approved scope), `design-brief.md` (Arena Board, locked), `PRODUCT.md`.
Status legend: pending / blocked / in-progress / awaiting-approval / completed. This index is the source of truth for status and dependencies.

## Roles

Frontend engineering (FE), UI/visual design (UI), Product/content (PD), QA/test (QA), Accessibility (AX), DevOps (DO).

## Tasks

### T1 — Scaffold + direction contract
- Owner: FE/DO · Status: completed · Size: small
- Outcome: runnable Vite + React + TypeScript + Tailwind project with the direction contract as the first HTML comment in the root layout (THESIS / OWN-WORLD / STORY / FIRST VIEWPORT / FORM with seed key 71356508 / FINISH, ≤150 words).
- Scope: project init, test runner (vitest) wired, dev/build commands, empty app shell.
- Deps: none. Files: package.json, vite config, tailwind config, index.html, src/main.tsx.
- Acceptance: `npm run build` succeeds; built output still contains the contract (grep seed key). Validation: build + grep.

### T2 — Counting engine (pure TS) + unit tests
- Owner: FE · Status: completed · Size: medium
- Outcome: deterministic instant-runoff engine over ranked blocs: per-round tallies, elimination with per-destination transfer counts, exhaustion accounting, deterministic tie-break with event record, winner via majority of active votes, final-two leader rule.
- Scope: `src/engine/` — types, count function, round model. Domain defaults per town-hall; research R1 may adjust wording/behavior behind the same API.
- Deps: T1. Files: src/engine/*.ts, tests.
- Acceptance: vitest suite green covering: majority-in-round-1, spoiler flip, exhaustion (ballots inactive in final round), elimination tie (disclosed), final-two-no-majority. Validation: `npm test`.

### T3 — Scenario system + authored recipes + validation tests
- Owner: PD/FE · Status: completed · Size: medium
- Outcome: scenario data model (named blocs with rankings), four authored recipes (The Spoiler = RCV flips plurality; The Comeback = early trailer wins; Status Quo Confirmed = RCV agrees; Nail-Biter = tie-break fires), Custom blank state, Surprise Me generator (always sum 100, plausible spread).
- Scope: `src/scenarios/`; each authored recipe asserted by test to produce its promised lesson via the engine.
- Deps: T2. Files: src/scenarios/*.ts, tests.
- Acceptance: recipe-validation tests green; Surprise Me 100-iter property test (sums to 100, terminates, ≤3 rounds). Validation: `npm test`.

### T4 — Arena world design tokens
- Owner: UI · Status: completed · Size: small-medium
- Outcome: the Arena Board world as theme: near-black arena ground, four colorblind-safe candidate inks (validated), buzzer amber reserved for threshold moments, numeral/display typefaces in the scoreboard register (chosen from the subject's world, not the training-data default list without cause), lane/ribbon/material treatments as Tailwind tokens.
- Scope: tailwind theme extension, token module, contrast/colorblind validation evidence (e.g. simulated checks recorded).
- Deps: T1 (parallel with T2/T3). Files: tailwind.config, src/theme/*.
- Acceptance: tokens exist and pass colorblind-safety + WCAG contrast checks against the ground; validation notes in production log. Validation: contrast tool/simulation output.

### T5 — Arena board static components
- Owner: UI/FE · Status: completed · Size: medium
- Outcome: the committed board as static React components: four team lanes with huge LED-style tallies, the 51 threshold line on the tally scale, ribbon caption strip, courtside token field (100 grouped tokens), the strike device for eliminated lanes, buzzer mark; mobile reflow (2×2 or stacked — builder's choice, identical elements).
- Scope: `src/components/board/*`; renders any engine round result statically.
- Deps: T2, T4. Files: src/components/board/*.
- Acceptance: desktop + phone-width renders show the committed world with all seven elements; detector pass on changed files. Validation: screenshots + `detect.mjs`.

### T6 — Playback state machine + transfer animation
- Owner: FE · Status: completed · Size: large
- Outcome: phases (setup → round-1 narration → rounds → verdict → replay) as a state machine; auto-advance with pause/resume, skip round, skip to result, replay; transfer animation = grouped token chunks streaming from struck lane to receiving lanes with leader-line counts pinned to each stream, digit ticks, one strike flash, buzzer on threshold cross; reduced-motion = instant state swaps; every board change mirrored in ribbon text (live region).
- Scope: `src/playback/` + board wiring. Signature interaction per design brief: the transfer stream with pinned counts.
- Deps: T5. Files: src/playback/*, src/components/board/*.
- Acceptance: full run on a preset animates with all controls working; reduced-motion toggle swaps instantly with ribbon carrying the story; keyboard operable. Validation: interaction walkthrough + screenshots.

### T7 — On-board editing + preset picker
- Owner: FE · Status: completed · Size: medium
- Outcome: one-board-two-grips: lineup editing on the board (bloc rows with steppers/rank selects, 100-sum enforced and visible), preset chips (4 authored + Custom + Surprise Me), instant rerun after edits. No separate setup screen.
- Scope: `src/components/editor/*`; ties scenario system to board.
- Deps: T3, T5 (T6 for rerun flow). Files: src/components/editor/*.
- Acceptance: edit → rerun works from verdict state; sum never ≠ 100 (invalid states prevented); ≤2 clicks preset→result holds. Validation: walkthrough.

### T8 — Dramatic reveal narrative + verdict card + copy
- Owner: PD/FE · Status: completed · Size: medium
- Outcome: round-1 ribbon framing as winner-take-all ("if we stopped here…"), final verdict card always naming plurality winner vs RCV winner with changed/same; plain-language disclosures for tie-break and exhausted ballots; gentle jargon tooltips (ranked-choice, exhausted ballot, majority); title/brand "How Votes Flow" + subtitle. Per R1 (committed): tie-break disclosure states that real jurisdictions break ties by lot (Maine/Alaska law; Portland ME 2021 public drawing) while the simulator uses a disclosed deterministic rule.
- Scope: copy module + verdict card component; ribbon strings. R1 copy requirements: (1) tie disclosure mentions jurisdictions use lots; (2) jargon tooltips aligned to official plain-language terms from `docs/ultron/research/R1-rcv-rules.md` ("ballots still counting" for active/continuing, "exhausted (inactive)", "ranked-choice voting" as the primary name).
- Deps: T6, T7. Files: src/components/verdict/*, src/copy/*.
- Acceptance: verdict card correct on Spoiler and Status-Quo presets (changed vs same both demonstrably rendered); disclosures fire on Nail-Biter (tie) and exhaustion case. Validation: walkthrough on all four presets.

### T9 — Accessibility hardening pass
- Owner: AX/QA · Status: completed · Size: medium
- Outcome: full keyboard operability incl. focus management across phase changes, ribbon as live narration (SR path), reduced-motion audit, contrast/colorblind final checks, focus-visible states in world grammar.
- Scope: cross-cutting; no new features.
- Deps: T6, T7, T8. Files: touched files across app.
- Acceptance: keyboard-only full journey completes; axe/manual audit findings fixed or justified. Validation: keyboard walkthrough + audit output.

### T10 — Finish pipeline: review, DESIGN.md, surface brief
- Owner: QA/UI · Status: completed · Size: medium
- Outcome: batched screenshot round (desktop + phone), design detector over changed targets, shipped finish reviewer with contract + screenshots, fix batch per disposition, documenter writes DESIGN.md + sidecar from the built world, surface brief persisted.
- Scope: `.impeccable/review/*` captures, documenter run. DESIGN.md written at finish, never before.
- Deps: T9. Files: .impeccable/*, DESIGN.md, surface brief.
- Acceptance: reviewer disposition resolved (ship or fix→verdict); DESIGN.md + sidecar exist and describe the built world; hero capture exists. Validation: reviewer return + files.

## Research queue (non-blocking)

- **R1 — RCV rules verification — status: committed (2026-08-28)** (fed T2 wording/behavior confirmation + T8 terminology). Question: What majority denominator do real single-winner RCV jurisdictions use when ballots exhaust (active votes vs original total), and what happens when only two candidates remain with no majority? What tie-break conventions exist (later-round vs earlier-round totals, lots/random, disclosure norms)? What plain-language terms do official explainers use for exhausted/inactive ballots? Full record + sources: `docs/ultron/research/R1-rcv-rules.md`.
  - **Committed decision: all three defaults CONFIRMED.** (1) Majority over active/continuing ballots — threshold `floor(active/2)+1`, strictly more than half; (2) when two candidates remain, the one with the most votes wins; (3) deterministic disclosed tie-break acceptable for the simulator — copy notes real jurisdictions (Maine/Alaska law; Portland ME 2021 public drawing) break ties by lot, and the cascade prefers prior-round totals before any alphabetical fallback.
  - **T2: unaffected.** Its cascade already prefers current-round then first-round totals before stable order — acceptable; no engine change. Evidence: Maine 21-A MRS §723-A, NYC Charter §1057-g, Alaska DoE RCV page, all accessed 2026-08-28. Confidence HIGH on rules; Alaska 2022 figures secondary-sourced — never print real-world numbers in-product without re-verification.
  - **T8: gains copy requirements** — (i) tie-break disclosure mentions jurisdictions use lots; (ii) jargon tooltips aligned to official plain-language terms from the record.
- Runs in parallel from plan approval; production does not wait on it. R1 committed 2026-08-28; queue empty.

## Dependency graph / build order

T1 → {T2, T4} parallel → T3 → T5 → T6 → T7 → T8 → T9 → T10. R1 parallel throughout.

## Milestones

- **M1 — Proven core** (T1–T3): engine + scenarios validated by tests; mistaken assumptions surface here.
- **M2 — First aha** (T5–T6): full animated count on a preset, end to end.
- **M3 — Complete journey** (T7–T8): setup→verdict→tweak loop with narrative and verdict card.
- **M4 — Acceptance complete** (T9–T10): all five acceptance criteria verified; world documented.

## Handoff

- **Fixed by scope:** lean-core MVP boundary and non-goals; six starting points; fixed cast of 4 (party-neutral); dramatic reveal; auto+controls playback; domain defaults; Vite+React+Tailwind client-only; mobile-first parity; Arena Board world (code-led).
- **Delegated to research:** R1 as phrased above — answerable, tied to T2/T8.
- **Assumptions that would return to Town Hall:** research contradicting a default in a way that changes the visible lesson or acceptance criteria; mobile parity proving infeasible without feature cuts; any scope addition.
- **Approval needed before research begins:** user approval of this plan (this review). After approval, supreme self-approves every task through production; halt list only.
- **Sizing note:** 10 tasks; T6 is the only large one (state machine + animation in one coherent session is intentional — splitting motion from machine risks two half-features).
