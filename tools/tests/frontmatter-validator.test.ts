import { describe, it, expect } from 'vitest';
import {
  validateFrontmatter,
  extractFrontmatter,
  countWords,
} from '../src/frontmatter-validator.js';

// ─── Helper ──────────────────────────────────────────────────────────────────

function makeFrontmatter(fields: Record<string, unknown>): string {
  const lines = Object.entries(fields).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`;
    }
    return `${key}: ${JSON.stringify(value)}`;
  });
  return `---\n${lines.join('\n')}\n---\n\n# Content`;
}

const VALID_FRONTMATTER: Record<string, unknown> = {
  title: 'Live Betting Overview',
  subdomain: 'discovery',
  'experience-area': 'live-betting',
  'document-type': 'overview',
  owner: 'Tomek Osinski',
  'last-updated': '2025-01-15',
  status: 'published',
  tags: ['live', 'betting', 'in-play'],
  summary: 'An overview of the live betting experience area covering real-time wagering interactions.',
};

// ─── extractFrontmatter ──────────────────────────────────────────────────────

describe('extractFrontmatter', () => {
  it('extracts YAML between --- delimiters', () => {
    const md = '---\ntitle: Test\n---\n\n# Hello';
    expect(extractFrontmatter(md)).toBe('title: Test');
  });

  it('returns null when no opening delimiter', () => {
    expect(extractFrontmatter('# No frontmatter')).toBeNull();
  });

  it('returns null when no closing delimiter', () => {
    expect(extractFrontmatter('---\ntitle: Test\n')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractFrontmatter('')).toBeNull();
  });
});

// ─── countWords ──────────────────────────────────────────────────────────────

describe('countWords', () => {
  it('counts words separated by spaces', () => {
    expect(countWords('hello world')).toBe(2);
  });

  it('counts words separated by multiple whitespace types', () => {
    expect(countWords('one\ttwo\nthree  four')).toBe(4);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \t\n  ')).toBe(0);
  });

  it('counts single word', () => {
    expect(countWords('hello')).toBe(1);
  });
});

// ─── validateFrontmatter — valid documents ───────────────────────────────────

