# R1 — RCV Rules Verification (domain & content accuracy)

- Track: RCV rules verification / domain accuracy
- Affected production tasks: **T2 (counting engine)**, **T8 (narrative copy / terminology)**
- Researcher: deep-research track agent, "How Votes Flow"
- All pages accessed **2026-08-28** unless noted.

---

## Question + affected task IDs

1. **Majority denominator** — In real single-winner RCV jurisdictions, is the majority threshold computed over continuing/active ballots or all ballots cast? When two candidates remain with no majority (exhausted ballots), does the leader win? → **T2, T8**
2. **Elimination tie-breaks** — How are ties for last place broken (prior-round totals, first-round totals, lot, alphabetical)? Documented cases? → **T2, T8**
3. **Plain-language terminology** — What terms do official explainers use for exhausted/inactive ballots and for RCV itself? Wording recommendations for a general-public US audience. → **T8**

## Constraints and evaluation criteria

App context: single-winner RCV (instant-runoff) simulator, 100 votes, 4 fictional candidates, ballots rank 1st/2nd/3rd only. Adopted defaults to verify (not re-derive):

- (a) Majority threshold computed over **votes still counting (active/continuing ballots)**, not the original 100.
- (b) If only two candidates remain with no majority (rankings only 3 deep → ballots exhaust), the **leader wins**.
- (c) **Deterministic elimination tie-break**, disclosed on screen when it fires.

Criteria: claims backed by primary sources (statutes, secretary-of-state / election-authority pages, FairVote / NCSL / RCV Resource Center); exact claim text recorded; each default confirmed or corrected; T8 wording grounded in official explainer usage.

---

## Findings per question, with evidence

### Q1. Majority denominator and the "two remain, leader wins" rule

**Maine (statewide RCV statute) — confirms defaults (a) and (b).**
Source: 21-A MRS §723-A, "Determination of winner in election for an office elected by ranked-choice voting," Maine Legislature, https://legislature.maine.gov/statutes/21-a/title21-Asec723-A.html (accessed 2026-08-28).
- Defines **"continuing ballot"** ("a ballot that is not an exhausted ballot") and **"exhausted ballot"** (no continuing candidate ranked, overvote at highest continuing ranking, or 2+ sequential skipped rankings).
- Round-1 shortcut: a candidate assigned ranking number one on "more than 50% of **all ballots cast for the particular office**" is declared the winner — i.e., a *stricter* first-round test; if it fails, rounds proceed.
- Round rule: "**Each continuing ballot counts as one vote for its highest-ranked continuing candidate for that round.**" and "**Exhausted ballots are not counted for any continuing candidate.**" → majority is measured against continuing ballots, not the original total.
- Terminal rule: "If there are **2 or fewer continuing candidates, the candidate with the most votes is declared the winner** of the election"; with more than two, "the last-place candidate is removed from consideration and a new round begins."
- Caveat: extraction tool limited to ≤125-char quotes; the two independent extractions agreed on all quoted language. One gloss ("denominator includes first choices for excluded candidates") was ambiguous; §723-A(2-A) sends ballots whose top choice was excluded (death/withdrawal/disqualification) to the next continuing choice, so it is not load-bearing for the app.

**Alaska (statewide RCV) — confirms defaults (a) and (b); no explicit "majority" framing at all.**
Sources: Alaska Division of Elections, "Ranked Choice Voting," https://www.elections.alaska.gov/RCV.php/ (accessed 2026-08-28); Alaska Stat. § 15.15.350, "General procedure for ballot count," via Justia, https://law.justia.com/codes/alaska/title-15/chapter-15/section-15-15-350/ (accessed 2026-08-28; Justia mirror — official text at akleg.gov, which 404'd for us).
- AS 15.15.350: "(c) All general elections shall be conducted by ranked-choice voting… (e) In the event of a tie between two candidates with the fewest votes, the tie shall be resolved by lot to determine which candidate is defeated."
- Alaska DoE explainer: "If a candidate gets 50% + 1 vote in round one, that candidate wins and the counting stops." and "**This keeps happening in rounds until two candidates are left and the one with the most votes wins.**" Alaska never restates a majority requirement after round 1 — the stop condition is simply "two left, leader wins."

