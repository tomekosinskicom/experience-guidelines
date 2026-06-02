/**
 * Sports Experience Guidelines — Manifest Generator CLI
 *
 * CLI entry point that generates the manifest.json file from all document
 * frontmatter in the repository. Optionally validates all documents before
 * generating.
 *
 * Usage:
 *   node --loader ts-node/esm tools/src/manifest.ts [--output <path>] [--validate]
 *
 * Flags:
 *   --output <path>  Output path for manifest.json (defaults to manifest.json in cwd)
 *   --validate       Run document validation before generating; abort if errors found
 *
 * Exit codes:
 *   0 — Manifest generated successfully
 *   1 — Validation errors found (when --validate is used)
 *   2 — Manifest generation failed
 *
 * Validates: Requirements 2.5
 */

import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import { generateManifest, updateRootIndex } from './manifest-generator.js';
import { runValidation } from './validate.js';

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

export interface ManifestCliOptions {
  output: string;
  validate: boolean;
  rootDir: string;
}

/**
 * Parses CLI arguments from process.argv.
 * Supports: --output <path>, --validate
 */
export function parseManifestArgs(argv: string[]): ManifestCliOptions {
  const args = argv.slice(2); // skip node and script path
  const options: ManifestCliOptions = {
    output: path.resolve(process.cwd(), 'manifest.json'),
    validate: false,
    rootDir: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
        i++;
        if (i < args.length) {
          options.output = path.resolve(args[i]);
        }
        break;
      case '--validate':
        options.validate = true;
        break;
    }
  }

  return options;
}

// ─── Main Logic ──────────────────────────────────────────────────────────────

/**
 * Runs the manifest generation pipeline.
 *
 * If `validate` is true, runs the document validator first and aborts
 * if any errors are found.
 *
 * @returns Object with success status, manifest data, and summary info
 */
export async function runManifestGeneration(options: ManifestCliOptions): Promise<{
  success: boolean;
  message: string;
  documentCount?: number;
  relationshipCount?: number;
}> {
  // 1. Optionally validate all documents first
  if (options.validate) {
    const report = runValidation({
      path: options.rootDir,
      report: 'text',
      fix: false,
    });

    if (!report.valid) {
      return {
        success: false,
        message: `Validation failed: ${report.errors.length} error(s) found in ${report.summary.documentsFailed} document(s). Aborting manifest generation.`,
      };
    }
  }

  // 2. Generate the manifest
  const manifest = await generateManifest(options.rootDir);

  // 3. Write to output path
  const jsonContent = JSON.stringify(manifest, null, 2);
  await writeFile(options.output, jsonContent, 'utf-8');

  // 4. Update root index.md with current navigation structure
  await updateRootIndex(options.rootDir, manifest);

  return {
    success: true,
    message: `Manifest generated successfully.`,
    documentCount: manifest.documentCount,
    relationshipCount: manifest.relationships.length,
  };
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

/**
 * CLI entry point. Parses arguments, optionally validates, generates manifest,
 * writes output, and prints summary.
 */
async function main(): Promise<void> {
  const options = parseManifestArgs(process.argv);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Manifest Generator');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (options.validate) {
    console.log('  Running validation...');
  }

  const result = await runManifestGeneration(options);

  if (!result.success) {
    console.log(`  ✗ ${result.message}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  }

  console.log(`  ✓ ${result.message}`);
  console.log(`  Documents: ${result.documentCount}`);
  console.log(`  Relationships: ${result.relationshipCount}`);
  console.log(`  Output: ${options.output}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  process.exit(0);
}

// Run if executed directly (not when imported as a module)
const isMainModule = process.argv[1] &&
  (process.argv[1].endsWith('manifest.ts') || process.argv[1].endsWith('manifest.js'));

if (isMainModule) {
  main().catch((err) => {
    console.error('Manifest generation failed:', err);
    process.exit(2);
  });
}
