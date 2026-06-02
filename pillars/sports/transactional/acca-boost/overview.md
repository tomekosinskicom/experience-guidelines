---
title: "Acca Boost"
subdomain: transactional
experience-area: acca-boost
document-type: overview
owner: Sports UX Team
last-updated: 2026-02-02
status: published
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

## Pop-up Notifications

### Standard Pop-up Notification

A toast message appears when the user adds a qualifying selection. It encourages adding more legs to increase the boost.

### Non-Eligible Legs

Pop-up message displayed always for legs that don't qualify for Acca Boost (e.g., certain market types or very low odds).

### Logged Out Users

Pop-up message and ladder shown for logged out users — the boost is visible but placing the bet requires login.

## Acca Drawer Component

The Acca Drawer is the persistent UI element that shows the current boost state. It has multiple variants:

### Component States

| State | Description |
|-------|-------------|
| Default | Standard ladder showing current and next boost |
| Transition | Animation between states when a new leg is added |
| Max - 1 | One selection away from maximum boost |
| Max | Maximum boost achieved |

### Bet Bar Variants

- **Regular Bet Bar** — Drawer sits above the standard fixed/floating bet bar
- **Yellow Bubble Bet Bar** — Drawer adapts to the yellow bubble variant with rounded corners and different padding

### Pill Components

| Type | State | Description |
|------|-------|-------------|
| Default | Default | Inactive boost tier pill |
| Default | Selected | Currently active boost tier (yellow border) |
| Max Boost | Default | Maximum boost pill (inactive) |
| Max Boost | Selected | Maximum boost achieved (yellow background + border) |

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

## Desktop Mocks

Desktop-specific designs showing the Acca Boost experience on larger viewports with side-by-side betslip layout.

## Technical Notes

- The yellow bubble bet bar disappears before the pop-up notification
- In case of long returns, the boosted returns move to the next line
- Ladder display is configurable (timeout duration, number of tiers)
- Progress bar increases only when approaching max boost (penultimate tier)

## Related Areas

- [Betslip](../betslip/) — related-to (Acca Boost displays within betslip)
- [Bet Bar](../bet-bar/) — related-to (Acca Drawer sits on bet bar)
- [Quick Bet](../quick-bet/) — related-to (Acca Boost visible in Quick Bet)
- [Sports Promos](../sports-promos/) — related-to (part of promotional ecosystem)
