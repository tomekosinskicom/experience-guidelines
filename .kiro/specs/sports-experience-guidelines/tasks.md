# Implementation Plan: Sports Experience Guidelines

## Overview

This plan implements the Sports Experience Guidelines framework — a file-based knowledge architecture with Node.js/TypeScript CLI tooling for validation, manifest generation, scaffolding, search, AI retrieval, and ownership management. Implementation proceeds from core data models and schemas through CLI tools to consumption-layer services, with property-based tests validating correctness properties throughout.

## Tasks

- [x] 1. Set up project structure and core schemas
  - [x] 1.1 Initialise Node.js/TypeScript project with directory structure
    - Create `tools/` directory with `src/`, `tests/`, and `schemas/` subdirectories
    - Initialise `package.json` with TypeScript, fast-check, and a test runner (vitest)
    - Configure `tsconfig.json` for Node.js CLI output
    - Create the folder structure skeleton: `principles/`, `discovery/`, `transactional/`, `post-bet/`, `cross-cutting-areas/`, `ownership/`, `roadmap/`
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 1.2 Define TypeScript interfaces and type definitions
    - Create `tools/src/types.ts` with all data model interfaces: `ManifestEntry`, `Manifest`, `Relationship`, `ValidationReport`, `ValidationError`, `SearchOptions`, `SearchResult`, `RetrievalRequest`, `RetrievalResponse`, `DocumentContent`, `DocumentChunk`, `Constraint`, `UXPrinciple`, `ExperienceAreaEntry`, `CrossCuttingArea`, `RoadmapPhase`
    - Define enumerations for `DocumentType`, `Status`, `Maturity`, `Influence`, `RelationshipType`
    - _Requirements: 2.2, 2.3, 4.5, 8.1_

  - [x] 1.3 Create JSON Schema files for validation rules
    - Create `tools/schemas/frontmatter.schema.json` defining required fields, types, constraints (title max 100 chars, summary max 200 words, tags 1-15 items, status enum, etc.)
    - Create `tools/schemas/document-types.json` with the closed enumerated list: overview, principles, patterns, research, decisions, guidelines, examples
    - Create `tools/schemas/naming-rules.json` with pattern `[a-z0-9]+(-[a-z0-9]+)*`, max 64 chars, `.md` extension for files
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.6_

- [x] 2. Implement naming and path utilities
  - [x] 2.1 Implement naming convention validator
    - Create `tools/src/naming-validator.ts`
    - Implement `validateName(input: string, isFile: boolean): ValidationResult` that checks kebab-case pattern, max 64 chars, and `.md` extension for files
    - Return specific rule violation messages for each failure mode
    - _Requirements: 1.2, 2.1_

  - [ ]* 2.2 Write property test for naming convention validation
    - **Property 1: Naming Convention Validation**
    - Generate random strings (ASCII, unicode, varying lengths, with/without hyphens, mixed case) and verify the validator accepts if and only if the string matches `[a-z0-9]+(-[a-z0-9]+)*`, is ≤64 chars, and (for files) ends with `.md`
    - **Validates: Requirements 1.2, 2.1**

  - [x] 2.3 Implement deterministic path generator
    - Create `tools/src/path-generator.ts`
    - Implement `generatePath(subdomain: string, experienceArea: string, documentType: DocumentType): string`
    - Produce `{subdomain}/{experience-area}/{document-type}.md` for subdomain docs and `cross-cutting-areas/{experience-area}/{document-type}.md` for cross-cutting docs
    - Validate inputs against naming rules and document-type enum before generating
    - _Requirements: 1.5, 2.1_

  - [ ]* 2.4 Write property test for deterministic path generation
    - **Property 2: Deterministic Path Generation**
    - Generate random valid (subdomain, area, type) tuples and verify the same inputs always produce the same output path matching the expected pattern
    - **Validates: Requirements 1.5, 2.1**

  - [ ]* 2.5 Write property test for document type enumeration
    - **Property 4: Document Type Enumeration**
    - Generate random strings including valid types and arbitrary strings; verify the validator accepts only the 7 enumerated types and rejects all others with the invalid type identified
    - **Validates: Requirements 2.2, 2.7**

