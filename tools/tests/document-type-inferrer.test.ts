import { describe, it, expect } from 'vitest';
import { DocumentTypeInferrer } from '../src/document-type-inferrer.js';
import type { ExtractedContent } from '../src/import-types.js';

/** Helper to create minimal ExtractedContent with given raw text. */
function makeContent(rawText: string): ExtractedContent {
  return {
    rawText,
    paragraphs: [rawText],
    headings: [],
    tables: [],
    metadata: {},
  };
}

describe('DocumentTypeInferrer', () => {
  const inferrer = new DocumentTypeInferrer();

  describe('infer', () => {
    it('returns "research" with high confidence when strong research signals present', () => {
      const content = makeContent(
        'Our methodology involved 30 participants. The findings from this usability study were significant.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('research');
      expect(result.confidence).toBe('high');
      expect(result.signals).toContain('methodology');
      expect(result.signals).toContain('findings');
      expect(result.signals).toContain('participants');
      expect(result.signals).toContain('usability study');
    });

    it('returns "patterns" with high confidence when pattern signals present', () => {
      const content = makeContent(
        'This pattern describes button anatomy and its variants. Know when to use it.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('patterns');
      expect(result.confidence).toBe('high');
      expect(result.signals).toContain('pattern');
      expect(result.signals).toContain('anatomy');
      expect(result.signals).toContain('variants');
      expect(result.signals).toContain('when to use');
    });

    it('returns "guidelines" with high confidence when guideline signals present', () => {
      const content = makeContent(
        'These guidelines state that you must follow the recommended approach. You should not ignore them.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('guidelines');
      expect(result.confidence).toBe('high');
      expect(result.signals).toContain('guidelines');
      expect(result.signals).toContain('must');
      expect(result.signals).toContain('should');
      expect(result.signals).toContain('recommended');
    });

    it('returns "overview" with high confidence when overview signals present', () => {
      const content = makeContent(
        'This overview provides an introduction to the scope and context of the system.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('overview');
      expect(result.confidence).toBe('high');
      expect(result.signals).toContain('overview');
      expect(result.signals).toContain('introduction');
      expect(result.signals).toContain('scope');
      expect(result.signals).toContain('context');
    });

    it('returns "principles" with high confidence when principle signals present', () => {
      const content = makeContent(
        'This principle outlines the rationale and evaluation criteria. It also describes the anti-pattern.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('principles');
      expect(result.confidence).toBe('high');
      expect(result.signals).toContain('principle');
      expect(result.signals).toContain('rationale');
      expect(result.signals).toContain('evaluation');
      expect(result.signals).toContain('anti-pattern');
    });

    it('returns "decisions" with high confidence when decision signals present', () => {
      const content = makeContent(
        'This decision document covers alternatives, rationale, and the trade-off involved.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('decisions');
      expect(result.confidence).toBe('high');
      expect(result.signals).toContain('decision');
      expect(result.signals).toContain('alternatives');
      expect(result.signals).toContain('rationale');
      expect(result.signals).toContain('trade-off');
    });

    it('returns "examples" with high confidence when example signals present', () => {
      const content = makeContent(
        'Here is an example and demonstration. This is a sample showcase of our work.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('examples');
      expect(result.confidence).toBe('high');
      expect(result.signals).toContain('example');
      expect(result.signals).toContain('demonstration');
      expect(result.signals).toContain('sample');
      expect(result.signals).toContain('showcase');
    });

    it('returns medium confidence when exactly 2 signals match', () => {
      const content = makeContent(
        'The methodology and findings are discussed here.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('research');
      expect(result.confidence).toBe('medium');
      expect(result.signals).toHaveLength(2);
    });

    it('returns low confidence when only 1 signal matches', () => {
      const content = makeContent(
        'The methodology is described in this document.'
      );
      const result = inferrer.infer(content);
      expect(result.confidence).toBe('low');
      expect(result.signals).toHaveLength(1);
    });

    it('defaults to "overview" with low confidence when no signals match', () => {
      const content = makeContent(
        'This is a document with no particular keywords that match any type signals.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('overview');
      expect(result.confidence).toBe('low');
      expect(result.signals).toHaveLength(0);
    });

    it('performs case-insensitive matching', () => {
      const content = makeContent(
        'METHODOLOGY and FINDINGS and PARTICIPANTS are discussed in this USABILITY STUDY.'
      );
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('research');
      expect(result.confidence).toBe('high');
    });

    it('picks the first type in TYPE_SIGNALS key order when tied', () => {
      // "rationale" is a signal for both "principles" and "decisions"
      // Create a tie with 1 unique signal for each of two types
      // research comes before principles in TYPE_SIGNALS order
      const content = makeContent(
        'methodology principle'
      );
      const result = inferrer.infer(content);
      // Both "research" and "principles" match 1 signal.
      // "research" appears first in TYPE_SIGNALS key order, so it wins the tie.
      expect(result.documentType).toBe('research');
    });

    it('handles empty rawText gracefully', () => {
      const content = makeContent('');
      const result = inferrer.infer(content);
      expect(result.documentType).toBe('overview');
      expect(result.confidence).toBe('low');
      expect(result.signals).toHaveLength(0);
    });

    it('returns matched signal keywords in the signals array', () => {
      const content = makeContent(
        'This is a pattern with anatomy details.'
      );
      const result = inferrer.infer(content);
      expect(result.signals).toEqual(expect.arrayContaining(['pattern', 'anatomy']));
    });
  });
});
