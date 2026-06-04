---
title: "Acca Boost"
subdomain: transactional
experience-area: acca-boost
document-type: overview
owner: Sports UX Team
last-updated: 2026-02-02
status: published
maturity: documented
tags:
  - acca-boost
  - parlay
  - transactional
  - promotions
  - betslip
  - bet-bar
  - shipped
summary: "Complete documentation for Acca Boost (Parlay Boost) — the promotional feature that automatically increases returns on accumulator bets based on the number of selections. Covers the boost ladder progression, pop-up notifications, non-eligible leg handling, acca drawer component (regular and yellow bubble bet bar), info overlay, desktop mocks, and edge cases including max returns and long translations."
---

## Overview

Acca Boost (also known as Parlay Boost) automatically enhances the potential returns on accumulator bets. As users add more selections to their accumulator, the boost percentage increases along a configurable ladder until a maximum boost is reached.

**Figma source:** [Parlay (Acca Boost) — Shipped file](https://www.figma.com/design/NDlkznbnTjf88YpLlxBD0a/Parlay--Acca-Boost----Shipped-file?node-id=1-75)

**Status:** Shipped and live

---

## Rules — When Boost Applies

| Rule | Condition | Result |
|------|-----------|--------|
| Minimum selections | User has ≥ 2 qualifying legs in accumulator | Boost activates at lowest tier |
| Eligible leg type | Selection meets minimum odds threshold | Counts toward boost ladder |
| Non-eligible leg | Selection below minimum odds or in excluded market | Does NOT count toward ladder; pop-up shown |
| Maximum boost reached | User reaches max selections on ladder (configurable, e.g. 50) | Boost percentage caps; ladder collapses |
| Max returns hit before max boost | Payout limit reached before max tier | UI adapts to show capped returns |
| Logged out user | User is not authenticated | Boost displays but bet placement requires login |
| Single bet | Only one selection in slip | Boost does NOT apply (acca only) |
| Build a Bet | SGP/BAB bet type | Boost does NOT apply (accumulator legs only) |

<!-- TODO: Confirm if BAB+ (multi-event) qualifies for Acca Boost or not. -->
<!-- TODO: Document minimum odds threshold per brand — is it configurable? -->

---

## State Transitions

| Current State | Trigger | Next State | UI Change |
|---------------|---------|------------|-----------|
| No boost (0-1 legs) | User adds 2nd qualifying leg | Boost active (tier 1) | Pop-up notification appears |
| Boost active (tier N) | User adds another qualifying leg | Boost active (tier N+1) | Ladder appears, shows progression |
| Boost active (tier N) | User removes leg below minimum | No boost | Ladder disappears |
| Boost active (tier N) | User adds non-eligible leg | Boost unchanged | Non-eligible pop-up shown |
| Boost active (max - 1) | User adds qualifying leg | Max boost | Progress bar fills; ladder shows max |
| Max boost | 10s timeout | Max boost (ladder collapsed) | Ladder collapses; boost badge remains |
| Any boost tier | Ladder displayed | Same tier (ladder collapsed) | After 10s (configurable), ladder auto-collapses |
| Boost active | Max returns limit reached | Capped returns | UI shows capped amount instead of boosted returns |

---

## Boost Ladder Progression

The Acca Boost uses a ladder UI that shows the user's progress toward maximum boost:

1. **2 selections** — User adds two selections, pop-up notification encourages adding the next one
2. **3 selections** — Ladder appears, remains for 10 seconds (configurable), then collapses
3. **4 selections** — Ladder appears again showing progression, collapses after timeout
4. **10 selections** — Continued progression along the ladder
5. **30 selections** — Higher boost tier reached
6. **49 selections (max - 1)** — Progress bar increases only at this stage
7. **50 selections** — Max boost achieved, stays for 10 seconds and disappears

The ladder is configurable per label — some labels may have fewer tiers (e.g., max boost at 7 or 12 selections).

### When Max Returns is Hit Before Max Boost

Edge case where the maximum payout limit is reached before the user achieves the maximum boost percentage. The UI adapts to show the capped returns.

### Long Translations

Handling for labels with verbose translations — boosted returns may move to the next line when the text is too long.

---

## Pop-up Notifications

### Standard Pop-up Notification

A toast message appears when the user adds a qualifying selection. It encourages adding more legs to increase the boost.

### Non-Eligible Legs

Pop-up message displayed always for legs that don't qualify for Acca Boost (e.g., certain market types or very low odds).

### Logged Out Users

Pop-up message and ladder shown for logged out users — the boost is visible but placing the bet requires login.

---

## Acca Drawer Component

The Acca Drawer is the persistent UI element that shows the current boost state. It has multiple variants:

### Component States

| State | Description | Behaviour |
|-------|-------------|-----------|
| Default | Standard ladder showing current and next boost tier | Static until interaction |
| Transition | Animation between states when a new leg is added | Animates for ~300ms, then settles |
| Max - 1 | One selection away from maximum boost | Progress bar increases at this tier |
| Max | Maximum boost achieved | Stays for 10s then collapses |
| Collapsed | Ladder hidden; boost badge/indicator remains | User can expand manually |

### Bet Bar Variants

- **Regular Bet Bar** — Drawer sits above the standard fixed/floating bet bar
- **Yellow Bubble Bet Bar** — Drawer adapts to the yellow bubble variant with rounded corners and different padding

### Pill Components

| Type | State | Description | Visual |
|------|-------|-------------|--------|
| Default | Default | Inactive boost tier pill | Standard colour, no border emphasis |
| Default | Selected | Currently active boost tier | Yellow border |
| Max Boost | Default | Maximum boost pill (inactive) | Standard colour |
| Max Boost | Selected | Maximum boost achieved | Yellow background + border |

---

## Configurable Elements

| Element | Configurable Per | Default | Notes |
|---------|-----------------|---------|-------|
| Max selections for max boost | Brand/label | 50 | Some labels cap at 7 or 12 |
| Ladder display timeout | Brand/label | 10 seconds | Time before ladder auto-collapses |
| Boost percentage per tier | Brand/label | Varies | Each tier maps to a specific boost % |
| Minimum odds per leg | Brand/label | TBD | Below this, leg is non-eligible |
| Max returns cap | Brand/label | Varies | Maximum payout limit |
| Yellow bubble bet bar | Brand/label | Off | Alternative bet bar style |

---

## Info Overlay

A detailed information overlay that explains how Acca Boost works:
- Header with explanation
- Minimum odds requirement
- Maximum boost percentage
- Eligible sports
- Qualifying legs explanation
- "OK, got it" dismiss button

Available in two contexts:
- Within the bet bar/acca drawer
- Within the full betslip

---

## Desktop Mocks

Desktop-specific designs showing the Acca Boost experience on larger viewports with side-by-side betslip layout.

---

## Technical Notes

- The yellow bubble bet bar disappears before the pop-up notification
- In case of long returns, the boosted returns move to the next line
- Ladder display is configurable (timeout duration, number of tiers)
- Progress bar increases only when approaching max boost (penultimate tier)

---

## Timing & Animation

| Animation | Duration | Trigger |
|-----------|----------|---------|
| Ladder reveal | ~300ms (slide up) | User adds qualifying leg |
| Ladder collapse (auto) | 10s delay then ~200ms collapse | Timeout after display |
| Pill state transition | Instant | Leg added/removed |
| Progress bar fill (max - 1 → max) | ~400ms (fill animation) | User reaches max tier |
| Pop-up notification appear | Standard toast timing (~200ms fade in) | Qualifying leg added |
| Pop-up notification dismiss | Auto-dismiss after ~3s | Timeout |
| Yellow bubble bet bar disappear | Before pop-up notification | System timing |

<!-- TODO: Confirm exact animation durations with engineering — are these estimated or specified? -->

---

## Related Areas

- [Betslip](../betslip/) — related-to (Acca Boost displays within betslip)
- [Bet Bar](../bet-bar/) — related-to (Acca Drawer sits on bet bar)
- [Quick Bet](../quick-bet/) — related-to (Acca Boost visible in Quick Bet)
- [Sports Promos](../sports-promos/) — related-to (part of promotional ecosystem)
