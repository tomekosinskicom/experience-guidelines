---
title: "Betslip"
subdomain: transactional
experience-area: betslip
document-type: overview
owner: David Lopez
contributors: [Surrender, Bianca]
last-updated: 2026-06-03
status: published
maturity: documented
tags:
  - betslip
  - transactional
  - mobile
  - theming
  - bet-placement
  - shipped
figma-source: "https://www.figma.com/design/fBkTpsuWPtoT0uNu3TODhk/Full-Betslip-Shipped"
summary: "The Full Betslip handles bet construction, stake input, odds display, error handling, and bet confirmation across all bet types and brands. Covers single/multi/system bets, odds acceptance modes, non-combinable conflicts, rewards integration, configurable elements per brand, and accessibility."
research:
  - title: "Odds Boost User Research"
    date: 2026-01
    owner: Chunyan Ren
    link: "[XRI SharePoint]/2026 UXR Study Reports/Odds Boost User Research-Jan 2026.pptx"
---

## Overview

The Full Betslip is the core transactional component in the sports betting experience. It handles bet construction, stake input, odds display, error handling, and bet confirmation across all bet types and brands.

**Figma:** [Full Betslip — 🚀 Shipped](https://www.figma.com/design/fBkTpsuWPtoT0uNu3TODhk/Full-Betslip---%F0%9F%9A%80-Shipped?node-id=28219-88598)
**Status:** Shipped and live across all brands
**Platforms:** Mobile (primary), Tablet (adapted), Desktop (separate doc)

---

## State Table

| State | Condition | Visual | User Actions |
|-------|-----------|--------|-------------|
| **Empty** | 0 selections | Empty state illustration | Close betslip |
| **Single (stake empty)** | 1 selection, no stake entered | Selection card + empty input + disabled CTA | Enter stake, remove selection |
| **Single (stake entered)** | 1 selection, valid stake | Selection card + returns shown + active CTA | Place bet, adjust stake, remove selection |
| **Multi (all combinable)** | 2+ combinable selections | Multi tab active, combined odds, single stake input | Place bet, switch to Singles, remove selections |
| **Singles (multiple)** | 2+ selections, not all combinable | Singles tab active, individual stake per card | Place bet, remove selections |
| **System bet** | 3+ selections, System tab active | System bet options shown | Select system type, enter stake |
| **Non-combinable conflict** | Conflicting selections present | Orange badges, warning banner, Multi tab disabled | Remove conflict, place as singles, move to BAB |
| **Odds changed (paused)** | Price moved + user must accept | Yellow flash, struck-through old odds, "Accept" CTA | Accept & place, cancel |
| **Odds changed (auto)** | Price moved + auto-accept on | Silent update, green/red arrow indicator | Continue normally |
| **Selection suspended** | Market suspended in-play | "Suspended" badge on card, CTA disabled | Wait or remove selection |
| **Selection closed** | Market closed permanently | "Closed" badge, CTA disabled | Remove closed selection |
| **Processing** | Bet submitted, awaiting response | Spinner on CTA, inputs locked | Wait |
| **Success (receipt)** | Bet confirmed by backend | Bet receipt with returns, "Done" CTA | Done / track bet / re-bet |
| **Error (network)** | Submission failed | Retry dialog | Try again / cancel |
| **Boost active** | Acca Boost ≥3 legs eligible | Boost badge, boosted returns, ladder | Add more legs, place bet |

---

## Decision Rules

| Condition | Rule |
|-----------|------|
| 1 selection | Show Single view — no bet type tabs |
| 2+ selections AND all combinable | Default to Multi tab (73% of users intend accas) |
| 2+ selections AND some non-combinable | Show Singles tab active; Multi tab disabled; conflict banner |
| 3+ selections AND all combinable | Show System tab option alongside Multi/Singles |
| Acca Boost: ≥3 legs AND all combinable | Show boost badge and enhanced returns |
| Acca Boost: 1 leg from next tier | Show upsell: "Add 1 more for +{next}%" |
| Stake = 0 OR below minimum | CTA disabled |
| Stake entered AND ≥ minimum | CTA active: "Place Bet · £{totalStake}" |
| Odds change + "Always accept" mode | Update silently, no interruption |
| Odds change + "Accept higher only" AND higher | Update silently |
| Odds change + "Accept higher only" AND lower | Pause: show "Accept & Place Bet" |
| Odds change + "Never auto-accept" | Always pause: show "Accept & Place Bet" |
| Price Boost selection + stake > max boost stake | Inline error: "Max stake for this boost: £{max}" |
| Selection removed → 2+ remaining | Recalculate odds; Multi tab stays |
| Selection removed → 1 remaining | Revert to single; hide Multi/System tabs |
| Selection removed → 0 remaining | Close betslip |
| Selection removed (any) | Show undo toast for 5 seconds |

---

## Design Principles

| # | Principle | Implication |
|---|-----------|-------------|
| 1 | Never lose user intent | Stake/selections persist through errors, odds changes, and navigation |
| 2 | Cost and reward crystal clear | Total stake + returns visible at all times without scrolling past CTA |
| 3 | Errors are recoverable | Every error offers a clear next action — no dead ends |
| 4 | Progressive complexity | Single bet = effortless; system bets reveal only when selections demand it |
| 5 | Brand-agnostic logic, brand-specific skin | Behaviour identical across labels; only visuals differ |

---

## Component Anatomy

```
┌─────────────────────────────────┐
│ Header (bet count, collapse)    │  ← ds-betslip-header
├─────────────────────────────────┤
│ Selection Card(s)               │  ← ds-selection-card (repeating)
│  ├─ Event name                  │
│  ├─ Market + Outcome            │
│  ├─ Odds (with boost indicator) │
│  ├─ Remove button               │
│  └─ Error badge (if applicable) │
├─────────────────────────────────┤
│ Bet Type Tabs                   │  ← ds-bet-type-tabs
│ (Singles | Multi | System)      │
├─────────────────────────────────┤
│ Stake Input                     │  ← ds-stake-input
│  ├─ Currency prefix             │
│  ├─ Input field                 │
│  ├─ Quick-stake chips           │
│  └─ Reward selector (optional)  │
├─────────────────────────────────┤
│ Returns Display                 │  ← ds-returns-display
│  ├─ Potential returns           │
│  ├─ Tax line (if applicable)    │
│  └─ Boost indicator (optional)  │
├─────────────────────────────────┤
│ Upsell Module (optional)        │  ← ds-betslip-upsell
├─────────────────────────────────┤
│ CTA: Place Bet                  │  ← ds-betslip-cta
│  └─ Total stake summary         │
└─────────────────────────────────┘
```

**DICE Token Mappings:**

| Component | Background | Text | Border |
|-----------|-----------|------|--------|
| Betslip container | `surface.elevated` | — | — |
| Selection card | `surface.default` | `text.primary` | `border.subtle` |
| Stake input | `surface.input` | `text.primary` | `border.interactive` |
| CTA button | `interactive.primary` | `text.on-primary` | — |
| Error badge | `feedback.error.subtle` | `feedback.error.text` | — |
| Boost indicator | `feedback.success.subtle` | `feedback.success.text` | — |

---

## User Journeys

### Placing a Single Bet

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Tap odds button on market | Selection added; bet bar appears with "1" badge |
| 2 | Tap Bet Bar to expand | Full betslip slides up; stake input auto-focuses |
| 3 | Enter stake via numpad or quick-stake chips | Returns calculate in real-time (debounced 100ms) |
| 4 | Tap "Place Bet · £{stake}" | CTA shows spinner; bet submitted |
| 5 | — | Bet Receipt replaces betslip; haptic feedback (light) |

### Placing a Multi Bet (Accumulator)

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Add 2+ selections from different events | Bet type tabs appear; Multi tab active by default |
| 2 | Enter stake in combined field | Combined returns shown with acca odds |
| 3 | Tap "Place Bet" | Same submission flow as singles |

### Removing a Selection

| Interaction | Animation | Result |
|-------------|-----------|--------|
| Swipe left on card | Reveals red "Remove" button | Tap to confirm removal |
| Tap ✕ (top-right of card) | Instant trigger | Card collapses 200ms ease-out |
| Either method completes | — | Undo toast for 5s; tap to restore |

---

## Edge Cases & Error States

| Edge Case | Behaviour | Resolution |
|-----------|-----------|------------|
| Odds change during stake input | Yellow flash on odds value; no interruption (if auto-accept) | User continues; or accepts if manual mode |
| Selection suspended mid-input | "Suspended" badge; CTA disabled | Wait for market to reopen; or remove selection |
| Network loss during placement | Retry dialog: "Try Again" / "Cancel" | User retries or cancels |
| App backgrounded during placement | Bet continues server-side | Receipt shown on return |
| Non-combinable selections added | Selection IS added (not blocked); conflict explained | Remove one; place as singles; move to BAB |
| Price Boost + stake exceeds max | Inline error on stake field | Reduce stake to ≤ max |
| Odds change again during acceptance | Reset flow; show newest odds | User accepts newest or cancels |
| All selections removed | Betslip closes | Empty state on next open |

---

## Configurable Elements

| Element | Options | Configured via |
|---------|---------|---------------|
| Odds format | Fractional / Decimal / American | User preference (account setting) |
| Currency | £, €, $, R$, etc. | Market/locale |
| Quick-stake chips | Array of values per brand | Brand config |
| Minimum stake | Per market/bet type | Backend |
| Maximum stake | Per selection/market | Backend (dynamic) |
| Tax display | None / Percentage / Fixed | Market regulation |
| Tax deduction point | Stake / Winnings | Market regulation |
| Reward badge | Show/hide | Feature flag |
| Upsell module | Show/hide + content | Feature flag + CMS |
| Acca Boost ladder | Tier structure | Promo engine config |
| Each-way availability | Per sport/market | Trading config |
| Bet Bar style | Mini / Expanded / Hidden | Brand config |

---

## Promotions & Rewards

### Price Boost

| Rule | Behaviour |
|------|-----------|
| Boosted selection present | Show boosted odds in brand highlight colour; original struck through |
| Boost badge | "BOOSTED" on selection card using `feedback.success` tokens |
| Stake exceeds max | Inline error: "Max stake for this boost: £{max}" |
| Boost applies to | Singles only (not combinable into accas unless explicitly allowed) |
| Boost expiry <5 mins | Show countdown timer |

### Acca Boost Ladder

| Legs | Boost | Display |
|------|-------|---------|
| 3 | +5% | Entry tier |
| 4 | +10% | |
| 5 | +15% | |
| 6 | +20% | |
| 7 | +25% | |
| 8+ | +30% | Max tier |

---

## Theming

| Brand | CTA Primary | Boost Highlight | Error | Surface |
|-------|------------|-----------------|-------|---------|
| Ladbrokes | `#C8102E` | `#C8102E` | `#D32F2F` | `#FFFFFF` |
| Coral | `#FFD700` (text: dark) | `#FFD700` | `#D32F2F` | `#1A1A2E` |
| bwin | `#FFD700` | `#FFD700` | `#D32F2F` | `#1C1C1C` |
| Sportingbet | `#00A651` | `#00A651` | `#D32F2F` | `#FFFFFF` |

**Note:** Currently using hex codes. L2 Semantic Tokens being discontinued by DICE; federated design system not yet ready.

---

## Animation & Timing

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Betslip slides up (open) | 300ms | ease-out |
| Selection card collapses (remove) | 200ms | ease-out |
| Undo toast appears | 200ms fade-in | ease-out |
| Undo toast auto-dismiss | 5000ms | — |
| Returns recalculate on keystroke | 100ms debounce | — |
| Odds flash (price change) | 500ms yellow flash | — |
| Price movement arrow persist | 5000ms then fade | — |
| CTA spinner (processing) | Until response | — |
| Bet receipt animate in | 300ms | ease-out |

---

## Accessibility

### Keyboard Navigation

| Focus Target | Key | Action |
|-------------|-----|--------|
| Selection card | Tab | Move focus between cards |
| Focused card | Delete / Backspace | Remove selection |
| Betslip open | Escape | Close betslip; return focus to odds button |
| Stake input | Tab from cards | Focus stake field |
| CTA | Tab from stake | Focus Place Bet button |

### Screen Reader Announcements

| Event | Announcement |
|-------|-------------|
| Selection added | "Added {outcome} at {odds} for {event}. {count} selections in betslip." |
| Odds change | "Odds changed from {old} to {new} for {outcome}." |
| Error | "Error: {error message}. {resolution action}." |
| Bet placed | "Bet placed successfully. Potential returns {amount}." |
| Boost applied | "Acca Boost applied. {percentage} boost on {legs} selections." |

### Touch Targets

| Element | Minimum Size | Notes |
|---------|:---:|-------|
| All interactive elements | 44×44pt | Platform standard |
| Swipe-to-remove gesture | 60px horizontal | Prevents accidental triggers |
| Stake input tap area | Full width | Not just the visible field |

---

## Decision Log

| # | Decision | Alternatives Considered | Rationale | Date |
|---|----------|------------------------|-----------|------|
| 1 | Show conflicts after adding, not block | Block with toast; Modal confirmation | User testing: blocking felt like rejection; explanation felt educational | Feb 2025 |
| 2 | Default to Multi tab when ≥2 selections | Default to Singles; Remember last | Analytics: 73% of multi-selection sessions → acca. Reduces taps. | Mar 2025 |
| 3 | 5-second undo on removal | No undo; Confirmation dialog | Dialog adds friction to frequent action. Undo is forgiving without blocking. | Apr 2025 |
| 4 | Auto-focus stake input on open | No auto-focus; Focus after animation | Reduces time-to-place by ~1.5s. Keyboard appears immediately. | May 2025 |
| 5 | CTA label shows stake not returns | Show returns; Show both; "Place Bet" only | Stake = user commitment. Returns = speculative. Clearer signal. | Jun 2025 |

---

## Metrics & Success Criteria

| Metric | Target | Current | Source |
|--------|--------|---------|--------|
| Bet placement completion rate | >85% | 82% | Analytics |
| Error recovery rate | >60% | 54% | Analytics |
| Time to place (single, from open) | <15s | 12s | Analytics |
| Odds acceptance rate (when prompted) | >70% | 68% | Analytics |
| Betslip abandonment rate | <20% | 22% | Analytics |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 4.0 | 2026-06-03 | Tomek | Restructured to documentation guidelines format |
| 3.1 | 2026-06-02 | Tomek | Added accessibility spec, decision log, metrics |
| 3.0 | 2026-02-11 | David | Full shipped spec — all bet types documented |
| 2.0 | 2025-08-14 | David | Redesign shipped — new component architecture |
| 1.0 | 2025-03-01 | David | Initial betslip documentation |

---

## Related Areas

- [Bet Bar](../bet-bar/) — Betslip launcher and selection preview
- [Quick Bet](../quick-bet/) — Simplified single-bet placement (bypasses full betslip)
- [Sports Token Promos](../sports-token-promos/) — Reward token integration
- [Bet Builder](../bet-builder/) — BAB/BAB+ construction flows
- [Price Boosts](../price-boosts/) — Boost mechanics and display
- [My Bets](../../post-bet/my-bets/) — Post-placement bet tracking
