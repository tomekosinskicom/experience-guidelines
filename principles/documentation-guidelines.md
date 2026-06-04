---
title: "Documentation Guidelines"
subdomain: cross-cutting-areas
experience-area: principles
document-type: guidelines
owner: Tomek Osinski
last-updated: 2026-06-03
status: published
maturity: documented
tags:
  - documentation
  - guidelines
  - standards
  - writing
  - agent-friendly
summary: "Standards for writing experience area documentation. Defines required structure, writing style, quality bar, and agent-friendliness criteria to ensure every document is useful, consistent, and actionable."
---

## Overview

This document defines how to write experience area documentation for the Sports Experience Design Guidelines. It ensures every doc is consistent, scannable, and can be used by both humans and AI agents to make informed decisions.

**Three-question test:** Any reader should answer these within 60 seconds of opening a doc:
1. What does this feature do?
2. What rules govern its behaviour?
3. What varies per brand?

---

## Quality Principles

| # | Principle | What it means in practice |
|---|-----------|--------------------------|
| 1 | Rules over descriptions | Don't describe appearance — document the logic that determines behaviour |
| 2 | Tables over prose | States, decisions, configs belong in tables, not paragraphs |
| 3 | Decisions with rationale | Every non-obvious choice includes WHY (prevents re-litigation) |
| 4 | Honest gaps | Unknown info gets a `<!-- TODO -->` — a known gap beats a wrong guess |
| 5 | Pattern over project | Document how it WORKS now, not how it was DELIVERED |

---

## Document Structure

### Frontmatter (Required)

Every document starts with YAML frontmatter:

| Field | Required | Example |
|-------|:---:|---------|
| title | ✅ | "Betslip" |
| subdomain | ✅ | transactional |
| experience-area | ✅ | betslip |
| document-type | ✅ | overview / research / guidelines / patterns |
| owner | ✅ | David Lopez |
| contributors | | [Surrender, Bianca] |
| last-updated | ✅ | 2026-06-03 |
| status | ✅ | draft / published / deprecated |
| maturity | | not-started / in-progress / documented / validated |
| tags | ✅ | [betslip, transactional, mobile] |
| figma-source | | Figma file URL (omit query params with `---`) |
| summary | ✅ | ≤200 words describing what the doc covers |

---

### Required Sections

| Section | Purpose | Format |
|---------|---------|--------|
| **Overview** | What the feature is, who uses it, current status | 2-4 sentences + Figma link + platform info |
| **State Table** | All possible states the feature can be in | Table: State / Condition / Visual / User Actions |
| **Decision Rules** | IF/THEN logic governing behaviour | Table: Condition / Rule |
| **Configurable Elements** | What varies per brand/market/flag | Table: Element / Options / Configured via |
| **Edge Cases & Errors** | What happens when things go wrong | Table: Case / Behaviour / Resolution |
| **Related Areas** | Links to connected experience areas | List with relationship type |

### Recommended Sections

| Section | When to include | Format |
|---------|----------------|--------|
| **User Journey / Flow** | Complex multi-step features | Table: Step / User Action / System Response |
| **Component Anatomy** | Features with distinct UI zones | ASCII diagram or labelled breakdown |
| **Animation & Timing** | Features with transitions | Table: Interaction / Duration / Easing |
| **Decision Log** | Features with non-obvious choices | Table: # / Decision / Alternatives / Rationale / Date |
| **Accessibility** | All shipped features (aspire to always include) | Screen reader announcements, keyboard nav, touch targets |
| **Theming** | Multi-brand features | Table: Brand / Token values |
| **Metrics** | Features with defined KPIs | Table: Metric / Target / Current / Source |

---

## State Table Standards

The state table is the most important section. It answers "what can this feature be doing right now?"

**Rules for writing state tables:**

| Rule | Explanation |
|------|-------------|
| States are mutually exclusive | Only one state active at a time |
| Include entry condition | What triggers transition INTO this state |
| Include available actions | What the user CAN DO (not just what they see) |
| Include exit path | How to leave this state |
| Cover error and empty states | Not just happy-path states |

**Minimum viable state table:**

