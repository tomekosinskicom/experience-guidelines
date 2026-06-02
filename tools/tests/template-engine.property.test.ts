/**
 * Property-Based Tests for TemplateEngine
 *
 * Uses fast-check to verify universal properties of the template engine logic.
 * Minimum 100 iterations per property test.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.2, 8.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { TemplateEngine } from '../src/template-engine.js';
import {
  TEMPLATE_SECTIONS,
  RESEARCH_EXTRA_SECTIONS,
  PLACEHOLDER_TEXT,
  type ExtractedContent,
  type TemplateOptions,
  type HeadingNode,
} from '../src/import-types.js';
import type { DocumentType } from '../src/types.js';

// ─── Generators ──────────────────────────────────────────────────────────────

/** All valid document types. */
const DOCUMENT_TYPES: DocumentType[] = [
  'overview',
  'principles',
  'patterns',
  'research',
  'decisions',
  'guidelines',
  'examples',
];

/** Arbitrary for valid document types. */
const documentTypeArb = fc.constantFrom(...DOCUMENT_TYPES);

/** Arbitrary for non-empty trimmed strings (for titles, text, etc). */
const nonEmptyStringArb = fc
  .stringOf(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
    ),
    { minLength: 1, maxLength: 60 }
  )
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/** Arbitrary for paragraph text. */
const paragraphArb = fc
  .stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!? '.split('')),
    { minLength: 5, maxLength: 200 }
  )
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/** Arbitrary for tags. */
const tagArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
    minLength: 2,
    maxLength: 15,
  })
  .filter((s) => /^[a-z]/.test(s) && !s.endsWith('-'));

/** Generates a HeadingNode (leaf — no children for simplicity). */
const headingNodeArb = (text: string, level: number): fc.Arbitrary<HeadingNode> =>
  fc.constant({ level, text, children: [] });

/**
 * Generates random ExtractedContent with arbitrary paragraphs and headings.
 */
const extractedContentArb: fc.Arbitrary<ExtractedContent> = fc
  .record({
    title: nonEmptyStringArb,
    paragraphs: fc.array(paragraphArb, { minLength: 1, maxLength: 5 }),
    tags: fc.array(tagArb, { minLength: 0, maxLength: 5 }),
    subdomain: fc.constantFrom('discovery', 'transactional', 'post-bet'),
    experienceArea: fc.constantFrom('general', 'onboarding', 'cashier'),
  })
  .map(({ title, paragraphs, tags, subdomain, experienceArea }) => ({
    rawText: paragraphs.join('\n\n'),
    paragraphs,
    headings: [{ level: 1, text: title, children: [] }],
    tables: [],
    metadata: {
      title,
      possibleTags: tags,
      possibleSubdomain: subdomain,
      possibleExperienceArea: experienceArea,
    },
  }));

/**
 * Generates a title string with diverse characters for filename testing.
 * Includes spaces, special chars, uppercase, numbers.
 */
