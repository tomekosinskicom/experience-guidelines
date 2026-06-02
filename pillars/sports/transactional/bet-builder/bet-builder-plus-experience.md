---
title: "Bet Builder+ Experience"
subdomain: transactional
experience-area: bet-builder
document-type: overview
owner: Sports UX Team
last-updated: 2026-06-02
status: published
tags:
  - bet-builder
  - bab-plus
  - sgm
  - responsive
  - transactional
  - shipped
summary: "Build a Bet+ (BAB+) is the multi-event Same Game Multi experience. This document covers Part 2 of the BB+ project: the responsive game tab redesign for ROW and CILA brands, including mobile and desktop final designs, theming, user testing, and UAT rounds."
---

## Overview

Build a Bet+ (BAB+) extends the single-event Build a Bet (Same Game Multi) to allow selections across multiple events. The "BB+ Experience — Part 2" project (SPO-437) focuses on redesigning the game tab to be responsive across mobile and desktop, with full theming support for ROW and CILA brands.

**Figma source:** [SPO-437 | BB+ Experience - PT 2](https://www.figma.com/design/THWPXa6YgI2uSv3DS7y4TC/SPO-437-%7C-BB--Experience---PT-2?node-id=8057-174712)

**Jira:** SPO-437, SPO-295264, SPO-301614, SPO-296403

## Project Scope

### Problem Statement

The existing game tab UI for Build a Bet+ was not responsive and lacked visual consistency across brands. Users struggled to understand how multi-event selections interact within the BAB+ interface, particularly on smaller screens.

### Key Deliverables

| Deliverable | Jira | Status |
|-------------|------|--------|
| Mobile Final Designs: Responsive Game Tab ROW | SPO-295264 | ✅ Shipped |
| Desktop Final Designs: ROW | SPO-301614 | ✅ Shipped |
| Theming: ROW & CILA | SPO-296403 | ✅ Shipped |
| UAT Round 1 | — | ✅ Complete |
| UAT Round 2 | — | ✅ Complete |
| UAT Round 3 | — | ✅ Complete |

## Design Decisions

### Responsive Game Tab

The game tab adapts across viewport sizes:
- **Mobile:** Compact tab layout with scrollable market categories, optimised for thumb reach
- **Desktop:** Expanded view with visible market categories and side-by-side selection display

### Brand Theming

Full theming applied for:
- **ROW brands** (bwin, Sportingbet) — primary design target
- **CILA brands** (Sportingbet BR, bwin SP) — adapted theming with localised patterns

## Research & Testing

### ROW User Test

User testing conducted with ROW brand users to validate the responsive game tab design. Test designs, scripts, and results are documented within the Figma file.

**Key pages:**
- 🧑🏼‍💻 ROW Test Designs
- 📚 ROW Test Script
- 📈 ROW Test Results

### CILA User Test

Separate user testing conducted for Sportingbet Brazil and bwin Spain to validate the localised experience.

## Components

Local components built for this feature are documented in the "🎨 Components" page within the Figma file. These include:
- Responsive game tab navigation
- Market category pills/tabs
- Selection cards (mobile and desktop variants)
- Multi-event indicator badges
- Icon system for BB+ markets

## UAT History

Three rounds of UAT were conducted to verify developer implementation against the design specs:

- **Round 1:** Initial implementation review — identified spacing and typography issues
- **Round 2:** Post-fix verification — addressed most issues, flagged minor theming discrepancies
- **Round 3:** Final sign-off — all issues resolved, approved for release

## Related Areas

- [Betslip](../betslip/) — related-to (BAB+ selections flow into betslip)
- [Sports Promos](../sports-promos/) — related-to (Acca Boost integration with BAB+)
- [Quick Bet](../quick-bet/) — related-to (quick placement of BAB+ bets)
