/**
 * Sports Experience Guidelines — RACI Matrix Validator
 *
 * Validates RACI assignments for experience areas against the ownership
 * framework rules defined in the design document.
 *
 * Rules:
 * - Each area must have exactly one Lead Designer in the Accountable role (string, not array)
 * - Each area must have at least one designer in the Responsible role
 * - All role values must be non-empty strings (designer names)
 * - If an area has no Responsible designer, flag it as "unowned"
 * - Consulted and Informed can be empty arrays
 */

/** A single RACI assignment for an experience area. */
export interface RaciAssignment {
  area: string;
  responsible: string | string[];
  accountable: string;
  consulted: string[];
  informed: string[];
}

/** A validation error for a RACI assignment. */
export interface RaciValidationError {
  area: string;
  field: string;
  rule: string;
  message: string;
}

/**
 * Validates an array of RACI assignments against the ownership framework rules.
 *
 * @param assignments - The RACI assignments to validate
 * @returns An array of validation errors (empty if all assignments are valid)
 */
export function validateRaci(
  assignments: RaciAssignment[]
): RaciValidationError[] {
  const errors: RaciValidationError[] = [];

  for (const assignment of assignments) {
    // Validate Accountable: must be exactly one Lead Designer (string, not array)
    if (typeof assignment.accountable !== 'string' || assignment.accountable.trim() === '') {
      errors.push({
        area: assignment.area,
        field: 'accountable',
        rule: 'exactly-one-accountable',
        message: `Area "${assignment.area}" must have exactly one Lead Designer in the Accountable role`,
      });
    }

    // Validate Responsible: must have at least one designer
    const responsibleList = normalizeToArray(assignment.responsible);

    if (responsibleList.length === 0) {
      errors.push({
        area: assignment.area,
        field: 'responsible',
        rule: 'at-least-one-responsible',
        message: `Area "${assignment.area}" has no Responsible designer and is flagged as unowned`,
      });
    }

    // Validate Consulted: all entries must be non-empty strings
    for (const name of assignment.consulted) {
      if (typeof name !== 'string' || name.trim() === '') {
        errors.push({
          area: assignment.area,
          field: 'consulted',
          rule: 'non-empty-name',
          message: `Area "${assignment.area}" Consulted role contains an empty or invalid name`,
        });
      }
    }

    // Validate Informed: all entries must be non-empty strings
    for (const name of assignment.informed) {
      if (typeof name !== 'string' || name.trim() === '') {
        errors.push({
          area: assignment.area,
          field: 'informed',
          rule: 'non-empty-name',
          message: `Area "${assignment.area}" Informed role contains an empty or invalid name`,
        });
      }
    }
  }

  return errors;
}

/**
 * Normalizes a responsible field value to an array of strings.
 * Handles both single string and array inputs, filtering out empty strings.
 */
function normalizeToArray(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value.filter((v) => v.trim() !== '');
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [value];
  }
  return [];
}
