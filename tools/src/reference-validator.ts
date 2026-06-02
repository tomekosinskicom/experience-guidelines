/**
 * Cross-Reference Validator
 *
 * Validates the integrity of cross-references within a document graph.
 * Detects:
 * - Broken references (targets that don't exist)
 * - Orphaned documents (no inbound references and not entry points)
 * - Circular references in dependency chains
 *
 * Validates: Requirements 9.4, 9.5
 */

import type { RelationshipType } from './types.js';

/** A node in the document graph with its outbound relationships. */
export interface DocumentNode {
  path: string;
  relationships: Partial<Record<RelationshipType, string[]>>;
  isEntryPoint?: boolean;
}

/** A reference error detected during validation. */
export interface ReferenceError {
  path: string;
  category: 'broken-reference' | 'orphaned' | 'circular-reference';
  reference: string;
  message: string;
}

/**
 * Validates cross-reference integrity across a document graph.
 *
 * @param documents - Array of document nodes with their relationships
 * @returns Array of reference errors found
 */
export function validateReferences(documents: DocumentNode[]): ReferenceError[] {
  const errors: ReferenceError[] = [];

  // Build a set of all known document paths for quick lookup
  const knownPaths = new Set(documents.map((doc) => doc.path));

  // Build an inbound reference map to detect orphans
  const inboundRefs = new Map<string, Set<string>>();
  for (const doc of documents) {
    inboundRefs.set(doc.path, new Set());
  }

  // Check for broken references and build inbound map
  for (const doc of documents) {
    for (const [, targets] of Object.entries(doc.relationships)) {
      if (!targets) continue;
      for (const target of targets) {
        if (!knownPaths.has(target)) {
          errors.push({
            path: doc.path,
            category: 'broken-reference',
            reference: target,
            message: `Reference to '${target}' does not exist in the document graph`,
          });
        } else {
          // Record inbound reference (only for valid targets)
          inboundRefs.get(target)!.add(doc.path);
        }
      }
    }
  }

  // Detect orphaned documents (no inbound references and not entry points)
  for (const doc of documents) {
    if (doc.isEntryPoint) continue;
    const inbound = inboundRefs.get(doc.path)!;
    if (inbound.size === 0) {
      errors.push({
        path: doc.path,
        category: 'orphaned',
        reference: doc.path,
        message: `Document '${doc.path}' has no inbound references and is not designated as an entry point`,
      });
    }
  }

  // Detect circular references using DFS cycle detection
  const circularErrors = detectCircularReferences(documents, knownPaths);
  errors.push(...circularErrors);

  return errors;
}

/**
 * Detects circular references in the document graph using DFS.
 * Reports each unique cycle found with the specific edge that closes the loop.
 */
function detectCircularReferences(
  documents: DocumentNode[],
  knownPaths: Set<string>,
): ReferenceError[] {
  const errors: ReferenceError[] = [];

  // Build adjacency list (only valid edges)
  const adjacency = new Map<string, string[]>();
  for (const doc of documents) {
    const targets: string[] = [];
    for (const [, refs] of Object.entries(doc.relationships)) {
      if (!refs) continue;
      for (const ref of refs) {
        if (knownPaths.has(ref)) {
          targets.push(ref);
        }
      }
    }
    adjacency.set(doc.path, targets);
  }

  // Track visited state: 'unvisited', 'in-stack' (currently being explored), 'done'
  const state = new Map<string, 'unvisited' | 'in-stack' | 'done'>();
  for (const path of knownPaths) {
    state.set(path, 'unvisited');
  }

  // Track the current DFS path for cycle reporting
  const reportedCycles = new Set<string>();

  function dfs(node: string, path: string[]): void {
    state.set(node, 'in-stack');
    path.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (state.get(neighbor) === 'in-stack') {
        // Found a cycle — report the edge that closes it
        const cycleStart = path.indexOf(neighbor);
        const cyclePath = path.slice(cycleStart);
        const cycleKey = [...cyclePath].sort().join(' -> ');

        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey);
          errors.push({
            path: node,
            category: 'circular-reference',
            reference: neighbor,
            message: `Circular reference detected: ${cyclePath.join(' -> ')} -> ${neighbor}`,
          });
        }
      } else if (state.get(neighbor) === 'unvisited') {
        dfs(neighbor, path);
      }
    }

    path.pop();
    state.set(node, 'done');
  }

  for (const doc of documents) {
    if (state.get(doc.path) === 'unvisited') {
      dfs(doc.path, []);
    }
  }

  return errors;
}
