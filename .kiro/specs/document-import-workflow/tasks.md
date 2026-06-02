# Implementation Plan: Document Import Workflow

## Overview

This plan implements an automated CLI pipeline (`npm run import`) that converts uploaded source documents (PDF, plain text, markdown) into the repository's standardised markdown format. The implementation follows the existing `tools/src/` patterns and integrates with current validators, manifest generator, and path utilities. Tasks are ordered so each step builds on the previous, ending with full pipeline wiring.

## Tasks

- [x] 1. Set up project structure, types, and dependencies
  - [x] 1.1 Add PDF parsing dependency and create shared types for the import pipeline
    - Add `pdf-parse` (or equivalent) to `dependencies` in `package.json`
    - Add `@types/pdf-parse` to `devDependencies`
    - Create `tools/src/import-types.ts` with all interfaces: `ImportOptions`, `ImportResult`, `ExtractedContent`, `HeadingNode`, `TableData`, `InferredMetadata`, `TemplateOptions`, `GeneratedDocument`, `SectionContent`, `FrontmatterFields`, `InferenceResult`, `ConfirmationPrompt`, `ConfirmationResponse`, `ImportValidationResult`, `PipelineState`, `SupportedFormat`
    - Define constants: `FORMAT_EXTENSIONS`, `MAX_FILE_SIZE_BYTES`, `TEMPLATE_SECTIONS`, `RESEARCH_EXTRA_SECTIONS`, `PLACEHOLDER_TEXT`, `TYPE_SIGNALS`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 8.1_

  - [x] 1.2 Create the CLI entry point `tools/src/import.ts`
    - Parse CLI arguments (`--file`, `--owner`, `--subdomain`, `--experience-area`)
    - Wire to a placeholder `ImportService.import()` call
    - Add `"import": "node --loader ts-node/esm tools/src/import.ts"` script to `package.json`
    - _Requirements: 1.1_

- [x] 2. Implement content extraction
  - [x] 2.1 Implement `ContentExtractor` in `tools/src/content-extractor.ts`
    - Implement format detection from file extension using `FORMAT_EXTENSIONS`
    - Implement file size validation (reject > 20 MB)
    - Implement PDF text extraction using `pdf-parse`
    - Implement plain text extraction (read file, split paragraphs on double newlines)
    - Implement markdown extraction (parse headings via `#` markers, extract tables)
    - Build `HeadingNode` tree from flat heading list preserving hierarchy
    - Extract `InferredMetadata` (title from first H1, possible tags from keywords)
    - Return `ExtractedContent` with `rawText`, `paragraphs`, `headings`, `tables`, `metadata`
    - Handle errors: file not found, permission denied, no extractable text, encoding issues
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Write property tests for ContentExtractor
    - **Property 1: Unsupported format rejection** — generate random unsupported extensions and verify rejection with supported format listing
    - **Property 2: Paragraph boundary preservation** — generate random text with double-newline separators and verify paragraph count and content
    - **Property 3: Heading hierarchy preservation** — generate random heading sequences at varying levels and verify parent-child nesting
    - **Property 4: Table structure preservation** — generate random tables (varying rows/columns) and verify dimensions and cell content
    - **Validates: Requirements 1.6, 2.1, 2.2, 2.3**

  - [x] 2.3 Write unit tests for ContentExtractor
    - Test PDF extraction with a small mock PDF buffer
    - Test plain text extraction with known paragraph structure
    - Test markdown extraction with headings, tables, and mixed content
    - Test error cases: missing file, oversized file, empty file, unsupported extension
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4_

- [x] 3. Implement document type inference
  - [x] 3.1 Implement `DocumentTypeInferrer` in `tools/src/document-type-inferrer.ts`
    - Score extracted content against `TYPE_SIGNALS` for each document type
    - Assign confidence level (high/medium/low) based on signal density
    - Return `InferenceResult` with `documentType`, `confidence`, and `signals` (matched keywords)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 3.2 Write property tests for DocumentTypeInferrer
    - **Property 13: Document-type inference correctness** — generate content containing strong signals for each type and verify correct type + high confidence
    - **Validates: Requirements 8.1**

  - [x] 3.3 Write unit tests for DocumentTypeInferrer
    - Test with content clearly matching each document type
    - Test with ambiguous content returning low confidence
    - Test with empty content
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement template engine
  - [x] 5.1 Implement `TemplateEngine` in `tools/src/template-engine.ts`
    - Accept `TemplateOptions` (extractedContent, documentType, overrides)
    - Generate frontmatter with all required fields (title, subdomain, experience-area, document-type, owner, last-updated, status: "draft", tags, summary)
    - Map extracted headings/content to canonical `TEMPLATE_SECTIONS` in correct order
    - For "research" document type, include `RESEARCH_EXTRA_SECTIONS`
    - Fill unmapped sections with `PLACEHOLDER_TEXT`
    - Generate `suggestedPath` using the existing `path-generator.ts` module
    - Generate `suggestedFilename` as kebab-case derived from title
    - Return `GeneratedDocument` with markdown string, frontmatter, sections, path, and filename
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 8.2_

  - [x] 5.2 Write property tests for TemplateEngine
    - **Property 5: Template conformance with complete sections** — generate random extracted content and verify all `TEMPLATE_SECTIONS` appear in order with non-empty content
    - **Property 6: Frontmatter completeness invariant** — generate random metadata and verify all required fields present, status = "draft", last-updated = today
    - **Property 7: Content-to-section mapping correctness** — generate content with headings matching template section names and verify correct placement
    - **Property 9: Kebab-case filename derivation** — generate random title strings and verify filename matches `^[a-z0-9]+(-[a-z0-9]+)*\.md$`
    - **Property 14: Research template variant includes required sections** — generate content with type "research" and verify methodology/findings/recommendations sections present
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.2, 8.2**

  - [x] 5.3 Write unit tests for TemplateEngine
    - Test frontmatter generation with complete and partial metadata
    - Test section mapping with known heading-to-section matches
    - Test placeholder insertion for unmapped sections
    - Test research-type template includes extra sections
    - Test kebab-case filename for various title formats (spaces, special chars, unicode)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 8.2_

