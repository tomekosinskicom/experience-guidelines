---
title: "Sportsbook Search — User Intent and Usability Research"
subdomain: discovery
experience-area: search
document-type: research
owner: Chunyan Ren
last-updated: 2026-02-01
status: published
tags:
  - search
  - usability
  - research
  - discovery
  - autosuggestions
  - mobile
summary: "Qualitative usability study evaluating user intent, expectations, and breakdowns in the sportsbook search journey. 8 participants tested the Bwin app. Key finding: search is a high-intent fallback where trust breaks quickly due to poor autosuggestion relevance, cross-sport leakage, and weak visual hierarchy. SUS score: 82.2/100. Prioritised roadmap: NOW (restore trust), NEXT (reduce friction), LATER (global/AI search)."
---

## Overview

Search is a high-intent entry point in betting products. Users who actively search for a team, player, or competition are often closer to placing a bet than those browsing. However, the current search interaction model and results page may be introducing friction, reducing confidence and slowing decision-making.

The UX team plans to redesign the Search Results Page, but before ideation begins, we need clear, evidence-based understanding of user needs, expectations, and breakdowns across the search journey.

**Business Goal:** Increase bet conversion rate from Search, especially on mobile.

**UX Goals:**
- Reduce friction and uncertainty during search
- Improve clarity, confidence, and speed of decision-making
- Ensure the search results page supports users' betting intent

## Research Approach

### Objectives

- Understand user search intent and expectations in betting apps or websites
- Identify friction and breakdowns in the current search flow
- Evaluate how the search results page supports (or hinders) betting decisions
- Determine what information and layout drive confidence and conversion
- Explore high-level reactions to future search concepts (low priority)

### Methodology

- 8 users total (none active Bwin customer, all sometimes engaged with the search feature on Sports betting platforms. 8 males aged from 26-53).
- Moderated, qualitative usability testing via Userlytics
- Users interacted with the Bwin app or site on their phone

### Evaluation Criteria

- Task success: number of successful tasks completed
- Friction / pain points: observations where confusion, hesitation were present
- Qualitative reasoning: user comments, mental models, expert observation

## Key Findings

### 1. Search Is a High-Intent Fallback

Users turn to search when they can't reliably find what they want through browsing. Common triggers include: event not visible on the homepage, market is buried or unclear, unsure where something "lives" in the product.

This happens most often when:
- **Betting ahead of time:** Homepage is perceived as today-focused → search used for future fixtures
- **Only partial info is known:** User knows a team/player/horse but not the competition or market
- **Looking for secondary sports:** Non-football sports (darts, F1, American football, niche leagues) are less prominent on homepage

**Impact:** Search compensates for weak, biased, or time-bound discoverability elsewhere in the product.

### 2. Search to Validate Market Availability

Users use search to answer a critical question: "Can I actually bet on this here?" Common examples include specials and outrights, novelty/quirky bets.

Key behaviours:
- Users do not persist through navigation for uncertain markets
- If search doesn't confirm availability quickly, they assume it doesn't exist and abandon

**Impact:** Search plays a critical role in validating availability. This is especially important for niche & specials bet conversion.

### 3. User Mental Models

Users expect search to adapt to them, reduce effort, and surface the most relevant result first.

**"Type loosely, it understands me"**
- Users expect the system to adapt to their natural language, rather than requiring precise or formal input
- They expect support for abbreviations (e.g. "Man City", "Man United"), partial input, and flexible, human-like interpretation of intent
- When search fails to understand common shorthand, users lose confidence quickly and assume the market or event is not available

**"Smart suggestion helps me type less and the list should reduce as I type"**
- Users are comfortable with suggestion-first search patterns if it improves speed and accuracy
- When autosuggest works: reduces typing effort, is consistent, helps filter noise early
- When autosuggest fails: suggestions feel irrelevant, inconsistent, or poorly ranked; trust drops immediately

