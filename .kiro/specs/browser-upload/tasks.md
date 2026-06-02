# Implementation Plan: Browser Upload

## Overview

This plan implements a browser-based document upload interface integrated into the existing Express dashboard. The feature exposes the CLI import pipeline (ContentExtractor, DocumentTypeInferrer, TemplateEngine, validateForImport) through HTTP endpoints and a vanilla HTML/JS frontend. Implementation follows an incremental approach: core infrastructure first, then pipeline integration, UI, and finally persistence/wiring.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - [x] 1.1 Add multer dependency and create upload module files
    - Add `multer` and `@types/multer` to package.json (dependencies/devDependencies)
    - Create empty files: `tools/src/upload-router.ts`, `tools/src/upload-session.ts`
    - Create `tmp/uploads/.gitkeep` and add `tmp/uploads/` to `.gitignore`
    - _Requirements: 10.1_

  - [x] 1.2 Implement SessionStore class in `upload-session.ts`
    - Define `UploadSession` interface with fields: id, tempFilePath, originalFilename, format, extractedContent, generatedDocument, documentType, confidence, overrides, createdAt
    - Implement `SessionStore` class with `create()`, `get()`, `update()`, `delete()`, `cleanup()` methods
    - Use in-memory Map for storage, UUID generation via `crypto.randomUUID()`
    - `cleanup(maxAgeMs)` removes sessions older than the threshold
    - _Requirements: 2.1, 2.5_

  - [ ]* 1.3 Write unit tests for SessionStore
    - Test create returns a session with valid UUID and createdAt
    - Test get returns undefined for non-existent IDs
    - Test update patches session fields correctly
    - Test delete removes session and returns undefined on subsequent get
    - Test cleanup removes sessions older than maxAgeMs but keeps fresh ones
    - _Requirements: 2.1, 2.5_

- [x] 2. Implement upload router with POST /api/upload endpoint
  - [x] 2.1 Create `upload-router.ts` with multer configuration and upload endpoint
    - Export `createUploadRouter(rootDir: string): Router` factory function
    - Configure multer: destination `tmp/uploads/`, filename with UUID + original extension, 20 MB file size limit, single file field named `file`
    - Implement `POST /api/upload` handler: save file → call ContentExtractor → call DocumentTypeInferrer → call TemplateEngine → call validateForImport → create session → return `UploadProcessResponse`
    - Map file extensions to SupportedFormat (`.pdf` → pdf, `.txt`/`.text` → text, `.md`/`.markdown` → markdown)
    - Return 400 for unsupported extensions with stage `'intake'`
    - Return 400/500 with `UploadErrorResponse` (error + stage) on pipeline failures
    - _Requirements: 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 2.2 Write property test: File extension validation correctness (Property 1)
    - **Property 1: File extension validation correctness**
    - For any filename string, validate acceptance iff extension ∈ {.pdf, .txt, .text, .md, .markdown}
    - Use `fc.string()` generators for random filenames with random extensions
    - Verify rejected files include all five supported extensions in error message
    - **Validates: Requirements 1.5, 1.6**

  - [ ]* 2.3 Write property test: Successful processing response completeness (Property 2)
    - **Property 2: Successful processing response completeness**
    - For any valid file processed without errors, verify response contains: non-empty markdown, non-empty suggestedPath, suggestedFilename matching kebab-case .md pattern, confidence ∈ {'high','medium','low'}, validation object with frontmatterErrors/structureErrors/namingErrors arrays
    - Use mock pipeline components returning valid random content
    - **Validates: Requirements 2.5**

  - [ ]* 2.4 Write property test: Pipeline error response includes stage and reason (Property 3)
    - **Property 3: Pipeline error response includes stage and reason**
    - For any file that causes a pipeline stage to fail, verify error response has non-empty `error` string and `stage` field identifying the failing stage
    - Generate random errors at each pipeline stage (extraction, conversion, validation)
    - **Validates: Requirements 2.6, 2.7**

  - [ ]* 2.5 Write property test: Low confidence response includes available types (Property 4)
    - **Property 4: Low confidence response includes available types**
    - For any file where DocumentTypeInferrer returns 'low' confidence, verify response includes `confidence: 'low'` and `availableTypes` containing all 7 document types
    - **Validates: Requirements 2.8**

