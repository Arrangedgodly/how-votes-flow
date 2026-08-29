# Design Brief — How Votes Flow

Status: **direction locked by user** (decision page, 2026-08-28 — chose THE ROLL: The Arena Board)
Run: ultron-supreme, phase 2 (impeccable init + shape). PRODUCT.md at project root. Seed key 71356508, assigned index 7.

## 1. Job and audience

A civics-curious adult (or student, or educator projecting in class) arrives knowing only "ranked-choice voting exists." They want to see how it works, not read about it — five minutes, phone or desktop. Visitor mode: **Operate** — this is a tool the visitor runs, with one narrated payoff (the reveal).

## 2. Outcome and proof

Primary task: pick a scenario → watch the count → read the verdict card (plurality winner vs. RCV winner, changed or same) → tweak numbers and rerun. Success is the approved acceptance set (≤2 clicks to result; every transfer animated and text-narrated; verdict always stated; unit-tested engine; reduced-motion + keyboard). Proof is the mechanism itself, demonstrated live; no real-world election claims beyond research-verified mechanics.

## 3. Selected direction — The Arena Board

**World:** stadium scoreboard / broadcast score-bug. Near-black arena ground; four colorblind-safe team inks (one per candidate, Okabe-Ito-derived); buzzer amber reserved for threshold moments; LED-style tally numerals; a ribbon caption strip for narration; court-lane geometry.

**Structural thesis:** the election is a live game on one board. Four team lanes with huge live tallies; the majority threshold is a physical line drawn at 51 on the tally scale; the 100 vote tokens mass courtside. Rounds are periods; elimination is the strike.

**Sequence:** land pre-loaded on a preset → ribbon frames Round 1 as "what winner-take-all would do" → elimination rounds auto-advance (pause / skip round / skip to result) → final verdict card → tweak-and-rerun on the same board.

**Focal moment:** the transfer — a struck team's tokens streaming across the court into teammates' lanes, every stream carrying its own leader-line count, the receiving digits ticking up, the buzzer line finally crossed.

**Signature interaction (code-led contract):** the transfer stream with pinned counts — motion that always states its number.

**Raised disciplines (from defeated challengers, named):**
- *From the Card Stack:* one board, two grips — lineup editing happens on the arena board itself, never a separate setup screen.
- *From Stockroom Quotes:* the strike — one bold diagonal device kills an eliminated team's card, legible at any size.
- *From The Tension Column:* leader-line counts — every transfer states its own number where it happens.

**Motion grammar:** digits tick, tokens stream in grouped chunks (never 100 individual sprites), the strike flashes once, the buzzer marks the threshold cross. Reduced-motion: instant state swaps; the ribbon carries the full story either way.

## 4. Scope and boundaries

- In: one page; six starting points (The Spoiler, The Comeback, Status Quo Confirmed, Nail-Biter, Custom, Surprise Me); full animated count with ribbon narration; verdict card; on-board editing; playback controls (pause, skip round, skip to result, replay).
- Untouched: the lean-core non-goal list (other systems, multi-winner, real data, accounts, telemetry, persistence, i18n, embed, sharing, speed control).
- Anti-goals: no real-politics resemblance (party-neutral cast); no invented election statistics or claims; no gamification beyond the world's own grammar.

## 5. States and ranges

100 votes, 4 candidates, 3 ranks; 1–3 elimination rounds per run; ballot exhaustion possible (inactive ballots in later rounds, explained in plain language); elimination-tie disclosure state; blank Custom state; reduced-motion state; replay state. Phone width is a first-class layout target, not a fallback.

## 6. Interaction and layout

Hierarchy: tally digits → lane identity → ribbon narration → controls. Topology: the board (lanes + threshold line) dominates the viewport; ribbon strip beneath it; courtside token field and controls at the base. Desktop: four lanes across. Phone: lanes reflow (2×2 or stacked) with identical elements. Controls: one primary action (TIP OFF), playback chips, preset selector, lineup editor with steppers keeping the 100-vote sum honest. Every board state change is mirrored in ribbon text — the accessibility channel and the narrator are the same element.

## 7. Constraints and open decisions

Binding: Vite + React + Tailwind, client-only static build; colorblind-safe palette validated at build; reduced-motion + keyboard operability are acceptance criteria; counting engine is pure, deterministic, unit-tested, with the town-hall domain defaults. Build path: **code-led** (no image generation in this harness; the toggle was never offered, so nothing is recorded in `.impeccable/config.json`).

Left to production (builder must not invent product facts, only craft): exact numeral/display typefaces within the scoreboard register; token rendering approach (grouped sprites vs. chunked arcs); phone lane reflow choice; the four candidates' names/personas (party-neutral, design-authored); preset numeric recipes (each must produce its promised lesson, verified by test).

## Handoff

Direction is locked. Plan-it-out organizes: counting engine (pure TS, unit tests, domain defaults), board/presentation layer (lanes, ribbon, tokens, strike, buzzer), scenario system (presets/custom/random), editing loop, playback state machine, accessibility, research verification (non-blocking), finish pipeline (detector, finish reviewer, documenter → DESIGN.md at finish).
