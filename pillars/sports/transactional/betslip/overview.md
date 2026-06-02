---
title: "Betslip"
subdomain: transactional
experience-area: betslip
document-type: overview
owner: David Lopez
contributors: [Surrender, Bianca]
last-updated: 2026-06-02
status: published
maturity: documented
tags:
  - betslip
  - transactional
  - mobile
  - theming
  - bet-placement
  - shipped
summary: "Comprehensive documentation of the Full Betslip feature covering all bet types, error states, configurable elements, theming, rewards integration, and market-specific variations. This is the shipped specification for mobile betslip across all brands."
research:
  - title: "Odds Boost User Research"
    date: 2026-01
    owner: Chunyan Ren
    link: "[XRI SharePoint]/2026 UXR Study Reports/Odds Boost User Research-Jan 2026.pptx"
---

## Overview

The Full Betslip is the core transactional component in the sports betting experience. It handles bet construction, stake input, odds display, error handling, and bet confirmation across all bet types and brands.

**Figma source:** [Full Betslip — 🚀 Shipped](https://www.figma.com/design/fBkTpsuWPtoT0uNu3TODhk/Full-Betslip---%F0%9F%9A%80-Shipped?node-id=28219-88598)

**Status:** Shipped and live across all brands
**Platforms:** Mobile (primary), Tablet (adapted), Desktop (separate doc)

---

## Design Principles

These principles govern all betslip decisions. When in conflict, higher-numbered principles yield to lower:

1. **Never lose user intent** — Stake values, selections, and preferences must persist through errors, odds changes, and navigation. Users must never re-enter what they already told us.

2. **Make cost and reward crystal clear** — Total stake, potential returns, and any deductions (tax, token value) must be visible at all times without scrolling past the CTA.

3. **Errors are recoverable, not blocking** — Every error state must offer a clear next action. Avoid dead ends.

4. **Progressive complexity** — A single bet should feel effortless. Complexity only reveals when the user's selections demand it (system bets, combinability issues).

5. **Brand-agnostic logic, brand-specific skin** — Behaviour is identical across labels. Only visual theming and configurable toggles differ.

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

## Mobile Journeys

### Placing a Single Bet

**Figma:** [Single Bet Flow](https://www.figma.com/design/fBkTpsuWPtoT0uNu3TODhk?node-id=28219-88600)

**Entry points:**
- Tap odds button on any market → selection added → betslip counter increments
- Bet Bar slides up showing selection summary (see [Bet Bar docs](../bet-bar/))

**Flow:**

| Step | Screen State | User Action | System Response |
|------|-------------|-------------|-----------------|
| 1 | Bet Bar visible with 1 selection | Tap Bet Bar to expand | Full betslip slides up from bottom |
| 2 | Single selection card + stake input | Enter stake via numpad | Returns calculate in real-time |
| 3 | Stake entered, CTA active | Tap "Place Bet £X.XX" | Loading state on CTA (spinner replaces text) |
| 4 | Processing | — | Bet submitted to backend |
| 5 | Success | — | Bet Receipt screen replaces betslip |

**Interaction details:**
- Stake input auto-focuses on betslip open (keyboard slides up)
- Quick-stake chips: £1, £2, £5, £10, £20 (configurable per brand)
- Returns display updates on every keystroke (debounced 100ms)
- CTA disabled until stake > 0 and ≥ minimum
- CTA label format: "Place Bet · £{totalStake}" (shows total, not returns)
- On success: haptic feedback (light impact), bet receipt animates in

**Edge cases:**
- Odds change during stake input → yellow flash on odds value, no interruption
- Selection suspended mid-input → selection card shows "Suspended" badge, CTA disabled
- Network loss during placement → retry dialog with "Try Again" / "Cancel"
- User backgrounds app during placement → bet continues server-side, receipt shown on return

---

### Placing a Multi Bet (Accumulator)

**Figma:** [Multi Bet Flow](https://www.figma.com/design/fBkTpsuWPtoT0uNu3TODhk?node-id=28219-88620)

**Trigger:** 2+ combinable selections from different events

**Flow:**

| Step | Screen State | User Action | System Response |
|------|-------------|-------------|-----------------|
| 1 | Bet type tabs appear: Singles \| Multi | Tap "Multi" tab | Stake input changes to single combined field |
| 2 | Combined odds displayed | Enter stake | Combined returns shown |
| 3 | CTA active | Tap "Place Bet" | Same submission flow as singles |

**Key behaviours:**
- Default tab: **Multi** (when all selections are combinable). Research showed users adding multiple selections intend accas 73% of the time.
- Combined odds format: fractional by default (UK), configurable per user preference
- If one selection becomes non-combinable mid-build → auto-switch to Singles tab with explanation toast
- Acca Boost indicator shows above returns when eligible (≥3 legs)

**Acca Boost display logic:**

```
IF selections.count >= 3 AND all combinable:
  Show boost badge: "+{boostPercentage}% Acca Boost"
  Show original returns (struck through)
  Show boosted returns (highlighted)
  Show boost ladder: "Add 1 more for +{nextTierPercentage}%"
```

---

### Removing a Selection

**Interaction pattern:**
- Swipe left on selection card → reveals red "Remove" button (iOS pattern)
- Tap ✕ button on selection card (always visible, top-right)
- Both trigger: card collapses with 200ms ease-out animation

**Consequences:**

| Selections remaining | Result |
|---------------------|--------|
| 2+ combinable | Multi tab stays, odds recalculate |
| 1 remaining | Multi/System tabs disappear, revert to single |
| 0 remaining | Betslip closes, empty state on next open |

**Undo:** Toast appears for 5s: "Selection removed · Undo". Tap undo → card re-expands, odds restore.

---

## Error States

### Non-Combinable Error

**Figma:** [Non-Combinable States](https://www.figma.com/design/fBkTpsuWPtoT0uNu3TODhk?node-id=28219-88640)

**Trigger:** User adds selections that cannot be combined (e.g., both teams to win in same match, or correlated markets from same event in a multi).

**Display logic:**

```
IF new selection conflicts with existing:
  1. Selection IS added (never reject silently)
  2. Conflicting selections get orange warning badge
  3. Banner appears below header: "Some selections can't be combined"
  4. Multi tab disabled; Singles tab auto-selected
  5. Conflicting selections grouped with explanation:
     "These are from the same event and can't go in a multi"
```

**Resolution options:**
- Remove one of the conflicting selections
- Place as individual singles
- Move conflicting selections to a Build a Bet (if same-event)

**Design decision:** We show the conflict *after* adding rather than blocking the addition. Rationale: users found rejection confusing ("why won't it let me?") vs. explanation helpful ("oh, I see why these clash"). Validated in usability testing Feb 2025.

---

### Odds Acceptance

**Figma:** [Odds Change Flow](https://www.figma.com/design/fBkTpsuWPtoT0uNu3TODhk?node-id=28219-88680)

**Trigger:** Odds change between adding selection and placing bet.

**Three modes (user-configurable in settings):**

| Mode | Behaviour | CTA State |
|------|-----------|-----------|
| Always accept | Odds update silently, no interruption | Active |
| Accept higher only | Higher odds update silently; lower odds pause | Conditional |
| Never auto-accept | Any change pauses placement | Disabled until accepted |

**"Accept changes" flow (when paused):**
1. Odds value flashes yellow → settles to new value
2. Original odds shown struck-through for 3s
3. CTA changes to: "Accept & Place Bet" (green) / "Cancel" (secondary)
4. Returns recalculate with new odds
5. If odds change *again* during acceptance → reset the flow (show newest)

**Price movement indicators:**
- ↑ Green arrow: odds drifted higher (better for user)
- ↓ Red arrow: odds shortened (worse for user)
- Arrow persists for 5s then fades

---

## Promotions and Rewards

### Price Boost

**Figma:** [Price Boost in Betslip](https://www.figma.com/design/fBkTpsuWPtoT0uNu3TODhk?node-id=28219-88700)

**Display:**
- Boosted odds shown in highlight colour (brand-specific: Ladbrokes = red, Coral = yellow)
- Original odds shown struck-through to the left
- "BOOSTED" badge on selection card (uses `feedback.success` tokens)
- Boost flame icon alongside odds value

**Interaction rules:**
- Boosted selections cannot have stake > boost max stake (varies per offer)
- If user enters stake > max → inline error: "Max stake for this boost: £{max}"
- Boost applies to singles only (not combinable into accas unless explicitly allowed)
- Boost has expiry time → countdown shown if <5 mins remaining

**Research insight (from Odds Boost UXR, Jan 2026):**
> Users who are "value shoppers" compare boost value across bookmakers. Showing effective % uplift alongside the boosted odds helps comparison. Currently NOT shown — opportunity for future iteration.

---

### Acca Boost

**Ladder structure:**

| Legs | Boost | Display |
|------|-------|---------|
| 3 | +5% | Entry tier |
| 4 | +10% | |
| 5 | +15% | |
| 6 | +20% | |
| 7 | +25% | |
| 8+ | +30% | Max tier |

**Display in betslip:**
- Boost percentage badge next to combined odds
- "Your boost: +{X}%" with visual bar showing progress through ladder
- Below returns: "Boosted returns: £{boostedReturns}" (highlighted)
- Upsell prompt when 1 leg away from next tier: "Add 1 more for +{next}%!"

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

## Theming

The betslip inherits from DICE L1 tokens and applies L2 Sports-specific overrides:

| Brand | CTA Primary | Boost Highlight | Error | Surface |
|-------|------------|-----------------|-------|---------|
| Ladbrokes | `#C8102E` | `#C8102E` | `#D32F2F` | `#FFFFFF` |
| Coral | `#FFD700` (text: dark) | `#FFD700` | `#D32F2F` | `#1A1A2E` |
| bwin | `#FFD700` | `#FFD700` | `#D32F2F` | `#1C1C1C` |
| Sportingbet | `#00A651` | `#00A651` | `#D32F2F` | `#FFFFFF` |

**Note (June 2026):** Currently using hex codes as interim fix. L2 Semantic Tokens being discontinued by DICE; federated design system not yet ready.

---

## Accessibility

### Keyboard Navigation
- Tab order: Selection cards → Bet type tabs → Stake input → Quick-stake chips → CTA
- Selection removal: focused card → Delete/Backspace key
- Escape: closes betslip, returns focus to triggering odds button

### Screen Reader Announcements

| Event | Announcement |
|-------|-------------|
| Selection added | "Added {outcome} at {odds} for {event}. {count} selections in betslip." |
| Odds change | "Odds changed from {old} to {new} for {outcome}." |
| Error | "Error: {error message}. {resolution action}." |
| Bet placed | "Bet placed successfully. Potential returns {amount}." |
| Boost applied | "Acca Boost applied. {percentage} boost on {legs} selections." |

### Touch Targets
- All interactive elements: minimum 44×44pt
- Swipe-to-remove: requires 60px+ horizontal gesture to prevent accidental triggers
- Stake input: full-width tap area, not just the visible field

---

## Decision Log

| # | Decision | Alternatives Considered | Rationale | Date |
|---|----------|------------------------|-----------|------|
| 1 | Show conflicts after adding, not block | Block addition with toast; Modal confirmation | User testing showed blocking felt like rejection. Adding then explaining felt educational. | Feb 2025 |
| 2 | Default to Multi tab when ≥2 selections | Default to Singles; No default (remember last) | Analytics: 73% of multi-selection sessions result in acca placement. Reduces taps for majority. | Mar 2025 |
| 3 | 5-second undo on removal | No undo; Confirmation dialog before remove | Dialog adds friction to a frequent action. Undo is forgiving without being blocking. | Apr 2025 |
| 4 | Auto-focus stake input on open | No auto-focus; Focus after animation completes | Reduces time-to-place by ~1.5s. Keyboard appears immediately. | May 2025 |
| 5 | Combined CTA label shows stake not returns | Show returns; Show both; Show "Place Bet" only | Stake = what user commits. Returns = speculative. Clearer commitment signal. | Jun 2025 |

---

## Metrics & Success Criteria

| Metric | Target | Current | Source |
|--------|--------|---------|--------|
| Bet placement completion rate | >85% | 82% | Analytics |
| Error recovery rate (user continues after error) | >60% | 54% | Analytics |
| Time to place (single bet, from betslip open) | <15s | 12s | Analytics |
| Odds acceptance rate (when prompted) | >70% | 68% | Analytics |
| Betslip abandonment rate | <20% | 22% | Analytics |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.1 | 2026-06-02 | Tomek | Added accessibility spec, decision log, metrics |
| 3.0 | 2026-02-11 | David | Full shipped spec — all bet types documented |
| 2.5 | 2025-11-20 | David | Added system bets, BAB+ flows |
| 2.0 | 2025-08-14 | David | Redesign shipped — new component architecture |
| 1.0 | 2025-03-01 | David | Initial betslip documentation |

---

## Related Areas

- [Bet Bar](../bet-bar/) — Betslip launcher and selection preview
- [Quick Bet](../quick-bet/) — Simplified single-bet placement (bypasses full betslip)
- [Sports Promos](../sports-promos/) — Reward token integration
- [Bet Builder](../bet-builder/) — BAB/BAB+ construction flows
- [Price Boosts](../price-boosts/) — Boost mechanics and display
- [My Bets](../../post-bet/my-bets/) — Post-placement bet tracking
