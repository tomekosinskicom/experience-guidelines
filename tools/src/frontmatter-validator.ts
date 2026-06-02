/**
 * Sports Experience Guidelines — YAML Frontmatter Validator
 *
 * Parses and validates YAML frontmatter from Markdown documents against
 * the schema defined in tools/schemas/frontmatter.schema.json.
 *
 * Validates:
 * - Required fields presence
 * - Type checks
 * - Enum values (subdomain, document-type, status)
 * - Tag constraints (1-15 kebab-case strings)
 * - Summary word count (≤200)
 * - Date format (ISO 8601 YYYY-MM-DD)
 * - Title max length (100 chars)
 * - Kebab-case patterns (experience-area, tags)
 * - Owner is a non-empty string (Lead Designer name)
 */

import { parse as parseYaml } from 'yaml';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single field-level validation error. */
export interface FrontmatterFieldError {
  field: string;
  rule: string;
  message: string;
}

/** Result of frontmatter validation. */
export interface FrontmatterValidationResult {
  valid: boolean;
  errors: FrontmatterFieldError[];
  data: Record<string, unknown> | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  'title',
  'subdomain',
  'experience-area',
  'document-type',
  'owner',
  'last-updated',
  'status',
  'tags',
  'summary',
] as const;

const SUBDOMAIN_ENUM = [
  'discovery',
  'transactional',
  'post-bet',
  'cross-cutting-areas',
] as const;

const DOCUMENT_TYPE_ENUM = [
  'overview',
  'principles',
  'patterns',
  'research',
  'decisions',
  'guidelines',
  'examples',
] as const;

const STATUS_ENUM = ['draft', 'in-review', 'published', 'deprecated'] as const;

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const TITLE_MAX_LENGTH = 100;

const SUMMARY_MAX_WORDS = 200;

const TAGS_MIN = 1;

const TAGS_MAX = 15;

// ─── Frontmatter Extraction ──────────────────────────────────────────────────

/**
 * Extracts the raw YAML frontmatter string from a Markdown document.
 * Frontmatter must be delimited by `---` at the very start of the file.
 *
 * @param markdown - The full Markdown document content
 * @returns The raw YAML string, or null if no frontmatter is found
 */
export function extractFrontmatter(markdown: string): string | null {
  if (!markdown.startsWith('---')) {
    return null;
  }

  const endIndex = markdown.indexOf('\n---', 3);
  if (endIndex === -1) {
    return null;
  }

  return markdown.slice(3, endIndex).trim();
}

// ─── Word Count Utility ──────────────────────────────────────────────────────

/**
 * Counts words in a string by splitting on whitespace.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates a parsed frontmatter object against the schema constraints.
 *
 * @param data - The parsed YAML object
 * @returns Array of field-level errors (empty if valid)
 */
