/**
 * Sports Experience Guidelines — Document Structure Validator
 *
 * Validates Markdown documents against the Documentation Template structure:
 * - Section order matches the defined template
 * - Required sections are present
 * - Combined word count of content sections ≤3000 words
 * - All 5 AI annotation markers are present
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5
 */

import type { ValidationError } from './types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Result of document structure validation. */
export interface StructureValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** A parsed section from the document. */
export interface ParsedSection {
  name: string;
  slug: string;
  content: string;
  wordCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Canonical section order as defined in the Documentation Template.
 * Frontmatter is handled separately (before any ## headings).
 */
export const SECTION_ORDER = [
  'overview',
  'principles-in-context',
  'current-state',
  'guidelines',
  'examples',
  'research-references',
  'decision-log',
  'related-areas',
] as const;

/** Sections that must be present in every document. */
export const REQUIRED_SECTIONS = [
  'overview',
  'principles-in-context',
  'current-state',
  'guidelines',
] as const;

/** Sections whose word count contributes to the 3000-word limit. */
export const WORD_COUNT_SECTIONS = [
  'overview',
  'principles-in-context',
  'current-state',
  'guidelines',
  'related-areas',
] as const;

/** Maximum combined word count for content sections. */
export const MAX_CONTENT_WORDS = 3000;

/** AI annotation markers that must be present in the document. */
export const AI_MARKERS = [
  '<!-- ai:summary -->',
  '<!-- ai:keywords -->',
  '<!-- ai:constraints -->',
  '<!-- ai:relationships -->',
  '<!-- ai:scope -->',
] as const;

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Counts words in a string by splitting on whitespace.
 * Returns 0 for empty or whitespace-only strings.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Converts a section heading to a slug for comparison.
 * E.g. "Principles in Context" → "principles-in-context"
 */
export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Strips YAML frontmatter from the beginning of a Markdown document.
 * Returns the document body after the closing `---` delimiter.
 */
export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---')) {
    return markdown;
  }

  const endIndex = markdown.indexOf('---', 3);
  if (endIndex === -1) {
    return markdown;
  }

  return markdown.slice(endIndex + 3).trim();
}

/**
 * Parses a Markdown document body (after frontmatter) into sections
 * based on `## Section Name` headings.
 *
 * @param body - The document body without frontmatter
 * @returns Array of parsed sections in document order
 */
export function parseSections(body: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = body.split('\n');

  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch) {
      // Save previous section if any
      if (currentHeading !== null) {
        const content = currentContent.join('\n');
        sections.push({
          name: currentHeading,
          slug: slugify(currentHeading),
          content,
          wordCount: countWords(content),
        });
      }

      currentHeading = headingMatch[1].trim();
      currentContent = [];
    } else {
      if (currentHeading !== null) {
        currentContent.push(line);
      }
    }
  }

  // Save last section
  if (currentHeading !== null) {
    const content = currentContent.join('\n');
    sections.push({
      name: currentHeading,
      slug: slugify(currentHeading),
      content,
      wordCount: countWords(content),
    });
  }

  return sections;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates that sections appear in the correct order as defined by the
 * Documentation Template. Only checks sections that are present — missing
 * sections are handled by the required sections check.
 *
 * @param sections - Parsed sections from the document
 * @param documentPath - Path to the document (for error reporting)
 * @returns Array of validation errors for ordering violations
 */
export function validateSectionOrder(
  sections: ParsedSection[],
  documentPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Filter to only sections that are in our canonical list
  const knownSections = sections.filter((s) =>
    (SECTION_ORDER as readonly string[]).includes(s.slug)
  );

  for (let i = 0; i < knownSections.length - 1; i++) {
    const currentIndex = SECTION_ORDER.indexOf(
      knownSections[i].slug as (typeof SECTION_ORDER)[number]
    );
    const nextIndex = SECTION_ORDER.indexOf(
      knownSections[i + 1].slug as (typeof SECTION_ORDER)[number]
    );

    if (currentIndex > nextIndex) {
      errors.push({
        path: documentPath,
        category: 'structure',
        field: 'section-order',
        rule: 'order',
        message: `Section '${knownSections[i + 1].name}' must appear before '${knownSections[i].name}' according to the Documentation Template`,
      });
    }
  }

  return errors;
}

