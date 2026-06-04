---
title: "Greyhounds on Digital"
subdomain: cross-cutting-areas
experience-area: horse-racing
document-type: overview
owner: Sports UX
last-updated: 2025-06-13
status: shipped
maturity: documented
tags:
  - greyhounds
  - racing
  - horse-racing
  - new-sport
  - forecast
  - tricast
  - race-card
figma-source: "https://www.figma.com/design/YXtFcyco8auU3LVjhiXVWG/Greyhound-on-Digital-Shipped?node-id=4306-56149"
summary: "Introduction of greyhound racing to digital platforms. A new sport addition covering entry points, race cards, forecast/tricast betting, and results — influenced by GBS with improvements over current horse racing journeys."
---

## Overview

Greyhounds is a new sport addition to digital that had not previously been included on the platform. The scope was to introduce greyhound racing as a fully supported betting sport.

The designs were influenced by GBS (retail greyhound betting) and used as reference points in the MoSCoW prioritisation. This project also presented an opportunity to improve a similar betting experience seen in horse racing — rather than copying existing user journeys, an improved experience was implemented for greyhounds.

**Key Points:**
- Addition of a new sport to digital
- Very popular sport in UK & Ireland
- Covers one of the feature gaps with LCG (competitor parity)

---

## Scope & Requirements

### High-Level Scope

The project covers the full greyhound digital betting journey from entry point through to resulted races, supporting both mobile and desktop.

### MoSCoW Prioritisation

Requirements were prioritised using the MoSCoW method, covering availability and eligibility criteria for the greyhound racing product on digital platforms.

---

## User Journeys

The greyhound betting journey covers the following key stages:

### Entry Point
- Users access greyhound racing from the sports navigation
- Clear entry into the greyhound section from the main product

### Next Race Tab
- **Mobile:** Compact view of upcoming races with race times and quick access
- **Desktop:** Expanded layout with additional race information
- Horizontal race time switcher showing upcoming races
- Location/venue pills for filtering

### Today & Tomorrow Tabs
- **Today tab:** Shows all greyhound races scheduled for the current day
- **Tomorrow tab:** Shows upcoming races for the next day
- Both support mobile and desktop layouts
- Location-based grouping (e.g. by track/venue)
- Expand/collapse all functionality for managing long lists

### No Races State
- Empty state handling when no races are available for the selected time period

---

## Race Card

### Race Winner Tab
- **Mobile:** Compact race card showing trap numbers (1-6), greyhound names, and odds
- **Desktop:** Expanded race card with additional space for form data
- Trap silks displayed with distinctive colours (standard greyhound trap colours)
- Price options: P (Price), BOG (Best Odds Guaranteed)
- Event status buttons: P&BOG, Pre_Race, Resulted

### All Tab
- Combined view showing all available markets for a race
- Aggregated information display

### Forecast (Mobile & Desktop)
- Users can select 1st and 2nd place finishers
- "Add Forecast" toggle to enable forecast betting mode
- Selection states: Active, Disabled, Locked
- FC (Forecast) button states for each runner
- Clear visual feedback on selections made

### Tricast (Mobile & Desktop)
- Users can select 1st, 2nd, and 3rd place finishers
- TC (Tricast) button states for each runner
- Extended selection interface compared to forecast
- Similar interaction patterns to forecast but with three positions

---

## Race Card State Table

| State | Visual Indicator | User Actions Available | Betting Available |
|-------|-----------------|----------------------|-------------------|
| **Pre-Race (default)** | Standard race card with active odds buttons | Select runners, add to betslip, toggle forecast/tricast | ✅ Yes |
| **Race Off** | Locked visual; "Race Off" indicator | None — view only | ❌ No |
| **Suspended** | Greyed-out odds, suspended indicator | None — view only | ❌ No |
| **Resulted** | Finishing positions displayed, winning trap highlighted | View results only | ❌ No |
| **No Races** | Empty state illustration/message | Navigate to different time period | ❌ N/A |

