import { describe, it, expect } from 'vitest';
import {
  generateScaffold,
  generateTitle,
  validateScaffoldInputs,
  generateFrontmatter,
  ScaffoldError,
} from '../src/scaffold.js';

describe('generateScaffold', () => {
  const validOptions = {
    subdomain: 'discovery',
    area: 'pre-match',
    type: 'overview',
    owner: 'Tomek Osinski',
  };
  const fixedDate = '2025-01-15';

  describe('path generation', () => {
    it('generates correct path for subdomain documents', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.path).toBe('discovery/pre-match/overview.md');
    });

    it('generates correct path for cross-cutting-areas', () => {
      const result = generateScaffold(
        { subdomain: 'cross-cutting-areas', area: 'live-betting', type: 'research', owner: 'Tomek Osinski' },
        fixedDate
      );
      expect(result.path).toBe('cross-cutting-areas/live-betting/research.md');
    });

    it('generates deterministic path for same inputs', () => {
      const result1 = generateScaffold(validOptions, fixedDate);
      const result2 = generateScaffold(validOptions, fixedDate);
      expect(result1.path).toBe(result2.path);
      expect(result1.content).toBe(result2.content);
    });
  });

  describe('frontmatter', () => {
    it('includes status draft', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('status: draft');
    });

    it('includes all required frontmatter fields', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('title: "Pre Match — Overview"');
      expect(result.content).toContain('subdomain: discovery');
      expect(result.content).toContain('experience-area: pre-match');
      expect(result.content).toContain('document-type: overview');
      expect(result.content).toContain('owner: Tomek Osinski');
      expect(result.content).toContain('last-updated: 2025-01-15');
      expect(result.content).toContain('status: draft');
      expect(result.content).toContain('tags:');
      expect(result.content).toContain('  - pre-match');
      expect(result.content).toContain('summary:');
    });

    it('starts with YAML frontmatter delimiters', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content.startsWith('---\n')).toBe(true);
      expect(result.content).toContain('\n---\n');
    });

    it('uses "unassigned" when owner is not provided', () => {
      const result = generateScaffold(
        { subdomain: 'discovery', area: 'pre-match', type: 'overview' },
        fixedDate
      );
      expect(result.content).toContain('owner: unassigned');
    });

    it('uses provided date in last-updated field', () => {
      const result = generateScaffold(validOptions, '2024-06-01');
      expect(result.content).toContain('last-updated: 2024-06-01');
    });

    it('auto-generates title from area and type', () => {
      const result = generateScaffold(
        { subdomain: 'transactional', area: 'bet-placement', type: 'guidelines', owner: 'Agnes Smith' },
        fixedDate
      );
      expect(result.content).toContain('title: "Bet Placement — Guidelines"');
    });

    it('includes area name as tag', () => {
      const result = generateScaffold(
        { subdomain: 'post-bet', area: 'cash-out', type: 'patterns', owner: 'Unassigned' },
        fixedDate
      );
      expect(result.content).toContain('  - cash-out');
    });
  });

  describe('AI annotation markers', () => {
    it('includes all 5 AI annotation markers', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('<!-- ai:summary -->');
      expect(result.content).toContain('<!-- ai:keywords -->');
      expect(result.content).toContain('<!-- ai:constraints -->');
      expect(result.content).toContain('<!-- ai:relationships -->');
      expect(result.content).toContain('<!-- ai:scope -->');
    });

    it('places ai:summary and ai:keywords in Overview section', () => {
      const result = generateScaffold(validOptions, fixedDate);
      const overviewStart = result.content.indexOf('## Overview');
      const principlesStart = result.content.indexOf('## Principles in Context');
      const summaryPos = result.content.indexOf('<!-- ai:summary -->');
      const keywordsPos = result.content.indexOf('<!-- ai:keywords -->');

      expect(summaryPos).toBeGreaterThan(overviewStart);
      expect(summaryPos).toBeLessThan(principlesStart);
      expect(keywordsPos).toBeGreaterThan(overviewStart);
      expect(keywordsPos).toBeLessThan(principlesStart);
    });

    it('places ai:scope in Current State section', () => {
      const result = generateScaffold(validOptions, fixedDate);
      const currentStateStart = result.content.indexOf('## Current State');
      const guidelinesStart = result.content.indexOf('## Guidelines');
      const scopePos = result.content.indexOf('<!-- ai:scope -->');

      expect(scopePos).toBeGreaterThan(currentStateStart);
      expect(scopePos).toBeLessThan(guidelinesStart);
    });

    it('places ai:constraints and ai:relationships in Guidelines section', () => {
      const result = generateScaffold(validOptions, fixedDate);
      const guidelinesStart = result.content.indexOf('## Guidelines');
      const examplesStart = result.content.indexOf('## Examples');
      const constraintsPos = result.content.indexOf('<!-- ai:constraints -->');
      const relationshipsPos = result.content.indexOf('<!-- ai:relationships -->');

      expect(constraintsPos).toBeGreaterThan(guidelinesStart);
      expect(constraintsPos).toBeLessThan(examplesStart);
      expect(relationshipsPos).toBeGreaterThan(guidelinesStart);
      expect(relationshipsPos).toBeLessThan(examplesStart);
    });
  });

  describe('document sections', () => {
    it('includes all 8 required sections in correct order', () => {
      const result = generateScaffold(validOptions, fixedDate);
      const sections = [
        '## Overview',
        '## Principles in Context',
        '## Current State',
        '## Guidelines',
        '## Examples',
        '## Research References',
        '## Decision Log',
        '## Related Areas',
      ];

      let lastIndex = -1;
      for (const section of sections) {
        const index = result.content.indexOf(section);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }
    });

    it('includes instructional placeholder text in Overview', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('Provide a high-level introduction');
    });

    it('includes instructional placeholder text in Principles in Context', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('Describe how the organisation\'s UX principles apply');
    });

    it('includes instructional placeholder text in Current State', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('Document the current state of this experience area');
    });

    it('includes instructional placeholder text in Guidelines', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('Provide specific, actionable guidance');
    });

    it('includes instructional placeholder text in Examples', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('Include concrete examples');
    });

    it('includes instructional placeholder text in Research References', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('List relevant research findings');
    });

    it('includes instructional placeholder text in Decision Log', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('Record significant design decisions');
    });

    it('includes instructional placeholder text in Related Areas', () => {
      const result = generateScaffold(validOptions, fixedDate);
      expect(result.content).toContain('List other experience areas');
    });
  });

  describe('all document types generate valid scaffolds', () => {
    const types = ['overview', 'principles', 'patterns', 'research', 'decisions', 'guidelines', 'examples'] as const;

    for (const type of types) {
      it(`generates valid scaffold for document type "${type}"`, () => {
        const result = generateScaffold(
          { subdomain: 'discovery', area: 'search', type, owner: 'Agnes Smith' },
          fixedDate
        );

        // Has frontmatter
        expect(result.content.startsWith('---\n')).toBe(true);
        expect(result.content).toContain('status: draft');
        expect(result.content).toContain(`document-type: ${type}`);

        // Has all sections
        expect(result.content).toContain('## Overview');
        expect(result.content).toContain('## Guidelines');

        // Has all AI markers
        expect(result.content).toContain('<!-- ai:summary -->');
        expect(result.content).toContain('<!-- ai:keywords -->');
        expect(result.content).toContain('<!-- ai:constraints -->');
        expect(result.content).toContain('<!-- ai:relationships -->');
        expect(result.content).toContain('<!-- ai:scope -->');

        // Path is correct
        expect(result.path).toBe(`discovery/search/${type}.md`);
      });
    }
  });
});