**"If it's important or happening soon, it should be at the top"**
- Users expect the most useful result to appear first, without needing to scan
- "Relevance" means: the most likely match for the query, the most imminent or upcoming event, the most popular Specials/Outrights
- Poor ranking forces users to scan and second-guess results, slowing decision-making and increasing drop-off

### 4. Search Results Page Is Primarily a Routing Step

The Search Results Page is primarily seen as a routing step, not the place where most betting decisions are made. Most users prefer placing bets on the Match Page. Multiple participants explicitly stated they prefer navigating to the match page to place bets, particularly for:
- Complex bets
- Build-a-bet
- Situations where they want reassurance before committing

**Why users move to the match page:**
- Want full market coverage
- Want more context (stats, form, options)
- Prefer a more immersive, and exciting experience (several users described the SRP as efficient but emotionally flat)

> *"I'd rather go into the match and look properly before placing a bet."*
> *"It feels a bit dry… It's not very exciting compared to the match page."*

### 5. Showing Odds on SRP Is Still Valued

Several users found it helpful to see odds directly on the search results page, even if their preference for placing complex bets was to navigate to the match page. Having an overview of odds helps them understand the potential for a good bet.

Some users (2 out of 8) are open to placing bets directly from the SRP, but only in specific, low-friction scenarios:
- Simple bets (e.g. match winner)
- Clear intent ("I already know what I want")
- Building quick accumulators across multiple matches

> *"If I'm just betting on the result, I could do it from here."*
> *"For accumulators, it's quicker to pick them straight from the list."*

### 6. Task Completion & SUS Score

**Task success rates:**

| Task | Success | Minor Friction | Major Friction |
|------|---------|----------------|----------------|
| Locate the search | 10/10 (100%) | Yes | No |
| Input search and get to results | 10/10 (100%) | Yes | Yes |
| Find what they are looking for | 9/10 (90%) | Yes | No |

**Search tasks conducted:**
- 5 searched for a specific team's matches
- 3 searched for a specific league's upcoming matches
- 1 searched for a special market
- 1 searched for a darts player's match (task failed)

**Overall SUS Score: 82.2/100**
- Above industry benchmark (68)
- Falls in the "Excellent" usability range
- 75% of participants rated 80 or higher
- Indicates strong perceived ease of use and confidence

The system demonstrates strong overall usability and positive user perception. However, the evaluation surfaced meaningful usability friction points that should be addressed to improve consistency, reduce cognitive load, and strengthen performance in more complex search scenarios.

## Usability Issues

### Critical Issues

**Poor autosuggestion relevance, consistency, and ranking:**
- Common abbreviations were missing (e.g. "Man City", "Man United")
- Popular sports, teams or competitions were not prioritised — less relevant or unfamiliar entities appeared before obvious ones
- Suggestions changed unexpectedly and inconsistently as the user typed — some categories or suggested terms disappeared and reappeared

What users wanted instead: prioritise most popular and most likely intent locally; respect common shorthand; suggestions become narrower and more accurate as they type.

**Implications:** Suggestions act as an early trust signal. When they feel wrong, users quickly lose confidence in the entire search experience.

**Results page prioritised irrelevant content:**
- Some users found the results didn't match the team or the sports they selected in the search suggestions
- Example: user selected "Liverpool – Virtual" and results returned matches from "Liverpool – Football"
- Example: user selected "Liverpool" (while "Liverpool – women" was in the suggestion list) and results returned "Liverpool – women" match on top

**Impact:** Trust in search accuracy is undermined early; increased risk of betting on the wrong event.

### High Issues

**Search suggestions fail to set expectations about result availability:**
- A user searched for a player name and saw that player appear in the suggestion list. However, after selecting the suggestion, the system returned no results
- The interface did not help the user anticipate this outcome before taking action
- Users interpret suggestions as a signal that relevant content exists — encountering a dead end discourages further exploration

