import { describe, it, expect } from 'vitest';
import { validateReferences, DocumentNode, ReferenceError } from '../src/reference-validator.js';

describe('validateReferences', () => {
  describe('broken references', () => {
    it('detects a reference to a non-existent document', () => {
      const documents: DocumentNode[] = [
        {
          path: 'discovery/search/overview.md',
          relationships: { 'depends-on': ['discovery/search/patterns.md'] },
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const broken = errors.filter((e) => e.category === 'broken-reference');

      expect(broken).toHaveLength(1);
      expect(broken[0].path).toBe('discovery/search/overview.md');
      expect(broken[0].reference).toBe('discovery/search/patterns.md');
      expect(broken[0].message).toContain('does not exist');
    });

    it('detects multiple broken references from the same document', () => {
      const documents: DocumentNode[] = [
        {
          path: 'discovery/search/overview.md',
          relationships: {
            'depends-on': ['nonexistent/a.md'],
            'extends': ['nonexistent/b.md'],
          },
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const broken = errors.filter((e) => e.category === 'broken-reference');

      expect(broken).toHaveLength(2);
      expect(broken.map((e) => e.reference)).toContain('nonexistent/a.md');
      expect(broken.map((e) => e.reference)).toContain('nonexistent/b.md');
    });

    it('does not report valid references as broken', () => {
      const documents: DocumentNode[] = [
        {
          path: 'discovery/search/overview.md',
          relationships: { 'depends-on': ['discovery/search/patterns.md'] },
          isEntryPoint: true,
        },
        {
          path: 'discovery/search/patterns.md',
          relationships: {},
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const broken = errors.filter((e) => e.category === 'broken-reference');

      expect(broken).toHaveLength(0);
    });

    it('detects broken references across multiple relationship types', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: {
            'depends-on': ['missing1.md'],
            'conflicts-with': ['missing2.md'],
            'supersedes': ['b.md'],
          },
          isEntryPoint: true,
        },
        { path: 'b.md', relationships: {}, isEntryPoint: true },
      ];

      const errors = validateReferences(documents);
      const broken = errors.filter((e) => e.category === 'broken-reference');

      expect(broken).toHaveLength(2);
      expect(broken.map((e) => e.reference)).toContain('missing1.md');
      expect(broken.map((e) => e.reference)).toContain('missing2.md');
    });
  });

  describe('orphaned documents', () => {
    it('detects a document with no inbound references and not an entry point', () => {
      const documents: DocumentNode[] = [
        {
          path: 'discovery/index.md',
          relationships: {},
          isEntryPoint: true,
        },
        {
          path: 'discovery/search/overview.md',
          relationships: {},
          isEntryPoint: false,
        },
      ];

      const errors = validateReferences(documents);
      const orphaned = errors.filter((e) => e.category === 'orphaned');

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].path).toBe('discovery/search/overview.md');
      expect(orphaned[0].message).toContain('no inbound references');
    });

    it('does not flag entry points as orphaned', () => {
      const documents: DocumentNode[] = [
        {
          path: 'discovery/index.md',
          relationships: {},
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const orphaned = errors.filter((e) => e.category === 'orphaned');

      expect(orphaned).toHaveLength(0);
    });

    it('does not flag documents with inbound references as orphaned', () => {
      const documents: DocumentNode[] = [
        {
          path: 'discovery/index.md',
          relationships: { 'related-to': ['discovery/search/overview.md'] },
          isEntryPoint: true,
        },
        {
          path: 'discovery/search/overview.md',
          relationships: {},
          isEntryPoint: false,
        },
      ];

      const errors = validateReferences(documents);
      const orphaned = errors.filter((e) => e.category === 'orphaned');

      expect(orphaned).toHaveLength(0);
    });

    it('treats documents without isEntryPoint as non-entry-points', () => {
      const documents: DocumentNode[] = [
        {
          path: 'discovery/search/overview.md',
          relationships: {},
        },
      ];

      const errors = validateReferences(documents);
      const orphaned = errors.filter((e) => e.category === 'orphaned');

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].path).toBe('discovery/search/overview.md');
    });

    it('does not count broken references as inbound references', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: { 'depends-on': ['nonexistent.md'] },
          isEntryPoint: true,
        },
        {
          path: 'b.md',
          relationships: {},
          isEntryPoint: false,
        },
      ];

      const errors = validateReferences(documents);
      const orphaned = errors.filter((e) => e.category === 'orphaned');

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].path).toBe('b.md');
    });
  });

  describe('circular references', () => {
    it('detects a simple two-node cycle', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: { 'depends-on': ['b.md'] },
          isEntryPoint: true,
        },
        {
          path: 'b.md',
          relationships: { 'depends-on': ['a.md'] },
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const circular = errors.filter((e) => e.category === 'circular-reference');

      expect(circular.length).toBeGreaterThanOrEqual(1);
      expect(circular[0].message).toContain('Circular reference detected');
    });

    it('detects a three-node cycle', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: { 'depends-on': ['b.md'] },
          isEntryPoint: true,
        },
        {
          path: 'b.md',
          relationships: { 'depends-on': ['c.md'] },
          isEntryPoint: true,
        },
        {
          path: 'c.md',
          relationships: { 'depends-on': ['a.md'] },
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const circular = errors.filter((e) => e.category === 'circular-reference');

      expect(circular.length).toBeGreaterThanOrEqual(1);
      expect(circular[0].message).toContain('Circular reference detected');
    });

    it('detects a self-referencing document', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: { 'depends-on': ['a.md'] },
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const circular = errors.filter((e) => e.category === 'circular-reference');

      expect(circular.length).toBeGreaterThanOrEqual(1);
      expect(circular[0].path).toBe('a.md');
      expect(circular[0].reference).toBe('a.md');
    });

    it('does not report cycles for acyclic graphs', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: { 'depends-on': ['b.md'] },
          isEntryPoint: true,
        },
        {
          path: 'b.md',
          relationships: { 'depends-on': ['c.md'] },
          isEntryPoint: true,
        },
        {
          path: 'c.md',
          relationships: {},
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const circular = errors.filter((e) => e.category === 'circular-reference');

      expect(circular).toHaveLength(0);
    });

    it('does not report cycles involving broken references', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: { 'depends-on': ['nonexistent.md'] },
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      const circular = errors.filter((e) => e.category === 'circular-reference');

      expect(circular).toHaveLength(0);
    });
  });

  describe('combined scenarios', () => {
    it('returns no errors for a valid graph', () => {
      const documents: DocumentNode[] = [
        {
          path: 'index.md',
          relationships: { 'related-to': ['discovery/overview.md', 'transactional/overview.md'] },
          isEntryPoint: true,
        },
        {
          path: 'discovery/overview.md',
          relationships: { 'depends-on': ['transactional/overview.md'] },
          isEntryPoint: false,
        },
        {
          path: 'transactional/overview.md',
          relationships: {},
          isEntryPoint: false,
        },
      ];

      const errors = validateReferences(documents);

      expect(errors).toHaveLength(0);
    });

    it('reports all error types in a single graph', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: {
            'depends-on': ['b.md', 'nonexistent.md'],
          },
          isEntryPoint: true,
        },
        {
          path: 'b.md',
          relationships: { 'depends-on': ['a.md'] },
          isEntryPoint: true,
        },
        {
          path: 'orphan.md',
          relationships: {},
          isEntryPoint: false,
        },
      ];

      const errors = validateReferences(documents);

      const broken = errors.filter((e) => e.category === 'broken-reference');
      const orphaned = errors.filter((e) => e.category === 'orphaned');
      const circular = errors.filter((e) => e.category === 'circular-reference');

      expect(broken.length).toBeGreaterThanOrEqual(1);
      expect(orphaned.length).toBeGreaterThanOrEqual(1);
      expect(circular.length).toBeGreaterThanOrEqual(1);
    });

    it('handles an empty document array', () => {
      const errors = validateReferences([]);
      expect(errors).toHaveLength(0);
    });

    it('handles documents with empty relationships', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: {},
          isEntryPoint: true,
        },
        {
          path: 'b.md',
          relationships: {},
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      expect(errors).toHaveLength(0);
    });

    it('handles documents with undefined relationship arrays', () => {
      const documents: DocumentNode[] = [
        {
          path: 'a.md',
          relationships: {
            'depends-on': undefined,
            'extends': ['b.md'],
          },
          isEntryPoint: true,
        },
        {
          path: 'b.md',
          relationships: {},
          isEntryPoint: true,
        },
      ];

      const errors = validateReferences(documents);
      expect(errors).toHaveLength(0);
    });
  });
});
