/**
 * Property-Based Tests for Import Validation
 *
 * Uses fast-check to verify universal properties of the import validation logic.
 * Minimum 100 iterations per property test.
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { validateForImport } from '../src/import-validation.js';
import { REQUIRED_SECTIONS } from '../src/structure-validator.js';
import { AI_MARKERS } from '../src/structure-validator.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** All required frontmatter fields. */
const REQUIRED_FRONTMATTER_FIELDS = [
  'title',
  'subdomain',
  'experience-area',
  'document-type',
  'owner',
  'last-updated',
  'status',
  'tags',
  'summary',
] as const;

/** Valid values for enum fields. */
const VALID_SUBDOMAINS = ['discovery', 'transactional', 'post-bet', 'cross-cutting-areas'];
const VALID_DOC_TYPES = ['overview', 'principles', 'patterns', 'research', 'decisions', 'guidelines', 'examples'];
const VALID_STATUSES = ['draft', 'in-review', 'published', 'deprecated'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates a fully-conforming markdown document with all required
 * frontmatter fields and all required structure sections + AI markers.
 * This serves as the base document that we then mutate to introduce violations.
 */
function buildValidDocument(): string {
  const frontmatter = [
    '---',
    'title: Valid Test Document',
    'subdomain: discovery',
    'experience-area: market-layouts',
    'document-type: guidelines',
    'owner: Jane Smith',
    'last-updated: 2024-06-15',
    'status: draft',
    'tags:',
    '  - testing',
    '  - validation',
    'summary: A valid test document for property-based testing of import validation.',
    '---',
  ].join('\n');

  const sections = [
    '## Overview\n\nThis is the overview section with content.\n',
    '## Principles in Context\n\nThis is the principles-in-context section.\n',
    '## Current State\n\nThis is the current-state section.\n',
    '## Guidelines\n\nThis is the guidelines section.\n',
    '## Examples\n\nSome examples here.\n',
    '## Research References\n\nReferences go here.\n',
    '## Decision Log\n\nDecisions documented here.\n',
    '## Related Areas\n\nRelated areas listed here.\n',
  ].join('\n');

  const markers = AI_MARKERS.join('\n');

  return `${frontmatter}\n\n${sections}\n${markers}\n`;
}

/**
 * Removes specified frontmatter fields from a valid document.
 * @param fieldsToRemove - Array of field names to remove from frontmatter
 */
function removeFields(markdown: string, fieldsToRemove: string[]): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inFrontmatter = false;
  let frontmatterCount = 0;
  let skipNextIndented = false;
  let currentField = '';

  for (const line of lines) {
    if (line.trim() === '---') {
      frontmatterCount++;
      inFrontmatter = frontmatterCount === 1;
      result.push(line);
      continue;
    }

    if (frontmatterCount >= 2) {
      // Past frontmatter, keep everything
      result.push(line);
      continue;
    }

    if (inFrontmatter) {
      // Check if this line starts a field
      const fieldMatch = line.match(/^([a-z-]+):/);
      if (fieldMatch) {
        currentField = fieldMatch[1];
        skipNextIndented = fieldsToRemove.includes(currentField);
        if (!skipNextIndented) {
          result.push(line);
        }
      } else if (line.match(/^\s+/)) {
        // Indented line (continuation of previous field, e.g. tags array items)
        if (!skipNextIndented) {
          result.push(line);
        }
      } else {
        skipNextIndented = false;
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Removes specified sections from a valid document by section slug.
 * Section slugs: 'overview', 'principles-in-context', 'current-state', 'guidelines'
 */
function removeSections(markdown: string, sectionsToRemove: string[]): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let currentSectionSlug: string | null = null;
  let skipping = false;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      const slug = headingMatch[1]
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      currentSectionSlug = slug;
      skipping = sectionsToRemove.includes(slug);
    }

    if (!skipping) {
      result.push(line);
    }
  }

  return result.join('\n');
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates a non-empty subset of required frontmatter fields to remove,
 * but never removes ALL fields (since that produces a different error category).
 */
const fieldsToRemoveArb = fc
  .subarray([...REQUIRED_FRONTMATTER_FIELDS], { minLength: 1 })
  .filter((arr) => arr.length > 0 && arr.length < REQUIRED_FRONTMATTER_FIELDS.length);

/**
 * Generates a non-empty subset of required structure sections to remove.
 */
const sectionsToRemoveArb = fc
  .subarray([...REQUIRED_SECTIONS], { minLength: 1 })
  .filter((arr) => arr.length > 0);

/**
 * Generates invalid filenames that will definitely fail kebab-case validation.
 * Uses constant-based approach to guarantee invalidity.
 */
const invalidFilenameArb = fc.oneof(
  // Filename with uppercase letters (guaranteed invalid kebab-case)
  fc
    .tuple(
      fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'),
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 1,
        maxLength: 10,
      })
    )
    .map(([upper, rest]) => `${upper}${rest}.md`),
  // Filename with underscores (invalid for kebab-case)
  fc
    .tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 1,
        maxLength: 8,
      }),
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 1,
        maxLength: 8,
      })
    )
    .map(([a, b]) => `${a}_${b}.md`),
  // Filename with spaces (invalid for kebab-case)
  fc
    .tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 1,
        maxLength: 8,
      }),
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 1,
        maxLength: 8,
      })
    )
    .map(([a, b]) => `${a} ${b}.md`),
  // Filename missing .md extension (has .txt instead)
  fc
    .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 2,
      maxLength: 10,
    })
    .map((s) => `${s}.txt`)
);