**Recommendation:** Signal availability directly within the suggestion. Example: "Player name – no results".

### Medium Issues

**Sports tabs in suggestions feel redundant when the list is short:**
- Tabs take up valuable vertical space and reduce visibility of relevant results
- Perceived redundancy when there are only a small number of suggestions

**Recommendation:** Simplify the suggestion layout for short lists. Consider displaying sports category inline with each search suggestion.

**Results page failed to filter out irrelevant teams/sports after selecting a suggestion:**
- After selecting "Liverpool" under "Football" tab, other sports tabs still showing; "Liverpool Montevideo" still showing
- Made the suggestion step feel redundant rather than helpful

**Recommendation:** Once a suggestion is selected, results should be strictly scoped to that entity. Unrelated entities should be excluded.

**Ordering of results — Chronological vs. Competition Grouping:**
- Some users preferred chronological order by date/time over competition-based grouping
- When the match happens mattered more than which competition it belongs to at the point of search
- Competition grouping can unintentionally hide imminent matches

**Recommendation:** Chronological ordering aligns better with search intent focused on what's coming up next. Preserve the flexibility to view results by leagues.

**Market terminology lacked explanation for less familiar users:**
- At least one user explicitly wanted tooltips or short descriptions for market names

**Recommendation:** Add a glossary tooltip on the market switch bar. Use plain-English microcopy, e.g.: "Both Teams to Score (Yes) – both teams score at least one goal."

**Missing contextual information (team form):**
- One user suggested that lightweight context, such as recent performance (last 5 results), would help decision-making

**Recommendation:** Add simple form indicators (e.g. W-D-L icons for last 5 games). Keep it lightweight and optional. Validate with further testing.

### Low Issues

**Small text size affects readability:**
- Critical information, particularly kick-off time and date, perceived as too small
- Users had to slow down or zoom to confirm details

**Recommendation:** Increase text size for time and date; treat them as decision-critical information, not metadata.

**Lack of visual contrast weakens information hierarchy:**
- Page described as "flat" — difficulty distinguishing key information, primary actions, and secondary labels
- Muted colours and low contrast made everything appear equally important

**Recommendation:** Strengthen visual hierarchy; use colour and weight intentionally to differentiate primary vs secondary text, and labels vs actions.

**Cluttered and "finicky" interaction elements:**
- Too many interactive elements packed into tight space on mobile
- Multiple tap targets competing for attention; users slowed down to avoid mis-taps

**Recommendation:** Remove unnecessary/low-value actions (e.g. "Go to [Team] page"); increase spacing between interactive elements; reconsider the use of "arrow" in buttons and links.

**"Build a Bet" perceived as a button rather than a label:**
- Some users tried to tap it directly; others questioned why it was there at all

**Recommendation:** Present "Build a Bet" as a non-interactive status label. Visually de-emphasise it or use clear copy: "Bet Builder available". Validate if signposting is necessary.

**"Up X" label was unclear:**
- Users guessed it might mean "trending" or "popular"

**Recommendation:** Improve the icon and make the meaning explicit.

**"Go to [Team] Page" link created uncertainty:**
- Users were unclear what content this link would lead to
- Found the destination did not match expectations

**Recommendation:** Consider removing the link if no value added.