function validateFields(data: Record<string, unknown>): FrontmatterFieldError[] {
  const errors: FrontmatterFieldError[] = [];

  // Check required fields presence
  for (const field of REQUIRED_FIELDS) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      errors.push({
        field,
        rule: 'required',
        message: `Required field '${field}' is missing`,
      });
    }
  }

  // Title validation
  if ('title' in data && data['title'] != null) {
    if (typeof data['title'] !== 'string') {
      errors.push({
        field: 'title',
        rule: 'type',
        message: `Field 'title' must be a string`,
      });
    } else {
      if (data['title'].length === 0) {
        errors.push({
          field: 'title',
          rule: 'minLength',
          message: `Field 'title' must not be empty`,
        });
      } else if (data['title'].length > TITLE_MAX_LENGTH) {
        errors.push({
          field: 'title',
          rule: 'maxLength',
          message: `Field 'title' exceeds maximum length of ${TITLE_MAX_LENGTH} characters (got ${data['title'].length})`,
        });
      }
    }
  }

  // Subdomain validation
  if ('subdomain' in data && data['subdomain'] != null) {
    if (typeof data['subdomain'] !== 'string') {
      errors.push({
        field: 'subdomain',
        rule: 'type',
        message: `Field 'subdomain' must be a string`,
      });
    } else if (!(SUBDOMAIN_ENUM as readonly string[]).includes(data['subdomain'])) {
      errors.push({
        field: 'subdomain',
        rule: 'enum',
        message: `Field 'subdomain' must be one of: ${SUBDOMAIN_ENUM.join(', ')} (got '${data['subdomain']}')`,
      });
    }
  }

  // Experience-area validation
  if ('experience-area' in data && data['experience-area'] != null) {
    if (typeof data['experience-area'] !== 'string') {
      errors.push({
        field: 'experience-area',
        rule: 'type',
        message: `Field 'experience-area' must be a string`,
      });
    } else if (!KEBAB_CASE_PATTERN.test(data['experience-area'])) {
      errors.push({
        field: 'experience-area',
        rule: 'pattern',
        message: `Field 'experience-area' must be lowercase-kebab-case (pattern: [a-z0-9]+(-[a-z0-9]+)*)`,
      });
    }
  }

  // Document-type validation
  if ('document-type' in data && data['document-type'] != null) {
    if (typeof data['document-type'] !== 'string') {
      errors.push({
        field: 'document-type',
        rule: 'type',
        message: `Field 'document-type' must be a string`,
      });
    } else if (!(DOCUMENT_TYPE_ENUM as readonly string[]).includes(data['document-type'])) {
      errors.push({
        field: 'document-type',
        rule: 'enum',
        message: `Field 'document-type' must be one of: ${DOCUMENT_TYPE_ENUM.join(', ')} (got '${data['document-type']}')`,
      });
    }
  }

  // Owner validation (Lead Designer name — non-empty string)
  if ('owner' in data && data['owner'] != null) {
    if (typeof data['owner'] !== 'string') {
      errors.push({
        field: 'owner',
        rule: 'type',
        message: `Field 'owner' must be a string`,
      });
    } else if (data['owner'].trim().length === 0) {
      errors.push({
        field: 'owner',
        rule: 'minLength',
        message: `Field 'owner' must not be empty`,
      });
    }
  }

  // Last-updated validation
  if ('last-updated' in data && data['last-updated'] != null) {
    const value = data['last-updated'];
    // YAML may parse dates as Date objects; convert to string for validation
    const strValue = value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value);

    if (!ISO_DATE_PATTERN.test(strValue)) {
      errors.push({
        field: 'last-updated',
        rule: 'pattern',
        message: `Field 'last-updated' must be in ISO 8601 date format (YYYY-MM-DD)`,
      });
    }
  }

  // Status validation
  if ('status' in data && data['status'] != null) {
    if (typeof data['status'] !== 'string') {
      errors.push({
        field: 'status',
        rule: 'type',
        message: `Field 'status' must be a string`,
      });
    } else if (!(STATUS_ENUM as readonly string[]).includes(data['status'])) {
      errors.push({
        field: 'status',
        rule: 'enum',
        message: `Field 'status' must be one of: ${STATUS_ENUM.join(', ')} (got '${data['status']}')`,
      });
    }
  }

  // Tags validation
  if ('tags' in data && data['tags'] != null) {
    if (!Array.isArray(data['tags'])) {
      errors.push({
        field: 'tags',
        rule: 'type',
        message: `Field 'tags' must be an array`,
      });
    } else {
      const tags = data['tags'] as unknown[];

      if (tags.length < TAGS_MIN) {
        errors.push({
          field: 'tags',
          rule: 'minItems',
          message: `Field 'tags' must contain at least ${TAGS_MIN} item(s) (got ${tags.length})`,
        });
      }

      if (tags.length > TAGS_MAX) {
        errors.push({
          field: 'tags',
          rule: 'maxItems',
          message: `Field 'tags' must contain at most ${TAGS_MAX} items (got ${tags.length})`,
        });
      }

      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (typeof tag !== 'string') {
          errors.push({
            field: `tags[${i}]`,
            rule: 'type',
            message: `Tag at index ${i} must be a string`,
          });
        } else if (!KEBAB_CASE_PATTERN.test(tag)) {
          errors.push({
            field: `tags[${i}]`,
            rule: 'pattern',
            message: `Tag '${tag}' at index ${i} must be lowercase-kebab-case`,
          });
        }
      }
    }
  }

  // Summary validation
  if ('summary' in data && data['summary'] != null) {
    if (typeof data['summary'] !== 'string') {
      errors.push({
        field: 'summary',
        rule: 'type',
        message: `Field 'summary' must be a string`,
      });
    } else {
      if (data['summary'].length === 0) {
        errors.push({
          field: 'summary',
          rule: 'minLength',
          message: `Field 'summary' must not be empty`,
        });
      } else {
        const wordCount = countWords(data['summary']);
        if (wordCount > SUMMARY_MAX_WORDS) {
          errors.push({
            field: 'summary',
            rule: 'maxWords',
            message: `Field 'summary' exceeds maximum of ${SUMMARY_MAX_WORDS} words (got ${wordCount})`,
          });
        }
      }
    }
  }

  return errors;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parses and validates YAML frontmatter from a Markdown document string.
 *
 * @param markdown - The full Markdown document content
 * @returns A FrontmatterValidationResult with validity status, errors, and parsed data
 */
export function validateFrontmatter(markdown: string): FrontmatterValidationResult {
  const rawYaml = extractFrontmatter(markdown);

  if (rawYaml === null) {
    return {
      valid: false,
      errors: [
        {
          field: '_frontmatter',
          rule: 'presence',
          message: 'No YAML frontmatter found (must start with --- delimiters)',
        },
      ],
      data: null,
    };
  }

  let data: unknown;
  try {
    data = parseYaml(rawYaml);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown parse error';
    return {
      valid: false,
      errors: [
        {
          field: '_frontmatter',
          rule: 'syntax',
          message: `Invalid YAML syntax: ${errorMessage}`,
        },
      ],
      data: null,
    };
  }

  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        {
          field: '_frontmatter',
          rule: 'type',
          message: 'Frontmatter must be a YAML mapping (object)',
        },
      ],
      data: null,
    };
  }

  const record = data as Record<string, unknown>;
  const errors = validateFields(record);

  return {
    valid: errors.length === 0,
    errors,
    data: record,
  };
}
