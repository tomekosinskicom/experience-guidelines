---
title: "Bottom Navigation"
subdomain: discovery
experience-area: sports-navigation
document-type: overview
owner: Sports UX
last-updated: 2026-06-02
status: shipped
maturity: documented
tags:
  - navigation
  - bottom-nav
  - mobile
  - home
  - scroll-to-top
  - state-preservation
figma-source: "https://www.figma.com/design/WmAiFe6d4vGZe3fiLDZ5OW/Bottom-Navigation---Delivery"
summary: "Bottom navigation delivery for mobile sportsbook. Covers Home destination introduction, scroll-to-top on re-press, A-Z page simplification, last-visited state preservation, and balance integration within the nav bar."
---

## Overview

The bottom navigation is the primary persistent navigation element on the mobile sportsbook. This delivery project introduced several improvements and new behaviours to the bottom navigation bar, enhancing usability and aligning with platform conventions.

---

## Nav Item State Table

| State | Icon Treatment | Label Treatment | Trigger |
|-------|---------------|-----------------|---------|
| **Unselected** | Outlined icon, muted colour | Muted colour | User is on a different destination |
| **Selected (active)** | Filled icon, active colour | Active colour | User is on this destination |
| **Re-pressed (scroll-to-top)** | Remains filled/active | Remains active | User taps the already-active item |
| **Badge (notification)** | Outlined/Filled + badge dot | Standard | System indicates new content on that destination |

<!-- TODO: Define badge behaviour — is there a notification badge on any nav items (e.g., My Bets unsettled count)? -->

---

## Animation & Timing Specs

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Scroll-to-top on re-press | Smooth vertical scroll to top of content | Platform default (iOS: ~300ms, Android: ~250ms) | Decelerate (ease-out) |
| Tab switch | Instant navigation (no cross-fade) | 0ms (immediate) | N/A |
| Icon state change (selected ↔ unselected) | Instant swap (filled ↔ outlined) | 0ms | N/A |
| Balance value update | Inline text update | N/A | N/A |

<!-- TODO: Confirm if there's a subtle transition on icon change (e.g., scale bounce) or if it's strictly instant. -->
<!-- TODO: Document the scroll-to-top behaviour when the user is already at the top — does a re-press do nothing or refresh content? -->

---

## Features Delivered

### SPO-262743: Home in Bottom Nav

Introduction of a dedicated "Home" destination in the bottom navigation bar.

**Key details:**
- New Home icon added to the bottom navigation
- Selected and unselected states defined
- Home icon follows standard iconography patterns (filled = selected, outlined = unselected)
- Provides a consistent entry point back to the homepage from any screen

### SPO-271516: Scroll to Top on Re-press

When a user taps an already-active bottom nav item, the page scrolls back to the top.

**Behaviour:**
- User is on a page associated with a bottom nav item
- User taps the same nav item again
- Page smoothly scrolls to the top of the content
- Works across all bottom nav destinations (Home, Find, In-Play, Casino, My Bets)
- Follows platform convention (iOS/Android pattern)

**Interactions:**
- Tap gesture on active nav item triggers scroll
- Vertical scroll animation to top of page

### SPO-271355: A-Z Remove Header + No Longer Overlay

Simplification of the A-Z sports listing page.

**Changes:**
- Removed the header from the A-Z page
- A-Z is no longer presented as an overlay/modal
- Now renders as a full page within the navigation stack
- Cleaner, more integrated browsing experience for discovering sports alphabetically

### SPO-271511: Preserve Last Visited State

Navigation state is preserved when switching between bottom nav destinations.

**Behaviour scenarios:**

**Home button destination:**
- Tapping Home always returns to the homepage regardless of where the user navigated within other tabs

**Navigating to another destination:**
- When a user navigates to a different bottom nav item, their position in the previous tab is preserved
- Returning to the previous tab restores the last visited state

**Navigating back and forth between destinations:**
- Users can move between destinations without losing context
- Each destination maintains its own navigation stack
- No betslip changes occur during navigation between tabs

**Key principle:** Bottom nav destinations act as independent stacks — switching tabs preserves scroll position and page state within each stack.

### Bottom Navigation - Include Balance

The user's account balance is displayed within the bottom navigation bar.

**Key details:**
- Balance shown directly in the nav bar for quick visibility
- Always accessible without navigating to account/cashier
- Horizontal layout accommodating nav items plus balance display
- Fixed height of 56px with centred content alignment

---

## State Preservation Rules

| Scenario | Behaviour | Resets State? |
|----------|-----------|---------------|
| Switch to another tab and return | Restores last-visited page and scroll position in that tab | ❌ No |
| Tap Home from any other tab | Navigates to homepage | ✅ Resets Home tab to root |
| Tap active Home item (re-press) | Scrolls to top of homepage | ❌ No |
| Tap active non-Home item (re-press) | Scrolls to top of current page within that tab | ❌ No |
| App goes to background and returns | Preserves all tab states | ❌ No |
| App is killed and relaunched | Resets all tabs to root | ✅ Yes |
| Deep link into the app | Opens target destination; other tabs maintain state | ❌ No (other tabs) |

<!-- TODO: Confirm deep-link behaviour — does it always open in a specific tab or can it create a new stack? -->

---

## Component Specifications

### Bottom Nav Bar (`btm_nav`)

| Property | Value |
|----------|-------|
| Background | Brand primary colour (black) |
| Layout | Horizontal flex, fixed width (full screen width) |
| Height | 56px |
| Padding (top) | 11px |
| Padding (bottom) | 7px |
| Alignment | Centre items vertically |
| Position | Fixed to bottom of viewport |
| Z-index | Above page content, below modals/sheets |

### Icon States
- **Selected:** Filled icon with active colour
- **Unselected:** Outlined icon with muted colour
- **Label:** Below icon, small text

---

## Interaction Patterns

| Action | Result |
|--------|--------|
| Tap unselected nav item | Navigate to that destination (preserves previous tab state) |
| Tap selected nav item (re-press) | Scroll to top of current page |
| Switch tabs | Preserve state in previous tab |
| Tap Home | Always return to homepage (resets Home stack) |
| Navigate within a tab | Push to that tab's stack |

---

## Design Principles

- **Persistent access:** Bottom nav is always visible during core browsing
- **State preservation:** Each tab maintains independent navigation history
- **Platform conventions:** Follows iOS/Android bottom navigation patterns (re-press = scroll to top)
- **Glanceable info:** Balance always visible without extra navigation

---

## When to Show / Hide Bottom Nav

| Context | Bottom Nav Visible |
|---------|--------------------|
| Standard browsing (home, find, in-play, casino, my bets) | ✅ Yes |
| Betslip open (full screen) | ❌ No |
| Modal / bottom sheet open | ❌ No (covered by overlay) |
| Keyboard active (search input) | Platform-dependent (iOS: hidden, Android: pushed up) |
| Onboarding / first-run flows | ❌ No |
| Login / registration screens | ❌ No |

<!-- TODO: Confirm behaviour during Quick Bet — is bottom nav visible behind quick bet, or does quick bet overlay it? -->

---

## Related Areas

- [Sports Navigation](../sports-navigation/) — parent area
- [Search](../search/) — Find destination in bottom nav
