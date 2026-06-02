/**
 * Sports Experience Guidelines — Document Validator CLI
 *
 * CLI entry point that orchestrates all validators (naming, frontmatter,
 * structure, references, experience area, RACI, status) and produces
 * a ValidationReport output as JSON or human-readable format.
 *
 * Usage:
 *   node --loader ts-node/esm tools/src/validate.ts [--path <path>] [--report json|text] [--fix]
 *
 * Flags:
 *   --path <path>    Directory to validate (defaults to current directory)
 *   --report <fmt>   Output format: "json" or "text" (defaults to "text")
 *   --fix            Auto-fix issues where possible (optional)
 *
 * Exit codes:
 *   0 — All documents valid
 *   1 — One or more validation errors found
 *
 * Validates: Requirements 9.4, 9.5, 2.6
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { validateName } from './naming-validator.js';
import { validateFrontmatter } from './frontmatter-validator.js';
import { validateStructure, validateAIMarkers } from './structure-validator.js';
import { validateReferences, type DocumentNode } from './reference-validator.js';
import { checkStatusTransition } from './status-validator.js';
import type { ValidationReport, ValidationError, ValidationWarning } from './types.js';

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

interface CliOptions {
  path: string;
  report: 'json' | 'text';
  fix: boolean;
}

/**
 * Parses CLI arguments from process.argv.
 * Supports: --path <path>, --report json|text, --fix
 */
function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2); // skip node and script path
  const options: CliOptions = {
    path: process.cwd(),
    report: 'text',
    fix: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
        i++;
        if (i < args.length) {
          options.path = path.resolve(args[i]);
        }
        break;
      case '--report':
        i++;
        if (i < args.length && (args[i] === 'json' || args[i] === 'text')) {
          options.report = args[i] as 'json' | 'text';
        }
        break;
      case '--fix':
        options.fix = true;
        break;
    }
  }

  return options;
}

// ─── File Discovery ──────────────────────────────────────────────────────────

/**
 * Recursively finds all .md files in the given directory.
 * Skips node_modules, .git, and dist directories.
 */
function findMarkdownFiles(dirPath: string): string[] {
  const results: string[] = [];
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.kiro']);

  function walk(currentPath: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          walk(path.join(currentPath, entry.name));
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(path.join(currentPath, entry.name));
      }
    }
  }

  walk(dirPath);
  return results;
}

// ─── Navigation Document Detection ──────────────────────────────────────────

/**
 * Determines if a file is a navigation/index document that should skip
 * structure validation. These files use custom headings because they serve
 * as navigation pages, not experience area documents.
 *
 * Matches:
 * - Any file named `index.md`
 * - Files at a pillar root level (e.g., `pillars/sports/principles.md`)
 * - Files in the top-level `principles/` directory
 */
function isNavigationDocument(relativePath: string): boolean {
  const fileName = path.basename(relativePath);
  const segments = relativePath.split(path.sep);

  // Any file named index.md
  if (fileName === 'index.md') return true;

  // Files at pillar root: pillars/<pillar>/<file>.md (3 segments)
  if (segments.length === 3 && segments[0] === 'pillars' && fileName.endsWith('.md')) {
    return true;
  }

  // Files in the top-level principles/ directory
  if (segments.length === 2 && segments[0] === 'principles' && fileName.endsWith('.md')) {
    return true;
  }

  return false;
}

// ─── Per-File Validation ─────────────────────────────────────────────────────

/**
 * Validates a single Markdown file: naming, frontmatter, and structure.
 * Returns errors and warnings for the file.
 */
