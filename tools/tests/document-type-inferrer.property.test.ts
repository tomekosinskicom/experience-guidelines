/**
 * Property-Based Tests for DocumentTypeInferrer
 *
 * Feature: document-import-workflow
 * Property 13: Document-type inference correctness
 *
 * Validates: Requirements 8.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DocumentTypeInferrer } from '../src/document-type-inferrer.js';
import { TYPE_SIGNALS } from '../src/import-types.js';
import type { ExtractedContent } from '../src/import-types.js';
import type { DocumentType } from '../src/types.js';

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

/** All document types that have at least 3 signals (eligible for high confidence). */
const eligibleTypes = (Object.entries(TYPE_SIGNALS) as [DocumentType, string[]][]).filter(
  ([, signals]) => signals.length >= 3
);

/** Filler words to intersperse between signal keywords. */
const FILLER_WORDS = [
  'the', 'document', 'describes', 'following', 'section',
  'this', 'is', 'about', 'content', 'area', 'team',
  'we', 'have', 'explored', 'various', 'aspects',
];

/**
 * Arbitrary that generates a tuple of [documentType, selectedSignals, rawText]:
 * 1. Picks a random eligible document type
 * 2. Picks at least 3 (up to all) signal keywords from that type
 * 3. Constructs text by interspersing filler words between the signals
 */
const strongSignalContentArb = fc
  .integer({ min: 0, max: eligibleTypes.length - 1 })
  .chain((typeIndex) => {
    const [docType, signals] = eligibleTypes[typeIndex];
    // Pick at least 3 signals, up to all available
    const minSignals = 3;
    const maxSignals = signals.length;

    return fc
      .subarray(signals, { minLength: minSignals, maxLength: maxSignals })
      .chain((selectedSignals) => {
        // Generate filler text between signals
        return fc
          .array(fc.constantFrom(...FILLER_WORDS), {
            minLength: selectedSignals.length,
            maxLength: selectedSignals.length * 3,
          })
          .map((fillerArr) => {
            // Intersperse filler words and signal keywords
            const parts: string[] = [];
            for (let i = 0; i < selectedSignals.length; i++) {
              // Add some filler before each signal
              const fillerSliceStart = i * Math.floor(fillerArr.length / selectedSignals.length);
              const fillerSliceEnd = (i + 1) * Math.floor(fillerArr.length / selectedSignals.length);
              const fillerChunk = fillerArr.slice(fillerSliceStart, fillerSliceEnd);
              parts.push(fillerChunk.join(' '));
              parts.push(selectedSignals[i]);
            }
            const rawText = parts.join(' ').trim();
            return { docType, selectedSignals, rawText };
          });
      });
  });

describe('DocumentTypeInferrer — Property-Based Tests', () => {
  const inferrer = new DocumentTypeInferrer();

  it('Property 13: Document-type inference correctness — content with 3+ signals returns correct type with high confidence', () => {
    fc.assert(
      fc.property(strongSignalContentArb, ({ docType, selectedSignals, rawText }) => {
        const content = makeContent(rawText);
        const result = inferrer.infer(content);

        // The inferred document type must match the type whose signals were injected
        expect(result.documentType).toBe(docType);

        // Confidence must be "high" since we injected 3+ signals
        expect(result.confidence).toBe('high');

        // The signals array must contain all the keywords we injected
        for (const signal of selectedSignals) {
          expect(result.signals).toContain(signal);
        }
      }),
      { numRuns: 100 }
    );
  });
});
