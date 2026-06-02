/**
 * Unit tests for the Manifest Generator.
 *
 * Uses temporary directories to simulate folder structures with Markdown
 * documents containing YAML frontmatter.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  findMarkdownFiles,
  parseDocument,
  generateManifest,
  updateManifestEntry,
} from '../src/manifest-generator.js';
import type { Manifest } from '../src/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Creates a valid frontmatter block for testing. */
function makeFrontmatter(overrides: Record<string, unknown> = {}): string {
  const defaults: Record<string, unknown> = {
    title: 'Test Document',
    subdomain: 'discovery',
    'experience-area': 'pre-match',
    'document-type': 'overview',
    owner: 'Tomek Osinski',
    'last-updated': '2025-01-15',
    status: 'draft',
    tags: ['betting', 'discovery'],
    summary: 'A test document for unit testing purposes.',
    maturity: 'in-progress',
  };

  const merged = { ...defaults, ...overrides };

  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(merged)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (Array.isArray(v)) {
          lines.push(`  ${k}:`);
          for (const item of v) {
            lines.push(`    - ${item}`);
          }
        } else {
          lines.push(`  ${k}: ${v}`);
        }
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push('# Test Document');
  lines.push('');
  lines.push('This is the body content of the test document with some words.');

  return lines.join('\n');
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('manifest-generator', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'manifest-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('findMarkdownFiles', () => {
    it('should find all .md files recursively', async () => {
      await mkdir(join(tempDir, 'discovery', 'pre-match'), { recursive: true });
      await writeFile(join(tempDir, 'discovery', 'pre-match', 'overview.md'), '# Test');
      await writeFile(join(tempDir, 'discovery', 'pre-match', 'patterns.md'), '# Test');
      await writeFile(join(tempDir, 'index.md'), '# Root');

      const files = await findMarkdownFiles(tempDir);

      expect(files).toHaveLength(3);
      expect(files).toContain('discovery/pre-match/overview.md');
      expect(files).toContain('discovery/pre-match/patterns.md');
      expect(files).toContain('index.md');
    });

    it('should skip node_modules, .git, dist, and .kiro directories', async () => {
      await mkdir(join(tempDir, 'node_modules'), { recursive: true });
      await writeFile(join(tempDir, 'node_modules', 'readme.md'), '# Skip');

      await mkdir(join(tempDir, '.git'), { recursive: true });
      await writeFile(join(tempDir, '.git', 'info.md'), '# Skip');

      await mkdir(join(tempDir, 'dist'), { recursive: true });
      await writeFile(join(tempDir, 'dist', 'output.md'), '# Skip');

      await mkdir(join(tempDir, '.kiro'), { recursive: true });
      await writeFile(join(tempDir, '.kiro', 'spec.md'), '# Skip');

      await writeFile(join(tempDir, 'valid.md'), '# Keep');

      const files = await findMarkdownFiles(tempDir);

      expect(files).toEqual(['valid.md']);
    });

    it('should return empty array for directory with no .md files', async () => {
      await writeFile(join(tempDir, 'readme.txt'), 'Not markdown');
      await writeFile(join(tempDir, 'data.json'), '{}');

      const files = await findMarkdownFiles(tempDir);

      expect(files).toEqual([]);
    });

    it('should return sorted file paths', async () => {
      await mkdir(join(tempDir, 'z-folder'), { recursive: true });
      await mkdir(join(tempDir, 'a-folder'), { recursive: true });
      await writeFile(join(tempDir, 'z-folder', 'doc.md'), '# Z');
      await writeFile(join(tempDir, 'a-folder', 'doc.md'), '# A');

      const files = await findMarkdownFiles(tempDir);

      expect(files[0]).toBe('a-folder/doc.md');
      expect(files[1]).toBe('z-folder/doc.md');
    });
  });

  describe('parseDocument', () => {
    it('should parse valid frontmatter and return document data', async () => {
      const content = makeFrontmatter();
      await writeFile(join(tempDir, 'test.md'), content);

      const result = await parseDocument(tempDir, 'test.md');

      expect(result).not.toBeNull();
      expect(result!.path).toBe('test.md');
      expect(result!.title).toBe('Test Document');
      expect(result!.subdomain).toBe('discovery');
      expect(result!.experienceArea).toBe('pre-match');
      expect(result!.documentType).toBe('overview');
      expect(result!.owner).toBe('Tomek Osinski');
      expect(result!.lastUpdated).toBe('2025-01-15');
      expect(result!.status).toBe('draft');
      expect(result!.tags).toEqual(['betting', 'discovery']);
      expect(result!.summary).toBe('A test document for unit testing purposes.');
      expect(result!.maturity).toBe('in-progress');
      expect(result!.wordCount).toBeGreaterThan(0);
    });

    it('should return null for files without frontmatter', async () => {
      await writeFile(join(tempDir, 'no-fm.md'), '# No Frontmatter\n\nJust content.');

      const result = await parseDocument(tempDir, 'no-fm.md');

      expect(result).toBeNull();
    });

    it('should return null for files with invalid YAML', async () => {
      const content = '---\ninvalid: [unclosed\n---\n# Body';
      await writeFile(join(tempDir, 'bad-yaml.md'), content);

      const result = await parseDocument(tempDir, 'bad-yaml.md');

      expect(result).toBeNull();
    });

    it('should extract relationships from frontmatter', async () => {
      const content = makeFrontmatter({
        relationships: {
          'depends-on': ['discovery/pre-match/principles.md'],
          'extends': ['cross-cutting-areas/live-betting/overview.md'],
          'related-to': ['transactional/bet-placement/overview.md'],
        },
      });
      await writeFile(join(tempDir, 'with-rels.md'), content);

      const result = await parseDocument(tempDir, 'with-rels.md');

      expect(result).not.toBeNull();
      expect(result!.relationships['depends-on']).toEqual(['discovery/pre-match/principles.md']);
      expect(result!.relationships['extends']).toEqual(['cross-cutting-areas/live-betting/overview.md']);
      expect(result!.relationships['related-to']).toEqual(['transactional/bet-placement/overview.md']);
    });

    it('should handle missing optional fields gracefully', async () => {
      const content = [
        '---',
        'title: Minimal Doc',
        'subdomain: discovery',
        'experience-area: pre-match',
        'document-type: overview',
        'owner: Tomek Osinski',
        'last-updated: 2025-01-15',
        'status: draft',
        'tags:',
        '  - test',
        'summary: A minimal document.',
        '---',
        '',
        '# Minimal',
      ].join('\n');
      await writeFile(join(tempDir, 'minimal.md'), content);

      const result = await parseDocument(tempDir, 'minimal.md');

      expect(result).not.toBeNull();
      expect(result!.maturity).toBe('not-started');
      expect(result!.relationships).toEqual({});
    });

    it('should count words in the body correctly', async () => {
      const body = 'word '.repeat(50).trim();
      const content = [
        '---',
        'title: Word Count Test',
        'subdomain: discovery',
        'experience-area: pre-match',
        'document-type: overview',
        'owner: Tomek Osinski',
        'last-updated: 2025-01-15',
        'status: draft',
        'tags:',
        '  - test',
        'summary: Testing word count.',
        '---',
        '',
        body,
      ].join('\n');
      await writeFile(join(tempDir, 'wordcount.md'), content);

      const result = await parseDocument(tempDir, 'wordcount.md');

      expect(result).not.toBeNull();
      expect(result!.wordCount).toBe(50);
    });
  });

  describe('generateManifest', () => {
    it('should generate a manifest with all documents', async () => {
      await mkdir(join(tempDir, 'discovery', 'pre-match'), { recursive: true });
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'overview.md'),
        makeFrontmatter({ title: 'Pre-Match Overview' })
      );
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'patterns.md'),
        makeFrontmatter({
          title: 'Pre-Match Patterns',
          'document-type': 'patterns',
        })
      );

      const manifest = await generateManifest(tempDir);

      expect(manifest.version).toBe('1.0.0');
      expect(manifest.generatedAt).toBeTruthy();
      expect(manifest.documentCount).toBe(2);
      expect(manifest.documents).toHaveLength(2);
      expect(manifest.documents.map((d) => d.title).sort()).toEqual([
        'Pre-Match Overview',
        'Pre-Match Patterns',
      ]);
    });

    it('should include relationships in the manifest', async () => {
      await mkdir(join(tempDir, 'discovery', 'pre-match'), { recursive: true });
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'overview.md'),
        makeFrontmatter({
          title: 'Overview',
          relationships: {
            'depends-on': ['discovery/pre-match/patterns.md'],
          },
        })
      );
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'patterns.md'),
        makeFrontmatter({
          title: 'Patterns',
          'document-type': 'patterns',
        })
      );

      const manifest = await generateManifest(tempDir);

      expect(manifest.relationships).toHaveLength(1);
      expect(manifest.relationships[0]).toEqual({
        source: 'discovery/pre-match/overview.md',
        target: 'discovery/pre-match/patterns.md',
        type: 'depends-on',
      });
    });

    it('should skip documents without valid frontmatter', async () => {
      await writeFile(join(tempDir, 'valid.md'), makeFrontmatter({ title: 'Valid' }));
      await writeFile(join(tempDir, 'invalid.md'), '# No frontmatter here');

      const manifest = await generateManifest(tempDir);

      expect(manifest.documentCount).toBe(1);
      expect(manifest.documents[0].title).toBe('Valid');
    });

    it('should produce correct generatedAt timestamp in ISO format', async () => {
      await writeFile(join(tempDir, 'doc.md'), makeFrontmatter());

      const before = new Date().toISOString();
      const manifest = await generateManifest(tempDir);
      const after = new Date().toISOString();

      expect(manifest.generatedAt >= before).toBe(true);
      expect(manifest.generatedAt <= after).toBe(true);
    });

    it('should handle empty directory', async () => {
      const manifest = await generateManifest(tempDir);

      expect(manifest.version).toBe('1.0.0');
      expect(manifest.documentCount).toBe(0);
      expect(manifest.documents).toEqual([]);
      expect(manifest.relationships).toEqual([]);
    });

    it('should handle multiple relationship types from a single document', async () => {
      await writeFile(
        join(tempDir, 'source.md'),
        makeFrontmatter({
          title: 'Source',
          relationships: {
            'depends-on': ['target-a.md'],
            'extends': ['target-b.md'],
            'conflicts-with': ['target-c.md'],
            'supersedes': ['target-d.md'],
            'related-to': ['target-e.md'],
          },
        })
      );

      const manifest = await generateManifest(tempDir);

      expect(manifest.relationships).toHaveLength(5);
      const types = manifest.relationships.map((r) => r.type).sort();
      expect(types).toEqual([
        'conflicts-with',
        'depends-on',
        'extends',
        'related-to',
        'supersedes',
      ]);
    });

    it('should set correct manifest entry fields from frontmatter', async () => {
      await writeFile(
        join(tempDir, 'doc.md'),
        makeFrontmatter({
          title: 'Full Entry Test',
          subdomain: 'transactional',
          'experience-area': 'bet-placement',
          'document-type': 'guidelines',
          owner: 'Unassigned',
          'last-updated': '2025-03-20',
          status: 'published',
          tags: ['betting', 'placement', 'ux'],
          summary: 'Guidelines for bet placement experience.',
          maturity: 'documented',
        })
      );

      const manifest = await generateManifest(tempDir);
      const entry = manifest.documents[0];

      expect(entry.path).toBe('doc.md');
      expect(entry.title).toBe('Full Entry Test');
      expect(entry.subdomain).toBe('transactional');
      expect(entry.experienceArea).toBe('bet-placement');
      expect(entry.documentType).toBe('guidelines');
      expect(entry.owner).toBe('Unassigned');
      expect(entry.lastUpdated).toBe('2025-03-20');
      expect(entry.status).toBe('published');
      expect(entry.tags).toEqual(['betting', 'placement', 'ux']);
      expect(entry.summary).toBe('Guidelines for bet placement experience.');
      expect(entry.maturity).toBe('documented');
      expect(entry.wordCount).toBeGreaterThan(0);
    });
  });

  describe('updateManifestEntry', () => {
    it('should update only the modified document entry without touching others', async () => {
      // Set up two documents
      await mkdir(join(tempDir, 'discovery', 'pre-match'), { recursive: true });
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'overview.md'),
        makeFrontmatter({ title: 'Original Overview', subdomain: 'discovery' })
      );
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'patterns.md'),
        makeFrontmatter({ title: 'Patterns Doc', 'document-type': 'patterns', subdomain: 'discovery' })
      );

      // Generate initial manifest
      const manifest = await generateManifest(tempDir);
      expect(manifest.documentCount).toBe(2);

      // Snapshot the patterns entry before update
      const patternsEntryBefore = manifest.documents.find(
        (d) => d.path === 'discovery/pre-match/patterns.md'
      );
      expect(patternsEntryBefore).toBeDefined();
      const patternsSnapshot = { ...patternsEntryBefore! };

      // Modify the overview document
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'overview.md'),
        makeFrontmatter({ title: 'Updated Overview', subdomain: 'discovery' })
      );

      // Perform incremental update on the overview only
      await updateManifestEntry(manifest, 'discovery/pre-match/overview.md', tempDir);

      // The overview entry should be updated
      const overviewEntry = manifest.documents.find(
        (d) => d.path === 'discovery/pre-match/overview.md'
      );
      expect(overviewEntry).toBeDefined();
      expect(overviewEntry!.title).toBe('Updated Overview');

      // The patterns entry should be completely unchanged
      const patternsEntryAfter = manifest.documents.find(
        (d) => d.path === 'discovery/pre-match/patterns.md'
      );
      expect(patternsEntryAfter).toBeDefined();
      expect(patternsEntryAfter!.title).toBe(patternsSnapshot.title);
      expect(patternsEntryAfter!.subdomain).toBe(patternsSnapshot.subdomain);
      expect(patternsEntryAfter!.documentType).toBe(patternsSnapshot.documentType);
      expect(patternsEntryAfter!.owner).toBe(patternsSnapshot.owner);
      expect(patternsEntryAfter!.status).toBe(patternsSnapshot.status);
      expect(patternsEntryAfter!.tags).toEqual(patternsSnapshot.tags);
    });

    it('should only update relationship edges where the modified document is the source', async () => {
      await mkdir(join(tempDir, 'discovery', 'pre-match'), { recursive: true });
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'overview.md'),
        makeFrontmatter({
          title: 'Overview',
          relationships: {
            'depends-on': ['discovery/pre-match/patterns.md'],
          },
        })
      );
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'patterns.md'),
        makeFrontmatter({
          title: 'Patterns',
          'document-type': 'patterns',
          relationships: {
            'related-to': ['discovery/pre-match/overview.md'],
          },
        })
      );

      // Generate initial manifest
      const manifest = await generateManifest(tempDir);
      expect(manifest.relationships).toHaveLength(2);

      // Modify overview to change its relationship
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'overview.md'),
        makeFrontmatter({
          title: 'Overview',
          relationships: {
            'extends': ['discovery/pre-match/patterns.md'],
          },
        })
      );

      // Perform incremental update
      await updateManifestEntry(manifest, 'discovery/pre-match/overview.md', tempDir);

      // The patterns→overview relationship should still exist (untouched)
      const patternsRel = manifest.relationships.find(
        (r) => r.source === 'discovery/pre-match/patterns.md'
      );
      expect(patternsRel).toBeDefined();
      expect(patternsRel!.target).toBe('discovery/pre-match/overview.md');
      expect(patternsRel!.type).toBe('related-to');

      // The overview relationship should be updated (depends-on → extends)
      const overviewRel = manifest.relationships.find(
        (r) => r.source === 'discovery/pre-match/overview.md'
      );
      expect(overviewRel).toBeDefined();
      expect(overviewRel!.target).toBe('discovery/pre-match/patterns.md');
      expect(overviewRel!.type).toBe('extends');
    });

    it('should remove entry when document frontmatter becomes invalid', async () => {
      await writeFile(join(tempDir, 'doc.md'), makeFrontmatter({ title: 'Valid Doc' }));

      const manifest = await generateManifest(tempDir);
      expect(manifest.documentCount).toBe(1);

      // Make the document invalid (no frontmatter)
      await writeFile(join(tempDir, 'doc.md'), '# No frontmatter');

      await updateManifestEntry(manifest, 'doc.md', tempDir);

      expect(manifest.documentCount).toBe(0);
      expect(manifest.documents).toHaveLength(0);
    });

    it('should add a new document entry without modifying existing entries', async () => {
      await writeFile(join(tempDir, 'existing.md'), makeFrontmatter({ title: 'Existing' }));

      const manifest = await generateManifest(tempDir);
      const existingSnapshot = { ...manifest.documents[0] };

      // Add a new document
      await writeFile(join(tempDir, 'new-doc.md'), makeFrontmatter({ title: 'New Document' }));

      await updateManifestEntry(manifest, 'new-doc.md', tempDir);

      expect(manifest.documentCount).toBe(2);

      // Existing entry unchanged
      const existingEntry = manifest.documents.find((d) => d.path === 'existing.md');
      expect(existingEntry!.title).toBe(existingSnapshot.title);
      expect(existingEntry!.subdomain).toBe(existingSnapshot.subdomain);

      // New entry added
      const newEntry = manifest.documents.find((d) => d.path === 'new-doc.md');
      expect(newEntry).toBeDefined();
      expect(newEntry!.title).toBe('New Document');
    });

    it('adding a new subdomain folder does not modify existing document paths or frontmatter', async () => {
      // Set up existing structure
      await mkdir(join(tempDir, 'discovery', 'pre-match'), { recursive: true });
      await writeFile(
        join(tempDir, 'discovery', 'pre-match', 'overview.md'),
        makeFrontmatter({ title: 'Discovery Overview', subdomain: 'discovery' })
      );

      const manifest = await generateManifest(tempDir);
      const discoveryEntry = { ...manifest.documents[0] };

      // Add a new subdomain with a new document
      await mkdir(join(tempDir, 'transactional', 'bet-placement'), { recursive: true });
      await writeFile(
        join(tempDir, 'transactional', 'bet-placement', 'overview.md'),
        makeFrontmatter({
          title: 'Bet Placement Overview',
          subdomain: 'transactional',
          'experience-area': 'bet-placement',
        })
      );

      // Update only the new document
      await updateManifestEntry(manifest, 'transactional/bet-placement/overview.md', tempDir);

      // Existing discovery entry is completely unchanged
      const existingEntry = manifest.documents.find(
        (d) => d.path === 'discovery/pre-match/overview.md'
      );
      expect(existingEntry!.path).toBe(discoveryEntry.path);
      expect(existingEntry!.title).toBe(discoveryEntry.title);
      expect(existingEntry!.subdomain).toBe(discoveryEntry.subdomain);
      expect(existingEntry!.experienceArea).toBe(discoveryEntry.experienceArea);
      expect(existingEntry!.owner).toBe(discoveryEntry.owner);
      expect(existingEntry!.tags).toEqual(discoveryEntry.tags);

      // New entry is added
      const newEntry = manifest.documents.find(
        (d) => d.path === 'transactional/bet-placement/overview.md'
      );
      expect(newEntry).toBeDefined();
      expect(newEntry!.title).toBe('Bet Placement Overview');
      expect(newEntry!.subdomain).toBe('transactional');
    });

    it('adding a new cross-cutting area does not modify existing cross-references', async () => {
      // Set up existing structure with cross-references
      await mkdir(join(tempDir, 'cross-cutting-areas', 'live-betting'), { recursive: true });
      await writeFile(
        join(tempDir, 'cross-cutting-areas', 'live-betting', 'overview.md'),
        makeFrontmatter({
          title: 'Live Betting',
          subdomain: 'cross-cutting-areas',
          'experience-area': 'live-betting',
          relationships: {
            'related-to': ['discovery/pre-match/overview.md'],
          },
        })
      );

      const manifest = await generateManifest(tempDir);
      const liveBettingRels = manifest.relationships.filter(
        (r) => r.source === 'cross-cutting-areas/live-betting/overview.md'
      );

      // Add a new cross-cutting area
      await mkdir(join(tempDir, 'cross-cutting-areas', 'accessibility'), { recursive: true });
      await writeFile(
        join(tempDir, 'cross-cutting-areas', 'accessibility', 'overview.md'),
        makeFrontmatter({
          title: 'Accessibility',
          subdomain: 'cross-cutting-areas',
          'experience-area': 'accessibility',
        })
      );

      await updateManifestEntry(manifest, 'cross-cutting-areas/accessibility/overview.md', tempDir);

      // Live betting relationships are unchanged
      const liveBettingRelsAfter = manifest.relationships.filter(
        (r) => r.source === 'cross-cutting-areas/live-betting/overview.md'
      );
      expect(liveBettingRelsAfter).toEqual(liveBettingRels);

      // Live betting entry is unchanged
      const liveBettingEntry = manifest.documents.find(
        (d) => d.path === 'cross-cutting-areas/live-betting/overview.md'
      );
      expect(liveBettingEntry!.title).toBe('Live Betting');
    });

    it('should update documentCount correctly after adding and removing', async () => {
      await writeFile(join(tempDir, 'a.md'), makeFrontmatter({ title: 'A' }));
      await writeFile(join(tempDir, 'b.md'), makeFrontmatter({ title: 'B' }));

      const manifest = await generateManifest(tempDir);
      expect(manifest.documentCount).toBe(2);

      // Add a third document
      await writeFile(join(tempDir, 'c.md'), makeFrontmatter({ title: 'C' }));
      await updateManifestEntry(manifest, 'c.md', tempDir);
      expect(manifest.documentCount).toBe(3);

      // Remove a document (make frontmatter invalid)
      await writeFile(join(tempDir, 'a.md'), '# No frontmatter');
      await updateManifestEntry(manifest, 'a.md', tempDir);
      expect(manifest.documentCount).toBe(2);
    });
  });
});
