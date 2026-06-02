/**
 * Sports Experience Guidelines — Document Type Inferrer
 *
 * Determines the document type from content signals by scoring extracted
 * content against keyword patterns defined in TYPE_SIGNALS.
 *
 * Scoring logic:
 * - Search for each signal keyword in the raw text (case-insensitive)
 * - Count matches per document type
 * - Highest scoring type wins (ties broken by TYPE_SIGNALS key order)
 * - Confidence: "high" = 3+ signals, "medium" = 2 signals, "low" = 0-1 signals
 * - Default to "overview" if no signals match
 */

import type { DocumentType } from './types.js';
import type { ExtractedContent, InferenceResult } from './import-types.js';
import { TYPE_SIGNALS } from './import-types.js';

/**
 * Infers the document type from extracted content by matching signal keywords.
 */
export class DocumentTypeInferrer {
  /**
   * Analyse extracted content and infer its document type based on signal keyword density.
   *
   * @param content - The structured content extracted from a source document
   * @returns An InferenceResult with the inferred type, confidence level, and matched signals
   */
  infer(content: ExtractedContent): InferenceResult {
    const text = content.rawText.toLowerCase();

    let bestType: DocumentType = 'overview';
    let bestScore = 0;
    let bestSignals: string[] = [];

    for (const [type, signals] of Object.entries(TYPE_SIGNALS) as [DocumentType, string[]][]) {
      const matched: string[] = [];

      for (const signal of signals) {
        if (text.includes(signal.toLowerCase())) {
          matched.push(signal);
        }
      }

      if (matched.length > bestScore) {
        bestScore = matched.length;
        bestType = type;
        bestSignals = matched;
      }
    }

    const confidence = this.scoreToConfidence(bestScore);

    return {
      documentType: bestType,
      confidence,
      signals: bestSignals,
    };
  }

  /**
   * Map a signal match count to a confidence level.
   */
  private scoreToConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 3) return 'high';
    if (score === 2) return 'medium';
    return 'low';
  }
}