- [x] 3. Checkpoint - Ensure upload endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement regenerate, validate, and save endpoints
  - [x] 4.1 Implement `POST /api/upload/regenerate` endpoint
    - Accept `RegenerateRequest` body: sessionId, optional documentType, optional overrides (owner, subdomain, experienceArea)
    - Retrieve session, re-run TemplateEngine with new type/overrides, re-run validateForImport
    - Update session with new generatedDocument and documentType
    - Return updated response (same shape as UploadProcessResponse minus sessionId)
    - Return 404 if session not found
    - _Requirements: 5.3, 5.4, 6.2, 6.3_

  - [ ]* 4.2 Write property test: Document type override regeneration (Property 9)
    - **Property 9: Document type override regeneration**
    - For any valid extracted content × any document type from {overview, principles, patterns, research, decisions, guidelines, examples}, verify regenerated document's frontmatter `document-type` equals the overridden type
    - Verify research-specific sections present when type is 'research'
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 4.3 Write property test: Metadata override regeneration (Property 10)
    - **Property 10: Metadata override regeneration**
    - For any non-empty metadata override (owner, subdomain, experience-area), verify regenerated document frontmatter contains the overridden values exactly as provided, with no normalisation
    - Use `fc.string()` generators for random override values
    - **Validates: Requirements 6.2, 6.3**

  - [x] 4.4 Implement `POST /api/upload/validate` endpoint
    - Accept `ValidatePathRequest` body: sessionId, targetPath, filename
    - Validate each path segment matches `^[a-z0-9]+(-[a-z0-9]+)*$` (max 64 chars)
    - Validate filename matches `^[a-z0-9]+(-[a-z0-9]+)*\.md$` (max 64 chars)
    - Reject paths resolving outside rootDir (path traversal: `../`, absolute paths)
    - Return `ValidatePathResponse` with naming errors
    - Return 404 if session not found
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.5 Write property test: Kebab-case path validation (Property 7)
    - **Property 7: Kebab-case path validation**
    - For any target path string, verify naming errors reported for each segment not matching `^[a-z0-9]+(-[a-z0-9]+)*$` and filename not matching `^[a-z0-9]+(-[a-z0-9]+)*\.md$`
    - Verify error identifies the specific invalid segment or filename
    - Use generators for random path segments mixing valid/invalid patterns
    - **Validates: Requirements 4.3, 4.4, 4.5**

  - [ ]* 4.6 Write property test: Path traversal rejection (Property 8)
    - **Property 8: Path traversal rejection**
    - For any path containing `../` segments, absolute paths, or symlink-like traversals resolving outside root, verify server rejects with validation error
    - Use generators for paths with various traversal patterns
    - **Validates: Requirements 4.6**

  - [x] 4.7 Implement `POST /api/upload/save` endpoint
    - Accept `SaveRequest` body: sessionId, targetPath, filename
    - Re-validate path before writing (reject if invalid)
    - Create target directory with `fs.mkdirSync({ recursive: true })`
    - Write generated markdown to `rootDir/targetPath/filename`
    - Update manifest by calling `generateManifest()` and writing to `manifest.json`
    - Delete temp file and session on success
    - Return `SaveResponse` with savedPath and manifestUpdated boolean
    - Return 500 with `SaveErrorResponse` on write failures
    - If manifest update fails, still return success with `manifestUpdated: false`
    - _Requirements: 7.2, 7.3, 7.4, 7.6_

  - [ ]* 4.8 Write property test: Save persistence round-trip (Property 11)
    - **Property 11: Save persistence round-trip**
    - For any valid generated document and valid target path, verify saved file content equals generated markdown and manifest contains entry with matching relative path
    - Use temporary directories for isolation
    - **Validates: Requirements 7.3, 7.4**

  - [x] 4.9 Implement `DELETE /api/upload/:sessionId` endpoint
    - Retrieve session, delete temp file from disk, delete session from store
    - Return `{ success: true }`
    - Return 404 if session not found
    - _Requirements: 7.8, 7.9_

