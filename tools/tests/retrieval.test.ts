/**
 * Unit tests for the AI Retrieval Service (Tasks 11.3 and 11.5)
 *
 * Tests:
 * - Dependency chain traversal up to depth 2
 * - Maximum 20 documents limit
 * - Circular reference detection
 * - Constraint extraction from `<!-- ai:constraints -->` markers
 * - Metadata completeness checking
 */

import { describe, it, expect } from 'vitest';
import {
  extractConstraints,
  checkMetadataCompleteness,
  traverseDependencyChain,
  findRelatedPaths,
  retrieve,
  buildDocumentContent,
  MAX_DEPTH,
  MAX_DOCUMENTS,
} from '../src/retrieval.js';
import type { Manifest, Relationship, RetrievalRequest } from '../src/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeManifest(
  documents: Array<{ path: string; title?: string }>,
  relationships: Relationship[] = []
): Manifest {
  return {
    version: '1.0.0',
    generatedAt: '2025-01-15T00:00:00.000Z',
    documentCount: documents.length,
    documents: documents.map((d) => ({
      path: d.path,
      title: d.title || 'Test',
      subdomain: 'discovery',
      experienceArea: 'test-area',
      documentType: 'overview' as const,
      owner: 'Test Designer',
      lastUpdated: '2025-01-15',
      status: 'published' as const,
      tags: ['test'],
      summary: 'A test document.',
      maturity: 'documented' as const,
      wordCount: 100,
    })),
    relationships,
  };
}

function makeMarkdown(options?: {
  title?: string;
  constraints?: string;
  missingFields?: boolean;
}): string {
  const title = options?.title || 'Test Document';
  const constraintBlock = options?.constraints || '';
  const missingFields = options?.missingFields || false;

  if (missingFields) {
    return `---
title: ${title}
status: draft
---

## Overview

Some content here.

${constraintBlock}`;
  }

  return `---
title: ${title}
subdomain: discovery
experience-area: test-area
document-type: overview
owner: Test Designer
last-updated: 2025-01-15
status: published
tags:
  - test
summary: A test document summary.
---

## Overview

Some content here.

${constraintBlock}

## Guidelines

Some guidelines content.`;
}

// ─── extractConstraints ──────────────────────────────────────────────────────

describe('extractConstraints', () => {
  it('returns empty array when no constraint marker exists', () => {
    const markdown = `## Overview\n\nSome content.`;
    expect(extractConstraints(markdown)).toEqual([]);
  });

  it('extracts a single prohibited constraint', () => {
    const markdown = `## Guidelines

<!-- ai:constraints -->
- [prohibited]: Do not recommend dark patterns (scope: all-subdomains)

## Examples`;

    const constraints = extractConstraints(markdown);
    expect(constraints).toHaveLength(1);
    expect(constraints[0]).toEqual({
      type: 'prohibited',
      description: 'Do not recommend dark patterns',
      scope: 'all-subdomains',
    });
  });

  it('extracts multiple constraints of different types', () => {
    const markdown = `## Guidelines

<!-- ai:constraints -->
- [prohibited]: Never suggest auto-play for responsible gambling (scope: responsible-gambling)
- [required]: Always include odds format preference (scope: discovery)
- [boundary]: Maximum 3 promotions per page (scope: transactional)

## Examples`;

    const constraints = extractConstraints(markdown);
    expect(constraints).toHaveLength(3);
    expect(constraints[0].type).toBe('prohibited');
    expect(constraints[1].type).toBe('required');
    expect(constraints[2].type).toBe('boundary');
  });

  it('stops parsing at next HTML comment marker', () => {
    const markdown = `## Guidelines

<!-- ai:constraints -->
- [prohibited]: No dark patterns (scope: all)

<!-- ai:relationships -->
- depends-on: other-doc.md`;

    const constraints = extractConstraints(markdown);
    expect(constraints).toHaveLength(1);
  });

  it('stops parsing at next section heading', () => {
    const markdown = `## Guidelines

<!-- ai:constraints -->
- [required]: Must include accessibility info (scope: all)

## Examples

Some example content.`;

    const constraints = extractConstraints(markdown);
    expect(constraints).toHaveLength(1);
  });

  it('ignores lines that do not match the constraint pattern', () => {
    const markdown = `## Guidelines

<!-- ai:constraints -->
This is just a comment, not a constraint.
- [prohibited]: Valid constraint (scope: test)
- Invalid line without proper format
- [required]: Another valid one (scope: discovery)

## Examples`;

    const constraints = extractConstraints(markdown);
    expect(constraints).toHaveLength(2);
  });

  it('handles constraint marker in the middle of a document', () => {
    const markdown = `---
title: Test
---

## Overview

Overview content.

## Guidelines

Some guidelines.

<!-- ai:constraints -->
- [boundary]: Max 500 words per section (scope: all-documents)

More guidelines text.`;

    const constraints = extractConstraints(markdown);
    expect(constraints).toHaveLength(1);
    expect(constraints[0].scope).toBe('all-documents');
  });
});

