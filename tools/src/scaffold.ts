/**
 * Sports Experience Guidelines — Document Scaffold Generator
 *
 * Generates new documents from the Documentation Template with pre-populated
 * placeholder content, AI annotation markers, and initial frontmatter.
 *
 * The core `generateScaffold()` function returns the generated content string.
 * The CLI wrapper handles file writing and manifest updates.
 *
 * Validates: Requirements 1.5, 7.4, 7.5, 8.7
 */

import { type DocumentType } from './types.js';
import { generatePath } from './path-generator.js';
import { validateName } from './naming-validator.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Valid subdomains for scaffold input. */
const VALID_SUBDOMAINS = [
  'discovery',
  'transactional',
  'post-bet',
  'cross-cutting-areas',
] as const;

/** Valid document types for scaffold input. */
const VALID_DOCUMENT_TYPES: readonly DocumentType[] = [
  'overview',
  'principles',
  'patterns',
  'research',
  'decisions',
  'guidelines',
  'examples',
] as const;

/** Options for scaffold generation. */
export interface ScaffoldOptions {
  subdomain: string;
  area: string;
  type: string;
  owner?: string;
}

/** Result of scaffold generation. */
export interface ScaffoldResult {
  content: string;
  path: string;
}

/** Error thrown when scaffold inputs are invalid. */
export class ScaffoldError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: string
  ) {
    super(message);
    this.name = 'ScaffoldError';
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates all scaffold inputs against naming conventions and enumerated types.
 *
 * @throws ScaffoldError if any input is invalid
 */
export function validateScaffoldInputs(options: ScaffoldOptions): void {
  const { subdomain, area, type, owner } = options;

  // Validate subdomain
  if (!VALID_SUBDOMAINS.includes(subdomain as typeof VALID_SUBDOMAINS[number])) {
    throw new ScaffoldError(
      `Invalid subdomain "${subdomain}". Must be one of: ${VALID_SUBDOMAINS.join(', ')}`,
      'subdomain',
      subdomain
    );
  }

  // Validate area against naming conventions (folder name)
  const areaValidation = validateName(area, false);
  if (!areaValidation.valid) {
    throw new ScaffoldError(
      `Invalid area "${area}": ${areaValidation.errors.join('; ')}`,
      'area',
      area
    );
  }

  // Validate document type against enumerated list
  if (!VALID_DOCUMENT_TYPES.includes(type as DocumentType)) {
    throw new ScaffoldError(
      `Invalid document type "${type}". Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`,
      'type',
      type
    );
  }

  // Validate owner if provided (must be a non-empty string)
  if (owner !== undefined) {
    if (owner.trim() === '') {
      throw new ScaffoldError(
        `Invalid owner: must not be empty`,
        'owner',
        owner
      );
    }
  }
}

// ─── Title Generation ────────────────────────────────────────────────────────

/**
 * Generates a human-readable title from the area and document type.
 * Converts kebab-case to Title Case.
 *
 * E.g. ("live-betting", "overview") → "Live Betting — Overview"
 */
export function generateTitle(area: string, type: string): string {
  const toTitleCase = (kebab: string): string =>
    kebab
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return `${toTitleCase(area)} — ${toTitleCase(type)}`;
}

// ─── Date Utility ────────────────────────────────────────────────────────────

/**
 * Returns today's date in ISO 8601 format (YYYY-MM-DD).
 */
export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Content Generation ──────────────────────────────────────────────────────

/**
 * Generates the YAML frontmatter block for a new document.
 */
export function generateFrontmatter(options: ScaffoldOptions, title: string, date: string): string {
  const { subdomain, area, type, owner } = options;
  const ownerValue = owner ?? 'unassigned';

  return [
    '---',
    `title: "${title}"`,
    `subdomain: ${subdomain}`,
    `experience-area: ${area}`,
    `document-type: ${type}`,
    `owner: ${ownerValue}`,
    `last-updated: ${date}`,
    `status: draft`,
    `tags:`,
    `  - ${area}`,
    `summary: "TODO: Add a machine-readable summary of this document (max 200 words)."`,
    '---',
  ].join('\n');
}

/**
 * Generates the full document body with all required sections,
 * instructional placeholder text, and AI annotation markers.
 */
export function generateBody(title: string): string {
  const sections = [
    generateOverviewSection(),
    generatePrinciplesInContextSection(),
    generateCurrentStateSection(),
    generateGuidelinesSection(),
    generateExamplesSection(),
    generateResearchReferencesSection(),
    generateDecisionLogSection(),
    generateRelatedAreasSection(),
  ];

  return sections.join('\n\n');
}

function generateOverviewSection(): string {
  return [
    '## Overview',
    '',
    '<!-- ai:summary -->',
    '<!-- ai:keywords -->',
    '',
    'Provide a high-level introduction to this experience area. Include the context,',
    'scope, and key concepts that a reader needs to understand before diving into',
    'the detailed guidelines. Aim for 100-300 words.',
  ].join('\n');
}

function generatePrinciplesInContextSection(): string {
  return [
    '## Principles in Context',
    '',
    'Describe how the organisation\'s UX principles apply specifically to this',
    'experience area. Identify which principles are most relevant and explain',
    'any area-specific interpretations or trade-offs.',
  ].join('\n');
}

function generateCurrentStateSection(): string {
  return [
    '## Current State',
    '',
    '<!-- ai:scope -->',
    '',
    'Document the current state of this experience area. Include what exists today,',
    'known pain points, recent changes, and any ongoing initiatives. This section',
    'helps readers understand the starting point for any improvements.',
  ].join('\n');
}

function generateGuidelinesSection(): string {
  return [
    '## Guidelines',
    '',
    '<!-- ai:constraints -->',
    '<!-- ai:relationships -->',
    '',
    'Provide specific, actionable guidance for this experience area. Include do/don\'t',
    'recommendations, boundary conditions, required patterns, and prohibited approaches.',
    'Each guideline should be clear enough for both human designers and AI agents to follow.',
  ].join('\n');
}

function generateExamplesSection(): string {
  return [
    '## Examples',
    '',
    'Include concrete examples that illustrate the guidelines in practice. Use',
    'screenshots, user flows, annotated designs, or code snippets as appropriate.',
    'Each example should reference which guideline(s) it demonstrates.',
  ].join('\n');
}

function generateResearchReferencesSection(): string {
  return [
    '## Research References',
    '',
    'List relevant research findings, usability studies, analytics data, and',
    'external references that inform the guidelines in this area. Include links',
    'to full research documents where available.',
  ].join('\n');
}

function generateDecisionLogSection(): string {
  return [
    '## Decision Log',
    '',
    'Record significant design decisions related to this experience area.',
    'Each entry should include the date, decision maker, what was decided,',
    'alternatives considered, and rationale. Max 150 words per entry.',
  ].join('\n');
}

function generateRelatedAreasSection(): string {
  return [
    '## Related Areas',
    '',
    'List other experience areas, cross-cutting concerns, and documents that',
    'relate to this area. Use typed relationship links (depends-on, extends,',
    'conflicts-with, supersedes, related-to) to describe the connection.',
  ].join('\n');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generates a complete scaffold document with frontmatter, sections,
 * placeholder text, and AI annotation markers.
 *
 * Returns the generated content string and the deterministic file path.
 * Does NOT write to disk — the CLI wrapper handles file I/O.
 *
 * @param options - Scaffold generation options
 * @param date - Optional date override (defaults to today, useful for testing)
 * @returns ScaffoldResult with content and path
 * @throws ScaffoldError if inputs are invalid
 */
export function generateScaffold(options: ScaffoldOptions, date?: string): ScaffoldResult {
  // Validate all inputs
  validateScaffoldInputs(options);

  // Generate deterministic path
  const path = generatePath(options.subdomain, options.area, options.type as DocumentType);

  // Generate title from area + type
  const title = generateTitle(options.area, options.type);

  // Use provided date or today
  const effectiveDate = date ?? getTodayISO();

  // Generate document content
  const frontmatter = generateFrontmatter(options, title, effectiveDate);
  const body = generateBody(title);
  const content = `${frontmatter}\n\n${body}\n`;

  return { content, path };
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

/**
 * CLI wrapper that parses arguments and writes the scaffold to disk.
 * Only runs when this module is executed directly.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const getArg = (name: string): string | undefined => {
    const index = args.indexOf(`--${name}`);
    if (index === -1 || index + 1 >= args.length) return undefined;
    return args[index + 1];
  };

  const subdomain = getArg('subdomain');
  const area = getArg('area');
  const type = getArg('type');
  const owner = getArg('owner');

  if (!subdomain || !area || !type) {
    console.error('Usage: scaffold --subdomain <name> --area <name> --type <document-type> [--owner <designer-name>]');
    console.error('');
    console.error('Subdomains: discovery, transactional, post-bet, cross-cutting-areas');
    console.error('Types: overview, principles, patterns, research, decisions, guidelines, examples');
    process.exit(1);
  }

  try {
    const result = generateScaffold({ subdomain, area, type, owner });

    // Write file to disk
    const fs = await import('node:fs');
    const path = await import('node:path');

    const fullPath = path.resolve(result.path);
    const dir = path.dirname(fullPath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, result.content, 'utf-8');

    console.log(`✓ Created: ${result.path}`);
  } catch (error) {
    if (error instanceof ScaffoldError) {
      console.error(`✗ Validation error (${error.field}): ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

// Run CLI if executed directly
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('scaffold.ts') || process.argv[1].endsWith('scaffold.js'));

if (isMainModule) {
  main();
}