- [x] 5. Checkpoint - Ensure all API endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the upload UI page
  - [x] 6.1 Implement `GET /upload` route serving the upload HTML page
    - Create vanilla HTML page with inline CSS/JS (matching dashboard pattern)
    - Implement drag-and-drop zone with visual highlight on dragover
    - Implement file picker button triggering native file dialog
    - Implement client-side validation: extension check (.pdf, .txt, .text, .md, .markdown), 20 MB size limit, 0-byte rejection, single-file enforcement
    - Display clear error messages for each validation failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 6.2 Implement preview panel and metadata editing UI
    - Left column: render frontmatter as labeled key-value pairs, render markdown body as styled HTML (headings, lists, tables, inline formatting)
    - Right column: document type dropdown (7 options), confidence indicator, metadata fields (owner, subdomain, experience area) with max 100 chars, target path and filename text inputs (max 256 chars)
    - Show validation errors grouped by category (frontmatter, structure, naming) with error count badge
    - Implement progress indicator during upload/processing
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 5.1, 5.2, 6.1, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 6.3 Implement Save/Discard actions and re-validation on field changes
    - Save button enabled only when validation errors = 0; disabled during save request
    - On save success: display confirmation with saved path, option to upload another
    - On save failure: display error, keep Save enabled for retry
    - Discard button returns to initial upload state
    - On path/filename blur: send to `/api/upload/validate` for re-validation
    - On document type change: send to `/api/upload/regenerate`
    - On metadata field change: send to `/api/upload/regenerate`
    - _Requirements: 4.2, 4.7, 5.3, 5.5, 6.2, 6.4, 7.1, 7.2, 7.5, 7.7, 7.8, 7.9, 7.10_

  - [ ]* 6.4 Write property test: Frontmatter display completeness (Property 5)
    - **Property 5: Frontmatter display completeness**
    - For any generated document with N frontmatter fields, verify preview rendering produces output containing each field name and value as distinct visible elements
    - Use generators for random `FrontmatterFields` objects
    - **Validates: Requirements 3.2**

  - [ ]* 6.5 Write property test: Markdown-to-HTML structure preservation (Property 6)
    - **Property 6: Markdown-to-HTML structure preservation**
    - For any markdown with headings (h1–h6), unordered/ordered lists, or tables, verify HTML output contains corresponding semantic elements (h1–h6, ul/li, ol/li, table)
    - Use generators for random markdown with structural elements
    - **Validates: Requirements 3.3**

- [x] 7. Integration and wiring
  - [x] 7.1 Integrate upload router into dashboard.ts
    - Import `createUploadRouter` in `tools/src/dashboard.ts`
    - Mount router: `app.use(uploadRouter)` before the HTML route
    - Add navigation link to `/upload` in the dashboard HTML header (alongside existing buttons)
    - Add startup cleanup: clear stale files in `tmp/uploads/` on server start
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 7.2 Write integration tests for full upload flow
    - Test: upload a real markdown file → verify full UploadProcessResponse shape
    - Test: upload → regenerate with type override → verify updated document
    - Test: upload → adjust path → re-validate → save → verify file on disk
    - Test: upload → discard → verify temp file cleaned up
    - Test: `GET /upload` serves HTML page with correct content-type
    - Test: dashboard header contains upload navigation link
    - _Requirements: 2.5, 5.4, 7.3, 7.8, 10.2, 10.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (11 properties total)
- Unit tests validate specific examples and edge cases
- The upload UI is vanilla HTML/JS with inline styles matching the existing dashboard pattern — no build step required
- `multer` handles multipart file uploads with streaming and size limits
- The SessionStore is in-memory (no database) — sessions are ephemeral and cleaned on restart
- All pipeline components (ContentExtractor, DocumentTypeInferrer, TemplateEngine, validateForImport) are imported and called directly — no ImportService/ConfirmationInterface dependency

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "4.1", "4.4"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.5", "4.6", "4.7", "4.9"] },
    { "id": 5, "tasks": ["4.8", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3"] },
    { "id": 7, "tasks": ["6.4", "6.5", "7.1"] },
    { "id": 8, "tasks": ["7.2"] }
  ]
}
```
