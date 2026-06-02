/**
 * Sports Experience Guidelines — Experience Area Entry Validator
 *
 * Validates ExperienceAreaEntry objects against the constraints defined
 * in the design document (Property 8):
 * - name: required, non-empty string
 * - subdomain: required, must be one of discovery, transactional, post-bet, cross-cutting-areas
 * - description: required, max 150 words
 * - scopeBoundary: required, must have non-empty `included` and `excluded` arrays
 * - relatedCrossCuttingAreas: required, must be a non-empty array
 * - maturity: required, must be one of: not-started, in-progress, documented, validated
 * - owner: required, non-empty string (Lead Designer name)
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 5.1
 */

import type { ExperienceAreaEntry, Maturity } from './types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single field-level validation error for an experience area entry. */
export interface ExperienceAreaValidationError {
  field: string;
  rule: string;
  message: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_SUBDOMAINS = [
  'discovery',
  'transactional',
  'post-bet',
  'cross-cutting-areas',
] as const;

const VALID_MATURITY_VALUES: readonly Maturity[] = [
  'not-started',
  'in-progress',
  'documented',
  'validated',
] as const;

const DESCRIPTION_MAX_WORDS = 150;

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Counts words in a string by splitting on whitespace.
 */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates an ExperienceAreaEntry object against all constraints.
 *
 * @param entry - A partial ExperienceAreaEntry to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateExperienceArea(
  entry: Partial<ExperienceAreaEntry>
): ExperienceAreaValidationError[] {
  const errors: ExperienceAreaValidationError[] = [];

  // ─── name ────────────────────────────────────────────────────────────────
  if (entry.name === undefined || entry.name === null) {
    errors.push({
      field: 'name',
      rule: 'required',
      message: "Field 'name' is required",
    });
  } else if (typeof entry.name !== 'string') {
    errors.push({
      field: 'name',
      rule: 'type',
      message: "Field 'name' must be a string",
    });
  } else if (entry.name.trim().length === 0) {
    errors.push({
      field: 'name',
      rule: 'minLength',
      message: "Field 'name' must not be empty",
    });
  }

  // ─── subdomain ───────────────────────────────────────────────────────────
  if (entry.subdomain === undefined || entry.subdomain === null) {
    errors.push({
      field: 'subdomain',
      rule: 'required',
      message: "Field 'subdomain' is required",
    });
  } else if (typeof entry.subdomain !== 'string') {
    errors.push({
      field: 'subdomain',
      rule: 'type',
      message: "Field 'subdomain' must be a string",
    });
  } else if (!(VALID_SUBDOMAINS as readonly string[]).includes(entry.subdomain)) {
    errors.push({
      field: 'subdomain',
      rule: 'enum',
      message: `Field 'subdomain' must be one of: ${VALID_SUBDOMAINS.join(', ')} (got '${entry.subdomain}')`,
    });
  }

  // ─── description ─────────────────────────────────────────────────────────
  if (entry.description === undefined || entry.description === null) {
    errors.push({
      field: 'description',
      rule: 'required',
      message: "Field 'description' is required",
    });
  } else if (typeof entry.description !== 'string') {
    errors.push({
      field: 'description',
      rule: 'type',
      message: "Field 'description' must be a string",
    });
  } else if (entry.description.trim().length === 0) {
    errors.push({
      field: 'description',
      rule: 'minLength',
      message: "Field 'description' must not be empty",
    });
  } else {
    const wordCount = countWords(entry.description);
    if (wordCount > DESCRIPTION_MAX_WORDS) {
      errors.push({
        field: 'description',
        rule: 'maxWords',
        message: `Field 'description' exceeds maximum of ${DESCRIPTION_MAX_WORDS} words (got ${wordCount})`,
      });
    }
  }

  // ─── scopeBoundary ───────────────────────────────────────────────────────
  if (entry.scopeBoundary === undefined || entry.scopeBoundary === null) {
    errors.push({
      field: 'scopeBoundary',
      rule: 'required',
      message: "Field 'scopeBoundary' is required",
    });
  } else if (typeof entry.scopeBoundary !== 'object' || Array.isArray(entry.scopeBoundary)) {
    errors.push({
      field: 'scopeBoundary',
      rule: 'type',
      message: "Field 'scopeBoundary' must be an object with 'included' and 'excluded' arrays",
    });
  } else {
    // Validate included
    if (!Array.isArray(entry.scopeBoundary.included)) {
      errors.push({
        field: 'scopeBoundary.included',
        rule: 'type',
        message: "Field 'scopeBoundary.included' must be an array",
      });
    } else if (entry.scopeBoundary.included.length === 0) {
      errors.push({
        field: 'scopeBoundary.included',
        rule: 'minItems',
        message: "Field 'scopeBoundary.included' must not be empty",
      });
    }

    // Validate excluded
    if (!Array.isArray(entry.scopeBoundary.excluded)) {
      errors.push({
        field: 'scopeBoundary.excluded',
        rule: 'type',
        message: "Field 'scopeBoundary.excluded' must be an array",
      });
    } else if (entry.scopeBoundary.excluded.length === 0) {
      errors.push({
        field: 'scopeBoundary.excluded',
        rule: 'minItems',
        message: "Field 'scopeBoundary.excluded' must not be empty",
      });
    }
  }

  // ─── relatedCrossCuttingAreas ────────────────────────────────────────────
  if (entry.relatedCrossCuttingAreas === undefined || entry.relatedCrossCuttingAreas === null) {
    errors.push({
      field: 'relatedCrossCuttingAreas',
      rule: 'required',
      message: "Field 'relatedCrossCuttingAreas' is required",
    });
  } else if (!Array.isArray(entry.relatedCrossCuttingAreas)) {
    errors.push({
      field: 'relatedCrossCuttingAreas',
      rule: 'type',
      message: "Field 'relatedCrossCuttingAreas' must be an array",
    });
  } else if (entry.relatedCrossCuttingAreas.length === 0) {
    errors.push({
      field: 'relatedCrossCuttingAreas',
      rule: 'minItems',
      message: "Field 'relatedCrossCuttingAreas' must not be empty",
    });
  }

  // ─── maturity ────────────────────────────────────────────────────────────
  if (entry.maturity === undefined || entry.maturity === null) {
    errors.push({
      field: 'maturity',
      rule: 'required',
      message: "Field 'maturity' is required",
    });
  } else if (typeof entry.maturity !== 'string') {
    errors.push({
      field: 'maturity',
      rule: 'type',
      message: "Field 'maturity' must be a string",
    });
  } else if (!(VALID_MATURITY_VALUES as readonly string[]).includes(entry.maturity)) {
    errors.push({
      field: 'maturity',
      rule: 'enum',
      message: `Field 'maturity' must be one of: ${VALID_MATURITY_VALUES.join(', ')} (got '${entry.maturity}')`,
    });
  }

  // ─── owner ───────────────────────────────────────────────────────────────
  if (entry.owner === undefined || entry.owner === null) {
    errors.push({
      field: 'owner',
      rule: 'required',
      message: "Field 'owner' is required",
    });
  } else if (typeof entry.owner !== 'string') {
    errors.push({
      field: 'owner',
      rule: 'type',
      message: "Field 'owner' must be a string",
    });
  } else if (entry.owner.trim().length === 0) {
    errors.push({
      field: 'owner',
      rule: 'minLength',
      message: "Field 'owner' must not be empty",
    });
  }

  return errors;
}
