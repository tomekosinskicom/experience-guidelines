---
title: "Build A Bet In-House"
subdomain: transactional
experience-area: bet-builder
document-type: overview
owner: Sports UX Team
last-updated: 2025-06-13
status: shipped
maturity: documented
tags:
  - bet-builder
  - bab
  - in-house
  - angstrom
  - sportscast
  - sgp
  - transactional
  - shipped
figma-source: "https://www.figma.com/design/dXzihPZfQpymOGRzQMksIH/Build-A-Bet-In-House-Shipped"
summary: "Documentation for the Build A Bet In-House feature — the migration of Bet Builder to an in-house solution using Angstrom pricing. Covers feature description, market identification, in-house market journeys, combined provider journeys (Angstrom + Sportscast), and mobile flows for bwin."
---

## Overview

Build A Bet In-House is the migration of the Bet Builder (BAB) experience from third-party pricing providers to an in-house solution powered by Angstrom. This allows the product to offer Same Game Parlays (SGP) with greater control over market availability, pricing accuracy, and user experience.

**Figma source:** [Build A Bet In-House — 🚀 Shipped](https://www.figma.com/design/dXzihPZfQpymOGRzQMksIH/Build-A-Bet-In-House-Shipped?node-id=5273-506)

**Status:** Shipped

---

## Feature Description

Build A Bet allows users to combine multiple selections from the same event into a single bet. The in-house version provides:

- Identification of Bet Builder markets within events
- Market combinability rules powered by in-house pricing (Angstrom)
- Seamless handling of mixed-provider scenarios (Angstrom + Sportscast)

---

## Selection State Table

| State | Visual | User Action | System Behaviour |
|-------|--------|-------------|------------------|
| **Unselected** | Default market button appearance | Tappable | N/A |
| **Selected** | Highlighted/active button, pick counter increments | Tappable to deselect | Combined odds recalculate via Angstrom |
| **Non-combinable** | Greyed out / disabled with info message | Non-interactive | Selection conflicts with existing picks |
| **Suspended** | Locked/greyed button | Non-interactive | Market suspended mid-selection |
| **Provider switching** | Loading/transitional state | Wait | Market moved between providers mid-session |
| **Minimum legs not met** | Selections made but CTA disabled | Add more legs | Odds not offered until minimum reached |
| **Minimum legs met** | CTA active, combined odds displayed | Place bet or continue adding | Odds calculated and displayed |
| **Error (pricing failure)** | Error message on bet placement | Retry or remove selections | Angstrom pricing API failed |

---

## Decision Rules — Provider Selection

When both Angstrom (in-house) and Sportscast (third-party) are active on the same event, use these rules:

| Condition | Provider Used | UI Indicator |
|-----------|--------------|--------------|
| Market available from Angstrom only | Angstrom | In-house pricing badge (if applicable) |
| Market available from Sportscast only | Sportscast | Info message on BaB tab entry |
| Market available from both providers | Angstrom (preferred) | None — seamless |
| Angstrom pricing unavailable (fallback) | Sportscast | Info message displayed |
| User combines markets from both providers | Mixed — handled gracefully | Navigation to respective EDPs for add/edit |
| Provider conflict (cannot combine across providers) | Error state | Clear messaging; user guided to resolve |

### When to Choose In-House vs Third-Party

| Decision Factor | Favour Angstrom (In-House) | Favour Sportscast (Third-Party) |
|----------------|---------------------------|----------------------------------|
| Market coverage | Wider range of combinations available | Specific niche markets not yet in-house |
| Pricing accuracy | Real-time, directly controlled | Provider-dependent latency |
| Combinability | Full combinability matrix | Provider-imposed restrictions |
| Availability | Primary — default for all new markets | Fallback when Angstrom unavailable |

---

## In-House Market Journeys

### Entry Points

Users access Build A Bet from:
- Event Detail Page (EDP) — dedicated "Build a Bet" / "BaB" tab
- Market cards within the event view
- Quick Bet module (when BAB selections are present)

### Selection Flow

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Navigate to event's Build A Bet tab | Available BAB markets displayed |
| 2 | Tap selection (goals, cards, corners, match result, etc.) | Pick counter increments; selection highlighted |
| 3 | Continue adding legs | Combined odds calculate in real-time via Angstrom |
| 4 | Meet minimum legs requirement | CTA becomes active with combined odds |
| 5 | Proceed to place bet | Opens Quick Bet or full betslip with BAB bet |

### Market Identification

Bet Builder-eligible markets are visually identified within the event view, allowing users to understand which markets can be combined before entering the dedicated BAB tab.

---

## Combined Provider Journeys (Angstrom + Sportscast)

When both pricing providers are active on the same event, the system handles:

### Angstrom Markets
- In-house priced markets with full combinability
- Real-time odds calculation
- Wider range of available combinations

### Sportscast Markets
- Third-party priced markets with specific provider limitations
- Info messages displayed when entering the BaB tab with Sportscast markets
- Pick counter increases for every added leg regardless of provider

### Mixed Provider Behaviour
- Quick Bet displays collapsed and opened states for combined provider events
- Build a Bet attempts across providers are handled gracefully
- Navigation to respective event detail pages for add/edit picks
- Delete 'X' available for all markets (both Sportscast and Angstrom)

---

## Mobile Flows (bwin)

### Journey Flow

The mobile experience on bwin follows this pattern:

1. **Sports Lobby / Competition Page** — User browses matches
2. **Event Detail Page** — User enters event and navigates to BaB tab
3. **Market Selection** — User selects legs from available markets
4. **Quick Bet / Betslip** — Combined BAB bet with in-house odds

### Key Interactions

- Tap on market selection adds leg to BAB
- Visual indicators show which markets are in-house (Angstrom) vs third-party (Sportscast)
- Pick counter is always visible during selection
- Bet placement follows standard Quick Bet or full betslip patterns

---

## Edge Cases

| Edge Case | Behaviour | Resolution |
|-----------|-----------|------------|
| Long market/pick names | Text truncation and wrapping per design specs | Tooltip or expanded view on long press (if applicable) |
| Provider switching mid-selection | Market becomes unavailable; user informed | Clear error message; option to remove conflicting leg |
| Minimum legs requirement not met | CTA disabled, helper text shows "X more legs needed" | User adds additional selections |
| Pricing API timeout | Odds display shows loading/error state | Retry mechanism; user can attempt placement again |
| All markets suspended (event level) | Entire BAB tab locked | User cannot add/place; existing picks preserved |

<!-- TODO: Define minimum legs requirement per brand — is it always 2, or configurable? -->
<!-- TODO: Document the visual indicator for in-house vs third-party markets — what exactly does it look like? -->
<!-- TODO: Clarify whether BAB supports in-play events or is pre-match only. -->

---

## Related Areas

- [Bet Builder+ Experience](./bet-builder-plus-experience.md) — Multi-event BAB (BAB+/SGP+)
- [Quick Bet](../quick-bet/) — BAB selections placed via Quick Bet
- [Betslip](../betslip/) — BAB selections in full betslip
- [Bet Bar](../bet-bar/) — BAB representation in bet bar
