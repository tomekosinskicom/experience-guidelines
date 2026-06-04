---
title: "iOS Lock Screen Widget — Live Bet Tracking"
subdomain: post-bet
experience-area: my-bets
document-type: patterns
owner: Sports UX Team
last-updated: 2026-05-29
status: published
maturity: documented
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

---

## Widget State Table

| State | Condition | Display Content | User Action |
|-------|-----------|----------------|-------------|
| **Live (in-play)** | Tracked bet has at least one live event | Event name, teams, current score, user's selection, odds, live indicator | View only (tap opens app to My Bets) |
| **Pre-match** | Tracked bet event hasn't started yet | Event name, teams, kick-off time, user's selection, odds | View only |
| **Partially settled** | Multi-leg bet with some legs settled | Settled legs (✓/✗), remaining live legs, combined status | View only |
| **Won** | Bet fully settled as winner | Win indicator, final score, returns amount | View only; widget eligible for auto-switch |
| **Lost** | Bet fully settled as loser | Loss indicator, final score | View only; widget eligible for auto-switch |
| **Cashed out** | User cashed out the tracked bet | Cash out confirmed indicator | View only; widget eligible for removal |
| **Void** | Bet voided by system | Void indicator | View only |
| **No active bet tracked** | No bets currently tracked | Empty state / prompt to track a bet | Tap opens app |
| **Tracking disabled** | User turned off tracking | Widget not shown on lock screen | N/A |

---

## Display Rules

| Rule | Condition | Behaviour |
|------|-----------|-----------|
| Show widget | User has enabled tracking AND has ≥ 1 active tracked bet | Widget visible on lock screen |
| Hide widget | User has no tracked bets OR tracking disabled | Widget not rendered |
| Auto-update | Tracked event is live | Scores and status refresh in near real-time |
| Bet settles (future) | Tracked bet resolves | Show result; auto-switch to next active bet (Phase 2) |
| Multiple bets tracked | User tracks more than one bet | Pick scroller allows cycling between bets |
| Build a Bet display | Tracked bet is BAB/SGP | Show event + combined odds + leg count |
| Thumbnail (small slot) | Widget placed in compact lock screen slot | Minimal info: team icons, score, status dot |

<!-- TODO: Define refresh rate for live scores — how frequently does the widget poll for updates? -->
<!-- TODO: Confirm iOS widget size constraints — what are the exact pixel dimensions for each widget size? -->

---

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

### Entry Point Decision Rules

| Context | Show Tracking Option? | CTA Type |
|---------|----------------------|----------|
| My Bets — active single bet (live) | ✅ Yes | Icon + tooltip |
| My Bets — active single bet (pre-match) | ✅ Yes | Icon + tooltip |
| My Bets — active accumulator (live) | ✅ Yes | Icon + tooltip |
| My Bets — settled bet | ❌ No | N/A |
| Bet Summary — just placed, event is live | ✅ Yes | Inline CTA |
| Bet Summary — just placed, event pre-match | ✅ Yes | Inline CTA |
| Quick Bet confirmation | ✅ Yes | Inline CTA |
| First-time user (never tracked before) | ✅ Yes + Onboarding modal | Modal + CTA |

---

## Onboarding

### After Logging In

Onboarding flow presented to users after login:
- Modal or tooltip educating the user about lock screen widget availability
- Clear CTA to enable the feature
- Dismissible for users who don't want it

<!-- TODO: Define onboarding trigger — is it shown once ever, once per session, or only after first eligible bet? -->

---

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

---

## Multi-Bet Ideal Journey

The happy path for tracking a multi-selection bet (Build a Bet+):

| Step | Action | Widget Shows |
|------|--------|-------------|
| 1 | User places BAB+ bet | N/A (bet just placed) |
| 2 | User enables lock screen tracking from bet confirmation | Widget appears with event + combined odds |
| 3 | First event goes live | Widget updates with live score |
| 4 | Events progress | Widget updates scores in real-time |
| 5 | Individual legs settle | Settled legs show ✓/✗ |
| 6 | All legs settled | Final result shown (win/loss + returns) |

---

## Future Enhancements (Not Ready for Dev)

### Switching from Settled to Open Bet

When a tracked bet settles, automatically switching the widget to show the next active open bet.

### Undo After Disabling Live Tracking

Providing an undo option after a user disables tracking, in case of accidental dismissal.

### Modal After Cash Out

Showing a modal after the user cashes out a tracked bet, asking if they want to track another bet.

### Disabling Live Tracking in Settled Bets

UI for disabling the widget from within the settled bets view.

---

## Related Areas

- [My Bets Overview](../my-bets/overview.md) — related-to
- [Cash Out](../cash-out/) — related-to (cash out interaction with tracked bets)
- [Betslip](../../transactional/betslip/) — related-to (entry point from bet confirmation)
- [Quick Bet](../../transactional/quick-bet/) — related-to (entry point from Quick Bet confirmation)
