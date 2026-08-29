# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + Tailwind (user non-negotiable). Client-only static build; no backend.

## Users

- Civics-curious adults encountering ranked-choice voting in news or on ballots.
- Students learning electoral systems.
- Educators demoing the concept in class (projector-friendly, also used on phones).

Their job: understand how ranked-choice counting works and why it can change who wins — in minutes, by playing, without prior knowledge.

## Product Purpose

"How Votes Flow" is a one-page educational simulator. The user picks a scenario (or builds one), allocating exactly 100 votes across four fictional candidates with 1st/2nd/3rd rankings. The app then animates ranked-choice counting: round 1 is framed as what winner-take-all would do; elimination rounds follow with eliminated candidates' votes visibly flowing to their next still-active choice, until someone crosses the majority threshold. A final card always names the plurality winner vs. the ranked-choice winner, changed or same. Success = a user can explain elimination rounds, vote transfers, and when/why the winner changes after five minutes of play.

## Positioning

Votes physically flowing between candidate buckets — an animated, dramatic-reveal narrative rather than a static explainer or a dry calculator. The comparison with winner-take-all is built into the story, not an afterthought.

## Operating Context

Solo play on desktop or mobile; possibly projected in a classroom. Shared as a link. No account, no persistence — a session is one page visit. Scenarios: *The Spoiler* (RCV flips plurality), *The Comeback*, *Status Quo Confirmed* (RCV agrees), *Nail-Biter* (tie drama), plus *Custom* blank slate and *Surprise Me* randomizer. Every scenario's numbers are editable; totals always sum to 100.

## Capabilities and Constraints

- Counting: instant-runoff single winner. Majority threshold over votes still counting; if the final two remain with exhausted ballots, the leader wins. Deterministic elimination tie-break, disclosed on screen when it fires. Ballots rank 3 of 4 candidates — exhaustion after two eliminations is expected and must be explained in plain language.
- Playback: auto-advance rounds with pause/resume, skip round, skip to result, replay. No speed control in v1.
- Accessibility: reduced-motion mode, keyboard-operable controls, text narration of every round alongside animation.
- Mobile-first parity: small screens get equal design effort; the vote-flow visual must work at phone width.
- Non-goals (v1): other voting systems, multi-winner STV, real election data, accounts, telemetry, backend, localStorage persistence, i18n, embed mode, scenario sharing.
- Open product facts: none — domain-rule citations pending research (non-blocking; defaults above are the build contract).

## Brand Commitments

- Name: **How Votes Flow** (with descriptive subtitle, e.g. "a ranked-choice voting simulator").
- Fixed cast of four fictional candidates, one consistent set of names/colors/personas across the whole app.
- Party-neutral: no resemblance to real parties or politicians; candidate colors chosen for colorblind accessibility, not party association. Classroom-safe.
- Voice: general-public friendly, plain language, gently playful; jargon introduced via tooltips.

## Evidence on Hand

None — no copy, assets, data, or testimonials exist yet. The approved scoping brief (`docs/ultron/town-hall.md`) is the sole product record. Future work must not fabricate real-world election claims; any factual framing beyond generic RCV mechanics awaits research citations.

## Product Principles

1. The animation is the argument — if a transfer can be watched, it should be watched, and also written.
2. Two clicks from curiosity to payoff; the tweak-and-rerun loop is frictionless.
3. Neutral by construction: fictional cast, party-free, accessible colors, works projected or pocketed.
4. The comparison is the lesson — plurality vs. RCV, stated every single time.
5. Correctness is non-negotiable: the counting engine is deterministic, unit-tested, and explains its own rules.

## Accessibility & Inclusion

Reduced-motion support, keyboard operability, and text-equivalent narration are acceptance criteria, not enhancements. Colorblind-safe candidate palette.