// ─── checkMetadataCompleteness ───────────────────────────────────────────────

describe('checkMetadataCompleteness', () => {
  it('returns complete when all required fields are present', () => {
    const frontmatter = {
      title: 'Test',
      subdomain: 'discovery',
      'experience-area': 'test-area',
      'document-type': 'overview',
      owner: 'Test Designer',
      'last-updated': '2025-01-15',
      status: 'published',
      tags: ['test'],
      summary: 'A summary.',
    };

    const result = checkMetadataCompleteness(frontmatter);
    expect(result.complete).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it('reports missing fields', () => {
    const frontmatter = {
      title: 'Test',
      subdomain: 'discovery',
    };

    const result = checkMetadataCompleteness(frontmatter);
    expect(result.complete).toBe(false);
    expect(result.missingFields).toContain('experience-area');
    expect(result.missingFields).toContain('document-type');
    expect(result.missingFields).toContain('owner');
    expect(result.missingFields).toContain('last-updated');
    expect(result.missingFields).toContain('status');
    expect(result.missingFields).toContain('tags');
    expect(result.missingFields).toContain('summary');
  });

  it('treats empty string values as missing', () => {
    const frontmatter = {
      title: '',
      subdomain: 'discovery',
      'experience-area': 'test',
      'document-type': 'overview',
      owner: 'Test Designer',
      'last-updated': '2025-01-15',
      status: 'published',
      tags: ['test'],
      summary: 'A summary.',
    };

    const result = checkMetadataCompleteness(frontmatter);
    expect(result.complete).toBe(false);
    expect(result.missingFields).toContain('title');
  });

  it('treats null values as missing', () => {
    const frontmatter = {
      title: 'Test',
      subdomain: null,
      'experience-area': 'test',
      'document-type': 'overview',
      owner: 'Test Designer',
      'last-updated': '2025-01-15',
      status: 'published',
      tags: ['test'],
      summary: 'A summary.',
    };

    const result = checkMetadataCompleteness(frontmatter);
    expect(result.complete).toBe(false);
    expect(result.missingFields).toContain('subdomain');
  });
});

// ─── findRelatedPaths ────────────────────────────────────────────────────────

describe('findRelatedPaths', () => {
  it('returns empty array when no relationships exist', () => {
    const result = findRelatedPaths('doc-a.md', []);
    expect(result).toEqual([]);
  });

  it('finds outgoing relationships', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-a.md', target: 'doc-c.md', type: 'extends' },
    ];

    const result = findRelatedPaths('doc-a.md', relationships);
    expect(result).toContain('doc-b.md');
    expect(result).toContain('doc-c.md');
  });

  it('finds incoming relationships', () => {
    const relationships: Relationship[] = [
      { source: 'doc-b.md', target: 'doc-a.md', type: 'depends-on' },
    ];

    const result = findRelatedPaths('doc-a.md', relationships);
    expect(result).toContain('doc-b.md');
  });

  it('deduplicates paths', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-b.md', target: 'doc-a.md', type: 'related-to' },
    ];

    const result = findRelatedPaths('doc-a.md', relationships);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('doc-b.md');
  });
});

// ─── traverseDependencyChain ─────────────────────────────────────────────────

