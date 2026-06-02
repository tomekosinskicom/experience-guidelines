/**
 * Unit tests for the Document Structure Validator.
 *
 * Tests cover:
 * - Section parsing from Markdown
 * - Section order validation
 * - Required sections presence
 * - Word count enforcement (≤3000 words)
 * - AI annotation marker presence
 */

import { describe, it, expect } from 'vitest';
import {
  validateStructure,
  parseSections,
  stripFrontmatter,
  slugify,
  countWords,
  validateSectionOrder,
  validateRequiredSections,
  validateWordCount,
  validateAIMarkers,
  SECTION_ORDER,
  REQUIRED_SECTIONS,
  AI_MARKERS,
  MAX_CONTENT_WORDS,
} from '../src/structure-validator.js';

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Builds a minimal valid document with all required sections and AI markers. */
function buildValidDocument(options?: {
  overviewWords?: number;
  principlesWords?: number;
  currentStateWords?: number;
  guidelinesWords?: number;
  relatedAreasWords?: number;
  includeOptionalSections?: boolean;
  includeMarkers?: boolean;
}): string {
  const {
    overviewWords = 50,
    principlesWords = 50,
    currentStateWords = 50,
    guidelinesWords = 50,
    relatedAreasWords = 50,
    includeOptionalSections = false,
    includeMarkers = true,
  } = options ?? {};

  const generateWords = (count: number) =>
    Array.from({ length: count }, (_, i) => `word${i}`).join(' ');

  const markers = includeMarkers
    ? AI_MARKERS.map((m) => m).join('\n')
    : '';

  let doc = `---
title: Test Document
subdomain: discovery
experience-area: test-area
document-type: guidelines
owner: Test Designer
last-updated: 2025-01-15
status: draft
tags:
  - test
summary: A test document for validation.
---

${markers}

## Overview

${generateWords(overviewWords)}

## Principles in Context

${generateWords(principlesWords)}

## Current State

${generateWords(currentStateWords)}

## Guidelines

${generateWords(guidelinesWords)}
`;

  if (includeOptionalSections) {
    doc += `
## Examples

Some example content here.

## Research References

- Reference 1
- Reference 2

## Decision Log

| Date | Decision |
|------|----------|
| 2025-01-01 | Initial decision |

## Related Areas

${generateWords(relatedAreasWords)}
`;
  }

  return doc;
}

// ─── slugify ─────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('converts heading to lowercase kebab-case', () => {
    expect(slugify('Overview')).toBe('overview');
    expect(slugify('Principles in Context')).toBe('principles-in-context');
    expect(slugify('Current State')).toBe('current-state');
    expect(slugify('Research References')).toBe('research-references');
    expect(slugify('Decision Log')).toBe('decision-log');
    expect(slugify('Related Areas')).toBe('related-areas');
  });

  it('handles extra whitespace', () => {
    expect(slugify('  Overview  ')).toBe('overview');
    expect(slugify('Principles   in   Context')).toBe('principles-in-context');
  });
});

// ─── countWords ──────────────────────────────────────────────────────────────

describe('countWords', () => {
  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('counts words correctly', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('hello')).toBe(1);
  });

  it('handles multiple whitespace between words', () => {
    expect(countWords('one   two\n\nthree')).toBe(3);
  });
});

// ─── stripFrontmatter ────────────────────────────────────────────────────────

describe('stripFrontmatter', () => {
  it('strips YAML frontmatter delimited by ---', () => {
    const doc = '---\ntitle: Test\n---\n\n## Overview\n\nContent here.';
    const body = stripFrontmatter(doc);
    expect(body).toBe('## Overview\n\nContent here.');
  });

  it('returns full content if no frontmatter', () => {
    const doc = '## Overview\n\nContent here.';
    expect(stripFrontmatter(doc)).toBe(doc);
  });

  it('returns full content if frontmatter is not closed', () => {
    const doc = '---\ntitle: Test\n\n## Overview\n\nContent here.';
    expect(stripFrontmatter(doc)).toBe(doc);
  });
});

// ─── parseSections ───────────────────────────────────────────────────────────

