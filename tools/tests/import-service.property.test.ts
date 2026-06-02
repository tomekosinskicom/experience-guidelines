/**
 * Property-Based Tests for Import Service — Manifest Update
 *
 * Uses fast-check to verify universal properties of path generation
 * and manifest update logic.
 * Minimum 100 iterations per property test.
 *
 * Validates: Requirements 4.1, 7.1, 7.2, 7.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { generatePath } from '../src/path-generator.js';
import { updateManifestEntry } from '../src/manifest-generator.js';
import type { Manifest, DocumentType, RelationshipType } from '../src/types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_SUBDOMAINS = ['discovery', 'transactional', 'post-bet', 'cross-cutting-areas'] as const;

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'overview',
  'principles',
  'patterns',
  'research',
  'decisions',
  'guidelines',
  'examples',
];

const VALID_RELATIONSHIP_TYPES: RelationshipType[] = [
  'depends-on',
  'extends',
  'conflicts-with',
  'supersedes',
  'related-to',
];

// ─── Generators ──────────────────────────────────────────────────────────────

/** Arbitrary for valid subdomains. */
const subdomainArb = fc.constantFrom(...VALID_SUBDOMAINS);

/** Arbitrary for valid document types. */
const documentTypeArb = fc.constantFrom(...VALID_DOCUMENT_TYPES);

/**
 * Arbitrary for valid kebab-case experience area names.
 * Pattern: ^[a-z0-9]+(-[a-z0-9]+)*$
 * Max length: 64 characters (naming-validator constraint)
 */
const experienceAreaArb = fc
  .array(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
      maxLength: 10,
    }),
    { minLength: 1, maxLength: 4 }
  )
  .map((segments) => segments.join('-'))
  .filter((s) => s.length <= 64 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s));

/** Arbitrary for non-empty trimmed strings (titles, owners, summaries). */
const nonEmptyStringArb = fc
  .stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
    { minLength: 1, maxLength: 50 }
  )
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/** Arbitrary for tags (kebab-case). */
const tagArb = fc
  .array(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
      maxLength: 8,
    }),
    { minLength: 1, maxLength: 3 }
  )
  .map((segments) => segments.join('-'))
  .filter((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s));

/** Arbitrary for ISO date strings (YYYY-MM-DD). */
const dateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ year, month, day }) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

/** Arbitrary for relationship types. */
const relationshipTypeArb = fc.constantFrom(...VALID_RELATIONSHIP_TYPES);

/** Arbitrary for relative document paths (targets of relationships). */
const relativePathArb = fc
  .tuple(experienceAreaArb, experienceAreaArb, documentTypeArb)
  .map(([sub, area, docType]) => `${sub}/${area}/${docType}.md`);

// ─── Property 8: Path generation from metadata ──────────────────────────────