/**
 * Validates that all required sections are present in the document.
 *
 * @param sections - Parsed sections from the document
 * @param documentPath - Path to the document (for error reporting)
 * @returns Array of validation errors for missing required sections
 */
export function validateRequiredSections(
  sections: ParsedSection[],
  documentPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const presentSlugs = new Set(sections.map((s) => s.slug));

  for (const required of REQUIRED_SECTIONS) {
    if (!presentSlugs.has(required)) {
      errors.push({
        path: documentPath,
        category: 'structure',
        field: required,
        rule: 'required',
        message: `Required section '${required}' is missing`,
      });
    }
  }

  return errors;
}

/**
 * Validates that the combined word count of content sections does not
 * exceed the 3000-word limit.
 *
 * Content sections: overview, principles-in-context, current-state,
 * guidelines, related-areas.
 *
 * @param sections - Parsed sections from the document
 * @param documentPath - Path to the document (for error reporting)
 * @returns Array of validation errors if word count exceeds limit
 */
export function validateWordCount(
  sections: ParsedSection[],
  documentPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  let totalWords = 0;
  for (const section of sections) {
    if ((WORD_COUNT_SECTIONS as readonly string[]).includes(section.slug)) {
      totalWords += section.wordCount;
    }
  }

  if (totalWords > MAX_CONTENT_WORDS) {
    errors.push({
      path: documentPath,
      category: 'content',
      field: 'word-count',
      rule: 'maxWords',
      message: `Combined content word count exceeds maximum of ${MAX_CONTENT_WORDS} words (got ${totalWords})`,
    });
  }

  return errors;
}

/**
 * Validates that all 5 AI annotation markers are present in the document.
 *
 * Markers: <!-- ai:summary -->, <!-- ai:keywords -->, <!-- ai:constraints -->,
 * <!-- ai:relationships -->, <!-- ai:scope -->
 *
 * @param markdown - The full Markdown document content (including frontmatter)
 * @param documentPath - Path to the document (for error reporting)
 * @returns Array of validation errors for missing markers
 */
export function validateAIMarkers(
  markdown: string,
  documentPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const marker of AI_MARKERS) {
    if (!markdown.includes(marker)) {
      errors.push({
        path: documentPath,
        category: 'structure',
        field: 'ai-markers',
        rule: 'required-marker',
        message: `Required AI annotation marker '${marker}' is missing`,
      });
    }
  }

  return errors;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validates a Markdown document against the Documentation Template structure.
 *
 * Checks:
 * 1. Section order matches the template
 * 2. All required sections are present
 * 3. Combined word count of content sections ≤3000
 * 4. All 5 AI annotation markers are present
 *
 * @param markdown - The full Markdown document content
 * @param documentPath - Path to the document (for error reporting)
 * @returns A StructureValidationResult with validity status and errors
 */
export function validateStructure(
  markdown: string,
  documentPath: string = ''
): StructureValidationResult {
  const errors: ValidationError[] = [];

  // Strip frontmatter and parse sections
  const body = stripFrontmatter(markdown);
  const sections = parseSections(body);

  // 1. Validate section order
  errors.push(...validateSectionOrder(sections, documentPath));

  // 2. Validate required sections
  errors.push(...validateRequiredSections(sections, documentPath));

  // 3. Validate word count
  errors.push(...validateWordCount(sections, documentPath));

  // 4. Validate AI annotation markers
  errors.push(...validateAIMarkers(markdown, documentPath));

  return {
    valid: errors.length === 0,
    errors,
  };
}
