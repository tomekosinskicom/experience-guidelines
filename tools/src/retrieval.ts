/**
 * Sports Experience Guidelines — AI Retrieval Service
 *
 * Provides structured document retrieval with dependency chain resolution
 * for AI agents. Includes:
 * - Dependency chain traversal up to depth 2, max 20 documents
 * - Circular reference detection
 * - Constraint extraction from `<!-- ai:constraints -->` annotations
 * - Metadata completeness checking
 *
 * Validates: Requirements 8.5, 8.7, 8.8
 */

import { stripFrontmatter, parseSections } from './structure-validator.js';
import { extractFrontmatter } from './frontmatter-validator.js';
import { parse as parseYaml } from 'yaml';
import { chunkDocument } from './chunker.js';
import type {
  RetrievalRequest,
  RetrievalResponse,
  DocumentContent,
  DocumentChunk,
  Constraint,
  Manifest,
  ManifestEntry,
  Relationship,
} from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum traversal depth for dependency chains. */
export const MAX_DEPTH = 2;

/** Maximum number of documents to return in a retrieval response. */
export const MAX_DOCUMENTS = 20;

/** Required frontmatter fields for metadata completeness check. */
const REQUIRED_FRONTMATTER_FIELDS = [
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

// ─── Constraint Extraction ───────────────────────────────────────────────────

/**
 * Constraint line pattern:
 * - [prohibited|required|boundary]: description (scope: scope-text)
 */
const CONSTRAINT_LINE_PATTERN =
  /^-\s+\[(prohibited|required|boundary)\]:\s+(.+?)\s+\(scope:\s+(.+?)\)\s*$/;

/**
 * Extracts constraint annotations from a Markdown document.
 *
 * Looks for content after `<!-- ai:constraints -->` marker until the next
 * HTML comment marker (`<!--`) or section heading (`## `).
 *
 * Parses constraint lines in format:
 *   - [prohibited|required|boundary]: description (scope: scope-text)
 *
 * @param markdown - The full Markdown document content
 * @returns Array of Constraint objects
 */
export function extractConstraints(markdown: string): Constraint[] {
  const constraints: Constraint[] = [];

  const markerIndex = markdown.indexOf('<!-- ai:constraints -->');
  if (markerIndex === -1) {
    return constraints;
  }

  // Get content after the marker
  const afterMarker = markdown.slice(markerIndex + '<!-- ai:constraints -->'.length);

  // Find the end boundary: next HTML comment or next section heading
  const lines = afterMarker.split('\n');
  const constraintLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Stop at next HTML comment marker or section heading
    if (trimmed.startsWith('<!--') || trimmed.startsWith('## ')) {
      break;
    }

    if (trimmed.length > 0) {
      constraintLines.push(trimmed);
    }
  }

  // Parse each constraint line
  for (const line of constraintLines) {
    const match = line.match(CONSTRAINT_LINE_PATTERN);
    if (match) {
      constraints.push({
        type: match[1] as Constraint['type'],
        description: match[2],
        scope: match[3],
      });
    }
  }

  return constraints;
}

// ─── Metadata Completeness ───────────────────────────────────────────────────

/**
 * Checks if a document's frontmatter contains all required fields.
 *
 * @param frontmatter - Parsed frontmatter object
 * @returns Object with `complete` flag and list of `missingFields`
 */
export function checkMetadataCompleteness(frontmatter: Record<string, unknown>): {
  complete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    const value = frontmatter[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }

  return {
    complete: missingFields.length === 0,
    missingFields,
  };
}

// ─── Document Content Building ───────────────────────────────────────────────

/**
 * Builds a DocumentContent object from raw Markdown content and manifest data.
 *
 * @param path - Document path
 * @param markdown - Full Markdown content
 * @param manifestRelationships - All relationships from the manifest
 * @returns A DocumentContent object
 */
export function buildDocumentContent(
  path: string,
  markdown: string,
  manifestRelationships: Relationship[]
): DocumentContent {
  // Parse frontmatter
  const rawYaml = extractFrontmatter(markdown);
  let frontmatter: Record<string, unknown> = {};

  if (rawYaml !== null) {
    try {
      const parsed = parseYaml(rawYaml);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        frontmatter = parsed as Record<string, unknown>;
      }
    } catch {
      // Leave frontmatter empty if parsing fails
    }
  }

  // Chunk the document
  const chunks = chunkDocument(markdown);

  // Extract constraints
  const constraints = extractConstraints(markdown);

  // Get relationships for this document
  const relationships = manifestRelationships.filter(
    (r) => r.source === path || r.target === path
  );

  return {
    path,
    frontmatter,
    chunks,
    constraints,
    relationships,
  };
}

// ─── Dependency Chain Traversal ──────────────────────────────────────────────

