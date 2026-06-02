import { describe, it, expect } from 'vitest';
import { validateRaci, RaciAssignment } from '../src/raci-validator.js';

describe('validateRaci', () => {
  describe('valid assignments', () => {
    it('accepts a fully valid RACI assignment with single responsible', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'live-betting',
          responsible: 'Tomek Osinski',
          accountable: 'Tomek Osinski',
          consulted: ['Agnes Smith', 'Designer A'],
          informed: ['Designer C'],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toEqual([]);
    });

    it('accepts a valid assignment with responsible as an array', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'personalisation',
          responsible: ['Agnes Smith', 'Designer A'],
          accountable: 'Agnes Smith',
          consulted: ['Designer B'],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toEqual([]);
    });

    it('accepts assignments with empty consulted and informed arrays', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'design-system',
          responsible: 'Designer C',
          accountable: 'Designer C',
          consulted: [],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toEqual([]);
    });

    it('accepts multiple valid assignments', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'live-betting',
          responsible: 'Tomek Osinski',
          accountable: 'Tomek Osinski',
          consulted: ['Agnes Smith'],
          informed: ['Designer C'],
        },
        {
          area: 'personalisation',
          responsible: ['Agnes Smith'],
          accountable: 'Agnes Smith',
          consulted: [],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toEqual([]);
    });

    it('accepts designer names with spaces and mixed case', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'search',
          responsible: 'Jean-Pierre Dupont',
          accountable: 'Jean-Pierre Dupont',
          consulted: ['María García'],
          informed: ['Björk Guðmundsdóttir'],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toEqual([]);
    });
  });

  describe('accountable role validation', () => {
    it('rejects an empty accountable field', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'live-betting',
          responsible: 'Tomek Osinski',
          accountable: '',
          consulted: [],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('accountable');
      expect(errors[0].rule).toBe('exactly-one-accountable');
    });

    it('rejects an accountable value that is whitespace only', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'live-betting',
          responsible: 'Tomek Osinski',
          accountable: '   ',
          consulted: [],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('accountable');
      expect(errors[0].rule).toBe('exactly-one-accountable');
    });
  });

  describe('responsible role validation', () => {
    it('flags area as unowned when responsible is an empty string', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'orphaned-area',
          responsible: '',
          accountable: 'Tomek Osinski',
          consulted: [],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('responsible');
      expect(errors[0].rule).toBe('at-least-one-responsible');
      expect(errors[0].message).toContain('unowned');
    });

    it('flags area as unowned when responsible is an empty array', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'orphaned-area',
          responsible: [],
          accountable: 'Tomek Osinski',
          consulted: [],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('responsible');
      expect(errors[0].rule).toBe('at-least-one-responsible');
      expect(errors[0].message).toContain('unowned');
    });

    it('flags area as unowned when responsible array contains only whitespace strings', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'orphaned-area',
          responsible: ['  ', ''],
          accountable: 'Tomek Osinski',
          consulted: [],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('responsible');
      expect(errors[0].rule).toBe('at-least-one-responsible');
      expect(errors[0].message).toContain('unowned');
    });
  });

  describe('consulted role validation', () => {
    it('rejects empty string names in consulted array', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'live-betting',
          responsible: 'Tomek Osinski',
          accountable: 'Tomek Osinski',
          consulted: ['Agnes Smith', ''],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('consulted');
      expect(errors[0].rule).toBe('non-empty-name');
    });

    it('accepts empty consulted array', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'live-betting',
          responsible: 'Tomek Osinski',
          accountable: 'Tomek Osinski',
          consulted: [],
          informed: ['Designer C'],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toEqual([]);
    });
  });

  describe('informed role validation', () => {
    it('rejects empty string names in informed array', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'live-betting',
          responsible: 'Tomek Osinski',
          accountable: 'Tomek Osinski',
          consulted: [],
          informed: [''],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('informed');
      expect(errors[0].rule).toBe('non-empty-name');
    });

    it('accepts empty informed array', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'live-betting',
          responsible: 'Tomek Osinski',
          accountable: 'Tomek Osinski',
          consulted: ['Agnes Smith'],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toEqual([]);
    });
  });

  describe('multiple errors', () => {
    it('reports multiple errors for a single assignment', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'broken-area',
          responsible: '',
          accountable: '',
          consulted: [''],
          informed: [''],
        },
      ];
      const errors = validateRaci(assignments);
      // accountable empty + responsible empty + consulted empty name + informed empty name
      expect(errors).toHaveLength(4);
      expect(errors.map((e) => e.field)).toContain('accountable');
      expect(errors.map((e) => e.field)).toContain('responsible');
      expect(errors.map((e) => e.field)).toContain('consulted');
      expect(errors.map((e) => e.field)).toContain('informed');
    });

    it('reports errors across multiple assignments', () => {
      const assignments: RaciAssignment[] = [
        {
          area: 'area-one',
          responsible: '',
          accountable: 'Tomek Osinski',
          consulted: [],
          informed: [],
        },
        {
          area: 'area-two',
          responsible: 'Agnes Smith',
          accountable: '',
          consulted: [],
          informed: [],
        },
      ];
      const errors = validateRaci(assignments);
      expect(errors).toHaveLength(2);
      expect(errors[0].area).toBe('area-one');
      expect(errors[0].rule).toBe('at-least-one-responsible');
      expect(errors[1].area).toBe('area-two');
      expect(errors[1].rule).toBe('exactly-one-accountable');
    });
  });

  describe('edge cases', () => {
    it('returns no errors for an empty assignments array', () => {
      const errors = validateRaci([]);
      expect(errors).toEqual([]);
    });
  });
});