- [x] 3. Implement frontmatter parsing and validation
  - [x] 3.1 Implement YAML frontmatter parser and validator
    - Create `tools/src/frontmatter-validator.ts`
    - Parse YAML frontmatter from Markdown files
    - Validate against JSON Schema: required fields presence, type checks, enum values, tag constraints (1-15 kebab-case strings), summary word count (≤200), date format (ISO 8601)
    - Return list of specific missing or invalid fields
    - _Requirements: 2.3, 2.6, 7.2, 8.2_

  - [ ]* 3.2 Write property test for frontmatter schema validation
    - **Property 3: Frontmatter Schema Validation**
    - Generate random YAML frontmatter objects with varying field presence, types, and values; verify the validator reports valid if and only if all required fields are present with correct types and constraints
    - **Validates: Requirements 2.3, 2.6, 8.2**

  - [ ]* 3.3 Write unit tests for frontmatter edge cases
    - Test well-formed YAML, malformed YAML, empty tags array, boundary word counts (199, 200, 201 words), invalid date formats, unknown status values
    - _Requirements: 2.3, 2.6_

- [x] 4. Checkpoint - Core utilities validated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Document Validator CLI
  - [x] 5.1 Implement document structure validator
    - Create `tools/src/structure-validator.ts`
    - Validate section order matches Documentation Template: frontmatter, overview, principles-in-context, current-state, guidelines, examples, research-references, decision-log, related-areas
    - Validate required sections are present
    - Validate combined word count of overview + principles-in-context + current-state + guidelines + related-areas ≤3000 words
    - Validate all 5 AI annotation markers are present at defined positions
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 5.2 Write property test for template structure validation
    - **Property 10: Template Structure Validation**
    - Generate random section orderings and content with varying word counts; verify the validator enforces correct order, required sections, word count limit, and AI annotation marker presence
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

  - [x] 5.3 Implement cross-reference validator
    - Create `tools/src/reference-validator.ts`
    - Detect broken references (targets that don't exist in the file system)
    - Detect orphaned documents (no inbound references and not root-level entry points)
    - Detect circular references in dependency chains
    - Report each error with affected document path, error category, and specific reference
    - _Requirements: 9.4, 9.5_

  - [ ]* 5.4 Write property test for cross-reference integrity
    - **Property 7: Cross-Reference Integrity**
    - Generate random document graphs with deliberate broken links and cycles; verify the validator detects and reports all broken references, orphaned documents, and circular references
    - **Validates: Requirements 9.4, 9.5**

  - [x] 5.5 Implement experience area entry validator
    - Create `tools/src/experience-area-validator.ts`
    - Validate: description ≤150 words, scope boundary with non-empty included and excluded lists, related cross-cutting areas list present, maturity from enumerated set, owner Pod assigned
    - _Requirements: 4.1, 4.2, 4.3, 5.1_

  - [ ]* 5.6 Write property test for experience area entry validation
    - **Property 8: Experience Area Entry Validation**
    - Generate random entry objects with varying field values and lengths; verify the validator enforces all constraints
    - **Validates: Requirements 4.1, 4.2, 4.3, 5.1**

  - [x] 5.7 Implement RACI matrix validator
    - Create `tools/src/raci-validator.ts`
    - Validate: exactly one Pod in Accountable role, all role values reference Pod names (not individuals), at least one Pod in Responsible role
    - Flag areas with no Responsible Pod as unowned
    - _Requirements: 6.1, 6.2, 6.6_

  - [ ]* 5.8 Write property test for RACI matrix constraints
    - **Property 9: RACI Matrix Constraints**
    - Generate random RACI matrices with varying Pod assignments; verify the validator enforces exactly one Accountable, Pod-based references, and at least one Responsible
    - **Validates: Requirements 6.1, 6.2, 6.6**

  - [x] 5.9 Implement status transition guards
    - Create `tools/src/status-validator.ts`
    - Prevent documents with validation errors from being assigned status "validated"
    - When a document with incomplete metadata is retrieved, include metadata-incomplete flag with list of missing/invalid fields
    - _Requirements: 7.7, 8.8_

  - [ ]* 5.10 Write property test for status transition guards
    - **Property 14: Status Transition Guards**
    - Generate random documents with varying validation states; verify documents with errors cannot reach "validated" status and incomplete metadata triggers the flag
    - **Validates: Requirements 7.7, 8.8**

  - [x] 5.11 Wire up Document Validator CLI entry point
    - Create `tools/src/validate.ts` as CLI entry point
    - Accept `--path`, `--fix`, `--report` flags
    - Orchestrate all validators (naming, frontmatter, structure, references, experience area, RACI, status)
    - Produce `ValidationReport` output as JSON or human-readable format
    - _Requirements: 9.4, 9.5, 2.6_

- [x] 6. Checkpoint - Document Validator complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Manifest Generator
  - [x] 7.1 Implement manifest generation logic
    - Create `tools/src/manifest-generator.ts`
    - Traverse folder structure and collect all Markdown documents
    - Extract frontmatter metadata from each document
    - Build relationship graph from typed references (depends-on, extends, conflicts-with, supersedes, related-to)
    - Generate `Manifest` object with version, timestamp, document count, entries, and relationships
    - Write output to `manifest.json`
    - _Requirements: 2.5, 9.2_

  - [ ]* 7.2 Write property test for manifest completeness
    - **Property 6: Manifest Completeness**
    - Generate random folder structures with 1-100 documents; verify the manifest contains exactly one entry per document with correct path, all metadata fields, and all relationship references
    - **Validates: Requirements 2.5, 9.2**

  - [x] 7.3 Implement incremental update isolation logic
    - Ensure modifying a single document only updates its own manifest entry and relationship edges
    - Adding a new subdomain or cross-cutting area does not modify existing document paths, frontmatter, or cross-references
    - _Requirements: 9.3, 9.6_

  - [ ]* 7.4 Write property test for incremental update isolation
    - **Property 13: Incremental Update Isolation**
    - Generate random dependency graphs, apply single-node modifications; verify no document without a direct dependency on the modified document is affected
    - **Validates: Requirements 9.3, 9.6**

  - [x] 7.5 Wire up Manifest Generator CLI entry point
    - Create `tools/src/manifest.ts` as CLI entry point
    - Accept `--output` and `--validate` flags
    - Integrate with validator to optionally validate all documents before generating
    - _Requirements: 2.5_

- [x] 8. Implement Document Scaffold
  - [x] 8.1 Implement scaffold generation logic
    - Create `tools/src/scaffold.ts`
    - Accept `--subdomain`, `--area`, `--type`, `--owner` arguments
    - Validate inputs against naming conventions and enumerated types
    - Generate deterministic file path from inputs using path generator
    - Create document with all required sections and instructional placeholder text
    - Insert 5 AI annotation markers at defined positions
    - Add initial frontmatter with status "draft"
    - _Requirements: 1.5, 7.4, 7.5, 8.7_

  - [ ]* 8.2 Write unit tests for scaffold tool
    - Test scaffold generates correct skeleton for each of the 7 document types
    - Verify all required sections present with placeholder text
    - Verify AI annotation markers at correct positions
    - Verify frontmatter has status "draft" and all required fields
    - _Requirements: 7.4, 7.5_

- [x] 9. Implement Search Index
  - [x] 9.1 Implement search function
    - Create `tools/src/search.ts`
    - Implement `search(manifest: Manifest, options: SearchOptions): SearchResult[]`
    - Exact tag match (case-insensitive)
    - Substring match within title and summary fields
    - Filter by subdomain, status, owner, cross-cutting area, maturity
    - Multiple filter values combined with OR within a field, AND across fields
    - Score and rank results
    - _Requirements: 2.4, 4.6, 8.1_

  - [ ]* 9.2 Write property test for search correctness
    - **Property 5: Search Correctness**
    - Generate random manifests (5-50 docs) and random query strings; verify the search returns exactly those documents matching by tag or substring, with no omissions or false positives, and filters applied correctly
    - **Validates: Requirements 2.4, 4.6, 8.1**

- [x] 10. Checkpoint - CLI tools complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement AI Retrieval Service
  - [x] 11.1 Implement document chunking
    - Create `tools/src/chunker.ts`
    - Split documents into chunks of ≤500 words each
    - Respect section boundaries (no chunk spans two sections)
    - Ensure complete coverage without loss or duplication
    - _Requirements: 8.3_

  - [ ]* 11.2 Write property test for document chunking
    - **Property 11: Document Chunking**
    - Generate random documents with varying section lengths (0-2000 words per section); verify chunks are ≤500 words, respect section boundaries, and cover the complete document without loss or duplication
    - **Validates: Requirements 8.3**

  - [x] 11.3 Implement dependency chain retrieval
    - Create `tools/src/retrieval.ts`
    - Implement `retrieve(request: RetrievalRequest, manifest: Manifest): RetrievalResponse`
    - Traverse related documents up to specified depth (max 2)
    - Return at most 20 documents total
    - Detect and terminate on circular references without infinite loop
    - Include `metadataComplete` flag and `missingFields` when applicable
    - _Requirements: 8.5, 8.8_

  - [ ]* 11.4 Write property test for dependency chain retrieval
    - **Property 12: Dependency Chain Retrieval**
    - Generate random DAGs and cyclic graphs with 1-30 nodes; verify retrieval returns correct documents up to depth, respects max 20 limit, and terminates on cycles
    - **Validates: Requirements 8.5**

  - [x] 11.5 Implement constraint extraction
    - Parse `<!-- ai:constraints -->` annotations from documents
    - Extract prohibited, required, and boundary constraints
    - Include in `RetrievalResponse` as typed `Constraint` objects
    - _Requirements: 8.7_

- [x] 12. Implement Ownership Manager
  - [x] 12.1 Implement RACI matrix and Pod data loading
    - Create `tools/src/ownership.ts`
    - Parse `ownership/raci-matrix.yaml` and `ownership/pods.yaml`
    - Provide lookup functions: get owner for area, get all areas for Pod, get unowned areas
    - Integrate with validator for RACI constraint checking
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

  - [ ]* 12.2 Write unit tests for ownership manager
    - Test RACI lookup, Pod mapping, unowned area detection
    - Test review cadence logic (quarterly for active, annual for stable)
    - _Requirements: 6.1, 6.5_

- [x] 13. Wire everything together and create root index
  - [x] 13.1 Create root `index.md` with navigation structure
    - Generate root index document listing all subdomains and cross-cutting areas
    - Include descriptions (≤150 chars per entry) and navigation links
    - Wire manifest generator to update index on regeneration
    - _Requirements: 1.6_

  - [x] 13.2 Create seed content for initial folder structure
    - Create `ownership/raci-matrix.yaml` with initial structure
    - Create `ownership/pods.yaml` with placeholder Pod definitions
    - Create `principles/overview.md` with UX Principles template
    - Create subdomain `index.md` files for discovery, transactional, post-bet, cross-cutting-areas
    - _Requirements: 1.3, 1.4, 3.1, 5.4_

  - [ ]* 13.3 Write integration tests for end-to-end workflow
    - Test scaffold → validate → manifest pipeline
    - Test search across generated manifest
    - Test AI retrieval with dependency chains
    - Verify 500-document scale target (search <2s, navigation <3s)
    - _Requirements: 9.1, 9.7_

- [x] 14. Final checkpoint - All components integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 14 universal correctness properties defined in the design
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript with fast-check for property-based testing and vitest as the test runner
- All CLI tools are in `tools/src/` and compile to `tools/` for execution

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.3"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.5", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "5.1", "5.3", "5.5", "5.7", "5.9"] },
    { "id": 5, "tasks": ["5.2", "5.4", "5.6", "5.8", "5.10", "5.11"] },
    { "id": 6, "tasks": ["7.1", "8.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "7.5", "8.2", "9.1"] },
    { "id": 8, "tasks": ["7.4", "9.2", "11.1", "11.3", "11.5"] },
    { "id": 9, "tasks": ["11.2", "11.4", "12.1"] },
    { "id": 10, "tasks": ["12.2", "13.1", "13.2"] },
    { "id": 11, "tasks": ["13.3"] }
  ]
}
```