/**
 * Finds all document paths related to a given document path in the manifest.
 *
 * @param documentPath - The source document path
 * @param relationships - All relationships from the manifest
 * @returns Array of related document paths (both outgoing and incoming)
 */
export function findRelatedPaths(
  documentPath: string,
  relationships: Relationship[]
): string[] {
  const related = new Set<string>();

  for (const rel of relationships) {
    if (rel.source === documentPath) {
      related.add(rel.target);
    }
    if (rel.target === documentPath) {
      related.add(rel.source);
    }
  }

  return Array.from(related);
}

/**
 * Traverses the dependency chain breadth-first up to the specified depth,
 * collecting related document paths. Detects circular references and
 * respects the maximum document count.
 *
 * @param startPath - The starting document path
 * @param relationships - All relationships from the manifest
 * @param maxDepth - Maximum traversal depth (capped at MAX_DEPTH)
 * @param maxDocuments - Maximum documents to collect (capped at MAX_DOCUMENTS)
 * @returns Object with collected paths and circular reference flag
 */
export function traverseDependencyChain(
  startPath: string,
  relationships: Relationship[],
  maxDepth: number,
  maxDocuments: number
): { paths: string[]; circularReferenceDetected: boolean } {
  const effectiveDepth = Math.min(maxDepth, MAX_DEPTH);
  const effectiveMax = Math.min(maxDocuments, MAX_DOCUMENTS);

  const visited = new Set<string>([startPath]);
  const collectedPaths: string[] = [];
  let circularReferenceDetected = false;

  // BFS traversal
  let currentLevel = [startPath];

  for (let depth = 0; depth < effectiveDepth; depth++) {
    const nextLevel: string[] = [];

    for (const path of currentLevel) {
      const relatedPaths = findRelatedPaths(path, relationships);

      for (const relatedPath of relatedPaths) {
        if (visited.has(relatedPath)) {
          // Circular reference detected — we've already visited this node
          circularReferenceDetected = true;
          continue;
        }

        visited.add(relatedPath);
        collectedPaths.push(relatedPath);
        nextLevel.push(relatedPath);

        // Stop if we've reached the max document count
        if (collectedPaths.length >= effectiveMax - 1) {
          // -1 because the primary document counts as one
          return { paths: collectedPaths, circularReferenceDetected };
        }
      }
    }

    currentLevel = nextLevel;

    if (currentLevel.length === 0) {
      break;
    }
  }

  return { paths: collectedPaths, circularReferenceDetected };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Retrieves a document with its dependency chain for AI consumption.
 *
 * @param request - The retrieval request specifying document path and options
 * @param manifest - The manifest containing all document metadata and relationships
 * @param documentLoader - Function to load document content by path (for testability)
 * @returns A RetrievalResponse with the primary document, related documents, and metadata flags
 */
export function retrieve(
  request: RetrievalRequest,
  manifest: Manifest,
  documentLoader: (path: string) => string | null
): RetrievalResponse {
  const { documentPath, includeDepth = 2, maxDocuments = 20 } = request;

  // Load the primary document
  const primaryMarkdown = documentLoader(documentPath);

  if (primaryMarkdown === null) {
    // Document not found — return empty response
    return {
      document: {
        path: documentPath,
        frontmatter: {},
        chunks: [],
        constraints: [],
        relationships: [],
      },
      relatedDocuments: [],
      metadataComplete: false,
      missingFields: REQUIRED_FRONTMATTER_FIELDS.slice(),
    };
  }

  // Build primary document content
  const primaryDocument = buildDocumentContent(
    documentPath,
    primaryMarkdown,
    manifest.relationships
  );

  // Check metadata completeness
  const { complete, missingFields } = checkMetadataCompleteness(primaryDocument.frontmatter);

  // Traverse dependency chain
  const { paths: relatedPaths, circularReferenceDetected } = traverseDependencyChain(
    documentPath,
    manifest.relationships,
    includeDepth,
    maxDocuments
  );

  // Load related documents
  const relatedDocuments: DocumentContent[] = [];

  for (const relPath of relatedPaths) {
    // Only include documents that exist in the manifest
    const existsInManifest = manifest.documents.some((d) => d.path === relPath);
    if (!existsInManifest) {
      continue;
    }

    const relMarkdown = documentLoader(relPath);
    if (relMarkdown !== null) {
      const relDoc = buildDocumentContent(relPath, relMarkdown, manifest.relationships);
      relatedDocuments.push(relDoc);
    }
  }

  // Build response
  const response: RetrievalResponse = {
    document: primaryDocument,
    relatedDocuments,
    metadataComplete: complete,
  };

  if (!complete) {
    response.missingFields = missingFields;
  }

  if (circularReferenceDetected) {
    response.circularReferenceDetected = true;
  }

  return response;
}
