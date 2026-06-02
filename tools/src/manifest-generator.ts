/**
 * Sports Experience Guidelines — Manifest Generator
 *
 * Traverses the folder structure, extracts frontmatter metadata from all
 * Markdown documents, builds a relationship graph, and produces a Manifest
 * object conforming to the types defined in types.ts.
 *
 * The core `generateManifest` function returns a Manifest object without
 * writing to disk — file I/O is handled by the CLI wrapper (manifest.ts).
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, extname, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { extractFrontmatter, countWords } from './frontmatter-validator.js';
import type {
  Manifest,
  ManifestEntry,
  Relationship,
  RelationshipType,
  DocumentType,
  Status,
  Maturity,
} from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Directories to skip during traversal. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.kiro']);

/** Valid relationship types for extraction. */
const RELATIONSHIP_TYPES: RelationshipType[] = [
  'depends-on',
  'extends',
  'conflicts-with',
  'supersedes',
  'related-to',
];

/** Current manifest schema version. */
const MANIFEST_VERSION = '1.0.0';

// ─── File Discovery ──────────────────────────────────────────────────────────

/**
 * Recursively finds all Markdown (.md) files under the given root directory,
 * skipping directories in the SKIP_DIRS set.
 *
 * @param rootDir - Absolute path to the root directory
 * @returns Array of relative file paths (relative to rootDir)
 */
export async function findMarkdownFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(fullPath);
        }
      } else if (entry.isFile() && extname(entry.name) === '.md') {
        const relativePath = relative(rootDir, fullPath);
        results.push(relativePath);
      }
    }
  }

  await walk(rootDir);
  return results.sort();
}

// ─── Frontmatter Parsing ─────────────────────────────────────────────────────

/**
 * Parsed frontmatter data relevant to manifest generation.
 */
export interface ParsedDocumentData {
  path: string;
  title: string;
  subdomain: string;
  experienceArea: string;
  documentType: DocumentType;
  owner: string;
  lastUpdated: string;
  status: Status;
  tags: string[];
  summary: string;
  maturity: Maturity;
  wordCount: number;
  relationships: Record<string, string[]>;
}

/**
 * Reads a Markdown file and extracts its frontmatter metadata and body word count.
 *
 * @param rootDir - Absolute path to the root directory
 * @param filePath - Relative path to the Markdown file
 * @returns Parsed document data, or null if frontmatter is missing/invalid
 */
