# Critique Snapshot — How Votes Flow (src/App.tsx)

Date: 2026-08-28 · Phase: finishing (ultron-impeccable auto mode) · Target slug: `src-app-tsx`

⚠️ DEGRADED: single-context (no sub-agent/Task tool exposed in this session; assessments A and B run as two rigorously separated in-thread passes, disclosed — pass A completed and closed before any detector output entered the synthesis context)

## Report header provenance

Method: degraded dual-pass (A: in-thread design review, closed first · B: in-thread detector + technical/craft, second). Isolation method: sequential passes in one context; A's findings were frozen in notes before the detector CLI/browser runs began. Snapshot directory with evidence: `.impeccable/critique/2026-08-28/` (13 fresh captures `A-*.png`, this file).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Ribbon mirrors every state change once; beat chip (`R2 · transfer / R3`); pause is a true freeze |
| 2 | Match System / Real World | 4 | Plain-language narration throughout; jargon glossed via tooltips; sports register coherent |
| 3 | User Control and Freedom | 3 | Pause/skip/replay/edit-rerun all present; no back-step to a previous round; editing locked mid-playback (by design) |
| 4 | Consistency and Standards | 4 | Token discipline test-enforced; one ink per candidate everywhere; native controls kept native |
| 5 | Error Prevention | 4 | Conserved electorate structurally unbreakable; steppers clamp; TIP OFF gated with singular/plural reason; one-click Spread recovery |
| 6 | Recognition Rather Than Recall | 3 | All state on-screen; mid-playback editor unmount imposes a small recall burden; rank selects show names |
| 7 | Flexibility and Efficiency | 3 | Keyboard-complete journey, 2-click payoff, skip controls; no keyboard accelerators (Space=pause etc.) |
| 8 | Aesthetic and Minimalist Design | 4 | Reserved channels (amber, strike white); zero decoration; every element states its number |
| 9 | Error Recovery | 3 | Blocked states explain themselves and recover in one click; thin error surface because prevention is so strong |
| 10 | Help and Documentation | 3 | Contextual glossary tooltips at decision points; no broader help (acceptable for one page) |
| **Total** | | **35/40** | **Good (top of band — one point shy of Excellent)** |

No heuristics scored n/a. Cognitive load checklist: 0 hard failures (borderline only: six preset chips at one decision point; roster controls numerous but grouped and phase-gated). Low load.

## Design Specificity Verdict