describe('traverseDependencyChain', () => {
  it('returns empty paths when no relationships exist', () => {
    const result = traverseDependencyChain('doc-a.md', [], 2, 20);
    expect(result.paths).toEqual([]);
    expect(result.circularReferenceDetected).toBe(false);
  });

  it('traverses one level of depth', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-a.md', target: 'doc-c.md', type: 'extends' },
    ];

    const result = traverseDependencyChain('doc-a.md', relationships, 1, 20);
    expect(result.paths).toContain('doc-b.md');
    expect(result.paths).toContain('doc-c.md');
    expect(result.paths).toHaveLength(2);
  });

  it('traverses two levels of depth', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-b.md', target: 'doc-c.md', type: 'depends-on' },
    ];

    const result = traverseDependencyChain('doc-a.md', relationships, 2, 20);
    expect(result.paths).toContain('doc-b.md');
    expect(result.paths).toContain('doc-c.md');
    expect(result.paths).toHaveLength(2);
  });

  it('does not traverse beyond depth 2 even if requested', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-b.md', target: 'doc-c.md', type: 'depends-on' },
      { source: 'doc-c.md', target: 'doc-d.md', type: 'depends-on' },
    ];

    const result = traverseDependencyChain('doc-a.md', relationships, 5, 20);
    expect(result.paths).toContain('doc-b.md');
    expect(result.paths).toContain('doc-c.md');
    // doc-d.md is at depth 3, should not be included
    expect(result.paths).not.toContain('doc-d.md');
  });

  it('detects circular references without infinite loop', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-b.md', target: 'doc-c.md', type: 'depends-on' },
      { source: 'doc-c.md', target: 'doc-a.md', type: 'depends-on' },
    ];

    const result = traverseDependencyChain('doc-a.md', relationships, 2, 20);
    expect(result.circularReferenceDetected).toBe(true);
    // Should still collect doc-b and doc-c
    expect(result.paths).toContain('doc-b.md');
    expect(result.paths).toContain('doc-c.md');
  });

  it('respects maxDocuments limit', () => {
    // Create a wide graph with many nodes at depth 1
    const relationships: Relationship[] = [];
    for (let i = 0; i < 25; i++) {
      relationships.push({
        source: 'doc-a.md',
        target: `doc-${i}.md`,
        type: 'related-to',
      });
    }

    const result = traverseDependencyChain('doc-a.md', relationships, 2, 20);
    // Should return at most 19 (maxDocuments - 1 for the primary)
    expect(result.paths.length).toBeLessThanOrEqual(19);
  });

  it('handles self-referencing document', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-a.md', type: 'related-to' },
    ];

    const result = traverseDependencyChain('doc-a.md', relationships, 2, 20);
    // doc-a is already visited (it's the start), so this is a circular ref
    expect(result.circularReferenceDetected).toBe(true);
    expect(result.paths).toHaveLength(0);
  });
});

// ─── retrieve ────────────────────────────────────────────────────────────────