```markdown
| State | Condition | Visual | User Actions |
|-------|-----------|--------|-------------|
| Default | Normal | Standard | All actions available |
| Loading | Data fetching | Skeleton | Wait |
| Error | Request failed | Error message | Retry / dismiss |
| Empty | No data | Empty illustration | Navigate elsewhere |
```

---

## Decision Rules Standards

Decision rules make the document machine-actionable. An agent or developer can implement directly from a well-written rules table.

**Format:**

```markdown
| Condition | Rule |
|-----------|------|
| User has ≥3 legs AND all combinable | Show acca boost badge |
| User has token AND qualifying bet | Show reward indicator |
| Feature flag = off | Hide feature entirely |
```

**Rules for writing decision rules:**
- One rule per row (no compound logic in a single cell)
- Use specific values where known (≥3, not "multiple")
- State the negative case explicitly (don't assume the reader infers "otherwise hide")

---

## Writing Style

### Do

| Practice | Example |
|----------|---------|
| Plain language | "Tapping the button opens the betslip" |
| Specific values | "56px height", "250ms duration", "≥3 selections" |
| Present tense | "The bar shows..." not "The bar will show..." |
| Active voice | "User taps X" not "X is tapped by the user" |
| Real examples | "e.g., Arsenal to Win · 6/4" |
| Define acronyms first use | "Build a Bet (BAB)" |

### Don't

| Anti-pattern | Why it's bad |
|-------------|-------------|
| "Various options available" | Vague — list the actual options |
| "Handled as expected" | Expected by whom? State the behaviour |
| "Similar to [other feature]" without specifics | Forces the reader to look elsewhere |
| Describing visuals without behaviour | "It's a red badge" — so what? When does it show? |
| Sprint/project delivery details in content | Put Jira refs in frontmatter only |
| Assuming reader has context | Each doc should stand alone |

---

## Completeness Checklist

Before setting `status: published`:

| Check | Verified? |
|-------|:---------:|
| Overview explains feature in ≤4 sentences | |
| State table covers ALL states (including error/empty/loading) | |
| Decision rules are explicit IF/THEN format | |
| Configurable elements listed with config surface | |
| At least one user journey documented (complex features) | |
| Edge cases identified (even if some are TODO) | |
| Related areas linked | |
| Figma source included | |
| Summary in frontmatter is ≤200 words and accurate | |
| No undefined acronyms | |

---

## Agent-Friendliness Test

Score a document by whether an AI agent can answer these questions from it alone:

| Question | Source Section | Pass if... |
|----------|---------------|------------|
| "What states does X have?" | State table | All states listed with conditions |
| "When does X show?" | Decision rules | Explicit IF/THEN rules |
| "What happens if X fails?" | Edge cases / errors | Behaviour and resolution documented |
| "How does user do X?" | Journey / flow | Step-by-step with system responses |
| "What varies per brand?" | Configurable elements | Table with options and config surface |
| "Why was X designed this way?" | Decision log | Alternatives and rationale stated |

**Scoring:** Each question = 1 point. Published docs should score ≥4/6. Gold standard = 6/6.

---

## Naming & File Conventions

| Convention | Rule | Example |
|-----------|------|---------|
| File names | kebab-case, descriptive | `bottom-navigation.md`, `build-a-bet-in-house.md` |
| Folder structure | `pillars/{pillar}/{subdomain}/{area}/` | `pillars/sports/transactional/betslip/` |
| Overview file | Always `overview.md` | First file displayed on lobby page |
| Additional docs | Descriptive name, not generic | `bet-builder-plus-experience.md` not `document-2.md` |
| Assets folder | `assets/` within the area folder | `pillars/sports/transactional/bet-bar/assets/` |

---

## When to Create vs Update

| Scenario | Action |
|----------|--------|
| New feature ships | Create new doc following this guide |
| Existing feature gets significant changes | Update existing doc, bump `last-updated` |
| Feature is deprecated/removed | Set `status: deprecated`, add deprecation note |
| Research conducted | Create research doc (`document-type: research`) in the relevant area |
| Design decision made without shipping | Add to decision log of the relevant area doc |

---

## Related Areas

- [Organisation-Wide Design Principles](./organisation.md) — overarching design philosophy
- [Sports Betting UX Principles](../pillars/sports/principles.md) — sports-specific principles
