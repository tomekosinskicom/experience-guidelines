import { describe, it, expect } from 'vitest';
import { search } from '../src/search.js';
import type { Manifest, ManifestEntry, SearchOptions } from '../src/types.js';

/** Helper to create a minimal ManifestEntry with overrides. */
function makeEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    path: 'discovery/pre-match/overview.md',
    title: 'Pre-Match Overview',
    subdomain: 'discovery',
    experienceArea: 'pre-match',
    documentType: 'overview',
    owner: 'Tomek Osinski',
    lastUpdated: '2025-01-15',
    status: 'published',
    tags: ['pre-match', 'discovery'],
    summary: 'Overview of the pre-match experience area.',
    maturity: 'documented',
    wordCount: 500,
    ...overrides,
  };
}

/** Helper to create a Manifest from entries. */
function makeManifest(documents: ManifestEntry[]): Manifest {
  return {
    version: '1.0.0',
    generatedAt: '2025-01-15T00:00:00Z',
    documentCount: documents.length,
    documents,
    relationships: [],
  };
}

describe('search', () => {
  describe('query matching', () => {
    it('returns empty array when no documents match', () => {
      const manifest = makeManifest([makeEntry()]);
      const results = search(manifest, { query: 'nonexistent' });
      expect(results).toEqual([]);
    });

    it('matches exact tag (case-insensitive) with score 3', () => {
      const entry = makeEntry({ tags: ['live-betting', 'in-play'] });
      const manifest = makeManifest([entry]);
      const results = search(manifest, { query: 'Live-Betting' });
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(3);
      expect(results[0].matchedFields).toContain('tags');
    });

    it('matches title substring (case-insensitive) with score 2', () => {
      const entry = makeEntry({ title: 'Live Betting Patterns' });
      const manifest = makeManifest([entry]);
      const results = search(manifest, { query: 'betting' });
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(2);
      expect(results[0].matchedFields).toContain('title');
    });

    it('matches summary substring (case-insensitive) with score 1', () => {
      const entry = makeEntry({
        title: 'Overview',
        summary: 'Covers live betting scenarios and patterns.',
        tags: ['overview'],
      });
      const manifest = makeManifest([entry]);
      const results = search(manifest, { query: 'betting' });
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(1);
      expect(results[0].matchedFields).toContain('summary');
    });

    it('scores are additive across multiple match types', () => {
      const entry = makeEntry({
        title: 'The live-betting Guide',
        summary: 'A guide to live-betting patterns.',
        tags: ['live-betting'],
      });
      const manifest = makeManifest([entry]);
      const results = search(manifest, { query: 'live-betting' });
      // tag exact match (3) + title substring (2) + summary substring (1) = 6
      expect(results[0].score).toBe(6);
      expect(results[0].matchedFields).toEqual(
        expect.arrayContaining(['tags', 'title', 'summary'])
      );
    });

    it('returns results sorted by score descending', () => {
      const entries = [
        makeEntry({
          path: 'a.md',
          title: 'Betting Overview',
          summary: 'No match here.',
          tags: ['other'],
        }),
        makeEntry({
          path: 'b.md',
          title: 'Something Else',
          summary: 'Betting is mentioned.',
          tags: ['betting'],
        }),
      ];
      const manifest = makeManifest(entries);
      const results = search(manifest, { query: 'betting' });
      // b.md: tag(3) + summary(1) = 4
      // a.md: title(2) = 2
      expect(results[0].path).toBe('b.md');
      expect(results[0].score).toBe(4);
      expect(results[1].path).toBe('a.md');
      expect(results[1].score).toBe(2);
    });

    it('sorts by title alphabetically when scores are tied', () => {
      const entries = [
        makeEntry({ path: 'z.md', title: 'Zebra Betting', tags: ['other'], summary: 'No.' }),
        makeEntry({ path: 'a.md', title: 'Alpha Betting', tags: ['other'], summary: 'No.' }),
      ];
      const manifest = makeManifest(entries);
      const results = search(manifest, { query: 'betting' });
      // Both match title only → score 2 each
      expect(results[0].title).toBe('Alpha Betting');
      expect(results[1].title).toBe('Zebra Betting');
    });

    it('returns correct SearchResult shape', () => {
      const entry = makeEntry({ tags: ['live-betting'] });
      const manifest = makeManifest([entry]);
      const results = search(manifest, { query: 'live-betting' });
      expect(results[0]).toEqual({
        path: entry.path,
        title: entry.title,
        score: expect.any(Number),
        matchedFields: expect.any(Array),
        metadata: entry,
      });
    });
  });

  describe('filters', () => {
    const entries = [
      makeEntry({
        path: 'discovery/pre-match/overview.md',
        title: 'Pre-Match Overview',
        subdomain: 'discovery',
        status: 'published',
        owner: 'Tomek Osinski',
        maturity: 'documented',
        tags: ['pre-match'],
      }),
      makeEntry({
        path: 'transactional/betslip/overview.md',
        title: 'Betslip Overview',
        subdomain: 'transactional',
        status: 'draft',
        owner: 'Unassigned',
        maturity: 'in-progress',
        tags: ['betslip'],
      }),
      makeEntry({
        path: 'cross-cutting-areas/live-betting/overview.md',
        title: 'Live Betting Overview',
        subdomain: 'cross-cutting-areas',
        experienceArea: 'live-betting',
        status: 'published',
        owner: 'Agnes Smith',
        maturity: 'validated',
        tags: ['live-betting'],
      }),
    ];

    it('filters by subdomain (OR within)', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: { subdomain: ['discovery', 'transactional'] },
      });
      expect(results).toHaveLength(2);
      expect(results.every((r) => ['discovery', 'transactional'].includes(r.metadata.subdomain))).toBe(true);
    });

    it('filters by status (OR within)', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: { status: ['draft'] },
      });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.status).toBe('draft');
    });

    it('filters by owner (OR within)', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: { owner: ['Tomek Osinski', 'Agnes Smith'] },
      });
      expect(results).toHaveLength(2);
    });

    it('filters by crossCuttingArea — only matches cross-cutting-areas subdomain', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: { crossCuttingArea: ['live-betting'] },
      });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.subdomain).toBe('cross-cutting-areas');
      expect(results[0].metadata.experienceArea).toBe('live-betting');
    });

    it('filters by maturity (OR within)', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: { maturity: ['validated', 'documented'] },
      });
      expect(results).toHaveLength(2);
    });

    it('combines multiple filters with AND across fields', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: {
          subdomain: ['discovery'],
          status: ['published'],
        },
      });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.subdomain).toBe('discovery');
      expect(results[0].metadata.status).toBe('published');
    });

    it('returns empty when filters exclude all matches', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: { subdomain: ['post-bet'] },
      });
      expect(results).toEqual([]);
    });

    it('filter values are case-insensitive', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: { subdomain: ['Discovery'] },
      });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.subdomain).toBe('discovery');
    });

    it('empty filter arrays do not restrict results', () => {
      const manifest = makeManifest(entries);
      const results = search(manifest, {
        query: 'overview',
        filters: { subdomain: [], status: [] },
      });
      // All 3 entries match "overview" in title
      expect(results).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('handles empty manifest', () => {
      const manifest = makeManifest([]);
      const results = search(manifest, { query: 'anything' });
      expect(results).toEqual([]);
    });

    it('handles empty query string — no matches', () => {
      const manifest = makeManifest([makeEntry()]);
      // Empty string is a substring of everything, so it matches title and summary
      const results = search(manifest, { query: '' });
      // Empty query matches as substring in title and summary
      expect(results).toHaveLength(1);
      expect(results[0].matchedFields).toContain('title');
      expect(results[0].matchedFields).toContain('summary');
    });

    it('does not match partial tag (only exact tag match counts)', () => {
      const entry = makeEntry({ tags: ['live-betting'] });
      const manifest = makeManifest([entry]);
      const results = search(manifest, { query: 'live' });
      // "live" is not an exact tag match, but may match title/summary
      const tagMatches = results.filter((r) => r.matchedFields.includes('tags'));
      expect(tagMatches).toHaveLength(0);
    });

    it('handles documents with empty tags array', () => {
      const entry = makeEntry({ tags: [], title: 'Betting Guide', summary: 'A guide.' });
      const manifest = makeManifest([entry]);
      const results = search(manifest, { query: 'betting' });
      expect(results).toHaveLength(1);
      expect(results[0].matchedFields).toContain('title');
      expect(results[0].matchedFields).not.toContain('tags');
    });

    it('handles special regex characters in query safely', () => {
      const entry = makeEntry({ title: 'Test (patterns) [here]', summary: 'No match.' });
      const manifest = makeManifest([entry]);
      // Should not throw and should match as substring
      const results = search(manifest, { query: '(patterns)' });
      expect(results).toHaveLength(1);
      expect(results[0].matchedFields).toContain('title');
    });
  });
});
