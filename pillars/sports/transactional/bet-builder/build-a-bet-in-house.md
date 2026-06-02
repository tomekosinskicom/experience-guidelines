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

## In-House Market Journeys

### Entry Points

Users access Build A Bet from:
- Event Detail Page (EDP) — dedicated "Build a Bet" / "BaB" tab
- Market cards within the event view
- Quick Bet module (when BAB selections are present)

### Selection Flow

1. User navigates to an event's Build A Bet tab
2. Available markets are displayed (goals, cards, corners, match result, etc.)
3. User taps selections to add legs to their BAB
4. Pick counter increments with each added leg
5. Combined odds calculate in real-time via Angstrom pricing
6. User proceeds to place bet via Quick Bet or full betslip

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

- Long market and pick names — text truncation and wrapping behaviour defined
- Provider switching — when a market becomes unavailable mid-selection
- Minimum legs requirement — BAB requires minimum number of selections before odds are offered

---

## Related Areas

- [Bet Builder+ Experience](./bet-builder-plus-experience.md) — Multi-event BAB (BAB+/SGP+)
- [Quick Bet](../quick-bet/) — BAB selections placed via Quick Bet
- [Betslip](../betslip/) — BAB selections in full betslip
- [Bet Bar](../bet-bar/) — BAB representation in bet bar