export async function parseDocument(
  rootDir: string,
  filePath: string
): Promise<ParsedDocumentData | null> {
  const fullPath = join(rootDir, filePath);
  const content = await readFile(fullPath, 'utf-8');

  const rawYaml = extractFrontmatter(content);
  if (rawYaml === null) {
    return null;
  }

  let data: Record<string, unknown>;
  try {
    const parsed = parseYaml(rawYaml);
    if (parsed === null || parsed === undefined || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  // Extract body content (everything after the closing ---)
  const frontmatterEnd = content.indexOf('---', 3);
  const body = frontmatterEnd !== -1 ? content.slice(frontmatterEnd + 3).trim() : '';
  const wordCount = countWords(body);

  // Normalise last-updated: YAML may parse dates as Date objects
  let lastUpdated = '';
  if (data['last-updated'] instanceof Date) {
    lastUpdated = data['last-updated'].toISOString().slice(0, 10);
  } else if (typeof data['last-updated'] === 'string') {
    lastUpdated = data['last-updated'];
  }

  // Extract relationships object
  const relationships: Record<string, string[]> = {};
  if (data['relationships'] && typeof data['relationships'] === 'object' && !Array.isArray(data['relationships'])) {
    const rels = data['relationships'] as Record<string, unknown>;
    for (const relType of RELATIONSHIP_TYPES) {
      if (Array.isArray(rels[relType])) {
        relationships[relType] = (rels[relType] as unknown[])
          .filter((v): v is string => typeof v === 'string');
      }
    }
  }

  return {
    path: filePath,
    title: typeof data['title'] === 'string' ? data['title'] : '',
    subdomain: typeof data['subdomain'] === 'string' ? data['subdomain'] : '',
    experienceArea: typeof data['experience-area'] === 'string' ? data['experience-area'] : '',
    documentType: (typeof data['document-type'] === 'string' ? data['document-type'] : 'overview') as DocumentType,
    owner: typeof data['owner'] === 'string' ? data['owner'] : '',
    lastUpdated,
    status: (typeof data['status'] === 'string' ? data['status'] : 'draft') as Status,
    tags: Array.isArray(data['tags'])
      ? (data['tags'] as unknown[]).filter((t): t is string => typeof t === 'string')
      : [],
    summary: typeof data['summary'] === 'string' ? data['summary'] : '',
    maturity: (typeof data['maturity'] === 'string' ? data['maturity'] : 'not-started') as Maturity,
    wordCount,
    relationships,
  };
}

// ─── Manifest Building ───────────────────────────────────────────────────────

/**
 * Builds a ManifestEntry from parsed document data.
 */
function buildManifestEntry(doc: ParsedDocumentData): ManifestEntry {
  return {
    path: doc.path,
    title: doc.title,
    subdomain: doc.subdomain,
    experienceArea: doc.experienceArea,
    documentType: doc.documentType,
    owner: doc.owner,
    lastUpdated: doc.lastUpdated,
    status: doc.status,
    tags: doc.tags,
    summary: doc.summary,
    maturity: doc.maturity,
    wordCount: doc.wordCount,
  };
}

/**
 * Extracts all typed relationships from parsed documents into a flat array.
 */
function buildRelationships(documents: ParsedDocumentData[]): Relationship[] {
  const relationships: Relationship[] = [];

  for (const doc of documents) {
    for (const [relType, targets] of Object.entries(doc.relationships)) {
      for (const target of targets) {
        relationships.push({
          source: doc.path,
          target,
          type: relType as RelationshipType,
        });
      }
    }
  }

  return relationships;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generates a complete Manifest object by traversing the given root directory,
 * extracting frontmatter from all Markdown files, and building the relationship graph.
 *
 * Documents with missing or unparseable frontmatter are skipped.
 *
 * @param rootDir - Absolute path to the root directory to scan
 * @returns A Manifest object ready for serialisation
 */
export async function generateManifest(rootDir: string): Promise<Manifest> {
  const filePaths = await findMarkdownFiles(rootDir);

  const parsedDocs: ParsedDocumentData[] = [];

  for (const filePath of filePaths) {
    const doc = await parseDocument(rootDir, filePath);
    if (doc !== null) {
      parsedDocs.push(doc);
    }
  }

  const documents = parsedDocs.map(buildManifestEntry);
  const relationships = buildRelationships(parsedDocs);

  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    documentCount: documents.length,
    documents,
    relationships,
  };
}

/**
 * Updates a single document's manifest entry and its relationship edges
 * without modifying any other entries in the manifest.
 *
 * This ensures incremental update isolation: modifying one document only
 * affects its own entry and the relationships where it is the source.
 * Other documents' entries, paths, frontmatter, and cross-references
 * remain untouched.
 *
 * If the file no longer has valid frontmatter, its entry and outgoing
 * relationships are removed from the manifest.
 *
 * @param manifest - The existing manifest to update (mutated in place and returned)
 * @param filePath - Relative path of the document to update
 * @param rootDir - Absolute path to the root directory
 * @returns The updated manifest
 */
export async function updateManifestEntry(
  manifest: Manifest,
  filePath: string,
  rootDir: string
): Promise<Manifest> {
  // Parse the updated document
  const doc = await parseDocument(rootDir, filePath);

  // Remove the old entry for this file path (if it exists)
  const existingIndex = manifest.documents.findIndex((d) => d.path === filePath);
  if (existingIndex !== -1) {
    manifest.documents.splice(existingIndex, 1);
  }

  // Remove all relationships where this file is the source
  manifest.relationships = manifest.relationships.filter((r) => r.source !== filePath);

  // If the document has valid frontmatter, add/replace its entry and relationships
  if (doc !== null) {
    const entry = buildManifestEntry(doc);
    manifest.documents.push(entry);

    // Add new outgoing relationships from this document
    for (const [relType, targets] of Object.entries(doc.relationships)) {
      for (const target of targets) {
        manifest.relationships.push({
          source: doc.path,
          target,
          type: relType as RelationshipType,
        });
      }
    }
  }

  // Update document count
  manifest.documentCount = manifest.documents.length;

  // Update timestamp
  manifest.generatedAt = new Date().toISOString();

  return manifest;
}

// ─── Root Index Generation ───────────────────────────────────────────────────

/** Subdomain definitions for root index generation. */
const SUBDOMAIN_ENTRIES = [
  { name: 'Discovery', path: 'discovery/index.md', description: 'Pre-bet browsing, search, and sport/event exploration experiences' },
  { name: 'Transactional', path: 'transactional/index.md', description: 'Bet placement, betslip, and payment flow experiences' },
  { name: 'Post Bet', path: 'post-bet/index.md', description: 'Bet tracking, cashout, results, and settlement experiences' },
];

/** Cross-cutting area definitions for root index generation. */
const CROSS_CUTTING_ENTRIES = [
  { name: 'Live Betting', path: 'cross-cutting-areas/live-betting/', description: 'In-play betting experiences spanning pre-match to live event transitions' },
  { name: 'Horse Racing', path: 'cross-cutting-areas/horse-racing/', description: 'Racing-specific experiences including form, cards, and race visualisation' },
  { name: 'Bet Builder', path: 'cross-cutting-areas/bet-builder/', description: 'Custom bet construction combining multiple selections within events' },
  { name: 'Personalisation', path: 'cross-cutting-areas/personalisation/', description: 'Tailored content, recommendations, and adaptive interfaces' },
  { name: 'Streaming and Visualisations', path: 'cross-cutting-areas/streaming-and-visualisations/', description: 'Live video, match trackers, and data visualisation experiences' },
  { name: 'Promotions and Boosts', path: 'cross-cutting-areas/promotions-and-boosts/', description: 'Promotional offers, boosted odds, and incentive experiences' },
  { name: 'Responsible Gambling', path: 'cross-cutting-areas/responsible-gambling/', description: 'Player protection, limits, self-exclusion, and safer gambling tools' },
  { name: 'Localisation', path: 'cross-cutting-areas/localisation/', description: 'Market-specific adaptations, language, and regulatory compliance' },
  { name: 'Accessibility', path: 'cross-cutting-areas/accessibility/', description: 'Inclusive design ensuring usability for all abilities and contexts' },
  { name: 'Design System', path: 'cross-cutting-areas/design-system/', description: 'Shared components, tokens, and interaction patterns across products' },
];

/**
 * Generates the root index.md content from the current manifest state.
 * Includes navigation links to all subdomains, cross-cutting areas,
 * principles, ownership, and roadmap sections.
 *
 * Each entry description is capped at 150 characters as per Requirement 1.6.
 *
 * @param manifest - The current manifest (used to verify document existence)
 * @returns The complete Markdown content for index.md
 */
export function generateRootIndexContent(manifest: Manifest): string {
  const today = new Date().toISOString().slice(0, 10);

  const frontmatter = `---
title: "Sports Experience Guidelines"
subdomain: "cross-cutting-areas"
experience-area: "navigation"
document-type: "overview"
owner: "Unassigned"
last-updated: "${today}"
status: "draft"
tags:
  - "navigation"
  - "index"
  - "knowledge-architecture"
summary: "Root navigation document for the Sports Experience Guidelines framework. Provides links to all subdomains, cross-cutting areas, principles, ownership, and roadmap sections."
maturity: "in-progress"
---`;

  const header = `
# Sports Experience Guidelines

The Sports Experience Guidelines framework is the structural backbone governing how experience knowledge is organised, owned, documented, and consumed across the sports betting product. It serves Product Designers, UX Researchers, Product Managers, Engineers, Content Designers, and AI agents.

<!-- ai:summary -->
Root navigation index for the Sports Experience Guidelines knowledge architecture, linking all subdomains, cross-cutting areas, and supporting sections.
<!-- ai:keywords -->`;

  // Build subdomains table
  let subdomainsTable = `
## Subdomains

| Area | Description | Link |
|------|-------------|------|`;
  for (const entry of SUBDOMAIN_ENTRIES) {
    const desc = entry.description.slice(0, 150);
    subdomainsTable += `\n| ${entry.name} | ${desc} | [${entry.path}](${entry.path}) |`;
  }

  // Build cross-cutting areas table
  let crossCuttingTable = `
## Cross-Cutting Areas

| Area | Description | Link |
|------|-------------|------|`;
  for (const entry of CROSS_CUTTING_ENTRIES) {
    const desc = entry.description.slice(0, 150);
    crossCuttingTable += `\n| ${entry.name} | ${desc} | [${entry.path}](${entry.path}) |`;
  }

  // Build principles section
  const principlesTable = `
## Principles

| Section | Description | Link |
|---------|-------------|------|
| UX Principles | Sports-betting-specific design principles guiding all experience decisions | [principles/overview.md](principles/overview.md) |`;

  // Build ownership section
  const ownershipTable = `
## Ownership

| Section | Description | Link |
|---------|-------------|------|
| RACI Matrix | Responsibility assignments for each experience area by Lead Designer | [ownership/raci-matrix.yaml](ownership/raci-matrix.yaml) |
| Designer Profiles | Designer profiles, roles, and area assignments | [ownership/designers.yaml](ownership/designers.yaml) |`;

  // Build roadmap section
  const roadmapTable = `
## Roadmap

| Section | Description | Link |
|---------|-------------|------|
| Implementation Plan | Phased rollout plan from Foundation through AI Generation | [roadmap/overview.md](roadmap/overview.md) |`;

  const footer = `
<!-- ai:constraints -->
- This index must be updated whenever documents are added, moved, or removed
- All entries must have descriptions of no more than 150 characters
- Navigation links must resolve to valid document paths

<!-- ai:relationships -->
<!-- ai:scope -->`;

  return [frontmatter, header, subdomainsTable, crossCuttingTable, principlesTable, ownershipTable, roadmapTable, footer].join('\n');
}

/**
 * Updates the root index.md file with current navigation structure.
 * Called during manifest regeneration to keep the index in sync.
 *
 * @param rootDir - Absolute path to the root directory
 * @param manifest - The current manifest
 */
export async function updateRootIndex(rootDir: string, manifest: Manifest): Promise<void> {
  const content = generateRootIndexContent(manifest);
  const indexPath = join(rootDir, 'index.md');
  await writeFile(indexPath, content, 'utf-8');
}