describe('parseSections', () => {
  it('parses sections from ## headings', () => {
    const body = '## Overview\n\nSome content.\n\n## Guidelines\n\nMore content.';
    const sections = parseSections(body);

    expect(sections).toHaveLength(2);
    expect(sections[0].name).toBe('Overview');
    expect(sections[0].slug).toBe('overview');
    expect(sections[0].content).toContain('Some content.');
    expect(sections[1].name).toBe('Guidelines');
    expect(sections[1].slug).toBe('guidelines');
  });

  it('calculates word count for each section', () => {
    const body = '## Overview\n\none two three four five';
    const sections = parseSections(body);

    expect(sections[0].wordCount).toBe(5);
  });

  it('ignores content before first ## heading', () => {
    const body = 'Some preamble text\n\n## Overview\n\nContent.';
    const sections = parseSections(body);

    expect(sections).toHaveLength(1);
    expect(sections[0].slug).toBe('overview');
  });

  it('handles empty sections', () => {
    const body = '## Overview\n\n## Guidelines\n\nContent.';
    const sections = parseSections(body);

    expect(sections).toHaveLength(2);
    expect(sections[0].wordCount).toBe(0);
    expect(sections[1].content).toContain('Content.');
  });

  it('does not treat ### as section headings', () => {
    const body = '## Overview\n\n### Subsection\n\nContent.';
    const sections = parseSections(body);

    expect(sections).toHaveLength(1);
    expect(sections[0].content).toContain('### Subsection');
    expect(sections[0].content).toContain('Content.');
  });
});

// ─── validateSectionOrder ────────────────────────────────────────────────────