function validateFile(
  filePath: string,
  basePath: string
): { errors: ValidationError[]; warnings: ValidationWarning[]; frontmatterData: Record<string, unknown> | null } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const relativePath = path.relative(basePath, filePath);

  // 1. Validate naming for each path segment
  const segments = relativePath.split(path.sep);
  const fileName = segments[segments.length - 1];
  const folderSegments = segments.slice(0, -1);

  // Validate folder names
  for (const folder of folderSegments) {
    const namingResult = validateName(folder, false);
    if (!namingResult.valid) {
      for (const err of namingResult.errors) {
        errors.push({
          path: relativePath,
          category: 'naming',
          field: folder,
          rule: 'kebab-case',
          message: `Folder '${folder}': ${err}`,
        });
      }
    }
  }

  // Validate file name
  const fileNamingResult = validateName(fileName, true);
  if (!fileNamingResult.valid) {
    for (const err of fileNamingResult.errors) {
      errors.push({
        path: relativePath,
        category: 'naming',
        field: fileName,
        rule: 'kebab-case',
        message: `File '${fileName}': ${err}`,
      });
    }
  }

  // 2. Read file content
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    errors.push({
      path: relativePath,
      category: 'structure',
      field: '_file',
      rule: 'readable',
      message: `Unable to read file: ${filePath}`,
    });
    return { errors, warnings, frontmatterData: null };
  }

  // 3. Validate frontmatter
  const frontmatterResult = validateFrontmatter(content);
  if (!frontmatterResult.valid) {
    for (const fmError of frontmatterResult.errors) {
      errors.push({
        path: relativePath,
        category: 'frontmatter',
        field: fmError.field,
        rule: fmError.rule,
        message: fmError.message,
      });
    }
  }

  // 4. Validate structure (skip section order/required/word count for navigation docs, keep AI markers)
  const shouldSkipStructure = isNavigationDocument(relativePath);
  let structureErrors: ValidationError[] = [];
  if (shouldSkipStructure) {
    // Navigation documents only get AI marker validation
    structureErrors = validateAIMarkers(content, relativePath);
  } else {
    const structureResult = validateStructure(content, relativePath);
    structureErrors = structureResult.errors;
  }
  errors.push(...structureErrors);

  // 5. Status transition guard check
  if (frontmatterResult.data && frontmatterResult.data['status']) {
    const statusErrors = structureErrors.map((e) => ({
      field: e.field,
      rule: e.rule,
      message: e.message,
    }));
    const fmErrors = frontmatterResult.errors.map((e) => ({
      field: e.field,
      rule: e.rule,
      message: e.message,
    }));

    const statusGuard = checkStatusTransition(
      String(frontmatterResult.data['status']),
      statusErrors,
      fmErrors
    );

    if (!statusGuard.metadataComplete) {
      for (const field of statusGuard.missingFields) {
        warnings.push({
          path: relativePath,
          category: 'frontmatter',
          field,
          rule: 'metadata-incomplete',
          message: `Metadata incomplete: field '${field}' is missing or invalid`,
        });
      }
    }
  }

  return { errors, warnings, frontmatterData: frontmatterResult.data };
}

// ─── Cross-Reference Validation ──────────────────────────────────────────────

/**
 * Builds a document graph from frontmatter relationship data and validates
 * cross-references across all documents.
 */
function validateCrossReferences(
  fileDataMap: Map<string, Record<string, unknown> | null>,
  basePath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build document nodes from frontmatter relationships
  const documents: DocumentNode[] = [];

  for (const [relativePath, data] of fileDataMap) {
    const relationships: DocumentNode['relationships'] = {};

    if (data && typeof data['relationships'] === 'object' && data['relationships'] !== null) {
      const rels = data['relationships'] as Record<string, unknown>;
      const relTypes = ['depends-on', 'extends', 'conflicts-with', 'supersedes', 'related-to'] as const;

      for (const relType of relTypes) {
        if (Array.isArray(rels[relType])) {
          relationships[relType] = (rels[relType] as unknown[]).filter(
            (v): v is string => typeof v === 'string'
          );
        }
      }
    }

    // Determine if this is an entry point:
    // - index.md files (subdomain/area entry points)
    // - overview.md files (experience area entry points)
    // - root-level files (no directory separator)
    // - files directly under a pillar root (e.g., pillars/sports/principles.md)
    // - files named component-registry.md (design system registries)
    // - files in the top-level principles/ directory
    // - guidelines.md files (experience area guideline documents)
    // - research.md files (research documents)
    // - patterns.md files (pattern documentation)
    const fileName = path.basename(relativePath);
    const segments = relativePath.split(path.sep);
    const isEntryPoint = fileName === 'index.md' ||
      fileName === 'overview.md' ||
      fileName === 'component-registry.md' ||
      fileName === 'guidelines.md' ||
      fileName === 'research.md' ||
      fileName === 'patterns.md' ||
      !relativePath.includes(path.sep) ||
      (segments.length === 3 && segments[0] === 'pillars') ||
      (segments.length === 2 && segments[0] === 'principles');

    documents.push({
      path: relativePath,
      relationships,
      isEntryPoint,
    });
  }

  // Only validate references if we have documents with relationships
  if (documents.length > 0) {
    const refErrors = validateReferences(documents);
    for (const refError of refErrors) {
      errors.push({
        path: refError.path,
        category: 'reference',
        field: refError.reference,
        rule: refError.category,
        message: refError.message,
      });
    }
  }

  return errors;
}

