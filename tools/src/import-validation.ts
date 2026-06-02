/**
 * Sports Experience Guidelines — Import Validation
 *
 * Composes existing validators (frontmatter, structure, naming) to provide
 * a single validation entry point for the document import pipeline.
 *
 * Returns categorised errors so the Confirmation Interface can present
 * actionable feedback to the user.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { basename } from 'node:path';
import { validateFrontmatter } from './frontmatter-validator.js';
import { validateStructure } from './structure-validator.js';
import { validateName } from './naming-validator.js';
import type { ImportValidationResult } from './import-types.js';

/**
 * Validates a generated markdown document for import by composing
 * frontmatter, structure, and naming validators.
 *
 * @param markdown - The full generated markdown string (including frontmatter)
 * @param targetPath - The intended file path where the document will be saved
 * @returns An ImportValidationResult with categorised errors
 */
export function validateForImport(
  markdown: string,
  targetPath: string
): ImportValidationResult {
  // 1. Validate frontmatter
  const frontmatterResult = validateFrontmatter(markdown);
  const frontmatterErrors = frontmatterResult.errors.map(
    (err) => `[${err.field}] ${err.message}`
  );

  // 2. Validate document structure
  const structureResult = validateStructure(markdown, targetPath);
  const structureErrors = structureResult.errors.map(
    (err) => `[${err.field}] ${err.message}`
  );

  // 3. Validate filename naming convention
  const filename = basename(targetPath);
  const namingResult = validateName(filename, true);
  const namingErrors = namingResult.errors;

  // Overall validity — all three categories must be error-free
  const valid =
    frontmatterErrors.length === 0 &&
    structureErrors.length === 0 &&
    namingErrors.length === 0;

  return {
    valid,
    frontmatterErrors,
    structureErrors,
    namingErrors,
  };
}
