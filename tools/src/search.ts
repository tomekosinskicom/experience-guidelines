/**
 * Sports Experience Guidelines — Search Index
 *
 * Provides search functionality across the manifest index with tag matching,
 * substring matching, multi-field filtering, and relevance scoring.
 */

import type { Manifest, ManifestEntry, SearchOptions, SearchResult } from './types.js';

/**
 * Search the manifest for documents matching the given query and filters.
 *
 * Scoring:
 *  - Exact tag match (case-insensitive): +3
 *  - Title substring match (case-insensitive): +2
 *  - Summary substring match (case-insensitive): +1
 *  - Scores are additive (a document can match on multiple fields)
 *
 * Filtering:
 *  - OR within a single filter field (e.g. status: ['draft', 'published'] matches either)
 *  - AND across different filter fields (all active filters must be satisfied)
 *
 * Results are sorted by score descending, then by title alphabetically for ties.
 */
export function search(manifest: Manifest, options: SearchOptions): SearchResult[] {
  const query = options.query.toLowerCase();
  const results: SearchResult[] = [];

  for (const entry of manifest.documents) {
    // Apply filters first — if a document doesn't pass filters, skip it
    if (!passesFilters(entry, options.filters)) {
      continue;
    }

    // Calculate match score
    const { score, matchedFields } = calculateScore(entry, query);

    // Only include documents that matched the query
    if (score > 0) {
      results.push({
        path: entry.path,
        title: entry.title,
        score,
        matchedFields,
        metadata: entry,
      });
    }
  }

  // Sort by score descending, then by title alphabetically for ties
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.title.localeCompare(b.title);
  });

  return results;
}

/**
 * Check whether a manifest entry passes all active filters.
 * OR logic within a field, AND logic across fields.
 */
function passesFilters(
  entry: ManifestEntry,
  filters?: SearchOptions['filters']
): boolean {
  if (!filters) {
    return true;
  }

  // Subdomain filter (OR within)
  if (filters.subdomain && filters.subdomain.length > 0) {
    const matches = filters.subdomain.some(
      (s) => s.toLowerCase() === entry.subdomain.toLowerCase()
    );
    if (!matches) return false;
  }

  // Status filter (OR within)
  if (filters.status && filters.status.length > 0) {
    const matches = filters.status.some(
      (s) => s.toLowerCase() === entry.status.toLowerCase()
    );
    if (!matches) return false;
  }

  // Owner filter (OR within)
  if (filters.owner && filters.owner.length > 0) {
    const matches = filters.owner.some(
      (o) => o.toLowerCase() === entry.owner.toLowerCase()
    );
    if (!matches) return false;
  }

  // Cross-cutting area filter (OR within) — only applies to cross-cutting-areas subdomain
  if (filters.crossCuttingArea && filters.crossCuttingArea.length > 0) {
    if (entry.subdomain.toLowerCase() === 'cross-cutting-areas') {
      const matches = filters.crossCuttingArea.some(
        (a) => a.toLowerCase() === entry.experienceArea.toLowerCase()
      );
      if (!matches) return false;
    } else {
      // Non-cross-cutting documents don't match this filter
      return false;
    }
  }

  // Maturity filter (OR within)
  if (filters.maturity && filters.maturity.length > 0) {
    const matches = filters.maturity.some(
      (m) => m.toLowerCase() === entry.maturity.toLowerCase()
    );
    if (!matches) return false;
  }

  return true;
}

/**
 * Calculate the relevance score for a manifest entry against a query.
 * Returns the total score and the list of matched fields.
 */
function calculateScore(
  entry: ManifestEntry,
  query: string
): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];

  // Exact tag match (case-insensitive): +3
  const hasTagMatch = entry.tags.some(
    (tag) => tag.toLowerCase() === query
  );
  if (hasTagMatch) {
    score += 3;
    matchedFields.push('tags');
  }

  // Title substring match (case-insensitive): +2
  if (entry.title.toLowerCase().includes(query)) {
    score += 2;
    matchedFields.push('title');
  }

  // Summary substring match (case-insensitive): +1
  if (entry.summary.toLowerCase().includes(query)) {
    score += 1;
    matchedFields.push('summary');
  }

  return { score, matchedFields };
}
