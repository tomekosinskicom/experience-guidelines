---
title: "Figma Project Template — Sports Betting"
subdomain: cross-cutting-areas
experience-area: figma-project-template
document-type: overview
owner: Sports UX Team
last-updated: 2026-04-16
status: published
tags:
  - figma
  - template
  - project-structure
  - workflow
summary: "Standard Figma file structure template for Sports Betting UX projects. Defines the page layout, naming conventions, and organisational structure that all Sports pillar designers should follow when setting up new project files."
---

## Overview

The Sports Betting Figma Project Template provides a standardised file structure for all UX projects within the Sports pillar. It ensures consistency across the team, makes files easily navigable by stakeholders, and aligns with the Sports UX Process phases.

**Template file:** [UX-XXXX | Project Name - Sports Betting Template](https://www.figma.com/design/emJ9swptHhbeztgsCBlAwm/UX-XXXX-%7C-Project-Name---Sports-Betting-Template?node-id=206-93)

## File Naming Convention

All Figma project files follow this naming pattern:

```
UX-XXXX | Project Name - Sports Betting Template
```

Where:
- `UX-XXXX` — the internal UX ticket/project number
- `Project Name` — a descriptive name for the feature or initiative

## Page Structure

The template defines the following page hierarchy:

### 🌇 Thumbnail
Cover page with project branding. Uses the shared thumbnail component with brand variant support (Ladbrokes, Coral, ROW).

### 🧠 Problem Statement
Documents the problem being solved, business context, user needs, and success criteria. This is the first thing stakeholders see.

### ✅ READY FOR DEVS
Finalised designs that have been approved and are ready for developer handoff. This is the source of truth for implementation.

### 🟢 Final Designs - SPO-XXXXXX - Jira name
Completed designs linked to specific Jira tickets. Each page is named with the Jira ticket reference for traceability.

### 🟡 SPO-XXXXXX - [Current work item / sprint page]
Work-in-progress designs for the current sprint. Named with the active Jira ticket reference.

### 🔎 Research & competitor analysis
Competitive analysis, benchmarking, and research artefacts gathered during the Research phase of the UX Process.

### 🕺 Playground & exploration
Divergent explorations, rough ideas, and brainstorming outputs. Used during the UX Design phase for creative divergence before convergence.

### 💼 PM Vis. Board
Visualisation board for product managers — a high-level view of the feature for stakeholder communication and alignment.

### 🎬 Prototype
Interactive prototype screens and flows for user testing and stakeholder demos.

### 📁 Archive
Previous iterations and superseded designs. Kept for reference but no longer active.

### 🗑 Bin
Discarded work. Kept temporarily before permanent deletion.

## Guidelines

### Page Separators

Use pages named `---` as visual separators between logical sections in the page list. This groups related pages and improves scannability.

### Naming Conventions

- **Final design pages** use 🟢 prefix with Jira ticket reference
- **Active work pages** use 🟡 prefix with Jira ticket reference
- **Utility pages** use emoji prefixes matching their function
- All Jira references follow the `SPO-XXXXXX` format

### When to Duplicate This Template

Duplicate this template when:
- Starting any new Sports Betting UX project
- Creating a new feature exploration
- Setting up a new initiative file

### Brand Variants

The thumbnail component supports multiple brand variants:
- Ladbrokes
- Coral
- New ROW (default)

Select the appropriate brand when setting up your project thumbnail.

## Related Areas

- [UX Process](../ux-process/guidelines.md) — related-to
- [Sports Pillar Overview](../../index.md) — related-to
