/**
 * Sports Experience Guidelines — Core Type Definitions
 *
 * All data model interfaces, enumerations, and type aliases used across
 * the validation, manifest generation, search, and AI retrieval tooling.
 */

// ─── Enumerations ────────────────────────────────────────────────────────────

/** Valid document types within the knowledge architecture. */
export type DocumentType =
  | 'overview'
  | 'principles'
  | 'patterns'
  | 'research'
  | 'decisions'
  | 'guidelines'
  | 'examples';

/** Publication status of a document node. */
export type Status = 'draft' | 'in-review' | 'published' | 'deprecated';

/** Maturity level of an experience area or document. */
export type Maturity = 'not-started' | 'in-progress' | 'documented' | 'validated';

/** Degree of influence a cross-cutting area has on a subdomain. */
export type Influence = 'primary' | 'secondary' | 'informational';

/** Typed relationship between two document nodes. */
export type RelationshipType =
  | 'depends-on'
  | 'extends'
  | 'conflicts-with'
  | 'supersedes'
  | 'related-to';

// ─── Manifest Interfaces ─────────────────────────────────────────────────────

/** A single document entry within the manifest index. */
export interface ManifestEntry {
  path: string;
  title: string;
  subdomain: string;
  experienceArea: string;
  documentType: DocumentType;
  owner: string;
  lastUpdated: string; // ISO 8601
  status: Status;
  tags: string[];
  summary: string;
  maturity: Maturity;
  wordCount: number;
}

/** Root-level manifest representing the full document index. */
export interface Manifest {
  version: string;
  generatedAt: string; // ISO 8601
  documentCount: number;
  documents: ManifestEntry[];
  relationships: Relationship[];
}

/** A typed directional relationship between two documents. */
export interface Relationship {
  source: string; // document path
  target: string; // document path
  type: RelationshipType;
}

// ─── Validation Interfaces ───────────────────────────────────────────────────

/** Structured report produced by the document validator. */
export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    documentsChecked: number;
    documentsValid: number;
    documentsFailed: number;
  };
}

/** A single validation error with location and rule details. */
export interface ValidationError {
  path: string;
  category: 'naming' | 'frontmatter' | 'structure' | 'content' | 'reference';
  field: string;
  rule: string;
  message: string;
}

/** A single validation warning (non-blocking). */
export interface ValidationWarning {
  path: string;
  category: 'naming' | 'frontmatter' | 'structure' | 'content' | 'reference';
  field: string;
  rule: string;
  message: string;
}

// ─── Search Interfaces ───────────────────────────────────────────────────────

/** Options for searching the manifest index. */
export interface SearchOptions {
  query: string;
  filters?: {
    subdomain?: string[];
    status?: string[];
    owner?: string[];
    crossCuttingArea?: string[];
    maturity?: string[];
  };
}

/** A single search result with relevance scoring. */
export interface SearchResult {
  path: string;
  title: string;
  score: number;
  matchedFields: string[];
  metadata: ManifestEntry;
}

// ─── AI Retrieval Interfaces ─────────────────────────────────────────────────

/** Request to retrieve a document with its dependency chain. */
export interface RetrievalRequest {
  documentPath: string;
  includeDepth?: number; // max 2
  maxDocuments?: number; // max 20
}

/** Response containing the document and related context. */
export interface RetrievalResponse {
  document: DocumentContent;
  relatedDocuments: DocumentContent[];
  metadataComplete: boolean;
  missingFields?: string[];
  circularReferenceDetected?: boolean;
}

/** Full content representation of a document for AI consumption. */
export interface DocumentContent {
  path: string;
  frontmatter: Record<string, unknown>;
  chunks: DocumentChunk[];
  constraints: Constraint[];
  relationships: Relationship[];
}

/** A section-bounded chunk of document content (max 500 words). */
export interface DocumentChunk {
  section: string;
  content: string;
  wordCount: number; // max 500
}

/** An explicit constraint annotation extracted from a document. */
export interface Constraint {
  type: 'prohibited' | 'required' | 'boundary';
  description: string;
  scope: string;
}

// ─── Domain Model Interfaces ─────────────────────────────────────────────────

/** A single UX principle in the priority-ordered set. */
export interface UXPrinciple {
  id: number; // priority order (1 = highest)
  title: string; // max 60 characters
  summary: string; // exactly 1 sentence, max 150 characters
  rationale: string; // 50-200 words
  evaluationQuestion: string; // yes/no question
  positiveExamples: Example[]; // exactly 2
  antiPatterns: Example[]; // exactly 2
  rankJustification: string; // 1 sentence relative to adjacent
  subdomainExceptions: SubdomainException[];
}

/** A concrete design scenario example. */
export interface Example {
  scenario: string; // max 100 words
}

/** A subdomain-specific exception to a UX principle. */
export interface SubdomainException {
  subdomain: 'discovery' | 'transactional' | 'post-bet';
  exception: string;
  rationale: string;
}

/** An experience area entry in the inventory. */
export interface ExperienceAreaEntry {
  name: string;
  subdomain: string;
  description: string; // max 150 words
  scopeBoundary: {
    included: string[];
    excluded: string[];
  };
  relatedCrossCuttingAreas: string[];
  maturity: Maturity;
  owner: string; // Lead Designer
  crossReferences?: string[]; // paths to canonical entries if cross-subdomain
}

/** A cross-cutting area that influences multiple subdomains. */
export interface CrossCuttingArea {
  name: string;
  description: string;
  scopeStatement: string;
  influencedSubdomains: ScopeMapEntry[];
  interactionPoints: InteractionPoint[];
}

/** A scope map entry showing influence level on a subdomain. */
export interface ScopeMapEntry {
  subdomain: string;
  influence: Influence;
}

/** An interaction point where two or more cross-cutting areas overlap. */
export interface InteractionPoint {
  areas: string[]; // 2+ cross-cutting area names
  subdomain: string;
  description: string;
}

// ─── Roadmap Interfaces ──────────────────────────────────────────────────────

/** A phase in the implementation roadmap. */
export interface RoadmapPhase {
  id: number;
  name: 'foundation' | 'populate' | 'standards' | 'ai-review' | 'ai-generation';
  objectives: string[];
  deliverables: Deliverable[];
  successCriteria: string[];
  durationWeeks: number;
  dependencies: number[]; // phase IDs
  requiredRoles: string[];
  gateCriteria: string[]; // min 2
  quickWins?: QuickWin[]; // Foundation phase only, min 3
}

/** A deliverable within a roadmap phase. */
export interface Deliverable {
  name: string;
  description: string;
  dependsOn: string[]; // deliverable names from prior phases
}

/** A quick win deliverable (Foundation phase only). */
export interface QuickWin {
  name: string;
  description: string;
  role: string; // single role
  maxDurationDays: number; // max 10 (2 weeks)
}