// ─── Property 10: Validation detects all violations ─────────────────────────

describe('Feature: document-import-workflow, Property 10: Validation detects all violations', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * For any generated document that is missing required frontmatter fields,
   * the Document Validator SHALL return a non-empty frontmatterErrors list
   * where each error identifies the missing field.
   */
  it('detects missing frontmatter fields and reports errors for each removed field', () => {
    fc.assert(
      fc.property(fieldsToRemoveArb, (fieldsToRemove) => {
        const validDoc = buildValidDocument();
        const brokenDoc = removeFields(validDoc, fieldsToRemove);
        const result = validateForImport(brokenDoc, 'pillars/sports/discovery/valid-doc.md');

        // The document should be invalid
        expect(result.valid).toBe(false);

        // frontmatterErrors should be non-empty
        expect(result.frontmatterErrors.length).toBeGreaterThan(0);

        // Each removed field should have a corresponding error
        for (const field of fieldsToRemove) {
          const hasErrorForField = result.frontmatterErrors.some(
            (err) => err.toLowerCase().includes(field)
          );
          expect(hasErrorForField).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * For any generated document that is missing required structure sections,
   * the Document Validator SHALL return a non-empty structureErrors list.
   */
  it('detects missing required sections and reports structure errors', () => {
    fc.assert(
      fc.property(sectionsToRemoveArb, (sectionsToRemove) => {
        const validDoc = buildValidDocument();
        const brokenDoc = removeSections(validDoc, sectionsToRemove);
        const result = validateForImport(brokenDoc, 'pillars/sports/discovery/valid-doc.md');

        // The document should be invalid
        expect(result.valid).toBe(false);

        // structureErrors should be non-empty
        expect(result.structureErrors.length).toBeGreaterThan(0);

        // Each removed section should have a corresponding error
        for (const section of sectionsToRemove) {
          const hasErrorForSection = result.structureErrors.some(
            (err) => err.toLowerCase().includes(section)
          );
          expect(hasErrorForSection).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * For any file path with an invalid filename (not kebab-case),
   * the Document Validator SHALL return a non-empty namingErrors list.
   */
  it('detects invalid filenames and reports naming errors', () => {
    fc.assert(
      fc.property(invalidFilenameArb, (invalidFilename) => {
        const validDoc = buildValidDocument();
        const targetPath = `pillars/sports/discovery/${invalidFilename}`;
        const result = validateForImport(validDoc, targetPath);

        // The document should be invalid
        expect(result.valid).toBe(false);

        // namingErrors should be non-empty
        expect(result.namingErrors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
