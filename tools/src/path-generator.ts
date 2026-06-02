/**
 * Sports Experience Guidelines — Deterministic Path Generator
 *
 * Generates file paths for documents based on subdomain, experience area,
 * and document type. Validates all inputs against naming rules and the
 * document-type enumeration before producing a path.
 */

import { type DocumentType } from './types.js';
import { validateName } from './naming-validator.js';

/** The set of valid subdomains (including cross-cutting-areas). */
const VALID_SUBDOMAINS = [
  'discovery',
  'transactional',
  'post-bet',
  'cross-cutting-areas',
] as const;

/** The set of valid document types. */
const VALID_DOCUMENT_TYPES: readonly DocumentType[] = [
  'overview',
  'principles',
  'patterns',
  'research',
  'decisions',
  'guidelines',
  'examples',
] as const;

/** Error thrown when path generation inputs are invalid. */
export class PathGenerationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: string
  ) {
    super(message);
    this.name = 'PathGenerationError';
  }
}

/**
 * Generates a deterministic file path for a document.
 *
 * - Subdomain documents: `{subdomain}/{experience-area}/{document-type}.md`
 * - Cross-cutting documents: `cross-cutting-areas/{experience-area}/{document-type}.md`
 *
 * @param subdomain - The subdomain or "cross-cutting-areas".
 * @param experienceArea - The experience area name (kebab-case).
 * @param documentType - One of the valid document types.
 * @returns The generated file path.
 * @throws PathGenerationError if any input is invalid.
 */
export function generatePath(
  subdomain: string,
  experienceArea: string,
  documentType: DocumentType
): string {
  // Validate subdomain
  if (!VALID_SUBDOMAINS.includes(subdomain as typeof VALID_SUBDOMAINS[number])) {
    throw new PathGenerationError(
      `Invalid subdomain "${subdomain}". Must be one of: ${VALID_SUBDOMAINS.join(', ')}`,
      'subdomain',
      subdomain
    );
  }

  // Validate experience area against naming rules (folder name)
  const areaValidation = validateName(experienceArea, false);
  if (!areaValidation.valid) {
    throw new PathGenerationError(
      `Invalid experience area "${experienceArea}": ${areaValidation.errors.join('; ')}`,
      'experienceArea',
      experienceArea
    );
  }

  // Validate document type against the enumerated list
  if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
    throw new PathGenerationError(
      `Invalid document type "${documentType}". Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`,
      'documentType',
      documentType
    );
  }

  // Generate the path
  return `${subdomain}/${experienceArea}/${documentType}.md`;
}
