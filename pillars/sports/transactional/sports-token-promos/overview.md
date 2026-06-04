---
title: "Sports Promos — Rewards Improvements"
subdomain: transactional
experience-area: sports-token-promos
document-type: overview
owner: Sports UX
last-updated: 2025-10-16
status: shipped
maturity: documented
tags:
  - rewards
  - promos
  - free-bet
  - odds-boost
  - tokens
  - betslip
  - transactional
figma-source: "https://www.figma.com/design/nbGBsC2htHazjjSPEVFjos/Rewards-Improvements-Shipped"
summary: "Comprehensive improvements to the sports promotional rewards system. Covers the rewards module, rewards drawer, reward token types (FreeBet, Odds Boost, Back Up Bet, Bet and Get), display criteria, and integration across betslip, bet bar, and event pages on mobile and desktop."
---

## Overview

The Rewards Improvements project delivered a comprehensive overhaul of how sports promotional tokens are surfaced, selected, and applied across the betting experience. The system supports multiple reward types and integrates with the betslip, bet bar, and event discovery surfaces.

This is the foundational framework for all sports promotions displayed to users during their betting journey.

---

## Reward Token Types

The platform supports four primary token types:

| Token Type | Display Value | Payout Description | When to Use |
|-----------|--------------|-------------------|-------------|
| FreeBet | Value of the freebet | N/A | User has a free bet credit to spend on any eligible market |
| Odds Boost | N/A (shows previous vs new odds when selected) | "Boosted winnings payout:" | User is being offered enhanced odds on specific selections |
| Back Up Bet / MoneyBack Bet | --% up to --.--€ | "Payout if your bet loses:" | User is offered stake protection (partial or full) on loss |
| Bet and Get | Value in the token name | "Payout upon bet placement:" or "Payout upon bet settlement:" | User earns a reward by placing or settling a qualifying bet |

### Decision Rules — Token Type Selection

Use these rules to determine which token type applies in a given scenario:

| Condition | Token Type |
|-----------|-----------|
| User receives a monetary credit to wager freely | FreeBet |
| The promotion enhances the odds of a specific selection | Odds Boost |
| The promotion refunds a percentage of stake on loss | Back Up Bet / MoneyBack |
| The user earns a reward on bet placement or settlement | Bet and Get |
| Multiple token types apply to the same bet | Display all applicable tokens; user selects one at a time |

<!-- TODO: Add rules for token stacking — can multiple tokens be applied to the same bet? Document combinability matrix. -->

---

## Eligibility Criteria

### Event Types

Rewards can be scoped to different levels of specificity:

| Scope Level | Display Rule | Truncation Rule |
|-------------|-------------|-----------------|
| All Sports | Displays "All Sports" | N/A |
| Specific Sports | Shows sport names (e.g. "Football", "Tennis") | Up to 4 sports displayed; 5+ shows "Multiple Sports" |
| Competition | Shows competition names (e.g. "Premier League") | Up to 2 competitions; 3+ shows "Multiple competitions" |
| Matches | Shows match names (e.g. "Real Madrid - PSG") | Up to 2 matches; 3+ shows "Multiple events" |
| Markets | Shows market names (e.g. "Match Result") | Up to 2 markets; 3+ shows "Multiple markets" |
| Selections | Shows selection names (e.g. "Real Madrid to win") | Up to 2 selections; 3+ shows "Multiple selections" |

### Bet Types

Rewards can target specific bet types:

| Bet Type Target | Description |
|----------------|-------------|
| Any | No restriction on bet type |
| Single (Prematch) | Only pre-match single bets qualify |
| Single (Live) | Only in-play single bets qualify |
| Single (Combined) | Both pre-match and live single bets qualify |
| Multiple (Prematch) | Only pre-match accumulator bets qualify |
| Multiple (Live) | Only in-play accumulator bets qualify |
| Multiple (Combined) | Both pre-match and live accumulators qualify |
| Build a Bet | Only Same Game Parlay / Bet Builder bets qualify |

---

## Rewards Module

The rewards module is the primary surface for presenting available rewards to users.

### Reward Module State Table

| State | Visual | User Action Available | Trigger |
|-------|--------|----------------------|---------|
| Available (unexpanded) | Reward icon + name + value visible | "Bet now", "Remind me later" | User has eligible tokens and views a qualifying context |
| Expanded (details visible) | Full metadata, payout info, countdown | "Bet now", "Remind me later" | User interacts with module or auto-expand on first view |
| Countdown active | Timer counting down | Same as expanded | Token has time-limited availability |
| Dismissed (remind later) | Not shown | N/A | User tapped "Remind me later" |
| Expired | Not shown | N/A | Countdown reached zero or token expired server-side |

### Display Rules