const titleStringArb = fc
  .stringOf(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`'.split(
        ''
      )
    ),
    { minLength: 1, maxLength: 80 }
  )
  .filter((s) => /[a-zA-Z0-9]/.test(s)); // Must contain at least one alphanumeric char

// ─── Property 5: Template conformance with complete sections ─────────────────

describe('Feature: document-import-workflow, Property 5: Template conformance with complete sections', () => {
  /**
   * **Validates: Requirements 3.1, 3.4**
   *
   * For any extracted content (regardless of coverage), the Template Engine
   * SHALL produce a document containing ALL sections defined in TEMPLATE_SECTIONS,
   * in correct canonical order, with non-empty content (either mapped or placeholder).
   */
  it('generated document contains all TEMPLATE_SECTIONS in order with non-empty content', () => {
    const engine = new TemplateEngine();

    fc.assert(
      fc.property(
        extractedContentArb,
        documentTypeArb.filter((t) => t !== 'research'), // Non-research types
        (content, docType) => {
          const options: TemplateOptions = {
            extractedContent: content,
            documentType: docType,
          };

          const result = engine.generate(options);

          // All TEMPLATE_SECTIONS must appear in the sections array
          const sectionNames = result.sections.map((s) => s.name);

          for (const expectedSection of TEMPLATE_SECTIONS) {
            expect(sectionNames).toContain(expectedSection);
          }

          // Sections must appear in canonical order
          const templateOrder = [...TEMPLATE_SECTIONS];
          let lastIndex = -1;
          for (const section of templateOrder) {
            const idx = sectionNames.indexOf(section);
            expect(idx).toBeGreaterThan(lastIndex);
            lastIndex = idx;
          }

          // Each section must have non-empty content
          for (const section of result.sections) {
            expect(section.content.trim().length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 6: Frontmatter completeness invariant ──────────────────────────

describe('Feature: document-import-workflow, Property 6: Frontmatter completeness invariant', () => {
  /**
   * **Validates: Requirements 3.2, 3.5, 3.6**
   *
   * For any generated Target Document, the frontmatter SHALL contain all required
   * fields, status SHALL equal "draft", and last-updated SHALL be today's date.
   */
  it('frontmatter contains all required fields, status is "draft", last-updated is today', () => {
    const engine = new TemplateEngine();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    fc.assert(
      fc.property(extractedContentArb, documentTypeArb, (content, docType) => {
        const options: TemplateOptions = {
          extractedContent: content,
          documentType: docType,
        };

        const result = engine.generate(options);
        const fm = result.frontmatter;

        // All required fields must be present and non-empty
        expect(fm.title).toBeDefined();
        expect(fm.title.length).toBeGreaterThan(0);

        expect(fm.subdomain).toBeDefined();
        expect(fm.subdomain.length).toBeGreaterThan(0);

        expect(fm['experience-area']).toBeDefined();
        expect(fm['experience-area'].length).toBeGreaterThan(0);

        expect(fm['document-type']).toBeDefined();
        expect(DOCUMENT_TYPES).toContain(fm['document-type']);

        expect(fm.owner).toBeDefined();
        expect(fm.owner.length).toBeGreaterThan(0);

        expect(fm['last-updated']).toBeDefined();
        expect(fm['last-updated']).toBe(expectedDate);

        expect(fm.status).toBe('draft');

        expect(fm.tags).toBeDefined();
        expect(Array.isArray(fm.tags)).toBe(true);

        expect(fm.summary).toBeDefined();
        expect(fm.summary.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 7: Content-to-section mapping correctness ──────────────────────

describe('Feature: document-import-workflow, Property 7: Content-to-section mapping correctness', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * When heading text matches a section name, content under that heading
   * should be placed in that section (not placeholder).
   */
  it('content with headings matching section names is placed in the correct section', () => {
    const engine = new TemplateEngine();

    // Pick random sections from TEMPLATE_SECTIONS to populate
    const sectionSubsetArb = fc
      .subarray([...TEMPLATE_SECTIONS], { minLength: 1, maxLength: 4 })
      .filter((arr) => arr.length > 0);

    fc.assert(
      fc.property(
        sectionSubsetArb,
        fc.array(paragraphArb, { minLength: 1, maxLength: 3 }),
        (selectedSections, contentParagraphs) => {
          // Build headings and paragraphs that match section names
          const headings: HeadingNode[] = selectedSections.map((sectionName) => ({
            level: 2,
            text: sectionSlugToHeading(sectionName),
            children: [],
          }));

          // Build paragraphs array: heading text followed by content paragraphs
          const paragraphs: string[] = [];
          for (const sectionName of selectedSections) {
            paragraphs.push(sectionSlugToHeading(sectionName));
            paragraphs.push(...contentParagraphs);
          }

          const extractedContent: ExtractedContent = {
            rawText: paragraphs.join('\n\n'),
            paragraphs,
            headings,
            tables: [],
            metadata: {
              title: 'Test Document',
              possibleTags: ['test'],
              possibleSubdomain: 'discovery',
              possibleExperienceArea: 'general',
            },
          };

          const options: TemplateOptions = {
            extractedContent,
            documentType: 'overview',
          };

          const result = engine.generate(options);

          // For each selected section, verify it is NOT a placeholder
          for (const sectionName of selectedSections) {
            const section = result.sections.find((s) => s.name === sectionName);
            expect(section).toBeDefined();
            // The section should have mapped content (not placeholder)
            // or at minimum, should not be using the placeholder text
            // if content paragraphs were available for mapping
            if (section && contentParagraphs.length > 0) {
              expect(section.content).not.toBe(PLACEHOLDER_TEXT);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Kebab-case filename derivation ──────────────────────────────

describe('Feature: document-import-workflow, Property 9: Kebab-case filename derivation', () => {
  /**
   * **Validates: Requirements 4.2**
   *
   * For ANY title string, the generated filename MUST match the pattern
   * ^[a-z0-9]+(-[a-z0-9]+)*\.md$
   */
  it('suggested filename matches kebab-case pattern for any title string', () => {
    const engine = new TemplateEngine();
    const kebabPattern = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/;

    fc.assert(
      fc.property(titleStringArb, (title) => {
        // Build minimal extracted content with the given title
        const extractedContent: ExtractedContent = {
          rawText: 'Some content',
          paragraphs: ['Some content paragraph.'],
          headings: [{ level: 1, text: title, children: [] }],
          tables: [],
          metadata: {
            title,
            possibleTags: [],
            possibleSubdomain: 'discovery',
            possibleExperienceArea: 'general',
          },
        };

        const options: TemplateOptions = {
          extractedContent,
          documentType: 'overview',
          overrides: { title },
        };

        const result = engine.generate(options);

        expect(result.suggestedFilename).toMatch(kebabPattern);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14: Research template variant includes required sections ───────

describe('Feature: document-import-workflow, Property 14: Research template variant includes required sections', () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * When documentType is "research", the generated sections MUST include
   * "methodology", "findings", and "recommendations".
   */
  it('research document type includes methodology, findings, and recommendations sections', () => {
    const engine = new TemplateEngine();

    fc.assert(
      fc.property(extractedContentArb, (content) => {
        const options: TemplateOptions = {
          extractedContent: content,
          documentType: 'research',
        };

        const result = engine.generate(options);
        const sectionNames = result.sections.map((s) => s.name);

        // All research extra sections must be present
        for (const extraSection of RESEARCH_EXTRA_SECTIONS) {
          expect(sectionNames).toContain(extraSection);
        }

        // All standard template sections must still be present
        for (const standardSection of TEMPLATE_SECTIONS) {
          expect(sectionNames).toContain(standardSection);
        }

        // Each research section must have non-empty content
        for (const extraSection of RESEARCH_EXTRA_SECTIONS) {
          const section = result.sections.find((s) => s.name === extraSection);
          expect(section).toBeDefined();
          expect(section!.content.trim().length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Converts a section slug back to heading text for matching.
 * e.g., "principles-in-context" → "Principles In Context"
 */
function sectionSlugToHeading(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
