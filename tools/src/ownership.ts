/**
 * Sports Experience Guidelines — Ownership Manager
 *
 * Loads and parses ownership YAML files (raci-matrix.yaml and designers.yaml),
 * provides lookup functions for ownership queries, and integrates with
 * the RACI validator for constraint checking.
 *
 * Requirements: 6.1, 6.2, 6.5, 6.6
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { validateRaci, RaciAssignment, RaciValidationError } from './raci-validator.js';

// ─── Data Interfaces ─────────────────────────────────────────────────────────

/** A designer profile from designers.yaml. */
export interface DesignerProfile {
  name: string;
  role: string; // "Lead Designer" | "Designer"
  areas: string[]; // experience areas they lead or contribute to
}

/** The parsed structure of designers.yaml. */
export interface DesignersFile {
  designers: DesignerProfile[];
}

/** RACI roles for an experience area. */
export interface RaciRoles {
  responsible: string | string[];
  accountable: string;
  consulted: string[];
  informed: string[];
}

/** A single experience area entry from raci-matrix.yaml. */
export interface RaciMatrixEntry {
  area: string;
  subdomain: string;
  raci: RaciRoles;
  'review-cadence': string;
  'last-reviewed': string;
}

/** The parsed structure of raci-matrix.yaml. */
export interface RaciMatrixFile {
  'experience-areas': RaciMatrixEntry[];
}

/** Review status information for an experience area. */
export interface ReviewStatus {
  cadence: string;
  lastReviewed: string;
  overdue: boolean;
}

/** Result of loading ownership data. */
export interface OwnershipData {
  designers: DesignerProfile[];
  raciMatrix: RaciMatrixEntry[];
  validationErrors: RaciValidationError[];
}

// ─── Cadence Helpers ─────────────────────────────────────────────────────────

/**
 * Returns the number of days for a given review cadence string.
 */
function cadenceToDays(cadence: string): number {
  switch (cadence.toLowerCase()) {
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    case 'biannual':
    case 'semi-annual':
      return 180;
    case 'annual':
    case 'yearly':
      return 365;
    default:
      return 90; // default to quarterly
  }
}

/**
 * Checks whether a review is overdue based on cadence and last-reviewed date.
 */