**LLM assessment (pass A, pre-detector):** Strongly product-specific — nothing category-interchangeable. The Doto LED register on every count, the amber-reserved majority line, the strike as the single kill device, and the ribbon-as sole-announcer are all authored for "the election as a live game"; no other product could ship this unchanged. The cast inks, the persona voices, and the changed-vs-same verdict treatments carry character. Missed-opportunity check found only one: the candidate personas (the cast's humanity) are truncated away on phones — the first-class layout loses the flavor that makes the fictional cast feel like people.

**Deterministic scan (pass B):**
- CLI on `src/App.tsx`: 0 findings. Broader scan (`index.html src/components src/playback src/copy`): 4 advisory `design-system-font-size` findings — `text-[15px]` at `src/components/board/Ribbon.tsx:25` and `src/components/verdict/VerdictCard.tsx:80`, `text-[13px]` at `src/components/board/ScoreLane.tsx:82` and `src/components/verdict/Term.tsx:78`. **Detector ran in degraded regex mode** (htmlparser2/css-select/css-tree/domutils unavailable in its node_modules context) — disclosed as an undercount, not a clean bill.
- Browser overlay (mutable injection preflight passed: title mutation + script append OK; `detect-antipatterns-browser.js` injected via puppeteer; overlays rendered): 112 findings (desktop setup) / 113 (mobile setup) / 98 (verdict) / 78 (mid-transfer). Adjudication of the label set: `ai color palette` ×212/page = false positive (the Okabe-Ito-derived, CVD-test-gated cast palette and blue-tinted ground ramp are exactly what this product demands); `glowing shadow accents` ×8 = false positive (the documented `led-lit` bloom and inset hairlines); `hairline border with wide shadow` ×2 = grounded (the two documented floating objects: strike bar, tooltip float); `same text repeated ("votes" ×4)` = false positive (four sr-only units, one per tally, an a11y requirement); `body text touching viewport edge` ×2 (mobile) = false positive (measured: only sr-only clip rects reach the edge; no visible text within 2px of x=0/390).

**Visual overlays:** rendered in the headless inspection page (not left running for a human); console carried `[impeccable] N anti-patterns found` per view. No user-visible overlay persists.

## Overall Impression

A genuinely finished, unusually disciplined build: the world grammar is enforced by tests, not vibes, and the reveal (strike → transfer with pinned counts → buzzer → verdict) lands every time. The single biggest opportunity is the last 5% of mobile parity (personas clipped away on 390px) plus two micro-warts in the signature moment (+0 leader at transfer start).

## What's Working

1. **Reserved-channel discipline makes the verdict emotionally legible.** Amber appears only at thresholds (measured again this run: line + buzzer mark on the winner + exactly the two changed-verdict elements; zero on confirmed outcomes). Changed vs same reads instantly — `A-desktop-verdict-changed.png` vs `A-desktop-verdict-same.png`.
2. **Dual-channel narration — animation and ribbon say the identical thing.** Reduced-motion verdict (`A-desktop-reduced-verdict.png`) is content-complete: struck lanes with OUT captions, full verdict card, final declaration in the ribbon. The accessibility channel doubles as the narrative device; verified 0 axe violations ×3 fresh runs (desktop setup/verdict, mobile setup).
3. **Engineering quality under the design.** 167/167 tests pass (re-run this critique); build clean; single accumulated playback clock (pause = true freeze, RAF cleanup on unmount); TransferLayer re-measures on resize AND `document.fonts.ready`; StrictMode on; focus seating on every self-disabling control. Craft is airtight where tests reach — and probes of what they don't cover (axe, scrollWidth=390, touch targets) came back clean too.

## Priority Issues

1. **[P2] Candidate personas are clipped to ellipsis on mobile 390px** — all four measured `scrollHeight > clientHeight` (DOM-verified in pass B; independently flagged by visual inspection in pass A). `ScoreLane.tsx:181` `line-clamp-2`; no `title`, no alternate surface carrying the full text.
   *Why it matters:* PRODUCT.md makes phone parity an acceptance criterion ("small screens get equal design effort"); the personas are the cast's humanity and the only character copy on the board — phones get none of it.
   *Fix:* in-world micro-fix — 3-line clamp at the 2×2 breakpoint, or drop persona to the mobile size with `leading-tight`, or ship the full text in an `sr-only`/`title`. Suggested command: `$impeccable polish`.
2. **[P3] The transfer's pinned leader reads "+0" for the first ~0.3–0.5s** of every transfer beat (`TransferLayer.tsx:222` `+{landed?.[index] ?? 0}` renders before the first chunk launches; DOM-confirmed via `?pin=transfer&round=1&at=80`).
   *Why it matters:* the signature contract is "motion that always states its number" — a visible "+0" states nothing.
   *Fix:* suppress the badge until `landed > 0` (or until the first chunk's launch time). Suggested command: `$impeccable polish`.
3. **[P3] Link-sharing surface is bare** — `index.html` has `lang`, viewport, and title, but no `meta description`, no `og:`/`twitter:` cards, no favicon (dist ships none).
   *Why it matters:* PRODUCT.md Operating Context: "Shared as a link" — the link preview is the product's front door and currently has none.
   *Fix:* one-line meta description + og:title/description (+ a 1-color square favicon in cast/buzzer ink). Suggested command: `$impeccable harden`.
4. **[P3] Type-ramp frontmatter omits the sizes the build uses** — DESIGN.md narrative documents 13px lane names and 15px ≥640px body, but the frontmatter `typography.body.fontSize` is `0.875rem` only; the detector's 4 advisory findings all point at this doc gap (the classes match the narrative).
   *Why it matters:* future detector runs and `$impeccable` commands read the machine-readable ramp; the record contradicts the world it describes.
   *Fix:* add the 13px/15px steps to DESIGN.md frontmatter + sidecar typography roles. Suggested command: `$impeccable document`.
5. **[P3] No keyboard accelerators for playback** (Space/K = pause, S = skip). Keyboard operability is complete (verified), but an educator mid-demo has no faster path than Tab.
   *Fix:* optional; v1 scope defensible (accelerators are unnamed in PRODUCT.md's playback contract). Recorded, not recommended.

## Persona Red Flags

**Jordan (Confused First-Timer):** "TIP OFF" is arena register — a sports-agnostic civics adult must infer "start the count" from position and the ribbon. Mitigated (sole primary, gated with reason, subtitle sets context); flagged as a question, not a defect. Everything else reads: first action obvious, jargon glossed inline, statuses stated.

**Sam (Accessibility-Dependent):** No red flags found. Axe 0 violations ×3 fresh runs; single polite live region; focus ring world-grammar (2px ink-bright offset 2px); focus continuity through every self-disable; steppers 32×32 and chips 30px tall — both clear WCAG 2.2 AA 24px (2.5.8), below the 44px best-practice bar (accepted, deliberate 2rem spec).

**Casey (Distracted Mobile):** Red flag = the persona clipping above. Otherwise: scrollWidth exactly 390 (re-measured), 2×2 lanes with identical element set, verdict card complete at width, controls wrap cleanly. No persistence is a stated non-goal.

**Riley (Stress Tester):** Edge findings only — tooltip panel opens above its term with no viewport-collision handling (a term scrolled to the very top could clip its panel; mid-page flow makes this rare); Custom boots as a 4×25 even split while PRODUCT.md says "blank slate" (deliberate per `recipes.ts` docblock, and the on-screen lesson line "A wide-open field: four even lanes, no second choices yet" explains it — residual is a PRODUCT.md wording tension, not a build defect).

## Adjudicated non-findings (A-flagged, B-resolved)

- **Mid-transfer count disagreement (lane LED 49 vs courtside row 44, +5 pinned):** designed choreography — lane tallies tick per chunk landing while the courtside field re-masses at settle; the pinned +N states the in-flight amount and the two displays converge at beat end (timeline-probed at 350ms samples). Not a defect.
- **Mobile h1 "clipping" (visual-inspection claim):** measured h1 right edge 234px < 390px; scrollWidth = 390. Vision artifact.
- **"395 elements still carrying transition durations under reduced motion":** the dual backstop (`@media (prefers-reduced-motion: reduce)` + `[data-motion='reduced']`) sets durations to `0.01ms`, which Chrome reports as `1e-05s` — string-compare artifact in the probe; motion is genuinely zeroed app-wide.

## Minor Observations

- Control-stack vertical rhythm reads tight (12px `space-y-3` between Controls/chips/roster) — compliant with DESIGN.md's "8–12px between siblings", a taste nit only.
- Native `<select>` chevron/font is the one non-world object — grounded accessibility tradeoff, kept.
- "51" threshold label is the smallest load-bearing text on the board; legible, but the one number a projector audience squints at.
- Barlow 500 weight ships (used for roster labels); Doto variable is 5.4KB — font budget healthy. JS 245KB (77KB gzip) is React-dominated; fine for a one-page tool.

## Questions to Consider

1. Is "TIP OFF" the right register for the civics-curious adult, or does the primary action want a bilingual moment ("TIP OFF — start the count") for the first run?
2. Should the cast's personas earn their full text on phones (3-line clamp), or is flavor text legitimately the first thing a small screen gives up?
3. Does a link-shared educational tool owe itself a favicon and og card — its de facto poster — before anything else in the finish queue?

## Auto-mode question answers (simulated-user proxy)

- **Priority direction — mobile parity first, then motion polish, then sharing metadata.** `simulated (auto mode)`; source: PRODUCT.md Accessibility & Inclusion ("Mobile-first parity: small screens get equal design effort") + design brief §5 ("Phone width is a first-class layout target, not a fallback") for the P2; PRODUCT.md Product Principle 1 ("The animation is the argument") for the +0 leader; PRODUCT.md Operating Context ("Shared as a link") for metadata.
- **Scope — fix the P2 and the two cheap P3s (leader, meta); skip keyboard accelerators and any world-grammar changes.** `simulated (auto mode)`; source: PRODUCT.md Capabilities (playback contract names pause/resume/skip/replay only — accelerators unnamed → out of v1 scope) + design brief §3 (direction locked by user, seed 71356508; the Arena Board rules are not on the table).
- **Off-limits — the reserved channels and world grammar (amber reservation, LED registers, square court, one ink per candidate).** `simulated (auto mode)`; source: DESIGN.md Named Rules (Buzzer Reservation, One Ink Per Candidate, Square Court, Flat Floor) as refreshed against the built world 2026-08-28.

## Action Summary (from the simulated answers)

1. `$impeccable polish` — P2 persona clipping on mobile 390 (ScoreLane.tsx:181) + P3 "+0" transfer leader (TransferLayer.tsx:222); both in-world micro-fixes.
2. `$impeccable harden` — link-sharing surface: meta description, og:title/description, favicon (index.html).
3. `$impeccable document` — add the 13px/15px type steps to DESIGN.md frontmatter + `.impeccable/design.json` typography roles so the ramp matches the built world (clears all 4 detector advisories).

No other commands carry material findings.

---

## Orchestration record (appended for this dated snapshot)

- Assessed by: single critique orchestrator subagent (ultron-impeccable auto mode, finishing phase).
- Isolation method: ⚠️ degraded — no sub-agent tool exposed; two sequential in-thread passes (A: design/UX vs design-brief + DESIGN.md + PRODUCT.md using 13 fresh puppeteer captures at 1280×800 and 390×844 across setup / strike / mid-transfer / verdict changed / verdict same / verdict tie / reduced-motion / custom; B: impeccable detector CLI + in-page browser detector with mutable-injection preflight, npm test, npm build, fresh axe runs, DOM probes). Pass A closed before any detector output entered context.
- Evidence: `.impeccable/critique/2026-08-28/A-*.png` (13 captures, fresh this run); probe measurements inlined above; prior captures `.impeccable/review/`.
- Tests at critique time: 167/167 pass; build exit 0 (dist CSS 34.46KB/11.12 gzip, JS 245.08KB/77.10 gzip).
- Local server: `vite preview` on :4180 started for captures, stopped before reporting.
- Scratch capture/probe scripts deleted after evidence extraction (PNGs kept).
