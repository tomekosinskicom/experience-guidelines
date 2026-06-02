import { describe, it, expect } from 'vitest';
import { generatePath, PathGenerationError } from '../src/path-generator.js';

describe('generatePath', () => {
  describe('subdomain documents', () => {
    it('generates correct path for discovery subdomain', () => {
      expect(generatePath('discovery', 'pre-match', 'overview')).toBe(
        'discovery/pre-match/overview.md'
      );
    });

    it('generates correct path for transactional subdomain', () => {
      expect(generatePath('transactional', 'bet-placement', 'patterns')).toBe(
        'transactional/bet-placement/patterns.md'
      );
    });

    it('generates correct path for post-bet subdomain', () => {
      expect(generatePath('post-bet', 'cash-out', 'guidelines')).toBe(
        'post-bet/cash-out/guidelines.md'
      );
    });
  });

  describe('cross-cutting documents', () => {
    it('generates correct path for cross-cutting-areas', () => {
      expect(generatePath('cross-cutting-areas', 'live-betting', 'research')).toBe(
        'cross-cutting-areas/live-betting/research.md'
      );
    });

    it('generates correct path for accessibility cross-cutting area', () => {
      expect(generatePath('cross-cutting-areas', 'accessibility', 'principles')).toBe(
        'cross-cutting-areas/accessibility/principles.md'
      );
    });
  });

  describe('all document types', () => {
    const types = [
      'overview',
      'principles',
      'patterns',
      'research',
      'decisions',
      'guidelines',
      'examples',
    ] as const;

    for (const type of types) {
      it(`generates correct path for document type "${type}"`, () => {
        const result = generatePath('discovery', 'search', type);
        expect(result).toBe(`discovery/search/${type}.md`);
      });
    }
  });

  describe('determinism', () => {
    it('produces the same output for the same inputs', () => {
      const result1 = generatePath('discovery', 'pre-match', 'overview');
      const result2 = generatePath('discovery', 'pre-match', 'overview');
      expect(result1).toBe(result2);
    });
  });

  describe('input validation', () => {
    it('throws PathGenerationError for invalid subdomain', () => {
      expect(() => generatePath('invalid', 'area', 'overview')).toThrow(PathGenerationError);
      expect(() => generatePath('invalid', 'area', 'overview')).toThrow(/Invalid subdomain/);
    });

    it('throws PathGenerationError for invalid experience area (uppercase)', () => {
      expect(() => generatePath('discovery', 'PreMatch', 'overview')).toThrow(
        PathGenerationError
      );
      expect(() => generatePath('discovery', 'PreMatch', 'overview')).toThrow(
        /Invalid experience area/
      );
    });

    it('throws PathGenerationError for invalid experience area (spaces)', () => {
      expect(() => generatePath('discovery', 'pre match', 'overview')).toThrow(
        PathGenerationError
      );
    });

    it('throws PathGenerationError for empty experience area', () => {
      expect(() => generatePath('discovery', '', 'overview')).toThrow(PathGenerationError);
    });

    it('throws PathGenerationError for invalid document type', () => {
      expect(() =>
        generatePath('discovery', 'area', 'invalid' as any)
      ).toThrow(PathGenerationError);
      expect(() =>
        generatePath('discovery', 'area', 'invalid' as any)
      ).toThrow(/Invalid document type/);
    });

    it('throws PathGenerationError for experience area exceeding 64 chars', () => {
      const longName = 'a'.repeat(65);
      expect(() => generatePath('discovery', longName, 'overview')).toThrow(
        PathGenerationError
      );
    });
  });
});
