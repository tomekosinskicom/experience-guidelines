---
title: "Sports Promos — Rewards Improvements"
subdomain: transactional
experience-area: sports-promos
document-type: overview
owner: Sports UX
last-updated: 2025-10-16
status: shipped
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

## Reward Token Types

The platform supports four primary token types:

| Token Type | Display Value | Payout Description |
|-----------|--------------|-------------------|
| FreeBet | Value of the freebet | N/A |
| Odds Boost | N/A (shows previous vs new odds when selected) | "Boosted winnings payout:" |
| Back Up Bet / MoneyBack Bet | --% up to --.--€ | "Payout if your bet loses:" |
| Bet and Get | Value in the token name | "Payout upon bet placement:" or "Payout upon bet settlement:" |

## Eligibility Criteria

### Event Types

Rewards can be scoped to different levels of specificity:

- **All Sports:** Displays "All Sports"
- **Specific Sports:** Shows sport names (e.g. "Football", "Tennis") — up to 4 sports; 5+ shows "Multiple Sports"
- **Competition:** Shows competition names (e.g. "Premier League") — up to 2 competitions; 3+ shows "Multiple competitions"
- **Matches:** Shows match names (e.g. "Real Madrid - PSG") — up to 2 matches; 3+ shows "Multiple events"
- **Markets:** Shows market names (e.g. "Match Result") — up to 2 markets; 3+ shows "Multiple markets"
- **Selections:** Shows selection names (e.g. "Real Madrid to win") — up to 2 selections; 3+ shows "Multiple selections"

### Bet Types

Rewards can target specific bet types:

- Any
- Single (Prematch, Live, or combined)
- Multiple (Prematch, Live, or combined)
- Build a Bet

## Rewards Module

The rewards module is the primary surface for presenting available rewards to users. It displays:

- Reward icon (token type specific)
- Reward name (e.g. "Odds Boost")
- Reward value (e.g. "10% Boost")
- Metadata (optional)
- Payout information (optional)
- CTAs: "Bet now", "Remind me later"

### Display Rules

- Criteria labels ("All Sports", "Live", "Competitions", etc.) must always be visible regardless of line wrapping (up to 2-3 lines maximum)
- Requirements (soft criteria) should be bold — not the title
- Countdown timer shown for time-limited rewards

### Behaviours

- **"Bet now" behaviour:** Tapping navigates user to relevant event/market
- **"Remind me later" behaviour:** Dismisses the reward temporarily, resurfaces later
- **Time display:** Shows countdown to expiry

## Rewards Drawer

The rewards drawer is an expandable container that lists available rewards when multiple tokens are present. It includes:

- Header with reward count
- Description section
- Individual reward cards (scrollable)
- Footer with navigation options
- Scroll indicator for overflow

### Reward Card States

| State | Visual Treatment |
|-------|-----------------|
| Unselected | White background, grey border |
| Selected | Green tinted background, green border |

## Reward on Module Component

The `Reward on module` component displays a single reward inline within the betting interface. Configurable properties:

- Reward icon (swappable — supports 12+ icon variants)
- Reward name
- Reward value
- Metadata visibility toggle
- Payout visibility toggle

## Reward Dropdown

A compact dropdown variant for showing reward details within constrained spaces. Structure:

1. **Header** — reward type label
2. **Description** — brief explanation of the reward
3. **Reward cards** — individual rewards with dividers
4. **Footer** — action link

## Desktop Support

All reward surfaces are designed for both mobile and desktop:

- Desktop layouts use wider containers (1366px viewport)
- Reward modules adapt to horizontal layouts
- Drawer components scale to desktop widths

## Edge Cases

### Long Text / Translations

- Criteria text may wrap to 2-3 lines — UI accommodates this
- Token names and values tested against long translations
- Truncation rules apply where space is constrained

## Related Areas

- [Bet Insurance](../bet-insurance/) — extends rewards system
- [Acca Boost](../acca-boost/) — specific reward type
- [Price Boosts](../price-boosts/) — specific reward type
- [Betslip](../betslip/) — integration point
- [Bet Bar](../bet-bar/) — integration point