describe('validateSectionOrder', () => {
  it('returns no errors for correct order', () => {
    const sections = [
      { name: 'Overview', slug: 'overview', content: '', wordCount: 0 },
      { name: 'Principles in Context', slug: 'principles-in-context', content: '', wordCount: 0 },
      { name: 'Current State', slug: 'current-state', content: '', wordCount: 0 },
      { name: 'Guidelines', slug: 'guidelines', content: '', wordCount: 0 },
    ];

    const errors = validateSectionOrder(sections, 'test.md');
    expect(errors).toHaveLength(0);
  });

  it('returns errors for incorrect order', () => {
    const sections = [
      { name: 'Guidelines', slug: 'guidelines', content: '', wordCount: 0 },
      { name: 'Overview', slug: 'overview', content: '', wordCount: 0 },
    ];

    const errors = validateSectionOrder(sections, 'test.md');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].category).toBe('structure');
    expect(errors[0].rule).toBe('order');
  });

  it('ignores unknown sections when checking order', () => {
    const sections = [
      { name: 'Overview', slug: 'overview', content: '', wordCount: 0 },
      { name: 'Custom Section', slug: 'custom-section', content: '', wordCount: 0 },
      { name: 'Guidelines', slug: 'guidelines', content: '', wordCount: 0 },
    ];

    const errors = validateSectionOrder(sections, 'test.md');
    expect(errors).toHaveLength(0);
  });

  it('detects out-of-order optional sections', () => {
    const sections = [
      { name: 'Overview', slug: 'overview', content: '', wordCount: 0 },
      { name: 'Related Areas', slug: 'related-areas', content: '', wordCount: 0 },
      { name: 'Decision Log', slug: 'decision-log', content: '', wordCount: 0 },
    ];

    const errors = validateSectionOrder(sections, 'test.md');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── validateRequiredSections ────────────────────────────────────────────────

describe('validateRequiredSections', () => {
  it('returns no errors when all required sections are present', () => {
    const sections = REQUIRED_SECTIONS.map((slug) => ({
      name: slug,
      slug,
      content: 'content',
      wordCount: 10,
    }));

    const errors = validateRequiredSections(sections, 'test.md');
    expect(errors).toHaveLength(0);
  });

  it('returns errors for each missing required section', () => {
    const sections = [
      { name: 'overview', slug: 'overview', content: 'content', wordCount: 10 },
    ];

    const errors = validateRequiredSections(sections, 'test.md');
    // Missing: principles-in-context, current-state, guidelines
    expect(errors).toHaveLength(3);
    expect(errors.every((e) => e.rule === 'required')).toBe(true);
  });

  it('returns 4 errors when no sections are present', () => {
    const errors = validateRequiredSections([], 'test.md');
    expect(errors).toHaveLength(4);
  });

  it('does not require optional sections', () => {
    const sections = REQUIRED_SECTIONS.map((slug) => ({
      name: slug,
      slug,
      content: 'content',
      wordCount: 10,
    }));

    const errors = validateRequiredSections(sections, 'test.md');
    expect(errors).toHaveLength(0);
  });
});

// ─── validateWordCount ───────────────────────────────────────────────────────

describe('validateWordCount', () => {
  it('returns no errors when word count is within limit', () => {
    const sections = [
      { name: 'Overview', slug: 'overview', content: '', wordCount: 500 },
      { name: 'Principles in Context', slug: 'principles-in-context', content: '', wordCount: 500 },
      { name: 'Current State', slug: 'current-state', content: '', wordCount: 500 },
      { name: 'Guidelines', slug: 'guidelines', content: '', wordCount: 500 },
      { name: 'Related Areas', slug: 'related-areas', content: '', wordCount: 500 },
    ];

    const errors = validateWordCount(sections, 'test.md');
    expect(errors).toHaveLength(0);
  });

  it('returns no errors at exactly 3000 words', () => {
    const sections = [
      { name: 'Overview', slug: 'overview', content: '', wordCount: 600 },
      { name: 'Principles in Context', slug: 'principles-in-context', content: '', wordCount: 600 },
      { name: 'Current State', slug: 'current-state', content: '', wordCount: 600 },
      { name: 'Guidelines', slug: 'guidelines', content: '', wordCount: 600 },
      { name: 'Related Areas', slug: 'related-areas', content: '', wordCount: 600 },
    ];

    const errors = validateWordCount(sections, 'test.md');
    expect(errors).toHaveLength(0);
  });

  it('returns error when word count exceeds 3000', () => {
    const sections = [
      { name: 'Overview', slug: 'overview', content: '', wordCount: 1000 },
      { name: 'Principles in Context', slug: 'principles-in-context', content: '', wordCount: 1000 },
      { name: 'Current State', slug: 'current-state', content: '', wordCount: 500 },
      { name: 'Guidelines', slug: 'guidelines', content: '', wordCount: 500 },
      { name: 'Related Areas', slug: 'related-areas', content: '', wordCount: 100 },
    ];

    // Total: 3100 > 3000
    const errors = validateWordCount(sections, 'test.md');
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('maxWords');
    expect(errors[0].message).toContain('3100');
  });

  it('does not count words from excluded sections (examples, research-references, decision-log)', () => {
    const sections = [
      { name: 'Overview', slug: 'overview', content: '', wordCount: 500 },
      { name: 'Principles in Context', slug: 'principles-in-context', content: '', wordCount: 500 },
      { name: 'Current State', slug: 'current-state', content: '', wordCount: 500 },
      { name: 'Guidelines', slug: 'guidelines', content: '', wordCount: 500 },
      { name: 'Examples', slug: 'examples', content: '', wordCount: 5000 },
      { name: 'Research References', slug: 'research-references', content: '', wordCount: 5000 },
      { name: 'Decision Log', slug: 'decision-log', content: '', wordCount: 5000 },
      { name: 'Related Areas', slug: 'related-areas', content: '', wordCount: 500 },
    ];

    // Content total: 500+500+500+500+500 = 2500 (excludes examples, research, decision-log)
    const errors = validateWordCount(sections, 'test.md');
    expect(errors).toHaveLength(0);
  });
});

// ─── validateAIMarkers ───────────────────────────────────────────────────────

describe('validateAIMarkers', () => {
  it('returns no errors when all markers are present', () => {
    const doc = AI_MARKERS.join('\n') + '\n\n## Overview\n\nContent.';
    const errors = validateAIMarkers(doc, 'test.md');
    expect(errors).toHaveLength(0);
  });

  it('returns errors for each missing marker', () => {
    const doc = '## Overview\n\nContent with no markers.';
    const errors = validateAIMarkers(doc, 'test.md');
    expect(errors).toHaveLength(5);
    expect(errors.every((e) => e.rule === 'required-marker')).toBe(true);
  });

  it('returns error for a single missing marker', () => {
    // Include 4 of 5 markers
    const markers = AI_MARKERS.slice(0, 4);
    const doc = markers.join('\n') + '\n\n## Overview\n\nContent.';
    const errors = validateAIMarkers(doc, 'test.md');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('<!-- ai:scope -->');
  });

  it('finds markers anywhere in the document', () => {
    const doc = `---
title: Test
---

## Overview

<!-- ai:summary -->
<!-- ai:keywords -->

Content here.

## Guidelines

<!-- ai:constraints -->
<!-- ai:relationships -->
<!-- ai:scope -->

More content.`;

    const errors = validateAIMarkers(doc, 'test.md');
    expect(errors).toHaveLength(0);
  });
});

// ─── validateStructure (integration) ─────────────────────────────────────────

describe('validateStructure', () => {
  it('returns valid for a well-formed document', () => {
    const doc = buildValidDocument({ includeOptionalSections: true });
    const result = validateStructure(doc, 'discovery/test-area/guidelines.md');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid when required sections are missing', () => {
    const doc = `---
title: Test
---

${AI_MARKERS.join('\n')}

## Overview

Some content here.
`;

    const result = validateStructure(doc, 'test.md');
    expect(result.valid).toBe(false);
    // Missing: principles-in-context, current-state, guidelines
    const missingErrors = result.errors.filter((e) => e.rule === 'required');
    expect(missingErrors.length).toBe(3);
  });

  it('returns invalid when sections are out of order', () => {
    const doc = `---
title: Test
---

${AI_MARKERS.join('\n')}

## Guidelines

Guidelines content.

## Overview

Overview content.

## Principles in Context

Principles content.

## Current State

State content.
`;

    const result = validateStructure(doc, 'test.md');
    expect(result.valid).toBe(false);
    const orderErrors = result.errors.filter((e) => e.rule === 'order');
    expect(orderErrors.length).toBeGreaterThan(0);
  });

  it('returns invalid when word count exceeds 3000', () => {
    const doc = buildValidDocument({
      overviewWords: 1000,
      principlesWords: 1000,
      currentStateWords: 500,
      guidelinesWords: 500,
      relatedAreasWords: 100,
      includeOptionalSections: true,
    });

    // Total: 1000+1000+500+500+100 = 3100 > 3000
    const result = validateStructure(doc, 'test.md');
    expect(result.valid).toBe(false);
    const wordErrors = result.errors.filter((e) => e.rule === 'maxWords');
    expect(wordErrors).toHaveLength(1);
  });

  it('returns invalid when AI markers are missing', () => {
    const doc = buildValidDocument({ includeMarkers: false });
    const result = validateStructure(doc, 'test.md');

    expect(result.valid).toBe(false);
    const markerErrors = result.errors.filter((e) => e.rule === 'required-marker');
    expect(markerErrors).toHaveLength(5);
  });

  it('reports document path in all errors', () => {
    const doc = '## Guidelines\n\nContent.';
    const result = validateStructure(doc, 'discovery/area/guidelines.md');

    for (const error of result.errors) {
      expect(error.path).toBe('discovery/area/guidelines.md');
    }
  });

  it('handles document with no frontmatter', () => {
    const doc = `${AI_MARKERS.join('\n')}

## Overview

Content.

## Principles in Context

Content.

## Current State

Content.

## Guidelines

Content.
`;

    const result = validateStructure(doc, 'test.md');
    expect(result.valid).toBe(true);
  });

  it('passes at exactly 3000 words', () => {
    const doc = buildValidDocument({
      overviewWords: 600,
      principlesWords: 600,
      currentStateWords: 600,
      guidelinesWords: 600,
      relatedAreasWords: 600,
      includeOptionalSections: true,
    });

    const result = validateStructure(doc, 'test.md');
    // Should be valid (3000 words exactly)
    const wordErrors = result.errors.filter((e) => e.rule === 'maxWords');
    expect(wordErrors).toHaveLength(0);
  });
});
