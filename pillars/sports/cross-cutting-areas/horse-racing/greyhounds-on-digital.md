---
title: "Greyhounds on Digital"
subdomain: cross-cutting-areas
experience-area: horse-racing
document-type: overview
owner: Sports UX
last-updated: 2025-06-13
status: shipped
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

## Scope & Requirements

### High-Level Scope

The project covers the full greyhound digital betting journey from entry point through to resulted races, supporting both mobile and desktop.

### MoSCoW Prioritisation

Requirements were prioritised using the MoSCoW method, covering availability and eligibility criteria for the greyhound racing product on digital platforms.

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

## Race States

### Race Off
- **Mobile:** Visual indication that a race has started (no further bets accepted)
- **Desktop:** Expanded race-off state with locked selections
- All betting buttons transition to locked state

### Resulted
- Display of race results with finishing positions
- Clear indication of winning trap/greyhound

## Bet Slip Integration

- Standard bet slip integration for greyhound selections
- Supports single, forecast, and tricast bet types
- Follows existing betslip patterns from the platform

## Design Decisions

### Trap Silks & Colours
- Standard greyhound trap colours (1-6) used for visual identification
- Large and small variants for different contexts

### Mobile Drop-Down Switcher
- Market switcher displays as dropdown on mobile for space efficiency
- Different from horizontal tab pattern used on desktop

### Racing Post Integration
- Trap silk and Racing Post modules incorporated for form data
- Provides additional context for informed betting decisions

### Desktop Navigation
- Dedicated greyhound navigation within the racing section
- Clear separation from horse racing while maintaining consistent patterns

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

## Related Areas

- Horse Racing — parent-pattern
- [Betslip](../../transactional/betslip/) — integration-point