**New York City (largest US RCV jurisdiction) — confirms both defaults verbatim in the same terms the app should use.**
Source: NYC Charter § 1057-g, "Ranked choice voting for certain primary elections…," American Legal Publishing code library, https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCcharter/0-0-0-3079 (accessed 2026-08-28).
- Definitions mirror Maine: "Continuing ballot" (not exhausted), "Exhausted ballot" ("all ranked candidates have been eliminated," or duplicate/nonconsecutive rankings invalidate remaining ranks).
- "each continuing ballot shall count as one vote for its highest ranked continuing candidate for that round; and **exhausted ballots shall not be counted for any continuing candidate**."
- "(a) If there are **two continuing candidates, the candidate with the most votes shall be declared the nominee… or elected winner**."
- Also authorizes "batch elimination" (eliminating multiple candidates who mathematically cannot win) — a real-world variation the simulator does NOT need (Alaska and Maine do not use it).

**Ireland (presidential elections, PR-STV single-winner for president) — continuing-ballot majority + leader-wins rule, plus fixed quota.**
Source: Presidential Elections Act 1937 (No. 32 of 1937), Third Schedule "Rules for counting votes," electronic Irish Statute Book, https://www.irishstatutebook.ie/eli/1937/act/32/enacted/en/print.html (accessed 2026-08-28).
- Rule 3 (quota): "(b) the quota shall be the nearest whole number exceeding the number obtained by dividing the total number of valid ballot papers at the first count by two… the quota shall be the number obtained by adding one to the number so ascertained" (i.e., floor(N/2)+1 over valid ballots).
- Rule 5(2): non-transferable papers are "set aside as finally dealt with" — exhausted ballots leave the count.
- Rule 7: "if, at any count, the aggregate of votes credited to a continuing candidate is greater than the aggregate of votes credited to all other continuing candidates together, that candidate shall be deemed elected" → **majority of continuing votes; with two remaining, the leader necessarily qualifies.**

**Australia (House of Representatives, full-preferential IRV) — majority of formal/continuing votes; exhaustion rare by design.**
Sources: AEC, "Preferential voting," https://www.aec.gov.au/learn/preferential-voting.htm (accessed 2026-08-28); APH House of Representatives Practice, ch. 3, https://www.aph.gov.au/About_Parliament/House_of_Representatives/Powers_practice_and_procedure/practice5/chapter3 (accessed 2026-08-28); CEA 1918 s 279 via AustLII https://www8.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/cea1918233/s279.html (403 to us; linked for reference).
- AEC: counting proceeds "to determine who has acquired an **absolute majority of the total votes (more than 50% of formal votes)**."
- APH Practice: "The preferential voting system used is an absolute majority system where for election a candidate must obtain more than 50 per cent of the votes **in the count**."
- Because Australia requires ranking *every* candidate, exhaustion is rare — relevant contrast: the app's 3-of-4 limit creates exhaustion exactly like US jurisdictions with limited ranking slots (Alaska ranks 4, NYC 5, Maine 3 for state races per ballot design).

**Documented exhausted-ballot case (use in T8 narrative):** 2022 Alaska US House special election (Peltola/Palin/Begich). Final round: Peltola 91,266 (51.5% of active final-round ballots) vs Palin 86,026; ~11,290 ballots exhausted; ~188,582 total ballots cast → the winner had **~48.4% of all ballots cast** while winning a majority of ballots still counting. Sources: Wikipedia, "2022 Alaska's at-large congressional district special election," https://en.wikipedia.org/wiki/2022_Alaska%27s_at-large_congressional_district_special_election; arXiv 2303.00108 analysis (figures cross-check). Exact certified figures should be re-verified against Alaska DoE published results before quoting numbers in-product; the *structural* fact (majority of continuing, sub-majority of total) is solid.

