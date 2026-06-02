/**
 * Sports Experience Guidelines — Naming Convention Validator
 *
 * Validates folder and file names against the kebab-case naming rules
 * defined in tools/schemas/naming-rules.json.
 *
 * Rules:
 * - Folder names: pattern [a-z0-9]+(-[a-z0-9]+)*, max 64 characters
 * - File names: pattern [a-z0-9]+(-[a-z0-9]+)*.md, max 64 characters
 */

/** Result of a naming validation check. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Pattern for valid kebab-case names (folders and file stems). */
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Maximum allowed length for a name (including extension for files). */
const MAX_LENGTH = 64;

/**
 * Validates a folder or file name against the naming convention rules.
 *
 * @param input - The name to validate (folder name or file name)
 * @param isFile - Whether the input is a file name (requires .md extension)
 * @returns A ValidationResult indicating success or specific rule violations
 */
export function validateName(input: string, isFile: boolean): ValidationResult {
  const errors: string[] = [];

  if (input.length === 0) {
    errors.push('Name must not be empty');
    return { valid: false, errors };
  }

  if (input.length > MAX_LENGTH) {
    errors.push(
      `Name exceeds maximum length of ${MAX_LENGTH} characters (got ${input.length})`
    );
  }

  if (isFile) {
    if (!input.endsWith('.md')) {
      errors.push('File name must end with .md extension');
    }

    if (!input.endsWith('.md') || !KEBAB_CASE_PATTERN.test(input.slice(0, -3))) {
      errors.push(
        'File name must be lowercase-kebab-case with .md extension (pattern: [a-z0-9]+(-[a-z0-9]+)*.md)'
      );
    }
  } else {
    if (!KEBAB_CASE_PATTERN.test(input)) {
      errors.push(
        'Folder name must be lowercase-kebab-case (pattern: [a-z0-9]+(-[a-z0-9]+)*)'
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