- Criteria labels ("All Sports", "Live", "Competitions", etc.) must always be visible regardless of line wrapping (up to 2-3 lines maximum)
- Requirements (soft criteria) should be bold — not the title
- Countdown timer shown for time-limited rewards
- Module must not obscure primary betting actions (odds, selections)

### Behaviours

| Action | Behaviour |
|--------|-----------|
| Tap "Bet now" | Navigate user to relevant event/market matching token eligibility |
| Tap "Remind me later" | Dismiss the reward temporarily; resurfaces later (timing configurable) |
| Countdown reaches 0 | Module is removed; token is no longer available |
| Token used | Module is removed from all surfaces |

<!-- TODO: Define "resurface later" timing — how long before a dismissed reward reappears? Is it session-based or time-based? -->

---

## Rewards Drawer

The rewards drawer is an expandable container that lists available rewards when multiple tokens are present. It includes:

- Header with reward count
- Description section
- Individual reward cards (scrollable)
- Footer with navigation options
- Scroll indicator for overflow

### Reward Card States

| State | Visual Treatment | Interaction |
|-------|-----------------|-------------|
| Unselected | White background, grey border | Tappable — selects this reward |
| Selected | Green tinted background, green border | Tappable — deselects this reward |
| Ineligible | Greyed out, non-interactive | Not tappable; shown with explanation of why ineligible |

<!-- TODO: Confirm if "ineligible" state exists visually in the drawer or if ineligible tokens are simply hidden. -->

---

## Interaction Flow

The following table documents the end-to-end interaction flow when a user encounters and applies a reward token:

| Step | Surface | Action | System Response |
|------|---------|--------|-----------------|
| 1 | Rewards Module (event page / homepage) | User sees available token | Token displayed based on eligibility match |
| 2 | Rewards Module | User taps "Bet now" | Navigate to qualifying event/market |
| 3 | Event Detail Page | User makes selections | Betslip/bet bar populates with selections |
| 4 | Betslip / Bet Bar | System detects eligible token | Reward indicator appears in betslip |
| 5 | Betslip — Rewards Drawer | User opens drawer | List of applicable rewards shown |
| 6 | Rewards Drawer | User selects a reward | Card transitions to selected state; betslip updates payout display |
| 7 | Betslip | User enters stake and places bet | Bet placed with reward applied; reward marked as used |
| 8 | Post-bet | Bet confirmation shown | Reward application confirmed in receipt |

---

## Reward on Module Component

The `Reward on module` component displays a single reward inline within the betting interface.

### Configurable Elements

| Property | Type | Description |
|----------|------|-------------|
| Reward icon | Swappable (12+ variants) | Icon representing the token type |
| Reward name | Text | Display name of the reward (e.g. "Odds Boost") |
| Reward value | Text | Monetary or percentage value of the reward |
| Metadata | Toggle (visible/hidden) | Additional context (event scope, bet type, etc.) |
| Payout info | Toggle (visible/hidden) | Projected payout or insurance amount |

---

## Reward Dropdown

A compact dropdown variant for showing reward details within constrained spaces. Structure:

1. **Header** — reward type label
2. **Description** — brief explanation of the reward
3. **Reward cards** — individual rewards with dividers
4. **Footer** — action link

---

## Desktop Support

All reward surfaces are designed for both mobile and desktop:

- Desktop layouts use wider containers (1366px viewport)
- Reward modules adapt to horizontal layouts
- Drawer components scale to desktop widths

---

## Edge Cases

### Long Text / Translations

- Criteria text may wrap to 2-3 lines — UI accommodates this
- Token names and values tested against long translations
- Truncation rules apply where space is constrained

<!-- TODO: Define exact character limits for truncation per field (reward name, value, criteria labels). -->
<!-- TODO: Document behaviour when a user has 10+ tokens available — pagination or scroll limit? -->

---

## Decision Rules Summary

Use this quick-reference for common design decisions:

| Question | Answer |
|----------|--------|
| How many tokens can a user apply to one bet? | One at a time (user selects from drawer) |
| What happens if a token expires mid-betslip? | Token is removed; betslip reverts to standard payout |
| Can tokens be applied after bet placement? | No — tokens must be selected before placing |
| Are tokens visible to logged-out users? | No — rewards require authentication |
| What is the max criteria text length? | Up to 2-3 lines before truncation |
| Which surface takes priority for showing tokens? | Betslip > Bet Bar > Rewards Module |

<!-- TODO: Confirm the priority order above and add any additional rules for token surfacing hierarchy. -->

---

## Related Areas

- [Bet Insurance](../bet-insurance/) — extends rewards system
- [Acca Boost](../acca-boost/) — specific reward type
- [Price Boosts](../price-boosts/) — specific reward type
- [Betslip](../betslip/) — integration point
- [Bet Bar](../bet-bar/) — integration point