**Correction to the brief:** "London mayor" is **not** an IRV comparator. Greater London mayoral elections used the **Supplementary Vote** (first + second choice, top-two runoff), not IRV, from 2000–2021; the Elections Act 2022 moved them to **first-past-the-post** for 2024 (Greater London Authority Elections (Amendment) Order 2022, https://www.legislation.gov.uk/uksi/2022/1111/pdfs/uksiem_20221111_en.pdf), with later reporting of a move back toward SV. Recommend dropping London from source material entirely.

### Q2. Elimination tie-break conventions

- **Maine — by lot, recorded and reused on recount.** 21-A §723-A(3): a tie between last-place candidates in any round "must be decided by lot"; the result is "recorded and reused in the event of a recount." A final-round top-two tie is cross-referenced to §732. (Same statute link/date as above.)
- **Alaska — by lot.** AS 15.15.350(e): "In the event of a tie between two candidates with the fewest votes, the tie shall be resolved by lot to determine which candidate is defeated." Alaska DoE glosses "by lot": the elections director "will flip a coin or draw straws," and the same applies to a tie between the final two.
- **New York City — defers to election law.** NYC Charter §1057-g(e)(3): "A tie between two or more candidates shall be resolved in accordance with the election law" (NY's general tie rule → by lot).
- **Ireland — prior-round totals first, then lot.** Presidential Elections Act 1937, Third Schedule, rule 5(4): if two or more candidates are tied for exclusion, exclude the one with **fewest first-preference (original) votes**; if equal there, exclude the one with fewest votes "at the first count at which they had an unequal number of votes"; if equal at every count, determine **by lot** ("slips of paper drawn at random… excluded in the order in which their names are drawn").
- **Sector summary.** RCV Resource Center glossary, https://www.rcvresources.org/rcv-glossary (accessed 2026-08-28), catalogs three conventions: "Tiebreaking by lot" ("a randomized process… drawings from a hat, drawing cards from a deck, or drawing straws" — "Standard tiebreaking process in US elections"), "Tiebreaking by previous round totals (forward looking)" (start at round one, move forward), and "(backward looking)" (start at the immediately previous round, work backward; fall through to lot).
- **Documented case.** Portland, Maine at-large City Council race, Nov 2, 2021 (RCV per 2011 charter amendment): the instant-runoff ended with the final two candidates **tied at 8,529 votes each**; under the charter "the City Clerk shall determine the winner in public by lot," and on Nov 4, 2021 the Clerk drew a name from a bowl on City Hall Plaza before a crowd (Brandon Mazer drawn; recount requested). Source: ABC News/AP coverage, https://abcnews.com/Politics/tied-city-council-race-portland-maine-decided-drawing/story?id=80976792 (accessed 2026-08-28).
- **Takeaway:** No major US RCV jurisdiction uses alphabetical order. The real-world norm is **random (by lot)**, sometimes preceded by a **prior-round comparison** (Ireland; several US localities per RCV Resource Center). A simulator *cannot* use real randomness and stay reproducible, so deterministic + disclosure is the right adaptation — but the disclosure should say what real jurisdictions actually do.

### Q3. Plain-language terminology (official explainer usage)

- **FairVote glossary**, https://fairvote.org/resources/glossary/ (accessed 2026-08-28): prefers "**Ranked Choice Voting**"; states "Single-winner RCV is also known as **instant runoff voting**, the alternative vote, and preferential majority voting." Ballot terms: "**Active Ballot**" ("A ballot which counts toward an active candidate in the current round of an RCV tabulation") and "**Inactive Ballot**" ("A ballot which does not count toward an Active Candidate… also known as an exhausted ballot"). "Continuing candidate" is a synonym of Active Candidate; FairVote has no "continuing ballot" entry.
- **RCV Resource Center glossary** (election-official-run), https://www.rcvresources.org/rcv-glossary (accessed 2026-08-28): "**Inactive ballot**" = "a ballot cast in a ranked choice voting election that does not count as a vote for any candidate," synonyms "**exhausted ballot**, non transferable total"; "**Active ballot**" synonym "continuing ballot"; "Active candidate" synonym "continuing candidate"; "Instant runoff voting (IRV)" = the single-winner form; "Majority" = "more than half."
- **Maine Secretary of State FAQ**, https://www.maine.gov/sos/elections-voting/ranked-choice-voting-frequently-asked-questions (accessed 2026-08-28): calls it "ranked-choice voting, sometimes called '**instant run-off voting**'"; tabulation "in rounds, with the lowest-ranked candidates eliminated in each round **until there are only two candidates left**"; winner receives "the majority of the votes (more than 50%) **in the final round**." SoS resources hub: https://www.maine.gov/sos/elections-voting/resources-for-ranked-choice-voting.
- **Alaska Division of Elections**, https://www.elections.alaska.gov/RCV.php/ (accessed 2026-08-28): uses "Ranked Choice Voting," "tabulation rounds," candidates "eliminated," votes transfer "to your next choice"; does **not** use "exhausted," "inactive," "instant runoff," or "continuing ballots" on its public explainer; explains "by lot" as "flip a coin or draw straws."
- **NCSL**, "Ranked Choice Voting in Practice," https://www.ncsl.org/elections-and-campaigns/ranked-choice-voting-in-practice-implementation-considerations-for-policymakers (accessed 2026-08-28; glossary snippet from search): glossary term "**Exhausted vote**" — "When a ranked choice ballot becomes inactive and cannot be advanced in tabulation because no further rankings remain." NCSL main RCV page confirms only Maine and Alaska use RCV statewide: https://www.ncsl.org/elections-and-campaigns/ranked-choice-voting.

---

## Recommendation per question

**Q1 — CONFIRM defaults (a) and (b); add one disclosure.**
- (a) Confirmed: threshold = floor(active ballots in current round / 2) + 1. Maine ("continuing ballot… counts as one vote… exhausted ballots are not counted"), NYC Charter §1057-g, Ireland (rule 7), Australia ("more than 50% of formal votes / votes in the count") all measure majority against ballots still counting. **No jurisdiction uses the original ballot total as an ongoing denominator.** (Maine's round-1 shortcut — >50% of *all* ballots cast ends it immediately — is a stricter early-exit test, not a different working denominator; the app need not implement it since a candidate clearing that bar also clears the continuing-ballot bar in round 1.)
- (b) Confirmed: when only two candidates remain, the leader wins even without a majority of the original 100 — Maine ("2 or fewer continuing candidates, the candidate with the most votes is declared the winner"), Alaska DoE ("until two candidates are left and the one with the most votes wins"), NYC §1057-g, Ireland rule 7. Real-world proof: Alaska 2022 (winner = 51.5% of continuing, ~48% of total cast).
- T8 disclosure to add: when the final winner is below 50% of the *original* 100, show both numbers, e.g. "Ana wins 52% of the ballots still counting — but only 46% of all 100 ballots. The other ballots ran out of rankings. This happened in Alaska's 2022 election, where Mary Peltola won with 51.5% of ballots still counting but about 48% of all ballots cast."

**Q2 — CONFIRM default (c) as a simulator adaptation, with honest wording; fix the tie-break method choice.**
- Keep deterministic and disclosed, but (i) prefer **prior-round comparison before a final deterministic fallback** (mirrors Ireland's rule 5(4) and RCV Resource Center's "previous round totals" conventions — also pedagogically meaningful), and (ii) word the disclosure to say real jurisdictions use **lot** (coin flip / name draw): e.g. "Ben and Cara tied for last place. In a real election, officials would break this tie by lot — a coin flip or drawing names (that's what Maine and Alaska law require, and what Portland, Maine did in 2021). To keep this simulation reproducible, we break ties by [higher first-round total / (fallback) alphabetical order] and show you whenever that happens."
- Alphabetical-only is defensible but matches no real jurisdiction; if kept as the *final* fallback (not the primary rule), it's fine. Also handle the final-two-tie case (Portland ME 2021) with the same disclosure.

**Q3 — T8 terminology recommendations.**
- Primary term: "**ranked-choice voting (RCV)**"; mention the synonym once: "also called instant-runoff voting." (FairVote, Maine SoS, Alaska DoE, NCSL all lead with ranked-choice voting; Maine explicitly glosses "instant run-off.")
- Ballots: "**ballots still counting**" (plain) = active/continuing ballots; "**exhausted ballots**" with a first-use gloss "(a ballot that has run out of rankings — everyone it named has been eliminated, so it no longer counts)" — "exhausted" is the term of art in Maine's statute, NYC's charter, and NCSL's glossary; FairVote/RCVRC treat "inactive" as the headword with "exhausted" as synonym, so "exhausted (inactive)" covers both.
- Rounds/candidates: "round," "eliminated," "transfers to your next choice" (Alaska DoE's plain phrasing); "continuing/active candidates" if needed.
- Majority: "more than half of the ballots still counting in this round" — never "more than half of the 100" after round 1.
- Do not use: "instant runoff" as the primary name; "wasted votes" for exhausted ballots; "London mayor" as an RCV example (it was Supplementary Vote, now FPTP — see correction above).

## Tradeoffs / risks / confidence

- **Confidence: HIGH** on Q1 and Q2 rules — statutory text fetched directly (Maine §723-A; NYC Charter §1057-g; Irish 1937 Act Third Schedule; Alaska §15.15.350 via Justia mirror + official DoE explainer). Two independent extractions of the Maine statute agreed.
- **Risk (low):** Maine verbatim quotes were obtained through an extraction layer with a 125-char quote cap; phrasing is solid, but if T8 ever quotes the statute word-for-word, re-pull from the legislature's PDF. Likewise Alaska's official text should be re-verified at akleg.gov (our attempts 404'd; Justia is a reputable mirror and matched the DoE explainer and search snippets).
- **Risk (low):** Alaska 2022 vote totals came from secondary sources (Wikipedia / arXiv cross-check). If T8 prints those numbers, verify against Alaska DoE certified results; otherwise phrase structurally ("about 48% of all ballots cast").
- **Risk (medium, accepted):** deterministic tie-break deliberately departs from real-world "by lot" — mitigated entirely by on-screen disclosure, which is already the adopted default (c).
- **Risk (low):** NYC batch elimination and Ireland's fixed quota are real variations the app omits; that's a fair simplification for 4 candidates / 100 votes, but T8 should avoid wording that implies the app's procedure is the *only* legal one ("jurisdictions vary slightly" covers it).

## Implementation consequences

**T2 (counting engine):**
1. Threshold per round: `Math.floor(activeCount / 2) + 1`, recomputed each round over active ballots; never over 100 (post-round-1).
2. Win condition: `votes >= threshold` → winner. Stop condition: `continuingCandidates <= 2` → leader wins even if below threshold; mark the round "final — two candidates remain."
3. Track exhausted ballots as an explicit per-round stack/category so the flow visualization can show votes that stop transferring (they never re-enter).
4. Tie-break order: (1) higher first-round total survives (compare earlier rounds if implemented multi-round); (2) deterministic fallback (alphabetical) if still tied; flag `tieBreakFired` + method for UI disclosure. Apply the same machinery to a final-two tie.
5. Expose per-round `votes / active` and, for the final round, also `winnerVotes / 100` so T8 can render the Alaska-style dual percentage.

**T8 (narrative copy):** adopt the terminology table above; add three disclosures — exhausted-ballot definition at first occurrence, two-remain-no-majority explainer (with optional Alaska 2022 example), and tie-break disclosure naming lot as the real-world method.

## Decision status

- Default (a) — **CONFIRMED** (majority over active/continuing ballots).
- Default (b) — **CONFIRMED** (two remain → leader wins; disclose sub-50%-of-total case).
- Default (c) — **CONFIRMED with wording fix** (deterministic tie-break kept; disclosure must say real jurisdictions break ties by lot; prefer prior-round-total rule before alphabetical fallback).
- Brief correction — **DROP London mayor** as an IRV comparator (Supplementary Vote → FPTP).
- Status: ready for T2/T8 implementation; no open blockers.
