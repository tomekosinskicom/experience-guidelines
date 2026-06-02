/**
 * Sports Experience Guidelines — Document Import CLI
 *
 * Converts source documents (PDF, plain text, markdown) into the repository's
 * standardised markdown format with frontmatter, template sections, and manifest
 * integration.
 *
 * Usage:
 *   npm run import -- --file <path> [--owner <name>] [--subdomain <name>] [--experience-area <name>]
 *
 * Validates: Requirements 1.1
 */

import { ImportService } from './import-service.js';
import type { ImportOptions } from './import-types.js';

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

/**
 * Parses CLI arguments and invokes the ImportService.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const getArg = (name: string): string | undefined => {
    const index = args.indexOf(`--${name}`);
    if (index === -1 || index + 1 >= args.length) return undefined;
    return args[index + 1];
  };

  const filePath = getArg('file');
  const owner = getArg('owner');
  const subdomain = getArg('subdomain');
  const experienceArea = getArg('experience-area');

  if (!filePath) {
    console.error('Usage: import --file <path> [--owner <name>] [--subdomain <name>] [--experience-area <name>]');
    console.error('');
    console.error('Options:');
    console.error('  --file             Path to the source document (required)');
    console.error('  --owner            Document owner name');
    console.error('  --subdomain        Target subdomain (e.g. discovery, post-bet)');
    console.error('  --experience-area  Target experience area (e.g. live-betting)');
    process.exit(1);
  }

  const options: ImportOptions = {
    filePath,
    owner,
    subdomain,
    experienceArea,
  };

  try {
    const service = new ImportService();
    const result = await service.import(options);

    if (result.success) {
      if (result.savedPath) {
        console.log(`✓ Imported: ${result.savedPath}`);
      } else {
        console.log('✓ Import completed successfully.');
      }
      if (result.manifestUpdated) {
        console.log('✓ Manifest updated.');
      }
    } else {
      console.error('✗ Import failed:');
      for (const error of result.errors ?? []) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`✗ Error: ${error.message}`);
    } else {
      console.error('✗ An unexpected error occurred.');
    }
    process.exit(1);
  }
}

// Run CLI if executed directly
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('import.ts') || process.argv[1].endsWith('import.js'));

if (isMainModule) {
  main();
}

export { main };