describe('retrieve', () => {
  it('returns the primary document with chunks and constraints', () => {
    const markdown = makeMarkdown({
      constraints: `<!-- ai:constraints -->
- [prohibited]: No dark patterns (scope: all)`,
    });

    const manifest = makeManifest([{ path: 'discovery/test-area/overview.md' }]);

    const loader = (path: string) => {
      if (path === 'discovery/test-area/overview.md') return markdown;
      return null;
    };

    const response = retrieve(
      { documentPath: 'discovery/test-area/overview.md' },
      manifest,
      loader
    );

    expect(response.document.path).toBe('discovery/test-area/overview.md');
    expect(response.document.chunks.length).toBeGreaterThan(0);
    expect(response.document.constraints).toHaveLength(1);
    expect(response.document.constraints[0].type).toBe('prohibited');
    expect(response.metadataComplete).toBe(true);
  });

  it('includes related documents up to depth 2', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-b.md', target: 'doc-c.md', type: 'extends' },
    ];

    const manifest = makeManifest(
      [{ path: 'doc-a.md' }, { path: 'doc-b.md' }, { path: 'doc-c.md' }],
      relationships
    );

    const docs: Record<string, string> = {
      'doc-a.md': makeMarkdown({ title: 'Doc A' }),
      'doc-b.md': makeMarkdown({ title: 'Doc B' }),
      'doc-c.md': makeMarkdown({ title: 'Doc C' }),
    };

    const loader = (path: string) => docs[path] || null;

    const response = retrieve({ documentPath: 'doc-a.md' }, manifest, loader);

    expect(response.relatedDocuments).toHaveLength(2);
    const relatedPaths = response.relatedDocuments.map((d) => d.path);
    expect(relatedPaths).toContain('doc-b.md');
    expect(relatedPaths).toContain('doc-c.md');
  });

  it('sets circularReferenceDetected when cycle exists', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-b.md', target: 'doc-a.md', type: 'depends-on' },
    ];

    const manifest = makeManifest(
      [{ path: 'doc-a.md' }, { path: 'doc-b.md' }],
      relationships
    );

    const docs: Record<string, string> = {
      'doc-a.md': makeMarkdown({ title: 'Doc A' }),
      'doc-b.md': makeMarkdown({ title: 'Doc B' }),
    };

    const loader = (path: string) => docs[path] || null;

    const response = retrieve({ documentPath: 'doc-a.md' }, manifest, loader);

    expect(response.circularReferenceDetected).toBe(true);
    expect(response.relatedDocuments).toHaveLength(1);
  });

  it('sets metadataComplete=false and missingFields when frontmatter is incomplete', () => {
    const markdown = makeMarkdown({ missingFields: true });
    const manifest = makeManifest([{ path: 'doc-a.md' }]);

    const loader = (path: string) => {
      if (path === 'doc-a.md') return markdown;
      return null;
    };

    const response = retrieve({ documentPath: 'doc-a.md' }, manifest, loader);

    expect(response.metadataComplete).toBe(false);
    expect(response.missingFields).toBeDefined();
    expect(response.missingFields!.length).toBeGreaterThan(0);
  });

  it('returns at most 20 documents total', () => {
    // Create 25 related documents
    const relationships: Relationship[] = [];
    const documents: Array<{ path: string }> = [{ path: 'doc-root.md' }];

    for (let i = 0; i < 25; i++) {
      const path = `doc-${i}.md`;
      documents.push({ path });
      relationships.push({
        source: 'doc-root.md',
        target: path,
        type: 'related-to',
      });
    }

    const manifest = makeManifest(documents, relationships);

    const docs: Record<string, string> = {};
    for (const d of documents) {
      docs[d.path] = makeMarkdown({ title: d.path });
    }

    const loader = (path: string) => docs[path] || null;

    const response = retrieve(
      { documentPath: 'doc-root.md', maxDocuments: 20 },
      manifest,
      loader
    );

    // Total documents = primary (1) + related (≤19) = ≤20
    expect(response.relatedDocuments.length + 1).toBeLessThanOrEqual(MAX_DOCUMENTS);
  });

  it('handles document not found gracefully', () => {
    const manifest = makeManifest([]);
    const loader = () => null;

    const response = retrieve(
      { documentPath: 'nonexistent.md' },
      manifest,
      loader
    );

    expect(response.document.path).toBe('nonexistent.md');
    expect(response.document.chunks).toHaveLength(0);
    expect(response.metadataComplete).toBe(false);
    expect(response.missingFields).toBeDefined();
  });

  it('respects includeDepth parameter', () => {
    const relationships: Relationship[] = [
      { source: 'doc-a.md', target: 'doc-b.md', type: 'depends-on' },
      { source: 'doc-b.md', target: 'doc-c.md', type: 'depends-on' },
    ];

    const manifest = makeManifest(
      [{ path: 'doc-a.md' }, { path: 'doc-b.md' }, { path: 'doc-c.md' }],
      relationships
    );

    const docs: Record<string, string> = {
      'doc-a.md': makeMarkdown({ title: 'Doc A' }),
      'doc-b.md': makeMarkdown({ title: 'Doc B' }),
      'doc-c.md': makeMarkdown({ title: 'Doc C' }),
    };

    const loader = (path: string) => docs[path] || null;

    // With depth 1, should only get doc-b
    const response = retrieve(
      { documentPath: 'doc-a.md', includeDepth: 1 },
      manifest,
      loader
    );

    expect(response.relatedDocuments).toHaveLength(1);
    expect(response.relatedDocuments[0].path).toBe('doc-b.md');
  });
});