- [x] 6. Implement validation wrapper
  - [x] 6.1 Implement `validateForImport` in `tools/src/import-validation.ts`
    - Compose existing `frontmatter-validator.ts`, `structure-validator.ts`, and `naming-validator.ts`
    - Accept generated markdown string and target path
    - Return `ImportValidationResult` with categorised errors (frontmatter, structure, naming)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Write property tests for import validation
    - **Property 10: Validation detects all violations** — generate documents with missing frontmatter fields or missing sections and verify non-empty error list identifying each violation
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 6.3 Write unit tests for import validation
    - Test with valid document (no errors)
    - Test with missing frontmatter fields
    - Test with missing required sections
    - Test with invalid filename (non-kebab-case)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Implement confirmation interface
  - [x] 7.1 Implement `ConfirmationInterface` in `tools/src/confirmation-interface.ts`
    - Display proposed filename and directory path
    - Display generated markdown preview (truncated for readability)
    - Display validation errors if any
    - Warn if target file already exists
    - Prompt user for action: approve, reject, change path, or edit content
    - Parse user responses into `ConfirmationResponse` type
    - Handle low-confidence type inference by prompting user to select document type
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.3_

  - [x] 7.2 Write unit tests for ConfirmationInterface
    - Mock stdin/stdout and test each response path (approve, reject, changePath, editContent)
    - Test display of validation errors
    - Test overwrite warning when `pathExists` is true
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 8. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Import Service orchestration and persistence
  - [x] 9.1 Implement `ImportService` in `tools/src/import-service.ts`
    - Orchestrate the full pipeline: intake → extraction → type inference → conversion → validation → confirmation → persistence
    - Track `PipelineState` through stages
    - On `approve`: write file to target path (create directories if needed), update manifest via `manifest-generator.ts`
    - On `reject`: discard and return
    - On `changePath`: update path/filename and re-validate
    - On `editContent`: re-run template engine with user instructions
    - Handle all error conditions per design (file not found, permission denied, write failures)
    - Ensure no partial writes — only commit on full success
    - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.3_

  - [x] 9.2 Write property tests for manifest update
    - **Property 8: Path generation from metadata** — generate valid subdomain/experience-area pairs and verify path matches expected pattern
    - **Property 11: Manifest round-trip completeness** — generate a document, save it, and verify manifest entry matches all frontmatter values
    - **Property 12: Relationship propagation to manifest** — generate documents with relationships and verify manifest `relationships` array contains correct entries
    - **Validates: Requirements 4.1, 7.1, 7.2, 7.3**

  - [x] 9.3 Write integration tests for the full pipeline
    - Test importing a plain text file end-to-end (file → extraction → conversion → validation → save)
    - Test importing a markdown file and verifying round-trip fidelity
    - Test that manifest.json is correctly updated after save
    - Test overwrite warning when target file exists
    - Test directory creation when target path is new
    - Test rejection flow (no file written)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 4.1, 5.3, 5.4, 7.1_

- [x] 10. Wire CLI entry point and final integration
  - [x] 10.1 Wire `import.ts` CLI entry point to `ImportService`
    - Connect CLI argument parsing to `ImportOptions`
    - Handle and display errors with user-friendly messages
    - Display success summary (saved path, manifest updated)
    - Ensure `npm run import -- --file <path>` works end-to-end
    - _Requirements: 1.1, 5.1, 5.2_

- [x] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (14 properties)
- Unit tests validate specific examples and edge cases
- The project uses Vitest for testing and fast-check for property-based tests (both already in devDependencies)
- All new modules go in `tools/src/` following existing patterns (e.g., `scaffold.ts`, `validate.ts`)
- The implementation reuses existing modules: `frontmatter-validator.ts`, `structure-validator.ts`, `path-generator.ts`, `naming-validator.ts`, `manifest-generator.ts`, and `types.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.2", "6.3", "7.1"] },
    { "id": 5, "tasks": ["7.2"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "10.1"] }
  ]
}
```
