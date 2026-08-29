---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface Brief — How Votes Flow (the one-page app)

## Scope

One page, one board, two grips — there is no setup screen and no second page. Everything lives on a single surface (`src/App.tsx`): the marquee (title + glossed subtitle), the Arena Board (four team lanes with LED tallies over the amber majority line at 51, the ribbon caption strip beneath it, the courtside token field with all 100 ballots), the playback controls (TIP OFF primary; Pause/Resume, Skip round, Skip to result, Reduced motion while playing; Replay at the verdict), the verdict card (plurality winner vs. ranked-choice winner — changed, confirmed, or tie the first count could not settle — plus the by-round story and only the disclosures that fired), the preset chips (The Spoiler, The Comeback, Status Quo Confirmed, Nail-Biter, Custom, Surprise Me), and the lineup roster (bloc rows with weight steppers, rank selects, Remove, Spread the unplaced, Add bloc — the conserved 100-sum always visible). While the count plays, the editing grip unmounts; it returns with the verdict, and any edit re-primes the board for an instant rerun.

## Visitor mode

Operate. The visitor runs the tool: pick a scenario, tip off, watch or skip the count, read the verdict, tweak numbers, rerun. One narrated payoff (the reveal), no browsing, no content pages.

## Audience / job / action / proof / constraints

- **Audience:** civics-curious adults meeting ranked-choice voting in news or on ballots; students; educators demoing on a projector — same build on phones.
- **Job:** understand how ranked-choice counting works and why it can change who wins, in minutes, by playing, without prior knowledge.
- **Action:** land pre-loaded on a preset → TIP OFF (≤2 clicks to the payoff) → watch the elimination rounds with counted transfers → read the verdict card → tweak the lineup and rerun.
- **Proof:** the mechanism itself, demonstrated live — a deterministic, unit-tested instant-runoff engine whose every round, transfer, exhaustion, and tie-break is shown and narrated; the plurality-vs-RCV comparison stated every single time. No real-world election claims beyond research-verified mechanics; the cast is fictional and party-neutral.
- **Constraints:** Vite + React + Tailwind client-only static build; mobile-first parity at 390px; reduced-motion (OS query AND in-app toggle) and full keyboard operability are acceptance criteria, not enhancements; colorblind-safe cast palette (Okabe-Ito-derived, gated by test); the 100-vote electorate is conserved (placed + unplaced = 100, structurally unbreakable); buzzer amber reserved for threshold moments.

## Chosen direction

**The Arena Board** — the election as a live game on a stadium scoreboard: near-black arena ground, four colorblind-safe team inks, LED dot-matrix tallies (Doto), a ribbon caption strip narrating every beat, court-lane geometry, the strike. Direction locked by the user (decision page roll, seed key 71356508); code-led build — no approved comp exists.

**Memorable moment:** the transfer — a struck lane's tokens streaming across the floor in grouped chunks into teammates' lanes, every stream carrying its own pinned +N leader-line count, the receiving digits ticking upward, and the buzzer line finally crossed. Motion that always states its number; under reduced motion the ribbon carries the identical story word for word.

## Unresolved decisions

None. All production-owned choices (typefaces, phone reflow 2×2, cast names/personas, preset recipes) were made and verified through the build; the finish reviewer's disposition is ship.
