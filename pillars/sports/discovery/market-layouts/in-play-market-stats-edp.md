---
title: "In-Play Market Stats on EDP"
subdomain: discovery
experience-area: market-layouts
document-type: guideline
owner: Tomek
last-updated: 2026-06-02
status: draft
maturity: in-progress
tags:
  - market-layouts
  - in-play
  - gamelines
  - metadata
  - edp
  - stats
summary: "Design guidelines for displaying in-play statistical metadata on Game Lines (6-Pack) markets within the Event Detail Page (EDP). Covers bet distribution visualisation, line-value mapping, and edge-case handling."
relationships:
  related-to:
    - "pillars/sports/discovery/market-layouts/overview.md"
    - "pillars/sports/cross-cutting-areas/live-betting/research.md"
figma-source: "https://www.figma.com/design/Nfma3jWuTYPBf1wkcLqrv7/SPO-10019-%7C-In-play-Stats-EDP?node-id=3121-391"
jira-ticket: SPO-10019
---

## Overview

<!-- ai:summary -->
<!-- ai:keywords -->

This guideline documents the design approach for displaying in-play statistical metadata on Game Lines (6-Pack) markets within the Event Detail Page (EDP). The feature enriches market cards with bet distribution data so customers can see how other bettors are distributed across selections, helping inform their decision-making.

The metadata is displayed as a graphical representation of bet volume distribution mapped to each selection's specific line value. When line values change (common in live markets), the associated metadata updates in sync.

**Scope:** Football (primary), Basketball (secondary). Mobile-first with multi-brand theming support.

---

## Principles in Context

- **Informed Betting** — Provide customers with contextual data that supports decision-making without overloading the market card.
- **Data Integrity** — Metadata must always be mapped to the correct, currently-displayed line value. Stale or misaligned data is worse than no data.
- **Progressive Disclosure** — Stats supplement the core betting experience; they must not displace odds or interfere with selection interaction.

---

## Problem Statement

For the Game Lines (6-Pack) markets, we should display metadata representing the number of bets placed on each market (and the specific line value shown). Metadata helps customers decide on the outcome they will place a bet on.

---

## Functional Requirements

- Display graphic metadata representing bet distribution for each Game Lines selection.
- Metadata must be mapped to the specific line value shown for that selection.
- Metadata must update when the associated line value changes.

---

## Scope Constraints (Must Not Change)

- Odds display and calculation must remain unchanged.
- Market structure (Game Lines layout and grouping) must remain unchanged.
- Selection interaction (tap/click behaviour) must remain unchanged.

---

## Stat Display State Table

| State | Condition | Visual Behaviour | Fallback |
|-------|-----------|-----------------|----------|
| **Happy Path** | Bet volume data available, line value stable | Stat bar renders below selections showing relative distribution | N/A |
| **No Bet Volume** | Insufficient data (new market, low traffic) | No metadata renders; market card uses default layout | Silent removal — no placeholder |
| **Market Suspended** | Market suspended during in-play event | Metadata paused; bar hidden alongside market | Follows existing suspension pattern |
| **Market Resumed** | Market resumes after suspension | Metadata refreshes with current values and re-renders | N/A |
| **Rapid Line Change** | Line values change faster than metadata refresh | Stale metadata suppressed until fresh data aligns | Bar hidden temporarily |
| **Data Feed Drops** | Metadata was visible but data feed lost mid-session | Bar gracefully removed without layout shift | Silent removal |
| **Single Selection Dominance** | One selection has near-100% distribution | Bar renders proportionally; minority side never collapses to zero-width | Minimum visible width enforced |
| **Compact Card** | Small viewport or constrained market card | Metadata may be truncated or hidden | Core betting functionality preserved |

---

## Decision Rules

Use these rules when deciding whether to show stat metadata:

| Rule | Decision |
|------|----------|
| Data available AND line value stable | ✅ Show metadata |
| Data available BUT line value just changed | ⏸ Suppress until data aligns with new line |
| No data OR volume too low | ❌ Do not render — silent fallback |
| Market is suspended | ❌ Hide metadata alongside market |
| Market resumed after suspension | ✅ Refresh and show if data available |
| Layout cannot accommodate metadata (compact) | ❌ Hide metadata; preserve betting UX |
| Data feed drops after metadata was visible | ❌ Remove gracefully, no layout shift |

---

## Guidelines

<!-- ai:constraints -->
<!-- ai:relationships -->

### Happy Path — Metadata Available

When bet volume data is available for a Game Lines market:

- Display a graphical bar or indicator showing relative bet distribution across selections.
- The metadata visualisation sits within the market card, below or adjacent to the odds.
- Distribution is shown as a comparative representation (e.g., percentage bars) between selections.
- Each selection's metadata corresponds to its currently displayed line value.