describe('Feature: document-import-workflow, Property 8: Path generation from metadata', () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * For any valid subdomain and experience-area pair, generatePath SHALL
   * produce a path matching the pattern: {subdomain}/{experience-area}/{document-type}.md
   */
  it('generates path matching expected pattern for valid inputs', () => {
    fc.assert(
      fc.property(
        subdomainArb,
        experienceAreaArb,
        documentTypeArb,
        (subdomain, experienceArea, documentType) => {
          const result = generatePath(subdomain, experienceArea, documentType);

          // Verify path matches expected pattern
          const expectedPath = `${subdomain}/${experienceArea}/${documentType}.md`;
          expect(result).toBe(expectedPath);

          // Verify path structure: exactly 2 slashes
          const parts = result.split('/');
          expect(parts).toHaveLength(3);

          // Verify subdomain part
          expect(parts[0]).toBe(subdomain);

          // Verify experience area is kebab-case
          expect(parts[1]).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);

          // Verify filename is {documentType}.md
          expect(parts[2]).toBe(`${documentType}.md`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 11: Manifest round-trip completeness ───────────────────────────

describe('Feature: document-import-workflow, Property 11: Manifest round-trip completeness', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'prop11-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  /**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any saved Target Document, the manifest SHALL contain an entry where
   * path, title, subdomain, experienceArea, documentType, owner, lastUpdated,
   * status, tags, and summary all match the saved document's frontmatter values.
   */
  it('manifest entry matches all frontmatter values from saved document', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        subdomainArb,
        experienceAreaArb,
        documentTypeArb,
        nonEmptyStringArb,
        dateArb,
        fc.array(tagArb, { minLength: 1, maxLength: 5 }),
        nonEmptyStringArb,
        async (title, subdomain, experienceArea, documentType, owner, lastUpdated, tags, summary) => {
          // Build frontmatter YAML
          const tagsYaml = tags.map((t) => `  - "${t}"`).join('\n');
          const markdown = [
            '---',
            `title: "${title}"`,
            `subdomain: "${subdomain}"`,
            `experience-area: "${experienceArea}"`,
            `document-type: "${documentType}"`,
            `owner: "${owner}"`,
            `last-updated: "${lastUpdated}"`,
            `status: "draft"`,
            `tags:`,
            tagsYaml,
            `summary: "${summary}"`,
            `maturity: "not-started"`,
            '---',
            '',
            '# Overview',
            '',
            'Some content here.',
          ].join('\n');

          // Write the markdown file into the temp directory
          const relativePath = `${subdomain}/${experienceArea}/${documentType}.md`;
          const fullDir = join(tempDir, subdomain, experienceArea);
          await mkdir(fullDir, { recursive: true });
          await writeFile(join(tempDir, relativePath), markdown, 'utf-8');

          // Create an empty manifest
          const manifest: Manifest = {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            documentCount: 0,
            documents: [],
            relationships: [],
          };

          // Update the manifest entry
          const updatedManifest = await updateManifestEntry(manifest, relativePath, tempDir);

          // Find the entry for our document
          const entry = updatedManifest.documents.find((d) => d.path === relativePath);
          expect(entry).toBeDefined();

          // Verify all fields match frontmatter
          expect(entry!.path).toBe(relativePath);
          expect(entry!.title).toBe(title);
          expect(entry!.subdomain).toBe(subdomain);
          expect(entry!.experienceArea).toBe(experienceArea);
          expect(entry!.documentType).toBe(documentType);
          expect(entry!.owner).toBe(owner);
          expect(entry!.lastUpdated).toBe(lastUpdated);
          expect(entry!.status).toBe('draft');
          expect(entry!.tags).toEqual(tags);
          expect(entry!.summary).toBe(summary);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 12: Relationship propagation to manifest ───────────────────────

describe('Feature: document-import-workflow, Property 12: Relationship propagation to manifest', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'prop12-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  /**
   * **Validates: Requirements 7.3**
   *
   * For any saved Target Document that defines relationships in its frontmatter,
   * the manifest relationships array SHALL contain corresponding entries with
   * correct source, target, and type values.
   */
  it('manifest relationships array contains correct entries from frontmatter relationships', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        subdomainArb,
        experienceAreaArb,
        documentTypeArb,
        nonEmptyStringArb,
        dateArb,
        nonEmptyStringArb,
        // Generate 1-3 relationship entries, each with a type and 1-2 targets
        fc.array(
          fc.record({
            type: relationshipTypeArb,
            targets: fc.array(relativePathArb, { minLength: 1, maxLength: 2 }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (title, subdomain, experienceArea, documentType, owner, lastUpdated, summary, relationships) => {
          // Build relationships YAML block
          const relYamlLines: string[] = [];
          // De-duplicate relationship types (only keep first occurrence per type)
          const seenTypes = new Set<string>();
          const uniqueRelationships = relationships.filter((r) => {
            if (seenTypes.has(r.type)) return false;
            seenTypes.add(r.type);
            return true;
          });

          for (const rel of uniqueRelationships) {
            relYamlLines.push(`  ${rel.type}:`);
            for (const target of rel.targets) {
              relYamlLines.push(`    - "${target}"`);
            }
          }

          const markdown = [
            '---',
            `title: "${title}"`,
            `subdomain: "${subdomain}"`,
            `experience-area: "${experienceArea}"`,
            `document-type: "${documentType}"`,
            `owner: "${owner}"`,
            `last-updated: "${lastUpdated}"`,
            `status: "draft"`,
            `tags:`,
            `  - "test"`,
            `summary: "${summary}"`,
            `maturity: "not-started"`,
            `relationships:`,
            ...relYamlLines,
            '---',
            '',
            '# Overview',
            '',
            'Some content here.',
          ].join('\n');

          // Write the markdown file
          const relativePath = `${subdomain}/${experienceArea}/${documentType}.md`;
          const fullDir = join(tempDir, subdomain, experienceArea);
          await mkdir(fullDir, { recursive: true });
          await writeFile(join(tempDir, relativePath), markdown, 'utf-8');

          // Create an empty manifest
          const manifest: Manifest = {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            documentCount: 0,
            documents: [],
            relationships: [],
          };

          // Update the manifest entry
          const updatedManifest = await updateManifestEntry(manifest, relativePath, tempDir);

          // Build expected relationships
          const expectedRelationships: Array<{ source: string; target: string; type: string }> = [];
          for (const rel of uniqueRelationships) {
            for (const target of rel.targets) {
              expectedRelationships.push({
                source: relativePath,
                target,
                type: rel.type,
              });
            }
          }

          // Verify all expected relationships are present in the manifest
          for (const expected of expectedRelationships) {
            const found = updatedManifest.relationships.find(
              (r) =>
                r.source === expected.source &&
                r.target === expected.target &&
                r.type === expected.type
            );
            expect(found, `Expected relationship: ${JSON.stringify(expected)}`).toBeDefined();
          }

          // Verify relationship count matches (no extra relationships)
          const sourceRelationships = updatedManifest.relationships.filter(
            (r) => r.source === relativePath
          );
          expect(sourceRelationships).toHaveLength(expectedRelationships.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
