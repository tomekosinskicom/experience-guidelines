---
title: "Sports Navigation"
subdomain: discovery
experience-area: sports-navigation
document-type: overview
owner: Sports UX
last-updated: 2026-06-03
status: published
maturity: documented
tags:
  - navigation
  - sports
  - top-nav
  - bottom-nav
  - edp
  - lobby
  - discovery
summary: "Overview of the sports navigation system covering top navigation (sport switcher), sport lobby sub-navigation, bottom navigation bar, Event Detail Page market tabs, and in-play navigation. Defines the navigation hierarchy, guidelines, and principles governing how users move through the sportsbook."
---

## Overview

Sports Navigation is the system of persistent and contextual navigation elements that allow users to move between sports, competitions, events, and markets across the sportsbook. It operates at multiple levels — from the global sport switcher at the top, through sport-specific lobby navigation, down to market-level tabs within individual events.

The navigation system is designed to be shallow (minimise taps to reach any market) while maintaining orientation (user always knows where they are and how to get back).

---

## Navigation Hierarchy

```
┌─────────────────────────────────────────────┐
│  Top Navigation (Sport Switcher)            │  ← Global, persistent on homepage
│  Football | Horse Racing | Tennis | ...     │
├─────────────────────────────────────────────┤
│  Sport Lobby                                │  ← Sport-specific landing page
│  Sub-navigation: Today | Tomorrow | Comps   │
├─────────────────────────────────────────────┤
│  Competition / Event List                   │  ← Matches within a sport/competition
├─────────────────────────────────────────────┤
│  Event Detail Page (EDP)                    │  ← Single event with all markets
│  Market Tabs: Main | Goals | Cards | ...    │
├─────────────────────────────────────────────┤
│  Bottom Navigation                          │  ← Global, persistent across sportsbook
│  Home | Find | In-Play | Casino | My Bets   │
└─────────────────────────────────────────────┘
```

---

## Top Navigation (Sport Switcher)

The top navigation is a horizontal scrollable bar displayed at the top of the sportsbook homepage. It provides the primary entry point into individual sports.

### Behaviour

- Displays key sports as tappable items (icon + label or label only)
- Horizontally scrollable when items exceed viewport width
- Tapping a sport navigates to that sport's lobby page
- The list of sports and their order is configurable per brand/market
- Popular or promoted sports appear first (leftmost position)

### Items Included

| Item Type | Examples | Behaviour on Tap |
|-----------|----------|-----------------|
| Key sports | Football, Horse Racing, Tennis, Basketball | Navigate to sport lobby |
| Live/In-Play | "In-Play" or "Live" item | Navigate to in-play hub |
| Specials/Promos | "Boosts", "Specials" | Navigate to promotional content |
| All Sports / A-Z | "A-Z" or "All" | Navigate to full sports list |

### Guidelines

- Maximum visible items without scrolling: 4-5 (depending on label length)
- Scroll indicator (fade/gradient on right edge) signals more items available
- Currently active sport should be visually highlighted if user is within that sport's pages
- Icons are optional — some brands use text-only for density

<!-- TODO: Document the configurable item list per brand — how many sports show by default? Is it CMS-driven or hardcoded? -->

---

## Sport Lobby & Sub-Navigation

When a user taps a sport from the top navigation, they arrive at the sport's lobby page. This page has its own sub-navigation layer.

### Lobby Sub-Navigation

A secondary horizontal tab bar within the sport lobby that provides access to different views of that sport:

| Tab | Content | Availability | Notes |
|-----|---------|-------------|-------|
| Featured | Highlighted matches, promos, popular events | All sports | Default landing tab |
| Competitions | Grouped by league/competition | All sports | Expandable accordion |
| Coupons | Pre-configured bet combinations | Sport-specific (customised) | Only shown if coupons exist for the sport |
| Calendar | Date-based event browser | All sports | Browse by upcoming dates |
| Teams | Team-based navigation and following | Some sports only (Football, Basketball, etc.) | Not shown for individual sports (Tennis, Golf, etc.) |

### Tab Availability Rules

| Sport Type | Featured | Competitions | Coupons | Calendar | Teams |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Team sports (Football, Basketball, Rugby, etc.) | ✅ | ✅ | If configured | ✅ | ✅ |
| Individual sports (Tennis, Golf, Darts, etc.) | ✅ | ✅ | If configured | ✅ | ❌ |
| Racing (Horse Racing, Greyhounds) | ✅ | ✅ | ❌ | ✅ | ❌ |

### Behaviour

- Sub-navigation sits below the page header, above the content
- Tabs are horizontally scrollable if they exceed viewport width
- Active tab is visually highlighted (underline or filled style)
- Switching tabs replaces the content below without full page navigation
- Scroll position resets when switching tabs
- Tabs that have no content for the current sport are hidden (not disabled)

### Guidelines

- Keep tab labels short (1-2 words maximum)
- "Featured" should be the default selected tab when entering a sport lobby
- Tab order is fixed: Featured → Competitions → Coupons → Calendar → Teams
- Hide tabs that don't apply to the current sport (don't show disabled/empty tabs)
- The tab bar should be sticky (fixed below header) so it remains accessible during scroll
- Coupons tab should only appear when the brand has configured coupons for that specific sport