### No Bet Volume / Low Volume

When insufficient bet volume data is available:

- Do **not** display empty or zero-state metadata indicators.
- The market card falls back to its default layout (without metadata).
- No placeholder or "no data" messaging is shown — the feature simply does not render.

### Market Suspended

When a market is suspended during an in-play event:

- Metadata display is paused alongside the market.
- Upon market resumption, metadata refreshes and re-displays with current values.
- Suspended state visual treatment follows existing market suspension patterns.

### Metadata Placement

- Metadata sits below the selection buttons within the market card.
- It does not increase the touch-target area of selections.
- Spacing between metadata and selection buttons is consistent with design-system spacing tokens.
- On compact market cards, metadata may be truncated or hidden to preserve core betting functionality.

### Visual Treatment

- Use a horizontal bar or proportional indicator to show distribution.
- Colours follow the brand's semantic colour tokens (not hardcoded).
- The visualisation must be legible in both light and dark themes.
- Accessibility: ensure sufficient contrast ratio (min 4.5:1) and do not rely solely on colour to convey information.

### Edge Cases

- **Rapid line changes**: If line values change faster than metadata can refresh, suppress stale metadata rather than showing misaligned data.
- **Single selection dominance**: If one selection has near-100% distribution, still render the bar proportionally (do not collapse the minority side to zero-width).
- **Data unavailable mid-session**: If metadata was displayed but data feed drops, gracefully remove the visualisation without layout shift.

---

## Configurable Elements

| Element | Configuration Surface | Default | Notes |
|---------|----------------------|---------|-------|
| Feature flag (show/hide metadata) | Per brand | Off | Controls whether metadata renders at all |
| Stat bar colour — majority | Brand semantic token | Primary action colour | Must pass 4.5:1 contrast in both themes |
| Stat bar colour — minority | Brand semantic token | Secondary/muted | Must remain visible (min width enforced) |
| Stat bar height | Design-system spacing scale | 4px | Follows spacing token |
| Stat bar corner radius | Design-system radius scale | 2px | Follows radius token |
| Minimum bar segment width | Fixed | 8px | Prevents zero-width rendering |
| Refresh debounce on line change | Time (ms) | TBD | Prevents flicker on rapid line changes |

<!-- TODO: Confirm refresh debounce timing with engineering — what is the acceptable delay before re-rendering? -->
<!-- TODO: Define minimum bet volume threshold for "data available" — is this a percentage, absolute count, or configurable per brand? -->

---

## Component Map

| Layer | Component | ID | L3 Customisation Surface |
|-------|-----------|-----|--------------------------|
| Compound | DS Card (clickable=false) | C.xx | Surface, elevated, border, radius tokens |
| Pattern | Market Card (6-Pack) | O.xx | Metadata slot (presence via feature flag) |
| Primitive | Stat Bar | P.xx | Colour tokens, height token |

L3 Assembly Decisions:
- Metadata slot is controlled by feature flag per brand.
- Bar colours use brand semantic tokens for distribution visualisation.
- Stat bar height and corner radius follow design-system spacing scale.

---

## Theming

The metadata visualisation supports multi-brand theming:

- All colours reference design-system variable tokens (not hardcoded hex values).
- Tested across light/dark modes.
- Market card container uses `DS Card (clickable=false)` component with surface/elevated/border/radius variants.
- Brand-specific label treatments are supported via the design-system theming layer.

---

## Examples

- **Figma Source**: [SPO-10019 | In-Play Stats EDP — Documentation](https://www.figma.com/design/Nfma3jWuTYPBf1wkcLqrv7/SPO-10019-%7C-In-play-Stats-EDP?node-id=3121-391)
- Key screens documented: Current Journey, Happy Path, No Bet Volume, Market Suspended, Visual Treatment, Edge Cases, Metadata Placement, Theming

---

## Research References

- Reference (non-binding): Visual approach inspired by BetMGM-style market metadata.
- See competitor analysis in Figma file (page: "🤺 Competitor Analysis").

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-02 | Metadata suppressed when data unavailable rather than showing empty state | Avoids misleading customers with zero/stale values |
| 2026-06-02 | Metadata bound to specific line value, not market-level | Game Lines frequently shift line values; metadata must track per-selection |
| 2026-06-02 | Scope limited to Game Lines (6-Pack) initially | Highest-volume market type; validates pattern before broader rollout |

---

## Related Areas

- [Market Layouts — Overview](overview.md) — Parent experience area
- [Live Betting](../../cross-cutting-areas/live-betting/research.md) — Cross-cutting in-play patterns
- [Promo Tokens](../promo-tokens/research.md) — Adjacent market enrichment patterns
