import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import {
  loadDesigners,
  loadRaciMatrix,
  loadOwnershipData,
  getOwnerForArea,
  getAreasForDesigner,
  getUnownedAreas,
  getReviewStatus,
  RaciMatrixEntry,
  DesignerProfile,
} from '../src/ownership.js';

const rootDir = resolve(__dirname, '..', '..');
const sportsDir = resolve(rootDir, 'pillars', 'sports');
const designersPath = resolve(sportsDir, 'ownership', 'designers.yaml');
const raciPath = resolve(sportsDir, 'ownership', 'raci-matrix.yaml');

describe('Ownership Module', () => {
  describe('loadDesigners', () => {
    it('loads and parses designers.yaml successfully', () => {
      const designers = loadDesigners(designersPath);
      expect(Array.isArray(designers)).toBe(true);
      expect(designers.length).toBeGreaterThan(0);
    });

    it('each designer has required fields: name, role, areas', () => {
      const designers = loadDesigners(designersPath);
      for (const designer of designers) {
        expect(designer.name).toBeDefined();
        expect(typeof designer.name).toBe('string');
        expect(designer.role).toBeDefined();
        expect(typeof designer.role).toBe('string');
        expect(Array.isArray(designer.areas)).toBe(true);
      }
    });

    it('designer roles are Lead Designer or Designer', () => {
      const designers = loadDesigners(designersPath);
      for (const designer of designers) {
        expect(['Lead Designer', 'Designer']).toContain(designer.role);
      }
    });

    it('throws on invalid file path', () => {
      expect(() => loadDesigners('/nonexistent/path/designers.yaml')).toThrow();
    });
  });

  describe('loadRaciMatrix', () => {
    it('loads and parses raci-matrix.yaml successfully', () => {
      const matrix = loadRaciMatrix(raciPath);
      expect(Array.isArray(matrix)).toBe(true);
      expect(matrix.length).toBeGreaterThan(0);
    });

    it('each entry has required fields: area, subdomain, raci, review-cadence, last-reviewed', () => {
      const matrix = loadRaciMatrix(raciPath);
      for (const entry of matrix) {
        expect(entry.area).toBeDefined();
        expect(typeof entry.area).toBe('string');
        expect(entry.subdomain).toBeDefined();
        expect(entry.raci).toBeDefined();
        expect(entry.raci.accountable).toBeDefined();
        expect(entry['review-cadence']).toBeDefined();
        expect(entry['last-reviewed']).toBeDefined();
      }
    });

    it('throws on invalid file path', () => {
      expect(() => loadRaciMatrix('/nonexistent/path/raci-matrix.yaml')).toThrow();
    });
  });

  describe('loadOwnershipData', () => {
    it('loads both files and returns combined data', () => {
      const data = loadOwnershipData(sportsDir);
      expect(data.designers.length).toBeGreaterThan(0);
      expect(data.raciMatrix.length).toBeGreaterThan(0);
    });

    it('validates RACI matrix entries', () => {
      const data = loadOwnershipData(sportsDir);
      // Our placeholder data should be valid
      expect(data.validationErrors).toEqual([]);
    });
  });

  describe('getOwnerForArea', () => {
    let raciMatrix: RaciMatrixEntry[];

    beforeAll(() => {
      raciMatrix = loadRaciMatrix(raciPath);
    });

    it('returns the responsible designer for a known area', () => {
      const owner = getOwnerForArea('live-betting', raciMatrix);
      expect(owner).toBe('Tomek Osinski');
    });

    it('returns null for an unknown area', () => {
      const owner = getOwnerForArea('nonexistent-area', raciMatrix);
      expect(owner).toBeNull();
    });

    it('returns the first designer when responsible is an array', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'multi-owner',
          subdomain: 'discovery',
          raci: {
            responsible: ['Agnes Smith', 'Designer A'],
            accountable: 'Agnes Smith',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2025-01-01',
        },
      ];
      const owner = getOwnerForArea('multi-owner', testMatrix);
      expect(owner).toBe('Agnes Smith');
    });

    it('returns null when responsible is empty string', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'unowned',
          subdomain: 'discovery',
          raci: {
            responsible: '',
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2025-01-01',
        },
      ];
      const owner = getOwnerForArea('unowned', testMatrix);
      expect(owner).toBeNull();
    });

    it('returns null when responsible is empty array', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'unowned',
          subdomain: 'discovery',
          raci: {
            responsible: [],
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2025-01-01',
        },
      ];
      const owner = getOwnerForArea('unowned', testMatrix);
      expect(owner).toBeNull();
    });
  });

  describe('getAreasForDesigner', () => {
    let raciMatrix: RaciMatrixEntry[];

    beforeAll(() => {
      raciMatrix = loadRaciMatrix(raciPath);
    });

    it('returns areas where designer is responsible', () => {
      const areas = getAreasForDesigner('Tomek Osinski', raciMatrix);
      expect(areas).toContain('live-betting');
      expect(areas).toContain('pre-match');
    });

    it('returns areas where designer is consulted', () => {
      const areas = getAreasForDesigner('Agnes Smith', raciMatrix);
      // Agnes Smith is consulted on live-betting
      expect(areas).toContain('live-betting');
    });

    it('returns areas where designer is informed', () => {
      const areas = getAreasForDesigner('Designer C', raciMatrix);
      // Designer C is informed on multiple areas
      expect(areas.length).toBeGreaterThan(0);
    });

    it('returns empty array for unknown designer', () => {
      const areas = getAreasForDesigner('Unknown Person', raciMatrix);
      expect(areas).toEqual([]);
    });

    it('does not duplicate areas when designer has multiple roles', () => {
      // Tomek Osinski is both responsible and accountable for live-betting
      const areas = getAreasForDesigner('Tomek Osinski', raciMatrix);
      const uniqueAreas = [...new Set(areas)];
      expect(areas.length).toBe(uniqueAreas.length);
    });
  });

  describe('getUnownedAreas', () => {
    it('returns empty array when all areas have responsible designers', () => {
      const raciMatrix = loadRaciMatrix(raciPath);
      const unowned = getUnownedAreas(raciMatrix);
      expect(unowned).toEqual([]);
    });

    it('detects areas with empty string responsible', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'orphaned-area',
          subdomain: 'discovery',
          raci: {
            responsible: '',
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2025-01-01',
        },
        {
          area: 'owned-area',
          subdomain: 'discovery',
          raci: {
            responsible: 'Agnes Smith',
            accountable: 'Agnes Smith',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2025-01-01',
        },
      ];
      const unowned = getUnownedAreas(testMatrix);
      expect(unowned).toEqual(['orphaned-area']);
    });

    it('detects areas with empty array responsible', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'orphaned-area',
          subdomain: 'discovery',
          raci: {
            responsible: [],
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2025-01-01',
        },
      ];
      const unowned = getUnownedAreas(testMatrix);
      expect(unowned).toEqual(['orphaned-area']);
    });

    it('detects areas with whitespace-only responsible strings', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'whitespace-area',
          subdomain: 'discovery',
          raci: {
            responsible: '   ',
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2025-01-01',
        },
      ];
      const unowned = getUnownedAreas(testMatrix);
      expect(unowned).toEqual(['whitespace-area']);
    });
  });

  describe('getReviewStatus', () => {
    let raciMatrix: RaciMatrixEntry[];

    beforeAll(() => {
      raciMatrix = loadRaciMatrix(raciPath);
    });

    it('returns review status for a known area', () => {
      const status = getReviewStatus('live-betting', raciMatrix);
      expect(status).not.toBeNull();
      expect(status!.cadence).toBe('quarterly');
      expect(status!.lastReviewed).toBe('2025-01-15');
      expect(typeof status!.overdue).toBe('boolean');
    });

    it('returns null for an unknown area', () => {
      const status = getReviewStatus('nonexistent-area', raciMatrix);
      expect(status).toBeNull();
    });

    it('marks as overdue when last review exceeds cadence', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'stale-area',
          subdomain: 'discovery',
          raci: {
            responsible: 'Tomek Osinski',
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2024-01-01',
        },
      ];
      // Use a reference date well past 90 days from 2024-01-01
      const referenceDate = new Date('2025-06-01');
      const status = getReviewStatus('stale-area', testMatrix, referenceDate);
      expect(status).not.toBeNull();
      expect(status!.overdue).toBe(true);
    });

    it('marks as not overdue when last review is within cadence', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'fresh-area',
          subdomain: 'discovery',
          raci: {
            responsible: 'Tomek Osinski',
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': '2025-05-01',
        },
      ];
      // Use a reference date within 90 days of 2025-05-01
      const referenceDate = new Date('2025-06-01');
      const status = getReviewStatus('fresh-area', testMatrix, referenceDate);
      expect(status).not.toBeNull();
      expect(status!.overdue).toBe(false);
    });

    it('handles monthly cadence correctly', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'monthly-area',
          subdomain: 'discovery',
          raci: {
            responsible: 'Tomek Osinski',
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'monthly',
          'last-reviewed': '2025-05-01',
        },
      ];
      // 45 days later — overdue for monthly
      const referenceDate = new Date('2025-06-15');
      const status = getReviewStatus('monthly-area', testMatrix, referenceDate);
      expect(status!.overdue).toBe(true);
    });

    it('handles annual cadence correctly', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'annual-area',
          subdomain: 'discovery',
          raci: {
            responsible: 'Tomek Osinski',
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'annual',
          'last-reviewed': '2025-01-01',
        },
      ];
      // 6 months later — not overdue for annual
      const referenceDate = new Date('2025-07-01');
      const status = getReviewStatus('annual-area', testMatrix, referenceDate);
      expect(status!.overdue).toBe(false);
    });

    it('marks as overdue when last-reviewed is an invalid date', () => {
      const testMatrix: RaciMatrixEntry[] = [
        {
          area: 'bad-date-area',
          subdomain: 'discovery',
          raci: {
            responsible: 'Tomek Osinski',
            accountable: 'Tomek Osinski',
            consulted: [],
            informed: [],
          },
          'review-cadence': 'quarterly',
          'last-reviewed': 'not-a-date',
        },
      ];
      const status = getReviewStatus('bad-date-area', testMatrix);
      expect(status!.overdue).toBe(true);
    });
  });
});
