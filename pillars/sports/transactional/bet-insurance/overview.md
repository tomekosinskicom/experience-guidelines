---
title: "Sports Promos — Bet Insurance"
subdomain: transactional
experience-area: bet-insurance
document-type: overview
owner: Sports UX Team
last-updated: 2026-06-02
status: published
maturity: documented
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

---

## Eligibility Rules

| Rule | Condition | Result |
|------|-----------|--------|
| Bet type | Must be an accumulator (multiple) | Single bets do NOT qualify |
| Minimum legs | User must have ≥ N qualifying legs (configurable) | Below threshold: "X more legs needed" messaging |
| Qualifying odds per leg | Each leg must meet minimum odds threshold | Legs below threshold do not count toward eligibility |
| Market eligibility | Selection must be from an insurable market | Excluded markets do not count |
| Insurance token available | User has been awarded an insurance token (promo) | Without token, feature not shown |
| Combined with Acca Boost | Both tokens available and bet qualifies | Dual-reward UI shown (boost + insurance) |
| Insurance only | Insurance token available, no Acca Boost token | Insurance-only UI variant shown |

<!-- TODO: Define the exact minimum legs requirement — is it 5 legs across all brands or configurable? -->
<!-- TODO: Document which markets/sports are excluded from insurance eligibility. -->
<!-- TODO: Clarify the insurance payout rule — is it "one leg loses = full stake back" or are there partial rules? -->

---

## State Table — Betslip with Insurance

| State | Condition | Visual | User Action |
|-------|-----------|--------|-------------|
| **Not qualified (legs missing)** | User has fewer than required legs | "Add X more legs to qualify" message; insurance badge greyed | Add more selections |
| **Qualified — insurance available** | Enough qualifying legs; token available | Insurance badge active; drawer accessible | Select insurance from drawer |
| **Insurance selected** | User has applied insurance to bet | Green insurance badge; payout info displayed | Remove insurance or place bet |
| **Insurance + Acca Boost selected** | Both rewards applied | Dual badge row; combined payout display | Remove either reward or place bet |
| **Odds changed** | Odds shift after selection | Odds change indicator; insurance/boost status preserved | Accept new odds or remove |
| **Non-combinable selections** | Legs cannot form valid acca | Error messaging; insurance status on valid legs only | Remove conflicting selections |
| **Bet placed (post-bet)** | Bet confirmed with insurance | Insurance badge in My Bets (active & settled) | View in My Bets |
| **Bet lost (one leg)** | One leg lost, rest won | Insurance payout triggered | Stake returned per insurance terms |
| **Bet lost (multiple legs)** | More than one leg lost | Insurance does NOT apply (standard loss) | N/A |
| **Bet won** | All legs won | Standard win payout (insurance not needed) | N/A |

---

## State Transitions

| From | Trigger | To | UI Change |
|------|---------|-----|-----------|
| Not qualified | User adds qualifying leg to reach minimum | Qualified | Badge activates; drawer becomes available |
| Qualified | User selects insurance from drawer | Insurance selected | Badge turns green; payout info appears |
| Insurance selected | User removes a leg below minimum | Not qualified | Badge greys out; warning shown |
| Insurance selected | User places bet | Post-bet (insured) | Confirmation shows insurance active |
| Insurance selected | User deselects insurance | Qualified | Badge reverts; payout info removed |
| Qualified (boost available) | User selects both boost and insurance | Dual reward | Combined badge row; dual payout display |

---

## User Journeys

### Acca Boost + Insurance Happy Journey

The primary flow where a user qualifies for both Acca Boost and Bet Insurance on the same accumulator. The user sees both rewards reflected in the betslip with combined odds enhancement and insurance protection.

### Insurance-Only Happy Journey

A flow where the user qualifies for Bet Insurance without Acca Boost. The insurance badge and drawer appear independently in the bet bar and betslip.

---

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

---

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

---

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

---

## Decision Rules — When to Show Insurance UI

| Condition | Show Insurance UI? | Variant |
|-----------|-------------------|---------|
| User has insurance token AND qualifying acca | ✅ Yes | Full insurance badge + drawer |
| User has insurance token BUT too few legs | ✅ Yes (partial) | "X more legs needed" progress indicator |
| User has insurance token AND Acca Boost token | ✅ Yes | Combined dual-reward UI |
| User has NO insurance token | ❌ No | Standard betslip (no insurance elements) |
| User has insurance token BUT single bet | ❌ No | Insurance requires accumulator |
| Bet is Build a Bet (SGP) | ❌ No | Insurance applies to multi-event accas only |

<!-- TODO: Confirm if Build a Bet (BAB) qualifies for insurance or only traditional multi-event accumulators. -->

---

## Design Phases

### Phase I (Current — SPO-305104)

- Acca Boost ladder only (no combined ladder)
- Bet Insurance on the bet bar
- Mobile final designs complete
- Badge system integrated

### Phase II (Planned)

- Combined Acca Boost + Insurance ladder
- Enhanced drawer with both rewards visible simultaneously

---

## Related Areas

- [Betslip](../betslip/) — related-to (insurance integrates into betslip UI)
- [Bet Bar](../bet-bar/) — related-to (insurance drawer in bet bar)
- [Acca Boost](../acca-boost/) — related-to (combined reward experience)
- [Price Boosts](../price-boosts/) — related-to (promo ecosystem)