describe('validateFrontmatter', () => {
  describe('valid frontmatter', () => {
    it('accepts a fully valid frontmatter', () => {
      const md = makeFrontmatter(VALID_FRONTMATTER);
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).not.toBeNull();
    });

    it('accepts all valid subdomain values', () => {
      for (const subdomain of ['discovery', 'transactional', 'post-bet', 'cross-cutting-areas']) {
        const md = makeFrontmatter({ ...VALID_FRONTMATTER, subdomain });
        expect(validateFrontmatter(md).valid).toBe(true);
      }
    });

    it('accepts all valid document-type values', () => {
      for (const type of ['overview', 'principles', 'patterns', 'research', 'decisions', 'guidelines', 'examples']) {
        const md = makeFrontmatter({ ...VALID_FRONTMATTER, 'document-type': type });
        expect(validateFrontmatter(md).valid).toBe(true);
      }
    });

    it('accepts all valid status values', () => {
      for (const status of ['draft', 'in-review', 'published', 'deprecated']) {
        const md = makeFrontmatter({ ...VALID_FRONTMATTER, status });
        expect(validateFrontmatter(md).valid).toBe(true);
      }
    });

    it('accepts title at exactly 100 characters', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, title: 'a'.repeat(100) });
      expect(validateFrontmatter(md).valid).toBe(true);
    });

    it('accepts summary at exactly 200 words', () => {
      const summary = Array(200).fill('word').join(' ');
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, summary });
      expect(validateFrontmatter(md).valid).toBe(true);
    });

    it('accepts tags with exactly 1 item', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, tags: ['single-tag'] });
      expect(validateFrontmatter(md).valid).toBe(true);
    });

    it('accepts tags with exactly 15 items', () => {
      const tags = Array.from({ length: 15 }, (_, i) => `tag-${i}`);
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, tags });
      expect(validateFrontmatter(md).valid).toBe(true);
    });
  });

  // ─── Missing fields ──────────────────────────────────────────────────────

  describe('missing required fields', () => {
    it('reports missing title', () => {
      const { title, ...rest } = VALID_FRONTMATTER;
      const md = makeFrontmatter(rest);
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title' && e.rule === 'required')).toBe(true);
    });

    it('reports missing subdomain', () => {
      const { subdomain, ...rest } = VALID_FRONTMATTER;
      const md = makeFrontmatter(rest);
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'subdomain' && e.rule === 'required')).toBe(true);
    });

    it('reports all missing fields when frontmatter is empty object', () => {
      const md = '---\n{}\n---\n\n# Content';
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(9); // all 9 required fields
    });

    it('reports each missing field individually', () => {
      const md = makeFrontmatter({ title: 'Only Title' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      const missingFields = result.errors
        .filter((e) => e.rule === 'required')
        .map((e) => e.field);
      expect(missingFields).toContain('subdomain');
      expect(missingFields).toContain('experience-area');
      expect(missingFields).toContain('document-type');
      expect(missingFields).toContain('owner');
      expect(missingFields).toContain('last-updated');
      expect(missingFields).toContain('status');
      expect(missingFields).toContain('tags');
      expect(missingFields).toContain('summary');
    });
  });

  // ─── Invalid enum values ─────────────────────────────────────────────────

  describe('invalid enum values', () => {
    it('rejects invalid subdomain', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, subdomain: 'invalid-domain' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'subdomain' && e.rule === 'enum')).toBe(true);
    });

    it('rejects invalid document-type', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, 'document-type': 'tutorial' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'document-type' && e.rule === 'enum')).toBe(true);
    });

    it('rejects invalid status', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, status: 'archived' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'status' && e.rule === 'enum')).toBe(true);
    });

    it('includes the invalid value in the error message', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, status: 'archived' });
      const result = validateFrontmatter(md);
      const error = result.errors.find((e) => e.field === 'status');
      expect(error?.message).toContain('archived');
    });
  });

  // ─── Pattern validation ──────────────────────────────────────────────────

  describe('pattern validation', () => {
    it('rejects experience-area with uppercase', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, 'experience-area': 'LiveBetting' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'experience-area' && e.rule === 'pattern')).toBe(true);
    });

    it('accepts owner with spaces (designer names)', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, owner: 'Tomek Osinski' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(true);
    });

    it('accepts owner with mixed case', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, owner: 'Agnes Smith' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(true);
    });

    it('rejects empty owner', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, owner: '' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'owner' && e.rule === 'minLength')).toBe(true);
    });

    it('rejects whitespace-only owner', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, owner: '   ' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'owner' && e.rule === 'minLength')).toBe(true);
    });

    it('rejects non-kebab-case tags', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, tags: ['valid-tag', 'Invalid_Tag'] });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.startsWith('tags[') && e.rule === 'pattern')).toBe(true);
    });

    it('rejects last-updated with invalid date format', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, 'last-updated': '15/01/2025' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'last-updated' && e.rule === 'pattern')).toBe(true);
    });

    it('rejects last-updated with datetime format', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, 'last-updated': '2025-01-15T10:30:00Z' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'last-updated')).toBe(true);
    });
  });

  // ─── Boundary word counts ────────────────────────────────────────────────

  describe('boundary word counts', () => {
    it('rejects summary exceeding 200 words', () => {
      const summary = Array(201).fill('word').join(' ');
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, summary });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'summary' && e.rule === 'maxWords')).toBe(true);
    });

    it('accepts summary at exactly 200 words', () => {
      const summary = Array(200).fill('word').join(' ');
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, summary });
      expect(validateFrontmatter(md).valid).toBe(true);
    });

    it('accepts summary with 1 word', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, summary: 'overview' });
      expect(validateFrontmatter(md).valid).toBe(true);
    });

    it('rejects empty summary', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, summary: '' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'summary' && e.rule === 'minLength')).toBe(true);
    });
  });

  // ─── Title length ────────────────────────────────────────────────────────

  describe('title length', () => {
    it('rejects title exceeding 100 characters', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, title: 'a'.repeat(101) });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title' && e.rule === 'maxLength')).toBe(true);
    });

    it('rejects empty title', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, title: '' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title' && e.rule === 'minLength')).toBe(true);
    });
  });

  // ─── Tags constraints ────────────────────────────────────────────────────

  describe('tags constraints', () => {
    it('rejects empty tags array', () => {
      // Use raw YAML since the helper can't serialize empty arrays properly
      const md = `---
title: "Live Betting Overview"
subdomain: "discovery"
experience-area: "live-betting"
document-type: "overview"
owner: "Tomek Osinski"
last-updated: "2025-01-15"
status: "published"
tags: []
summary: "An overview of the live betting experience area."
---

# Content`;
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'tags' && e.rule === 'minItems')).toBe(true);
    });

    it('rejects more than 15 tags', () => {
      const tags = Array.from({ length: 16 }, (_, i) => `tag-${i}`);
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, tags });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'tags' && e.rule === 'maxItems')).toBe(true);
    });

    it('rejects non-array tags', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, tags: 'not-an-array' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'tags' && e.rule === 'type')).toBe(true);
    });
  });

  // ─── Malformed YAML ──────────────────────────────────────────────────────

  describe('malformed YAML', () => {
    it('reports missing frontmatter delimiters', () => {
      const result = validateFrontmatter('# Just a heading\n\nSome content');
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('_frontmatter');
      expect(result.errors[0].rule).toBe('presence');
    });

    it('reports invalid YAML syntax', () => {
      const md = '---\ntitle: [invalid yaml\n---\n\n# Content';
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('_frontmatter');
      expect(result.errors[0].rule).toBe('syntax');
    });

    it('reports non-object YAML (scalar)', () => {
      const md = '---\njust a string\n---\n\n# Content';
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('_frontmatter');
      expect(result.errors[0].rule).toBe('type');
    });

    it('reports non-object YAML (array)', () => {
      const md = '---\n- item1\n- item2\n---\n\n# Content';
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('_frontmatter');
      expect(result.errors[0].rule).toBe('type');
    });
  });

  // ─── Data output ─────────────────────────────────────────────────────────

  describe('parsed data output', () => {
    it('returns parsed data on valid frontmatter', () => {
      const md = makeFrontmatter(VALID_FRONTMATTER);
      const result = validateFrontmatter(md);
      expect(result.data).not.toBeNull();
      expect(result.data?.['title']).toBe('Live Betting Overview');
      expect(result.data?.['subdomain']).toBe('discovery');
    });

    it('returns parsed data even when validation fails (for partial data access)', () => {
      const md = makeFrontmatter({ ...VALID_FRONTMATTER, status: 'invalid' });
      const result = validateFrontmatter(md);
      expect(result.valid).toBe(false);
      expect(result.data).not.toBeNull();
      expect(result.data?.['title']).toBe('Live Betting Overview');
    });

    it('returns null data when frontmatter cannot be parsed', () => {
      const result = validateFrontmatter('# No frontmatter');
      expect(result.data).toBeNull();
    });
  });
});
