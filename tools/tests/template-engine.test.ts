import { describe, it, expect } from 'vitest';

import { TemplateEngine } from '../src/template-engine.js';
import {
  TEMPLATE_SECTIONS,
  RESEARCH_EXTRA_SECTIONS,
  PLACEHOLDER_TEXT,
  type ExtractedContent,
  type TemplateOptions,
  type FrontmatterFields,
} from '../src/import-types.js';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeExtractedContent(overrides: Partial<ExtractedContent> = {}): ExtractedContent {
  return {
    rawText: 'Overview of the project.\n\nGuidelines for usage.',
    paragraphs: ['Overview of the project.', 'Guidelines for usage.'],
    headings: [],
    tables: [],
    metadata: {
      title: 'My Test Document',
      possibleTags: ['design', 'guidelines'],
      possibleSubdomain: 'discovery',
      possibleExperienceArea: 'market-layouts',
    },
    ...overrides,
  };
}

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Frontmatter Generation ─────────────────────────────────────────────────

describe('TemplateEngine', () => {
  const engine = new TemplateEngine();

  describe('frontmatter generation', () => {
    it('generates frontmatter with all required fields from complete metadata', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'guidelines',
      };

      const result = engine.generate(options);

      expect(result.frontmatter.title).toBe('My Test Document');
      expect(result.frontmatter.subdomain).toBe('discovery');
      expect(result.frontmatter['experience-area']).toBe('market-layouts');
      expect(result.frontmatter['document-type']).toBe('guidelines');
      expect(result.frontmatter.owner).toBe('Unassigned');
      expect(result.frontmatter['last-updated']).toBe(todayISO());
      expect(result.frontmatter.status).toBe('draft');
      expect(result.frontmatter.tags).toEqual(['design', 'guidelines']);
      expect(result.frontmatter.summary).toBe('Overview of the project.');
    });

    it('sets status to "draft" for all generated documents', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'overview',
      };

      const result = engine.generate(options);
      expect(result.frontmatter.status).toBe('draft');
    });

    it('sets last-updated to today in YYYY-MM-DD format', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'patterns',
      };

      const result = engine.generate(options);
      expect(result.frontmatter['last-updated']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.frontmatter['last-updated']).toBe(todayISO());
    });

    it('uses defaults for missing metadata fields', () => {
      const content = makeExtractedContent({
        metadata: {
          title: undefined,
          possibleTags: undefined,
          possibleSubdomain: undefined,
          possibleExperienceArea: undefined,
        },
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);

      expect(result.frontmatter.title).toBe('Untitled Document');
      expect(result.frontmatter.subdomain).toBe('discovery');
      expect(result.frontmatter['experience-area']).toBe('general');
      expect(result.frontmatter.tags).toEqual(['draft']);
      expect(result.frontmatter.status).toBe('draft');
    });

    it('applies overrides over inferred metadata values', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'guidelines',
        overrides: {
          title: 'Override Title',
          subdomain: 'post-bet',
          'experience-area': 'cash-out',
          owner: 'Jane Doe',
          tags: ['override-tag'],
          summary: 'Custom summary text.',
        },
      };

      const result = engine.generate(options);

      expect(result.frontmatter.title).toBe('Override Title');
      expect(result.frontmatter.subdomain).toBe('post-bet');
      expect(result.frontmatter['experience-area']).toBe('cash-out');
      expect(result.frontmatter.owner).toBe('Jane Doe');
      expect(result.frontmatter.tags).toEqual(['override-tag']);
      expect(result.frontmatter.summary).toBe('Custom summary text.');
      // status and last-updated should still be generated
      expect(result.frontmatter.status).toBe('draft');
      expect(result.frontmatter['last-updated']).toBe(todayISO());
    });

    it('truncates summary to max 200 words from first paragraph', () => {
      const longParagraph = Array(250).fill('word').join(' ');
      const content = makeExtractedContent({
        paragraphs: [longParagraph],
        rawText: longParagraph,
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);
      const summaryWords = result.frontmatter.summary.replace('...', '').trim().split(/\s+/);
      expect(summaryWords.length).toBeLessThanOrEqual(200);
    });
  });

  // ─── Section Mapping ─────────────────────────────────────────────────────

  describe('section mapping', () => {
    it('maps headings matching template section names to correct sections', () => {
      const content = makeExtractedContent({
        headings: [
          { level: 1, text: 'Overview', children: [] },
          { level: 1, text: 'Guidelines', children: [] },
        ],
        paragraphs: ['Overview', 'This is the overview content.', 'Guidelines', 'Follow these rules.'],
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'guidelines',
      };

      const result = engine.generate(options);

      const overviewSection = result.sections.find((s) => s.name === 'overview');
      expect(overviewSection).toBeDefined();
      expect(overviewSection!.isPlaceholder).toBe(false);
      expect(overviewSection!.content).toContain('This is the overview content.');

      const guidelinesSection = result.sections.find((s) => s.name === 'guidelines');
      expect(guidelinesSection).toBeDefined();
      expect(guidelinesSection!.isPlaceholder).toBe(false);
      expect(guidelinesSection!.content).toContain('Follow these rules.');
    });

    it('includes all TEMPLATE_SECTIONS in generated output', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'overview',
      };

      const result = engine.generate(options);

      for (const section of TEMPLATE_SECTIONS) {
        const found = result.sections.find((s) => s.name === section);
        expect(found, `Section "${section}" should be present`).toBeDefined();
      }
    });

    it('preserves canonical section order in generated markdown', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'overview',
      };

      const result = engine.generate(options);

      const sectionNames = result.sections.map((s) => s.name);
      const expectedOrder = [...TEMPLATE_SECTIONS];

      for (let i = 0; i < expectedOrder.length; i++) {
        const idx = sectionNames.indexOf(expectedOrder[i]);
        expect(idx, `Section "${expectedOrder[i]}" should be in correct position`).toBeGreaterThanOrEqual(0);
        if (i > 0) {
          const prevIdx = sectionNames.indexOf(expectedOrder[i - 1]);
          expect(idx).toBeGreaterThan(prevIdx);
        }
      }
    });
  });

  // ─── Placeholder Insertion ───────────────────────────────────────────────

  describe('placeholder insertion', () => {
    it('fills unmapped sections with PLACEHOLDER_TEXT', () => {
      const content = makeExtractedContent({
        headings: [],
        paragraphs: ['Some content that does not map to any section.'],
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);

      // All sections should be placeholders since no headings match
      for (const section of result.sections) {
        expect(section.isPlaceholder).toBe(true);
        expect(section.content).toBe(PLACEHOLDER_TEXT);
      }
    });

    it('marks sections with content as non-placeholder', () => {
      const content = makeExtractedContent({
        headings: [{ level: 1, text: 'Overview', children: [] }],
        paragraphs: ['Overview', 'Real content for overview section.'],
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);

      const overviewSection = result.sections.find((s) => s.name === 'overview');
      expect(overviewSection!.isPlaceholder).toBe(false);
      expect(overviewSection!.content).not.toBe(PLACEHOLDER_TEXT);
    });

    it('includes PLACEHOLDER_TEXT in the generated markdown string', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent({ headings: [], paragraphs: ['Some text'] }),
        documentType: 'overview',
      };

      const result = engine.generate(options);
      expect(result.markdown).toContain(PLACEHOLDER_TEXT);
    });
  });

  // ─── Research Template ───────────────────────────────────────────────────

  describe('research-type template', () => {
    it('includes RESEARCH_EXTRA_SECTIONS when documentType is "research"', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'research',
      };

      const result = engine.generate(options);

      for (const extraSection of RESEARCH_EXTRA_SECTIONS) {
        const found = result.sections.find((s) => s.name === extraSection);
        expect(found, `Research section "${extraSection}" should be present`).toBeDefined();
      }
    });

    it('does NOT include RESEARCH_EXTRA_SECTIONS for non-research types', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'guidelines',
      };

      const result = engine.generate(options);

      for (const extraSection of RESEARCH_EXTRA_SECTIONS) {
        const found = result.sections.find((s) => s.name === extraSection);
        expect(found, `Research section "${extraSection}" should NOT be present for guidelines`).toBeUndefined();
      }
    });

    it('places research sections after overview', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'research',
      };

      const result = engine.generate(options);
      const sectionNames = result.sections.map((s) => s.name);

      const overviewIdx = sectionNames.indexOf('overview');
      const methodologyIdx = sectionNames.indexOf('methodology');
      const findingsIdx = sectionNames.indexOf('findings');
      const recommendationsIdx = sectionNames.indexOf('recommendations');

      expect(methodologyIdx).toBe(overviewIdx + 1);
      expect(findingsIdx).toBe(overviewIdx + 2);
      expect(recommendationsIdx).toBe(overviewIdx + 3);
    });

    it('includes research sections in generated markdown headings', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'research',
      };

      const result = engine.generate(options);

      expect(result.markdown).toContain('## Methodology');
      expect(result.markdown).toContain('## Findings');
      expect(result.markdown).toContain('## Recommendations');
    });
  });

  // ─── Kebab-Case Filename Generation ──────────────────────────────────────

  describe('kebab-case filename generation', () => {
    it('converts title with spaces to kebab-case', () => {
      const content = makeExtractedContent({
        metadata: { title: 'My Document Title' },
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);
      expect(result.suggestedFilename).toBe('my-document-title.md');
    });

    it('removes special characters and produces valid kebab-case', () => {
      const content = makeExtractedContent({
        metadata: { title: 'Design Guidelines: V2 (Final!)' },
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'guidelines',
      };

      const result = engine.generate(options);
      expect(result.suggestedFilename).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.md$/);
      expect(result.suggestedFilename).toBe('design-guidelines-v2-final.md');
    });

    it('handles unicode characters by removing them', () => {
      const content = makeExtractedContent({
        metadata: { title: 'Über Design Café' },
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);
      expect(result.suggestedFilename).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.md$/);
      // Unicode chars are stripped; only ascii alphanumeric remains
      expect(result.suggestedFilename).toBe('ber-design-caf.md');
    });

    it('handles title with only special chars by using default filename', () => {
      const content = makeExtractedContent({
        metadata: { title: '!@#$%^&*()' },
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);
      expect(result.suggestedFilename).toBe('untitled-document.md');
    });

    it('handles title with leading/trailing spaces', () => {
      const content = makeExtractedContent({
        metadata: { title: '  Padded Title  ' },
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);
      expect(result.suggestedFilename).toBe('padded-title.md');
    });

    it('collapses multiple hyphens into single hyphen', () => {
      const content = makeExtractedContent({
        metadata: { title: 'Design --- Rules' },
      });

      const options: TemplateOptions = {
        extractedContent: content,
        documentType: 'overview',
      };

      const result = engine.generate(options);
      expect(result.suggestedFilename).toBe('design-rules.md');
    });

    it('produces filename from override title when provided', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'overview',
        overrides: { title: 'Overridden Title Name' },
      };

      const result = engine.generate(options);
      expect(result.suggestedFilename).toBe('overridden-title-name.md');
    });
  });

  // ─── Generated Markdown Structure ────────────────────────────────────────

  describe('generated markdown structure', () => {
    it('includes YAML frontmatter block delimited by ---', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'overview',
      };

      const result = engine.generate(options);
      expect(result.markdown.startsWith('---\n')).toBe(true);
      // Should have closing ---
      const parts = result.markdown.split('---');
      expect(parts.length).toBeGreaterThanOrEqual(3); // before, content, after
    });

    it('includes section headings as ## in markdown', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'overview',
      };

      const result = engine.generate(options);

      expect(result.markdown).toContain('## Overview');
      expect(result.markdown).toContain('## Principles In Context');
      expect(result.markdown).toContain('## Guidelines');
      expect(result.markdown).toContain('## Component Map');
      expect(result.markdown).toContain('## Examples');
      expect(result.markdown).toContain('## Research References');
      expect(result.markdown).toContain('## Decision Log');
      expect(result.markdown).toContain('## Related Areas');
    });

    it('includes frontmatter fields in markdown YAML block', () => {
      const options: TemplateOptions = {
        extractedContent: makeExtractedContent(),
        documentType: 'guidelines',
      };

      const result = engine.generate(options);

      expect(result.markdown).toContain('title: "My Test Document"');
      expect(result.markdown).toContain('subdomain: "discovery"');
      expect(result.markdown).toContain('experience-area: "market-layouts"');
      expect(result.markdown).toContain('document-type: "guidelines"');
      expect(result.markdown).toContain('status: "draft"');
      expect(result.markdown).toContain(`last-updated: "${todayISO()}"`);
    });
  });
});