**Search bar minor frictions:**
- Some users expected search at top of screen (it's in bottom nav) — brief scanning hesitation
- Label "Find" caused hesitation before users realised it was search
- Mobile ergonomics: users had to adjust grip or use second hand to reach search bar at top

**Recommendation:** Improve visibility, labelling, and spatial prominence of the search bar on mobile.

**Mandatory suggestion selection — mixed reactions:**
- Most users (5 out of 8) were comfortable and felt it helped structure search
- Others found it unnecessary, especially when suggestions were few or irrelevant

## Reactions to Future Concepts

### Global Search

Most participants were not opposed to seeing both Sports and Casino in search, as long as results are clearly categorized and separated. Users want tabs, toggles, or clear sections to control what they see.

Mixed results are not a deal-breaker for everyone — most users were neutral to mildly positive about Global Search.

> *"It wouldn't be a problem but maybe have it under different tabs like there was with the soccer and E-football."*
> *"I don't like it, but it wouldn't stop me probably from using it."*

**Implications:**
- Global Search is acceptable, but only if it respects user intent
- Users want clear separation, relevance control, and no forced crossover between Sports and Casino
- If implemented, should default to intent-first separation (tabs/toggles), not blended results

### AI Search

Many participants reacted positively to AI-powered search, particularly where it could:
- Learn from past behaviour
- Surface relevant bets proactively
- Save time and reduce manual research

There was clear desire for natural-language, conversational interaction. However, some had significant concerns about trust, bias, and bookmaker intent. A minority expressed no interest, preferring full manual control.

> *"I don't get why you don't have like suggested bets or… it learns what you've done bet on before."*
> *"It would use stats and provide feedback… to save you obviously time."*
> *"I'm a bit skeptical whether… you're suggesting something good for me or something else."*

**Implications:** AI search should start as a trust-building discovery tool, not a betting authority. Success depends on respecting user intent, offering control, and delivering clear efficiency gains without perceived bias.

## Strategic Recommendations

### 1. Fix the Fundamentals Before Adding New Layers (Non-negotiables)
- Support common abbreviations and shorthand
- Improve autosuggestion relevance, consistency, and ranking
- Ensure suggestion selection acts as a hard filter on results
- Prevent suggestion → empty result mismatches

### 2. Re-align the SRP With User Intent (Design for speed, confidence, and correctness)
- Prioritise relevance and imminence (chronological ordering as default or option)
- Eliminate cross-sport / cross-team leakage after selection
- Make time, date, and odds visually prominent
- Reduce clutter and ambiguous actions

### 3. Treat SRP as an Accelerator, Not a Destination
- Optimise SRP for quick validation of availability and simple bets/accumulators
- Preserve Match Page as the primary environment for complex betting

### 4. Clarify Meaning at Decision Points (Reduce cognitive load)
- Remove or re-label misleading UI elements ("Build a Bet" → clear availability label; "Up X" → explicit meaning)
- Remove low-value links that break mental models
- Add lightweight explanations for markets and terminology

### 5. Build Trust Before Advancing to Global or AI Search (Phase the vision)
- Start with intent-first, scoped search
- Introduce Global Search with clear tabs or toggles
- Position AI search as a discovery and efficiency tool — transparent, explainable, and optional
- Avoid blending or pushing recommendations without supporting evidence

## Prioritised Roadmap

### NOW — Restore Trust (Critical-High Priority)
- Improve autosuggestion relevance, ranking, and consistency
- Support common abbreviations and shorthand
- Make suggestion selection a hard filter on results
- Prevent suggestion → empty result experiences

### NEXT — Reduce Friction
- Re-prioritise results by imminence (chronological first or toggle)
- Remove cross-sport / cross-team leakage
- Simplify SRP layout; reduce competing tap targets
- Improve visibility of time, date, and odds
- Clarify or de-emphasise "Build a Bet" label
- Make "Up X" meaning explicit
- Add market tooltips / plain English

### LATER — Accelerate Value (Future)
- Add optional lightweight context (e.g. team form W-D-L)
- Introduce Global Search with clear Sports / Casino separation
- Explore AI Search as transparent, opt-in, assistive functionality

## Research References

- Study conducted: February 2026
- Researcher: Chunyan Ren
- Method: Moderated qualitative usability testing via Userlytics
- Platform tested: Bwin app (mobile)
- Participants: 8 males, aged 26-53, all use search on sports betting platforms

## Related Areas

- [Sports Navigation](../sports-navigation/) — related-to
- [Market Layouts](../market-layouts/) — related-to