describe('validateScaffoldInputs', () => {
  it('accepts valid inputs', () => {
    expect(() =>
      validateScaffoldInputs({
        subdomain: 'discovery',
        area: 'pre-match',
        type: 'overview',
        owner: 'Tomek Osinski',
      })
    ).not.toThrow();
  });

  it('throws ScaffoldError for invalid subdomain', () => {
    expect(() =>
      validateScaffoldInputs({ subdomain: 'invalid', area: 'test', type: 'overview' })
    ).toThrow(ScaffoldError);
  });

  it('throws ScaffoldError for invalid area (uppercase)', () => {
    expect(() =>
      validateScaffoldInputs({ subdomain: 'discovery', area: 'PreMatch', type: 'overview' })
    ).toThrow(ScaffoldError);
  });

  it('throws ScaffoldError for empty area', () => {
    expect(() =>
      validateScaffoldInputs({ subdomain: 'discovery', area: '', type: 'overview' })
    ).toThrow(ScaffoldError);
  });

  it('throws ScaffoldError for invalid document type', () => {
    expect(() =>
      validateScaffoldInputs({ subdomain: 'discovery', area: 'test', type: 'invalid' })
    ).toThrow(ScaffoldError);
  });

  it('throws ScaffoldError for empty owner', () => {
    expect(() =>
      validateScaffoldInputs({ subdomain: 'discovery', area: 'test', type: 'overview', owner: '' })
    ).toThrow(ScaffoldError);
  });

  it('accepts owner with spaces (designer names)', () => {
    expect(() =>
      validateScaffoldInputs({ subdomain: 'discovery', area: 'test', type: 'overview', owner: 'Tomek Osinski' })
    ).not.toThrow();
  });

  it('accepts owner with mixed case', () => {
    expect(() =>
      validateScaffoldInputs({ subdomain: 'discovery', area: 'test', type: 'overview', owner: 'Agnes Smith' })
    ).not.toThrow();
  });

  it('accepts inputs without owner', () => {
    expect(() =>
      validateScaffoldInputs({ subdomain: 'discovery', area: 'test', type: 'overview' })
    ).not.toThrow();
  });

  it('reports correct field in error for subdomain', () => {
    try {
      validateScaffoldInputs({ subdomain: 'bad', area: 'test', type: 'overview' });
    } catch (e) {
      expect((e as ScaffoldError).field).toBe('subdomain');
    }
  });

  it('reports correct field in error for area', () => {
    try {
      validateScaffoldInputs({ subdomain: 'discovery', area: 'BAD', type: 'overview' });
    } catch (e) {
      expect((e as ScaffoldError).field).toBe('area');
    }
  });

  it('reports correct field in error for type', () => {
    try {
      validateScaffoldInputs({ subdomain: 'discovery', area: 'test', type: 'bad' });
    } catch (e) {
      expect((e as ScaffoldError).field).toBe('type');
    }
  });
});

describe('generateTitle', () => {
  it('converts kebab-case area and type to Title Case', () => {
    expect(generateTitle('live-betting', 'overview')).toBe('Live Betting — Overview');
  });

  it('handles single-word area and type', () => {
    expect(generateTitle('search', 'patterns')).toBe('Search — Patterns');
  });

  it('handles multi-word area and type', () => {
    expect(generateTitle('bet-placement-flow', 'research')).toBe('Bet Placement Flow — Research');
  });
});