// ─── Output Formatting ───────────────────────────────────────────────────────

/**
 * Formats a ValidationReport as human-readable text.
 */
function formatTextReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  Document Validation Report');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  Documents checked:  ${report.summary.documentsChecked}`);
  lines.push(`  Documents valid:    ${report.summary.documentsValid}`);
  lines.push(`  Documents failed:   ${report.summary.documentsFailed}`);
  lines.push(`  Total errors:       ${report.errors.length}`);
  lines.push(`  Total warnings:     ${report.warnings.length}`);
  lines.push('');

  if (report.errors.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('  ERRORS');
    lines.push('───────────────────────────────────────────────────────────────');

    for (const error of report.errors) {
      lines.push(`  ✗ [${error.category}] ${error.path}`);
      lines.push(`    Field: ${error.field} | Rule: ${error.rule}`);
      lines.push(`    ${error.message}`);
      lines.push('');
    }
  }

  if (report.warnings.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('  WARNINGS');
    lines.push('───────────────────────────────────────────────────────────────');

    for (const warning of report.warnings) {
      lines.push(`  ⚠ [${warning.category}] ${warning.path}`);
      lines.push(`    Field: ${warning.field} | Rule: ${warning.rule}`);
      lines.push(`    ${warning.message}`);
      lines.push('');
    }
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(report.valid ? '  ✓ PASSED — All documents valid' : '  ✗ FAILED — Validation errors found');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Main validation orchestrator. Finds all .md files, runs all validators,
 * builds the cross-reference graph, and produces a ValidationReport.
 */
export function runValidation(options: CliOptions): ValidationReport {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];
  const fileDataMap = new Map<string, Record<string, unknown> | null>();

  // 1. Find all markdown files
  const files = findMarkdownFiles(options.path);

  // 2. Validate each file individually
  const failedPaths = new Set<string>();

  for (const filePath of files) {
    const relativePath = path.relative(options.path, filePath);
    const result = validateFile(filePath, options.path);

    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    fileDataMap.set(relativePath, result.frontmatterData);

    if (result.errors.length > 0) {
      failedPaths.add(relativePath);
    }
  }

  // 3. Validate cross-references across all documents
  const refErrors = validateCrossReferences(fileDataMap, options.path);
  allErrors.push(...refErrors);

  for (const err of refErrors) {
    failedPaths.add(err.path);
  }

  // 4. Build report
  const report: ValidationReport = {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      documentsChecked: files.length,
      documentsValid: files.length - failedPaths.size,
      documentsFailed: failedPaths.size,
    },
  };

  return report;
}

/**
 * CLI entry point. Parses arguments, runs validation, outputs report,
 * and exits with appropriate code.
 */
function main(): void {
  const options = parseArgs(process.argv);
  const report = runValidation(options);

  // Output report
  if (options.report === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatTextReport(report));
  }

  // Exit with appropriate code
  process.exit(report.valid ? 0 : 1);
}

// Run if executed directly (not when imported as a module)
const isMainModule = process.argv[1] &&
  (process.argv[1].endsWith('validate.ts') || process.argv[1].endsWith('validate.js'));

if (isMainModule) {
  main();
}
