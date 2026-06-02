---
title: "Sports Promos — Bet Insurance"
subdomain: transactional
experience-area: bet-insurance
document-type: overview
owner: Sports UX Team
last-updated: 2026-06-02
status: published
tags:
  - bet-insurance
  - acca-boost
  - promos
  - betslip
  - transactional
summary: "Bet Insurance is a promotional feature that provides users with insurance protection on accumulator bets. When combined with Acca Boost, it creates a dual-reward experience within the betslip and bet bar. This document covers the Phase I mobile final designs including happy journeys, betslip states, components, and promo tray integration."
---

## Overview

Bet Insurance is a promotional reward within the Sports Promos experience area. It allows users to protect their accumulator bets — if one leg of their acca loses, they receive their stake back. When combined with Acca Boost, it creates a compelling dual-reward offering.

**Figma source:** [SPO-290536 | Bet Insurance](https://www.figma.com/design/4S4GycVhEJBU5owqCOT0It/SPO-290536-%7C-Bet-Insurance)

**Jira:** SPO-290536, SPO-305104

## User Journeys

### Acca Boost + Insurance Happy Journey

The primary flow where a user qualifies for both Acca Boost and Bet Insurance on the same accumulator. The user sees both rewards reflected in the betslip with combined odds enhancement and insurance protection.

### Insurance-Only Happy Journey

A flow where the user qualifies for Bet Insurance without Acca Boost. The insurance badge and drawer appear independently in the bet bar and betslip.

## Betslip States

### Odds Changed

When odds change after selections are made, the betslip displays the update while preserving the insurance and boost status indicators.

### Regular Non-Combinable Odds

When certain selections cannot be combined into a single Bet Builder or accumulator, the betslip shows clear error messaging. Insurance status remains visible on valid legs.

### Legs Missing to Qualify

When the user has fewer than the required number of selections (e.g., less than 5 legs), the betslip indicates how many additional legs are needed to qualify for insurance.

### Badges on Different Bet Types

Insurance and Acca Boost badges appear across different bet types:
- **Small badges** — used in compact betslip views (from Dice design system)
- **Medium badges** — used in bet bar and betslip headers
- **Betslip badges** — combined Insurance + Acca Boost badge row
- **Post-bet badges** — shown in My Bets for settled and active insured bets

## Components

### Bet Bar Drawer

The bet bar shows insurance status with expandable drawers:
- **Phase I:** Acca Boost ladder only (using existing ladder component)
- **Phase II:** Combined Acca Boost + Insurance ladder

### Insurance Drawer

A standalone drawer component showing insurance details, terms, and status. Available in both "Acca + Insurance" combined and "Insurance only" variants.

### Bet Insurance Tray Card

A card component used within the promo tray for selecting and applying the insurance reward.

### Onboarding Modal

A modal (sourced from Dice design system) that introduces the Bet Insurance feature to first-time users.

### Container Message

A notification component (sourced from Sports) that confirms insurance is active on the user's bet.

## Integration Points

| Touchpoint | Source | Description |
|------------|--------|-------------|
| Bet Bar | Sports | Shows insurance badge and expandable drawer |
| Betslip | Sports | Displays insurance status, badges, and qualification progress |
| My Bets | Sports | Shows insurance badge on settled/active bets |
| Quick Bet | Sports | Insurance badge visible on quick bet flows |
| Promo Tray | Sports | Insurance reward selectable from promo tray |
| Onboarding Modal | Dice | First-time user education modal |
| Container Message | Sports | Confirmation toast/banner |
| Badges | Dice | Small badge components from design system |

## Design Phases

### Phase I (Current — SPO-305104)

- Acca Boost ladder only (no combined ladder)
- Bet Insurance on the bet bar
- Mobile final designs complete
- Badge system integrated

### Phase II (Planned)

- Combined Acca Boost + Insurance ladder
- Enhanced drawer with both rewards visible simultaneously

## Related Areas

- [Betslip](../betslip/) — related-to (insurance integrates into betslip UI)
- [Bet Bar](../bet-bar/) — related-to (insurance drawer in bet bar)
- [Acca Boost](../acca-boost/) — related-to (combined reward experience)
- [Price Boosts](../price-boosts/) — related-to (promo ecosystem)