function isOverdue(cadence: string, lastReviewed: string, referenceDate?: Date): boolean {
  const now = referenceDate ?? new Date();
  const lastDate = new Date(lastReviewed);

  if (isNaN(lastDate.getTime())) {
    return true; // invalid date means overdue
  }

  const daysSinceReview = Math.floor(
    (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceReview > cadenceToDays(cadence);
}

// ─── Loading Functions ───────────────────────────────────────────────────────

/**
 * Loads and parses the designers.yaml file.
 *
 * @param filePath - Absolute or relative path to designers.yaml
 * @returns Parsed designer profiles
 * @throws Error if file cannot be read or parsed
 */
export function loadDesigners(filePath: string): DesignerProfile[] {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(content) as DesignersFile;

  if (!parsed || !Array.isArray(parsed.designers)) {
    throw new Error(`Invalid designers.yaml structure: expected "designers" array at top level`);
  }

  return parsed.designers;
}

/**
 * Loads and parses the raci-matrix.yaml file.
 *
 * @param filePath - Absolute or relative path to raci-matrix.yaml
 * @returns Parsed RACI matrix entries
 * @throws Error if file cannot be read or parsed
 */
export function loadRaciMatrix(filePath: string): RaciMatrixEntry[] {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(content) as RaciMatrixFile;

  if (!parsed || !Array.isArray(parsed['experience-areas'])) {
    throw new Error(
      `Invalid raci-matrix.yaml structure: expected "experience-areas" array at top level`
    );
  }

  return parsed['experience-areas'];
}

/**
 * Loads both ownership files and validates the RACI matrix.
 *
 * @param rootDir - Root directory of the project (containing ownership/ folder)
 * @returns Loaded ownership data with any validation errors
 */
export function loadOwnershipData(rootDir: string): OwnershipData {
  const designersPath = resolve(rootDir, 'ownership', 'designers.yaml');
  const raciPath = resolve(rootDir, 'ownership', 'raci-matrix.yaml');

  const designers = loadDesigners(designersPath);
  const raciMatrix = loadRaciMatrix(raciPath);

  // Convert to RaciAssignment format for validation
  const assignments: RaciAssignment[] = raciMatrix.map((entry) => ({
    area: entry.area,
    responsible: entry.raci.responsible,
    accountable: entry.raci.accountable,
    consulted: entry.raci.consulted,
    informed: entry.raci.informed,
  }));

  const validationErrors = validateRaci(assignments);

  return { designers, raciMatrix, validationErrors };
}

// ─── Lookup Functions ────────────────────────────────────────────────────────

/**
 * Returns the Responsible designer for a given experience area.
 * If multiple designers are responsible, returns the first one.
 *
 * @param area - The experience area name (e.g., "live-betting")
 * @param raciMatrix - The loaded RACI matrix entries
 * @returns The responsible designer name, or null if the area is not found or has no responsible designer
 */
export function getOwnerForArea(area: string, raciMatrix: RaciMatrixEntry[]): string | null {
  const entry = raciMatrix.find((e) => e.area === area);
  if (!entry) return null;

  const responsible = entry.raci.responsible;
  if (Array.isArray(responsible)) {
    return responsible.length > 0 ? responsible[0] : null;
  }
  if (typeof responsible === 'string' && responsible.trim() !== '') {
    return responsible;
  }
  return null;
}

/**
 * Returns all experience areas where a designer has any RACI role
 * (Responsible, Accountable, Consulted, or Informed).
 *
 * @param designerName - The designer name to search for
 * @param raciMatrix - The loaded RACI matrix entries
 * @returns Array of area names where the designer has a role
 */
export function getAreasForDesigner(designerName: string, raciMatrix: RaciMatrixEntry[]): string[] {
  const areas: string[] = [];

  for (const entry of raciMatrix) {
    const { raci } = entry;

    // Check responsible
    const responsibleList = Array.isArray(raci.responsible)
      ? raci.responsible
      : [raci.responsible];
    if (responsibleList.includes(designerName)) {
      areas.push(entry.area);
      continue;
    }

    // Check accountable
    if (raci.accountable === designerName) {
      areas.push(entry.area);
      continue;
    }

    // Check consulted
    if (raci.consulted.includes(designerName)) {
      areas.push(entry.area);
      continue;
    }

    // Check informed
    if (raci.informed.includes(designerName)) {
      areas.push(entry.area);
      continue;
    }
  }

  return areas;
}

/**
 * Returns all experience areas that have no Responsible designer assigned.
 * An area is considered unowned if:
 * - The responsible field is an empty string
 * - The responsible field is an empty array
 * - The responsible field contains only whitespace strings
 *
 * @param raciMatrix - The loaded RACI matrix entries
 * @returns Array of area names with no responsible designer
 */
export function getUnownedAreas(raciMatrix: RaciMatrixEntry[]): string[] {
  return raciMatrix
    .filter((entry) => {
      const responsible = entry.raci.responsible;
      if (Array.isArray(responsible)) {
        return responsible.filter((r) => r.trim() !== '').length === 0;
      }
      if (typeof responsible === 'string') {
        return responsible.trim() === '';
      }
      return true;
    })
    .map((entry) => entry.area);
}

/**
 * Returns the review status for a given experience area, including
 * whether the review is overdue based on the cadence and last-reviewed date.
 *
 * @param area - The experience area name
 * @param raciMatrix - The loaded RACI matrix entries
 * @param referenceDate - Optional reference date for overdue calculation (defaults to now)
 * @returns Review status object, or null if area not found
 */
export function getReviewStatus(
  area: string,
  raciMatrix: RaciMatrixEntry[],
  referenceDate?: Date
): ReviewStatus | null {
  const entry = raciMatrix.find((e) => e.area === area);
  if (!entry) return null;

  return {
    cadence: entry['review-cadence'],
    lastReviewed: entry['last-reviewed'],
    overdue: isOverdue(entry['review-cadence'], entry['last-reviewed'], referenceDate),
  };
}
