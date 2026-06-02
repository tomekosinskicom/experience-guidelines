---
title: "Quick Bet"
subdomain: transactional
experience-area: quick-bet
document-type: overview
owner: Sports UX Team
last-updated: 2026-04-17
status: published
maturity: documented
tags:
  - quick-bet
  - transactional
  - mobile
  - bet-placement
  - shipped
summary: "Complete documentation for the Quick Bet feature — a streamlined, inline bet placement module that allows users to place bets without opening the full betslip. Covers single and multi selections, default stake behaviour, error states, odds handling, rewards, Build a Bet integration, market-specific variations (horse racing, football EW), and in-play signposting."
figma-source: "https://www.figma.com/design/uzbUN7CtDGe8t5CMsU0CUF/New-Quickbet-Shipped-file"
---

## Overview

Quick Bet is a lightweight, inline bet placement module that appears at the bottom of the screen when a user taps a selection. It allows single-tap bet placement without navigating to the full betslip, reducing friction for confident bettors.

**Figma source:** [New Quickbet — 🚀 Shipped file](https://www.figma.com/design/uzbUN7CtDGe8t5CMsU0CUF/New-Quickbet---%F0%9F%9A%80-Shipped-file?node-id=1-77)

**Status:** Shipped (ROW Final Designs)

---

## When to Use Quick Bet vs Full Betslip

| Scenario | Use Quick Bet | Use Full Betslip |
|----------|:---:|:---:|
| Single, confident bet with known stake | ✅ | |
| Quick accumulator from a list | ✅ | |
| Complex multi with system bets | | ✅ |
| Applying multiple rewards | | ✅ |
| Reviewing all selections in detail | | ✅ |
| Build a Bet construction | ✅ (simplified) | ✅ (full control) |

---

## Component States

Quick Bet adapts its appearance based on authentication, stake configuration, and selection context:

### Authentication & Stake

| State | Stake Field | CTA | Balance |
|-------|-------------|-----|---------|
| Logged in + default stake | Pre-filled | "Place Bet" active | Shown |
| Logged in + no default stake | Empty + quick-stake chips | Disabled until stake entered | Shown |
| Not logged in + default stake | Pre-filled | "Login to Place Bet" | Hidden |
| Not logged in + no default stake | Empty | "Login / Register" | Hidden |

### Selection Context

| Context | Behaviour |
|---------|-----------|
| Single selection | Standard Quick Bet module |
| Multi selection | Combined odds, selection count, bet bar integration |
| Odds movement | Directional indicator (up/down) with acceptance mode |
| Locked (in-play) | Waiting state, placement blocked |
| Closed | Closed state, remove or wait for reopening |
| Acca Boost eligible | Boost badge and enhanced returns |
| Build a Bet | BAB selection with legs listed |
| Reward applied | Reward badge, modified returns |
| Early Payout | Early Payout badge and tooltip |

Each state has variants with and without the quick stakes + keypad visible.

---

## Single Selection

### With Default Stake

When the user has a default stake set, tapping a selection immediately shows the Quick Bet with the pre-filled stake, estimated returns, and a "Place Bet" button. A tooltip reminds the user of their default stake setting.

### Without Default Stake

When no default stake is set, the Quick Bet appears with an empty stake field and quick-stake chips for rapid selection. The user must enter a stake before "Place Bet" is enabled.

### Logged In vs Not Logged In

- **Logged in:** Full Quick Bet with balance display and Place Bet button
- **Not logged in:** Quick Bet shows a login/register prompt instead of Place Bet

---

## Multi Selection

When the user adds multiple selections, the Quick Bet adapts to show combined odds, selection count, and interactions with the Bet Bar (if enabled).

### With Bet Bar

Quick Bet multi integrates with the bet bar — the bet bar shows selection count and combined odds, Quick Bet shows the stake input and place button.

### Without Bet Bar

For labels without bet bar, the Quick Bet module handles the full multi experience independently.

### Happy Journey from Homepage

User adds selections from the homepage match list → Quick Bet appears → user places multi bet.

### Lots of Picks — Bet Confirmation

When many selections are added, the bet confirmation adapts to show a summarised view.

---

## Error States

| Configuration | Error Display |
|---------------|--------------|
| With Bet Bar | Error indicators appear in both Quick Bet module and bet bar simultaneously |
| Without Bet Bar | All error messaging contained within the Quick Bet module alone |

---

## Odds Handling

### Odds Movement (Up/Down)

Quick Bet displays odds change indicators with visual direction (green up, red down).

| Mode | Behaviour |
|------|-----------|
| User needs to accept | Quick Bet requires explicit acceptance before placing |
| Auto-accept | Price updates automatically without blocking placement |

### Locked Bets

When a selection is temporarily locked (in-play key moment), the Quick Bet shows a locked state with a waiting indicator.

### Closed Bets

When a selection has closed, the Quick Bet shows a closed state with the option to remove or wait for reopening.

---

## Rewards Integration

### Apply Reward Journey

Flow showing how users select and apply a reward (freebet, odds boost, etc.) from within the Quick Bet module.

### Acca Boost

Quick Bet multi with Acca Boost applied — shows boost percentage and enhanced returns.

---

## Build a Bet Integration

Quick Bet supports Build a Bet (BAB) without the BAB drawer, adapting to different pricing providers.

### Angstrom Provider

Standard Build a Bet flow using Angstrom pricing — Quick Bet shows the BAB selection with individual legs listed.

### Sportscast Provider

Build a Bet with Sportscast-powered markets. Key behaviours:

- Info message displayed when user enters the BaB tab and QB module is closed
- Pick counter increases for every added leg even in Sportscast
- Message in bet bar pushes user to add another pick
- Delete 'X' available for all markets (Sportscast and Angstrom) since BaB drawer is removed

### Angstrom + Sportscast Combined

When both providers are active on the same event:

- Quick Bet collapsed and opened states for combined provider events
- Build a Bet attempts across providers
- Navigation to respective event detail pages for add/edit picks

### Long Market and Pick Names

Edge case handling for selections with long market/pick names — text truncation and wrapping behaviour.

---

## Market-Specific Variations

### Football Each-Way

- Single selection with EW toggle
- Multi selection with EW applied
- Display of EW terms and calculations

### Horse Racing SP/EW

| Configuration | Display |
|--------------|---------|
| Single + SP | Starting Price indicator shown |
| Single + SP + EW | SP and EW combined display |
| Multi + EW only | EW visible (SP shown only in full betslip due to space constraints) |
| Mixed multi (cross-sport) | Horse racing EW selections alongside other sports |

### Early Payout

- Single selection with Early Payout badge and tooltip
- Multi selection with Early Payout indicator
- Tooltip positioning: falls below badge when space allows, above when constrained (e.g., with keypad open)

---

## In-Play / Live Signposting

Quick Bet displays live/in-play status through badge positioning options:

| Badge Position | Use Case |
|----------------|----------|
| Next to selection name | Default for single selections |
| Next to market name | When market context matters more |
| Before market name | Alternative layout variant |
| No badge (multis) | Too cluttered in collapsed multi view |

---

## Brand Variants

### BetMGM Approach (ROW)

Adapted Quick Bet variant for BetMGM-style experience:
- Single collapsed (not logged in)
- Single logged in
- Error state
- Multis (including BaB)

---

## Related Areas

- [Betslip](../betslip/) — Quick Bet is the lightweight alternative to full betslip
- [Bet Bar](../bet-bar/) — Quick Bet interacts with bet bar for multi bets
- [Bet Builder](../bet-builder/) — BAB selections in Quick Bet
- [Sports Promos](../sports-promos/) — Reward application in Quick Bet
