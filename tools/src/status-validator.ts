/**
 * Sports Experience Guidelines — Status Transition Guards
 *
 * Checks whether a document can be assigned a given target status.
 * Specifically, prevents documents with validation errors from reaching
 * "validated" status and flags incomplete metadata on retrieval.
 *
 * Validates: Requirements 7.7, 8.8
 */

import type { Maturity } from './types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Result of a status transition guard check. */
export interface StatusGuardResult {
  allowed: boolean;
  metadataComplete: boolean;
  missingFields: string[];
  blockingErrors: string[];
}

/** A validation error with field, rule, and message. */
export interface StatusValidationError {
  field: string;
  rule: string;
  message: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Statuses that are always allowed regardless of validation state. */
const ALWAYS_ALLOWED_STATUSES: string[] = [
  'draft',
  'in-review',
  'published',
  'deprecated',
];

/** The status that requires a clean validation state. */
const GUARDED_STATUS: Maturity = 'validated';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Checks whether a document can be assigned a given target status.
 * Specifically, prevents documents with validation errors from reaching "validated" status.
 *
 * @param targetStatus - The status the document is being transitioned to
 * @param validationErrors - Structure/content validation errors for the document
 * @param frontmatterErrors - Frontmatter field-level validation errors
 * @returns A StatusGuardResult indicating whether the transition is allowed
 */
export function checkStatusTransition(
  targetStatus: string,
  validationErrors: StatusValidationError[],
  frontmatterErrors: StatusValidationError[]
): StatusGuardResult {
  const allErrors = [...validationErrors, ...frontmatterErrors];

  // Determine metadata completeness from frontmatter errors
  const missingFields = frontmatterErrors.map((e) => e.field);
  const metadataComplete = frontmatterErrors.length === 0;

  // For non-guarded statuses, the transition is always allowed
  if (targetStatus !== GUARDED_STATUS) {
    return {
      allowed: true,
      metadataComplete,
      missingFields,
      blockingErrors: [],
    };
  }

  // For "validated" status, block if there are any errors
  if (allErrors.length > 0) {
    const blockingErrors = allErrors.map(
      (e) => `[${e.field}] ${e.rule}: ${e.message}`
    );

    return {
      allowed: false,
      metadataComplete,
      missingFields,
      blockingErrors,
    };
  }

  // No errors — transition to "validated" is allowed
  return {
    allowed: true,
    metadataComplete,
    missingFields: [],
    blockingErrors: [],
  };
}
