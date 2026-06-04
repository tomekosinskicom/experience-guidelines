---
title: "My Bets"
subdomain: post-bet
experience-area: my-bets
document-type: overview
owner: Sports UX Team
last-updated: 2026-06-03
status: published
maturity: documented
tags:
  - my-bets
  - post-bet
  - bet-tracking
  - settled
  - cash-out
  - edit-bet
figma-source: "https://www.figma.com/design/MtlVpbnyKwUTaf00v2DDM3/Sports-Mobile?node-id=6931-124806"
summary: "My Bets is the post-bet tracking area where users monitor active, open, and settled bets. Covers live/in-play tracking, open pre-match bets, settled bets with filtering, edit bet flows (add/remove selections, add stake), empty states, and bet card component variants."
---

## Overview

My Bets is the primary post-bet experience area where users track the progress and outcome of their placed bets. It provides real-time updates for live bets, visibility into upcoming pre-match bets, and a history of settled outcomes.

**Figma source:** [Sports Mobile — My Bets (Signed Off)](https://www.figma.com/design/MtlVpbnyKwUTaf00v2DDM3/Sports-Mobile?node-id=6931-124806)

**Status:** Signed off (Ready for Dev)

---

## Page Structure

My Bets uses a tabbed navigation to separate different bet states:

| Tab | Content | Default View |
|-----|---------|-------------|
| Live | Bets with at least one in-play event | Cards expanded, showing live scores |
| Open | Pre-match bets not yet started | Cards showing upcoming events |
| Settled | Resolved bets (won, lost, cashed out) | Grouped by date, filterable |

### Sticky Header

The page header area is sticky and contains:
1. Main header (brand header with account balance)
2. Page title ("My Bets")
3. Tab Group (Live / Open / Settled) with underline indicator

---

## Bet Card Component

The core component (`my bets/cards`) is a flexible card that adapts to bet type and status.

### Card Variants

| Bet Type | Description | Key Visual Differences |
|----------|-------------|----------------------|
| Single | One selection from one event | Single event display, direct odds |
| Multi | Multiple selections (accumulator) | Collapsible leg list, combined odds |
| Build a Bet | Same-game multi (SGP/BAB) | BAB badge, leg list, combined odds |

### Card States

| Bet Status | Visual Treatment | Actions Available |
|------------|-----------------|-------------------|
| In-play | Live indicator, real-time score updates, active odds | Cash out, view details |
| Pre-match | Upcoming event info, kick-off time | Edit bet, cash out (if available) |
| Settled — Won | Green win indicator, returns displayed | Re-bet, share |
| Settled — Lost | Loss indicator, stake shown | Re-bet |
| Settled — Cashed Out | Cash out confirmed badge, payout amount | N/A |

### Collapsed vs Expanded

| State | Behaviour | When Used |
|-------|-----------|-----------|
| Expanded (`collapsed: off`) | Full card showing all selections, odds, and actions | Default for first card, single bets |
| Collapsed (`collapsed: on`) | Compact card showing summary only (type, odds, status) | Multi and BAB cards when there are many bets |

---

## Live Tab

Shows all bets that have at least one event currently in play.

**Bet cards display:**
- Live score and match status prominently shown
- Real-time odds updates
- Cash out button (when available)
- Auto cash out option (bwin WL exclusive — hidden on other labels)

---

## Open Tab

Shows pre-match bets where events haven't started yet.

**Bet cards display:**
- Event details with kick-off time
- Current odds
- Edit bet option (add/remove selections, adjust stake)
- Cash out (if available pre-event)

---

## Settled Tab

Shows resolved bets grouped by date. Includes filtering and sorting options.

### Filtering

- **Filter bar:** Positioned at top of content area
- **Date grouping:** Bets grouped by settlement date
- **Bottom sheet filter:** Opens a modal with filter options (bet type, outcome, date range)

### Settled States

| Outcome | Indicator | Details Shown |
|---------|-----------|---------------|
| Won | Green badge/highlight | Returns amount, profit |
| Lost | Neutral/grey treatment | Stake lost |
| Cashed Out | Cash out badge | Payout amount received |

---

## Edit Bet Flows

Users can modify open (pre-match) bets through the Edit Bet experience.

### Add Selection

| Step | Screen | Description |
|------|--------|-------------|
| 1 | Edit bet view | Shows current selections with sticky bottom bar |
| 2 | Sports lobby modal | Opens football/sport lobby to browse markets |
| 3 | Selection added modal | Confirms new selection added to the bet |
| 4 | Add tray | Bottom tray showing updated bet with new pick |

### Remove Selection

| Step | Screen | Description |
|------|--------|-------------|
| 1 | Edit bet view | Current selections displayed with remove option |
| 2 | Remove confirmed | Pick removed, updated odds shown in sticky bottom bar |

### Add Stake

| Step | Screen | Description |
|------|--------|-------------|
| 1 | Keyboard view | Numeric keypad for entering additional stake |
| 2 | Confirmation | Shows updated bet with new total stake, "Save Changes" CTA |

### Edit Bet Bottom Bar

A sticky bottom component that shows during edit mode:
- Current bet summary (selections count, combined odds)
- Stake amount
- "Save Changes" CTA
- States: Default, Edit added stake

---

## Empty State

When the user has no bets in the current tab:
- Centred empty state illustration/icon
- Message: context-appropriate text (e.g., "No open bets" / "No settled bets")
- CTA to encourage placing a bet

---

## Decision Rules

| Question | Rule |
|----------|------|
| Which tab is default on My Bets entry? | Live (if user has live bets), otherwise Open |
| When does a bet move from Open to Live? | When the first event in the bet goes in-play |
| When does a bet move to Settled? | When all events in the bet have concluded and the bet is settled |
| Can users edit settled bets? | No — only open (pre-match) bets are editable |
| What happens to Live tab if no live bets? | Tab still visible but shows contextual empty state |
| Does cash out show on all bets? | Only when cash out is available (trading-determined, not guaranteed) |
| Is auto cash out available everywhere? | Only for bwin white label — hidden on all other brands |

<!-- TODO: Confirm the exact default tab logic — does it also consider Open if Live is empty? -->
<!-- TODO: Document cash out button states (available, suspended, not offered) in detail. -->
<!-- TODO: Define the maximum number of visible bet cards before pagination/infinite scroll kicks in. -->

---

## Related Areas

- [iOS Lock Screen Widget](./ios-lock-screen-widget.md) — Live tracking widget
- [Cash Out](../cash-out/) — Cash out feature within My Bets
- [Betslip](../../transactional/betslip/) — Bet placement (entry point to My Bets)
- [Bet Bar](../../transactional/bet-bar/) — Bet bar with My Bets entry point (configurable)
