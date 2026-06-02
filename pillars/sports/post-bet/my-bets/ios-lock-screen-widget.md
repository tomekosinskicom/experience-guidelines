---
title: "iOS Lock Screen Widget — Live Bet Tracking"
subdomain: post-bet
experience-area: my-bets
document-type: patterns
owner: Sports UX Team
last-updated: 2026-05-29
status: published
tags:
  - ios
  - widget
  - lock-screen
  - live-tracking
  - my-bets
  - post-bet
  - mobile
summary: "iOS lock screen widget for live bet tracking. Allows users to track their active bets directly from the iPhone lock screen without opening the app. Covers entry points (My Bets, Bet Summary from Betslip, Quick Bet), onboarding flow, widget design (single, Build a Bet, pick scroller, thumbnail), multi-bet ideal journey, and future enhancements."
---

## Overview

The iOS Lock Screen Widget enables users to track their active bets directly from the iPhone lock screen. It provides at-a-glance bet status, scores, and odds without needing to unlock the device or open the app.

**Figma source:** [SPO-274185: iOS Lock Screen Widget](https://www.figma.com/design/oulsIwl6KLgclX0YzGTAhr/SPO-274185--iOS-lock-screen-widget?node-id=5134-6407)

**Jira:** SPO-274185

**Status:** Final Designs (Ready for Dev)

## Entry Points

### From My Bets

User journey from My Bets screen:
- User opens My Bets, sees active bet with "Track on lock screen" tooltip
- Tooltip text: "track your bet on the lock screen"
- User taps the tracking icon to enable the widget

### From Bet Summary (Betslip)

User journey from the bet confirmation screen after placing via full betslip:
- After bet placement, the confirmation summary shows the lock screen tracking option
- User can enable tracking immediately post-placement

### From Bet Summary (Quick Bet)

User journey from Quick Bet confirmation:
- Same flow as betslip but originating from the Quick Bet confirmation screen

## Onboarding

### After Logging In

Onboarding flow presented to users after login:
- Modal or tooltip educating the user about lock screen widget availability
- Clear CTA to enable the feature
- Dismissible for users who don't want it

## Widget Design

### Single Bet Widget

Displays a single active bet on the lock screen with:
- Event name and teams
- Current score/status
- User's selection
- Odds
- Bet status indicator (live, settled)

### Build a Bet Widget

Adapted widget for Build a Bet / Same Game Multi bets:
- Shows the event and combined odds
- Indicates number of legs
- Status of individual legs where possible

### Pick Scroller

For multi-leg bets, a scrollable pick display allowing users to see individual selections within the widget.

### Thumbnail Widget

A compact widget variant for the smaller lock screen widget slot showing minimal bet information (team icons, score, status indicator).

## Multi-Bet Ideal Journey

The happy path for tracking a multi-selection bet (Build a Bet+):
- User places BAB+ bet
- Enables lock screen tracking from bet confirmation
- Widget appears on lock screen showing combined bet status
- As events progress, the widget updates with live scores
- On settlement, the widget shows win/loss result

## Future Enhancements (Not Ready for Dev)

### Switching from Settled to Open Bet

When a tracked bet settles, automatically switching the widget to show the next active open bet.

### Undo After Disabling Live Tracking

Providing an undo option after a user disables tracking, in case of accidental dismissal.

### Modal After Cash Out

Showing a modal after the user cashes out a tracked bet, asking if they want to track another bet.

### Disabling Live Tracking in Settled Bets

UI for disabling the widget from within the settled bets view.

## Related Areas

- [My Bets Overview](../my-bets/overview.md) — related-to
- [Cash Out](../cash-out/) — related-to (cash out interaction with tracked bets)
- [Betslip](../../transactional/betslip/) — related-to (entry point from bet confirmation)
- [Quick Bet](../../transactional/quick-bet/) — related-to (entry point from Quick Bet confirmation)
