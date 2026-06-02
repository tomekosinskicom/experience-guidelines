---
title: "In-store GBS Usability Study — Football Bet Builder Journey"
subdomain: retail
experience-area: bet-builder
document-type: research
owner: Chunyan Ren
last-updated: 2026-01-01
status: published
tags:
  - bet-builder
  - retail
  - gbs
  - usability
  - football
summary: "Usability study evaluating the football Bet Builder journey on in-store GBS terminals. Conducted in Ladbrokes and Coral shops with 7 retail customers. Key finding: growth is blocked by confidence gaps, not basic usability. Three friction clusters identified: Bet Builder eligibility comprehension, multi-match clarity in the bet slip, and decision support quality."
---

## Overview

This research evaluates the complete user journey for football Bet Builder on in-store GBS (Global Betting System) terminals. The study was conducted in January 2026 by Chunyan Ren (User Research Lead, Sports Pillar).

A key business driver for Retail in 2025 is Bet Builder, specifically around football. The target for Retail staking on football Bet Builder is to achieve close to £1m per week — currently the average weekly staking is £400k. At present, there are limited user insights into the end-to-end user experience on GBS, particularly for Bet Builder journeys.

## Principles in Context

The study applies core UX principles of clarity, confidence, and efficiency to the in-store betting context. The retail environment introduces unique constraints: users have limited time, unreliable mobile signal for second-screen research, and varying levels of familiarity with the GBS interface.

Design for confidence is the primary principle: users need to feel certain about what they're building, why markets are or aren't eligible, and whether their combined bets are structured correctly.

## Current State

### Methodology

A usability study evaluating the football Bet Builder journey on GBS with two scenarios:

1. **Exploratory:** Browse and build a Bet Builder of choice
2. **Direct intent:** Build multi-match Bet Builder (result + player + corner market)

Testing was conducted in person in Ladbrokes and Coral shops.

### Participants

- 7 Retail customers skewing to regular football bettors; many are habit-driven
- Most place football bets frequently, engaging with Bet Builder from weekly to several times a week
- Common markets: match results, goals over & under, corners, cards, player scoring
- Two behavioural modes:
  - **Habitual builders:** come with a plan, move fast, low browsing
  - **Decision-led builders:** browse markets/stats, sometimes use external apps for validation

## Guidelines

### What Works Well

- The core Bet Builder flow is learnable and fast for regular users
- Finding matches and selecting markets is generally easy
- Top market navigation helps users jump quickly between market types
- Homepage football list and left-nav sport entry are intuitive and familiar
- Users with strong intent move directly to leagues or specific matches without browsing

### Key Friction Points

#### 1. Bet Builder Eligibility Isn't Self-Evident

Users often don't notice or understand the Bet Builder icon. They rely on the Bet Builder tab or trial/error.

- Most users didn't notice the Bet Builder icon and didn't understand what it meant when prompted
- Eligibility is often only discovered via the BB tab or after encountering an error in the bet slip
- **Impact:** Creates hesitation and uncertainty, particularly for newer or less habitual users. Limits users' mental model of how Bet Builder works.

#### 2. Stats Are Seen as Shallow

Existing stats are easy to understand (except "Average Goals" graph), but are perceived as too generic to meaningfully support Bet Builder decision-making.

- Some users ignore stats because they've pre-researched; others rely on external apps (FlashScore) during build, which is painful with bad signal
- Graphs (average home/away goals) are hard to interpret at a glance
- Users desire more information: injuries/suspensions, player form and top scorers, corners/cards history
- **Impact:** Weak decision support lowers confidence. Less exploration and smaller bets. Encourages second-screen behaviour, unreliable with poor in-store signal.

#### 3. Multi-match Bet Builder in Bet Slip Causes Uncertainty

When adding multiple matches, the bet slip can look like separate bets, causing uncertainty about whether selections are correctly combined.

- Confusion at the review stage: "Is it one bet or two separate bets?"
- The repeated "Bet Builder" title above each match and the separation line add to confusion
- The combined message is low salience and placed low in the bet slip
- **Impact:** High risk moment right before commit — reduces confidence, may suppress stake size.

#### 4. Match Switching Is Functional but Inefficient

Users can switch matches and leagues when building Bet Builders, but the process requires unnecessary back and forth.

- Most users switch matches by navigating back to the football match list or league match list
- Some expected breadcrumbs to return to the previous match list
- **Impact:** Extra steps add friction to multi-match building.

#### 5. Error States Don't Consistently Teach

Error messages indicate that a market cannot be combined, but they don't always help users understand why.

- Understanding varies: some grasp the meaning immediately, others delete the selection without understanding the cause
- **Impact:** Users can complete the task, but learning does not consistently occur. Reinforces reliance on familiar markets rather than exploration.

#### 6. Left Navigation Icons ("Star" and "Timer")

Sports category icons are widely recognised without labels, but the "Star" and "Timer" icons are frequently misunderstood.

- Not a Bet Builder blocker, but lack of clarity leads to low engagement.

### Motivations and Barriers

**Core motivations for Bet Builder use:**
- Maximising returns through custom combinations (higher odds by combining markets they believe in)
- Control and confidence over bet construction (building the bet themselves vs. picking pre-built)
- Expressing personal football knowledge and beliefs

**What is NOT motivating Bet Builder use:**
- In-store inspiration or exploration (pre-built Bet Builders rarely noticed; users come with a plan)
- On-screen stats (seen as "too surface-level"; support confidence at best but don't trigger BB usage)

**Barriers:**
- Low awareness of multi-match Bet Builder availability

## Examples

No annotated design examples included in this study. Screenshots from GBS terminals were captured during sessions showing the bet slip confusion points and stats display limitations.

## Research References

- Study conducted: January 2026
- Researcher: Chunyan Ren, User Research Lead, Sports Pillar
- Method: In-person usability testing, Ladbrokes and Coral shops
- Participants: 7 retail customers (regular football bettors)

## Decision Log

### Strategic Recommendations (Jan 2026)

Growth is blocked by confidence gaps, not basic usability. The foundations are strong — growth will not come from reworking the core flow, but from improving clarity and confidence around it.

**Priority recommendations:**

1. **Design for confidence first, not discovery** — Users come with a plan; support execution, not browsing
2. **Market multi-match BB on screen** — Increase awareness that multi-match Bet Builder is available
3. **Improve the Bet Builder eligibility icon** — Add a tooltip to clarify which markets are eligible
4. **Stronger visual grouping in bet slip** — Clearer combined state at the top of the slip for multi-match
5. **Shift stats from generic to context-relevant** — Stats should reinforce confidence in the market being actively selected (player form, corners/cards history, injuries)
6. **Simplify visualisation for glanceability** — Average Goals graph is hard to parse
7. **Streamline match and league switching** — Reduce steps for multi-match building
8. **Strengthen explanatory feedback in error states** — Help users build a clearer mental model of eligibility
9. **Consider labels/tooltips for ambiguous nav icons** — "Star" and "Timer" icons need clarity

## Related Areas

- [Market Layouts Overview](./overview.md) — related-to
- [In-Play Market Stats EDP](./in-play-market-stats-edp.md) — related-to
