import { describe, it, expect } from 'vitest';
import { validateForImport } from '../src/import-validation.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Builds a complete valid document with all required frontmatter, sections, and AI markers. */
function buildValidDocument(): string {
  return `---
title: Valid Test Document
subdomain: discovery
experience-area: market-layouts
document-type: guidelines
owner: Jane Smith
last-updated: 2024-06-15
status: draft
tags:
  - testing
  - validation
summary: A short summary for testing purposes.
---

<!-- ai:summary -->
<!-- ai:keywords -->
<!-- ai:constraints -->
<!-- ai:relationships -->
<!-- ai:scope -->

## Overview

This is the overview section content.

## Principles in Context

Principles content goes here.

## Current State

Current state content here.

## Guidelines

Guidelines content goes here.

## Examples

Examples content here.

## Research References

References content here.

## Decision Log

Decision log content here.

## Related Areas

Related areas content here.
`;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('validateForImport', () => {
  it('returns valid with no errors for a complete valid document', () => {
    const markdown = buildValidDocument();
    const result = validateForImport(markdown, 'pillars/sports/discovery/market-layouts/valid-document.md');

    expect(result.valid).toBe(true);
    expect(result.frontmatterErrors).toEqual([]);
    expect(result.structureErrors).toEqual([]);
    expect(result.namingErrors).toEqual([]);
  });

  it('reports frontmatter errors when required fields are missing', () => {
    // Missing 'title' and 'tags'
    const markdown = `---
subdomain: discovery
experience-area: market-layouts
document-type: guidelines
owner: Jane Smith
last-updated: 2024-06-15
status: draft
summary: A short summary for testing purposes.
---

<!-- ai:summary -->
<!-- ai:keywords -->
<!-- ai:constraints -->
<!-- ai:relationships -->
<!-- ai:scope -->

## Overview

Overview content.

## Principles in Context

Principles content.

## Current State

Current state content.

## Guidelines

Guidelines content.
`;

    const result = validateForImport(markdown, 'pillars/sports/discovery/market-layouts/valid-name.md');

    expect(result.valid).toBe(false);
    expect(result.frontmatterErrors.length).toBeGreaterThan(0);
    expect(result.frontmatterErrors.some(e => e.includes('title'))).toBe(true);
    expect(result.frontmatterErrors.some(e => e.includes('tags'))).toBe(true);
  });

  it('reports structure errors when required sections are missing', () => {
    // Has frontmatter but missing "Overview" and "Guidelines" sections
    const markdown = `---
title: Test Document
subdomain: discovery
experience-area: market-layouts
document-type: guidelines
owner: Jane Smith
last-updated: 2024-06-15
status: draft
tags:
  - testing
summary: A short summary for testing purposes.
---

<!-- ai:summary -->
<!-- ai:keywords -->
<!-- ai:constraints -->
<!-- ai:relationships -->
<!-- ai:scope -->

## Principles in Context

Principles content.

## Current State

Current state content.
`;

    const result = validateForImport(markdown, 'pillars/sports/discovery/market-layouts/valid-name.md');

    expect(result.valid).toBe(false);
    expect(result.structureErrors.length).toBeGreaterThan(0);
    expect(result.structureErrors.some(e => e.includes('overview'))).toBe(true);
    expect(result.structureErrors.some(e => e.includes('guidelines'))).toBe(true);
  });

  it('reports naming errors when the filename is not kebab-case', () => {
    const markdown = buildValidDocument();

    // Filename with spaces
    const result1 = validateForImport(markdown, 'pillars/sports/discovery/My Document.md');
    expect(result1.valid).toBe(false);
    expect(result1.namingErrors.length).toBeGreaterThan(0);

    // Filename with uppercase
    const result2 = validateForImport(markdown, 'pillars/sports/discovery/UPPER.md');
    expect(result2.valid).toBe(false);
    expect(result2.namingErrors.length).toBeGreaterThan(0);
  });

  it('reports errors in all three categories when document has multiple issues', () => {
    // Missing frontmatter fields + missing sections + bad filename
    const markdown = `---
subdomain: discovery
experience-area: market-layouts
document-type: guidelines
owner: Jane Smith
last-updated: 2024-06-15
status: draft
summary: A short summary for testing purposes.
---

## Principles in Context

Some content.
`;

    const result = validateForImport(markdown, 'pillars/sports/discovery/Bad Name Here.md');

    expect(result.valid).toBe(false);
    // Missing title and tags
    expect(result.frontmatterErrors.length).toBeGreaterThan(0);
    // Missing overview, current-state, guidelines + missing AI markers
    expect(result.structureErrors.length).toBeGreaterThan(0);
    // Non-kebab-case filename
    expect(result.namingErrors.length).toBeGreaterThan(0);
  });
});