---

## Forecast / Tricast Selection States

| State | Meaning | Visual | Interaction |
|-------|---------|--------|-------------|
| **Active** | Runner available for selection | Standard button colour | Tappable — adds to forecast/tricast |
| **Selected (1st)** | Runner selected as 1st place | Highlighted with position badge "1" | Tappable — deselects |
| **Selected (2nd)** | Runner selected as 2nd place | Highlighted with position badge "2" | Tappable — deselects |
| **Selected (3rd)** | Tricast only — 3rd place | Highlighted with position badge "3" | Tappable — deselects |
| **Disabled** | Runner not available (non-runner/scratched) | Greyed out | Non-interactive |
| **Locked** | Race off — no further selections | Locked icon, greyed | Non-interactive |

---

## Interaction Timing

| Event | Timing Rule | User Impact |
|-------|-------------|-------------|
| Race goes off | Immediate lock — all betting buttons transition to locked state | No further bets accepted |
| Race results available | After stewards confirm (varies by track) | Resulted state replaces race-off state |
| Next Race tab auto-advance | When current "next race" goes off, tab advances to the following race | User sees fresh upcoming race |
| Forecast/Tricast toggle | Instant UI mode change | Market view switches to positional selection |
| Odds update (pre-race) | Real-time price feed | Buttons flash to indicate price change |

<!-- TODO: Confirm exact timing for auto-advance to next race — is it immediate on race-off or delayed? -->
<!-- TODO: Document non-runner handling — what happens to forecast/tricast selections when a runner is scratched pre-race? -->

---

## Race States

### Race Off
- **Mobile:** Visual indication that a race has started (no further bets accepted)
- **Desktop:** Expanded race-off state with locked selections
- All betting buttons transition to locked state

### Resulted
- Display of race results with finishing positions
- Clear indication of winning trap/greyhound

---

## Bet Slip Integration

- Standard bet slip integration for greyhound selections
- Supports single, forecast, and tricast bet types
- Follows existing betslip patterns from the platform

---

## Design Decisions

### Trap Silks & Colours
- Standard greyhound trap colours (1-6) used for visual identification
- Large and small variants for different contexts

| Trap Number | Colour |
|------------|--------|
| 1 | Red |
| 2 | Blue |
| 3 | White |
| 4 | Black |
| 5 | Orange |
| 6 | Black & White Stripes |

### Mobile Drop-Down Switcher
- Market switcher displays as dropdown on mobile for space efficiency
- Different from horizontal tab pattern used on desktop

### Racing Post Integration
- Trap silk and Racing Post modules incorporated for form data
- Provides additional context for informed betting decisions

### Desktop Navigation
- Dedicated greyhound navigation within the racing section
- Clear separation from horse racing while maintaining consistent patterns

---

## Platform Support

| Feature | Mobile | Desktop |
|---------|--------|---------|
| Next Race Tab | ✅ | ✅ |
| Today/Tomorrow | ✅ | ✅ |
| Race Card | ✅ | ✅ |
| Forecast | ✅ | ✅ |
| Tricast | ✅ | ✅ |
| Race Off State | ✅ | ✅ |
| Resulted | ✅ | ✅ |

---

## When to Use This Pattern vs Horse Racing

| Scenario | Use Greyhounds Pattern | Use Horse Racing Pattern |
|----------|----------------------|--------------------------|
| 6 or fewer runners per race | ✅ | ❌ |
| Trap-based identification (numbered traps 1-6) | ✅ | ❌ |
| Named runners with jockey/trainer info | ❌ | ✅ |
| Forecast/Tricast with fixed trap positions | ✅ | Use equivalent HR forecast pattern |
| Form data from Racing Post | ✅ (simplified) | ✅ (full form card) |

---

## Related Areas

- Horse Racing — parent-pattern
- [Betslip](../../transactional/betslip/) — integration-point