<!-- TODO: Document which sports have non-standard lobby layouts (e.g., Horse Racing uses Next Race/Today/Tomorrow pattern instead of standard tabs) -->

---

## Bottom Navigation

The bottom navigation is the persistent global navigation bar anchored to the bottom of the viewport. It provides access to the top-level sportsbook destinations.

For full documentation on the bottom navigation including state preservation, scroll-to-top behaviour, balance display, and component specs, see:

→ [Bottom Navigation — Detailed Documentation](./bottom-navigation.md)

### Key Points

- 56px fixed height, anchored to bottom of viewport
- Contains 5 primary destinations (configurable per brand)
- Supports state preservation — each tab maintains its own navigation stack
- Re-pressing the active tab scrolls to top (platform convention)
- Optionally includes account balance display and My Bets entry point
- Customisable per brand: item order, icons, labels, and included destinations can vary

---

## Event Detail Page (EDP) Navigation

Within an individual event (e.g., Arsenal vs Liverpool), the EDP has its own navigation layer for browsing between market groups.

### Market Tabs

A horizontal tab bar at the top of the EDP content area that allows users to switch between market categories:

| Tab | Markets Included | Notes |
|-----|-----------------|-------|
| Main | Match Result, Both Teams to Score, Over/Under | Default landing tab; most popular markets |
| Goals | Total Goals, Exact Score, First Goalscorer | |
| Cards | Yellow/Red card markets | Football-specific |
| Corners | Total Corners, First Corner | Football-specific |
| Players | Player-specific markets | |
| Build a Bet | BAB/SGP market builder | Opens BaB experience |
| All | Full list of all available markets | Catch-all tab |

### Behaviour

- Tabs are sport-specific — football shows Goals/Cards/Corners; tennis shows Sets/Games
- The tab bar is horizontally scrollable
- Active tab highlighted with underline/fill indicator
- Switching tabs scrolls to the relevant market group or filters the market list
- "Main" is always the default selected tab on EDP entry
- Number badge (optional) shows count of markets within each tab
- Tab availability is dynamic — tabs without available markets are hidden

### Guidelines

- Market tab order should reflect betting popularity (most-bet markets first)
- The "Build a Bet" tab should be visually differentiated (icon or colour accent) as it opens a different experience mode
- "All" tab should always be last — it's the fallback for users who can't find what they want
- On in-play events, "Main" tab should prioritise live-relevant markets (Next Goal, Current Score)

---

## In-Play Navigation

In-play (live) events have additional navigation patterns:

### In-Play Hub

- Accessible from the bottom navigation or top navigation "In-Play" item
- Shows all currently live events grouped by sport
- Events are sorted by time started / popularity

### In-Play Event Switching

- Within a live EDP, users can swipe between live events in the same competition
- A horizontal event carousel at the top of the EDP allows quick switching
- Events show live score/status in the carousel item

### Guidelines

- Live events should always show current score/status alongside the event name
- Time indicators (e.g., "45' ", "2nd Half", "3rd Set") should be prominent
- In-play markets that are suspended should be clearly differentiated from open markets
- Navigation between live events should preserve the user's market tab position where possible

<!-- TODO: Document the event carousel/swipe pattern in detail — is it a horizontal list or a swipe-between-pages pattern? -->

---

## Navigation Principles

These principles govern all sports navigation decisions:

1. **Shallow hierarchy** — Any market should be reachable in ≤3 taps from the homepage. Top nav → Sport lobby → Event → Market.

2. **Persistent orientation** — The user should always know which sport, competition, and event they're viewing. Breadcrumbs, highlighted nav items, and page headers maintain context.

3. **State preservation** — Navigating away and returning should restore the user's position. This applies to bottom nav tabs, lobby tab selection, and EDP market tab.

4. **Progressive disclosure** — Show the most popular/relevant content first. Less popular sports, competitions, and markets are accessible but not foregrounded.

5. **Consistency across sports** — The navigation pattern (top nav → lobby → sub-nav → EDP → market tabs) is identical across all sports. Only the content and tab labels change.

6. **Configurability** — Navigation items, order, and visibility are configurable per brand and market. This supports different sport priorities across regions.

---

## Decision Rules

| Question | Rule |
|----------|------|
| Which sports appear in top nav? | Configurable per brand/market; ordered by popularity/priority |
| What's the default tab in a sport lobby? | Always "Featured" (most relevant/promoted content) |
| What's the default tab on an EDP? | Always "Main" (most popular markets) |
| Should the bottom nav be visible during EDP? | Yes — unless betslip or modal is open |
| How does a user get "back" from an EDP? | Hardware/OS back button or header back arrow → returns to sport lobby |
| What happens when a sport has no events today? | Featured tab still shows promoted content; Calendar tab shows upcoming dates |
| Should in-play events appear in the regular sport lobby? | Yes — with a live badge; also accessible via dedicated In-Play hub |

---

## Related Areas

- [Bottom Navigation](./bottom-navigation.md) — Detailed bottom nav documentation
- [Search](../search/) — "Find" destination in bottom nav
- [Market Layouts](../market-layouts/) — How markets are displayed within EDP tabs
