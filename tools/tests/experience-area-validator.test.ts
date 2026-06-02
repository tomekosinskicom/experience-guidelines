import { describe, it, expect } from 'vitest';
import { validateExperienceArea } from '../src/experience-area-validator.js';
import type { ExperienceAreaEntry } from '../src/types.js';

// ─── Helper ──────────────────────────────────────────────────────────────────

const VALID_ENTRY: ExperienceAreaEntry = {
  name: 'Pre-Match Browsing',
  subdomain: 'discovery',
  description: 'Covers the experience of browsing available markets and events before a match begins.',
  scopeBoundary: {
    included: ['market browsing', 'event listing', 'odds display'],
    excluded: ['live in-play updates', 'cash-out functionality'],
  },
  relatedCrossCuttingAreas: ['personalisation', 'accessibility'],
  maturity: 'in-progress',
  owner: 'Tomek Osinski',
};

// ─── Valid entries ───────────────────────────────────────────────────────────

describe('validateExperienceArea', () => {
  describe('valid entries', () => {
    it('accepts a fully valid entry with no errors', () => {
      const errors = validateExperienceArea(VALID_ENTRY);
      expect(errors).toHaveLength(0);
    });

    it('accepts all valid maturity values', () => {
      for (const maturity of ['not-started', 'in-progress', 'documented', 'validated'] as const) {
        const errors = validateExperienceArea({ ...VALID_ENTRY, maturity });
        expect(errors).toHaveLength(0);
      }
    });

    it('accepts all valid subdomain values', () => {
      for (const subdomain of ['discovery', 'transactional', 'post-bet', 'cross-cutting-areas']) {
        const errors = validateExperienceArea({ ...VALID_ENTRY, subdomain });
        expect(errors).toHaveLength(0);
      }
    });

    it('accepts description at exactly 150 words', () => {
      const description = Array(150).fill('word').join(' ');
      const errors = validateExperienceArea({ ...VALID_ENTRY, description });
      expect(errors).toHaveLength(0);
    });

    it('accepts entry with optional crossReferences field', () => {
      const entry: ExperienceAreaEntry = {
        ...VALID_ENTRY,
        crossReferences: ['cross-cutting-areas/live-betting/overview.md'],
      };
      const errors = validateExperienceArea(entry);
      expect(errors).toHaveLength(0);
    });
  });

  // ─── name validation ─────────────────────────────────────────────────────

  describe('name validation', () => {
    it('reports missing name', () => {
      const { name, ...rest } = VALID_ENTRY;
      const errors = validateExperienceArea(rest);
      expect(errors.some((e) => e.field === 'name' && e.rule === 'required')).toBe(true);
    });

    it('reports empty name', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, name: '' });
      expect(errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);
    });

    it('reports whitespace-only name', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, name: '   ' });
      expect(errors.some((e) => e.field === 'name' && e.rule === 'minLength')).toBe(true);
    });
  });

  // ─── subdomain validation ────────────────────────────────────────────────

  describe('subdomain validation', () => {
    it('reports missing subdomain', () => {
      const { subdomain, ...rest } = VALID_ENTRY;
      const errors = validateExperienceArea(rest);
      expect(errors.some((e) => e.field === 'subdomain' && e.rule === 'required')).toBe(true);
    });

    it('rejects invalid subdomain value', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, subdomain: 'invalid-domain' });
      expect(errors.some((e) => e.field === 'subdomain' && e.rule === 'enum')).toBe(true);
    });

    it('includes the invalid value in the error message', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, subdomain: 'unknown' });
      const error = errors.find((e) => e.field === 'subdomain');
      expect(error?.message).toContain('unknown');
    });
  });

  // ─── description validation ──────────────────────────────────────────────

  describe('description validation', () => {
    it('reports missing description', () => {
      const { description, ...rest } = VALID_ENTRY;
      const errors = validateExperienceArea(rest);
      expect(errors.some((e) => e.field === 'description' && e.rule === 'required')).toBe(true);
    });

    it('reports empty description', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, description: '' });
      expect(errors.some((e) => e.field === 'description' && e.rule === 'minLength')).toBe(true);
    });

    it('reports whitespace-only description', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, description: '   \t\n  ' });
      expect(errors.some((e) => e.field === 'description' && e.rule === 'minLength')).toBe(true);
    });

    it('rejects description exceeding 150 words', () => {
      const description = Array(151).fill('word').join(' ');
      const errors = validateExperienceArea({ ...VALID_ENTRY, description });
      expect(errors.some((e) => e.field === 'description' && e.rule === 'maxWords')).toBe(true);
    });

    it('includes word count in error message', () => {
      const description = Array(151).fill('word').join(' ');
      const errors = validateExperienceArea({ ...VALID_ENTRY, description });
      const error = errors.find((e) => e.field === 'description');
      expect(error?.message).toContain('151');
    });

    it('accepts description at exactly 150 words', () => {
      const description = Array(150).fill('word').join(' ');
      const errors = validateExperienceArea({ ...VALID_ENTRY, description });
      expect(errors.filter((e) => e.field === 'description')).toHaveLength(0);
    });

    it('accepts description with 1 word', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, description: 'overview' });
      expect(errors.filter((e) => e.field === 'description')).toHaveLength(0);
    });
  });

  // ─── scopeBoundary validation ────────────────────────────────────────────

  describe('scopeBoundary validation', () => {
    it('reports missing scopeBoundary', () => {
      const { scopeBoundary, ...rest } = VALID_ENTRY;
      const errors = validateExperienceArea(rest);
      expect(errors.some((e) => e.field === 'scopeBoundary' && e.rule === 'required')).toBe(true);
    });

    it('reports empty included array', () => {
      const errors = validateExperienceArea({
        ...VALID_ENTRY,
        scopeBoundary: { included: [], excluded: ['something'] },
      });
      expect(errors.some((e) => e.field === 'scopeBoundary.included' && e.rule === 'minItems')).toBe(true);
    });

    it('reports empty excluded array', () => {
      const errors = validateExperienceArea({
        ...VALID_ENTRY,
        scopeBoundary: { included: ['something'], excluded: [] },
      });
      expect(errors.some((e) => e.field === 'scopeBoundary.excluded' && e.rule === 'minItems')).toBe(true);
    });

    it('reports both empty included and excluded arrays', () => {
      const errors = validateExperienceArea({
        ...VALID_ENTRY,
        scopeBoundary: { included: [], excluded: [] },
      });
      expect(errors.some((e) => e.field === 'scopeBoundary.included' && e.rule === 'minItems')).toBe(true);
      expect(errors.some((e) => e.field === 'scopeBoundary.excluded' && e.rule === 'minItems')).toBe(true);
    });

    it('accepts scopeBoundary with single items in each list', () => {
      const errors = validateExperienceArea({
        ...VALID_ENTRY,
        scopeBoundary: { included: ['one'], excluded: ['two'] },
      });
      expect(errors.filter((e) => e.field.startsWith('scopeBoundary'))).toHaveLength(0);
    });
  });

  // ─── relatedCrossCuttingAreas validation ─────────────────────────────────

  describe('relatedCrossCuttingAreas validation', () => {
    it('reports missing relatedCrossCuttingAreas', () => {
      const { relatedCrossCuttingAreas, ...rest } = VALID_ENTRY;
      const errors = validateExperienceArea(rest);
      expect(errors.some((e) => e.field === 'relatedCrossCuttingAreas' && e.rule === 'required')).toBe(true);
    });

    it('reports empty relatedCrossCuttingAreas array', () => {
      const errors = validateExperienceArea({
        ...VALID_ENTRY,
        relatedCrossCuttingAreas: [],
      });
      expect(errors.some((e) => e.field === 'relatedCrossCuttingAreas' && e.rule === 'minItems')).toBe(true);
    });

    it('accepts relatedCrossCuttingAreas with a single item', () => {
      const errors = validateExperienceArea({
        ...VALID_ENTRY,
        relatedCrossCuttingAreas: ['accessibility'],
      });
      expect(errors.filter((e) => e.field === 'relatedCrossCuttingAreas')).toHaveLength(0);
    });
  });

  // ─── maturity validation ─────────────────────────────────────────────────

  describe('maturity validation', () => {
    it('reports missing maturity', () => {
      const { maturity, ...rest } = VALID_ENTRY;
      const errors = validateExperienceArea(rest);
      expect(errors.some((e) => e.field === 'maturity' && e.rule === 'required')).toBe(true);
    });

    it('rejects invalid maturity value', () => {
      const errors = validateExperienceArea({
        ...VALID_ENTRY,
        maturity: 'complete' as any,
      });
      expect(errors.some((e) => e.field === 'maturity' && e.rule === 'enum')).toBe(true);
    });

    it('includes the invalid value in the error message', () => {
      const errors = validateExperienceArea({
        ...VALID_ENTRY,
        maturity: 'finished' as any,
      });
      const error = errors.find((e) => e.field === 'maturity');
      expect(error?.message).toContain('finished');
    });
  });

  // ─── owner validation ────────────────────────────────────────────────────

  describe('owner validation', () => {
    it('reports missing owner', () => {
      const { owner, ...rest } = VALID_ENTRY;
      const errors = validateExperienceArea(rest);
      expect(errors.some((e) => e.field === 'owner' && e.rule === 'required')).toBe(true);
    });

    it('reports empty owner', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, owner: '' });
      expect(errors.some((e) => e.field === 'owner' && e.rule === 'minLength')).toBe(true);
    });

    it('reports whitespace-only owner', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, owner: '   ' });
      expect(errors.some((e) => e.field === 'owner' && e.rule === 'minLength')).toBe(true);
    });

    it('accepts a valid designer name', () => {
      const errors = validateExperienceArea({ ...VALID_ENTRY, owner: 'Agnes Smith' });
      expect(errors.filter((e) => e.field === 'owner')).toHaveLength(0);
    });
  });

  // ─── Multiple errors ─────────────────────────────────────────────────────

  describe('multiple errors', () => {
    it('reports all missing fields for an empty object', () => {
      const errors = validateExperienceArea({});
      const requiredFields = ['name', 'subdomain', 'description', 'scopeBoundary', 'relatedCrossCuttingAreas', 'maturity', 'owner'];
      for (const field of requiredFields) {
        expect(errors.some((e) => e.field === field && e.rule === 'required')).toBe(true);
      }
    });

    it('reports multiple different validation errors simultaneously', () => {
      const errors = validateExperienceArea({
        name: '',
        subdomain: 'invalid',
        description: Array(200).fill('word').join(' '),
        scopeBoundary: { included: [], excluded: [] },
        relatedCrossCuttingAreas: [],
        maturity: 'unknown' as any,
        owner: '  ',
      });
      expect(errors.length).toBeGreaterThan(1);
      expect(errors.some((e) => e.field === 'name')).toBe(true);
      expect(errors.some((e) => e.field === 'subdomain')).toBe(true);
      expect(errors.some((e) => e.field === 'description')).toBe(true);
      expect(errors.some((e) => e.field.startsWith('scopeBoundary'))).toBe(true);
      expect(errors.some((e) => e.field === 'relatedCrossCuttingAreas')).toBe(true);
      expect(errors.some((e) => e.field === 'maturity')).toBe(true);
      expect(errors.some((e) => e.field === 'owner')).toBe(true);
    });
  });
});
