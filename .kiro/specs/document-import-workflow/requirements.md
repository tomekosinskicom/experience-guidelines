# Requirements Document

## Introduction

The Document Import Workflow automates the conversion of uploaded documents (PDFs, design specs, research reports, competitor analyses) into the standardised markdown format used across the Sports Experience Guidelines repository. Currently, adding new guideline documents requires manual AI-assisted conversion — a slow, error-prone process. This feature provides a structured workflow: upload a source document, automatically convert it to the correct template format (with front-matter metadata and standard sections), confirm the target location and content with the user, and save the result to the repository.

## Glossary

- **Import_Service**: The backend service responsible for receiving uploaded documents, extracting their content, and orchestrating the conversion pipeline.
- **Template_Engine**: The component that maps extracted content into the repository's standardised markdown template structure (front-matter, sections, component maps).
- **Document_Validator**: The component that checks generated markdown documents against the repository's schema rules (required front-matter fields, section ordering, relationship formats).
- **Source_Document**: A PDF, image, or other file uploaded by the user as input for conversion.
- **Target_Document**: The generated markdown file conforming to the repository template, ready for saving.
- **Front_Matter**: The YAML metadata block at the top of each markdown file containing fields such as title, subdomain, experience-area, document-type, owner, status, and tags.
- **Repository_Template**: The standardised markdown structure used across the guidelines repo, including sections: Overview, Principles in Context, Guidelines, Component Map, Examples, Research References, Decision Log, and Related Areas.
- **Manifest**: The manifest.json file that indexes all documents in the repository with their metadata.
- **Confirmation_Interface**: The UI or CLI prompt that presents the user with the proposed filename, directory location, and content preview for approval before saving.

## Requirements

### Requirement 1: Upload Source Documents

**User Story:** As a design guidelines author, I want to upload PDF and other document files, so that their content can be automatically converted into the repository's markdown format.

#### Acceptance Criteria

1. WHEN a user provides a Source_Document file, THE Import_Service SHALL accept the file for processing.
2. THE Import_Service SHALL support PDF files as a Source_Document format.
3. THE Import_Service SHALL support plain text files as a Source_Document format.
4. THE Import_Service SHALL support Markdown files as a Source_Document format.
5. IF a Source_Document exceeds 20 MB in size, THEN THE Import_Service SHALL reject the file and return a descriptive error message indicating the size limit.
6. IF a Source_Document is in an unsupported format, THEN THE Import_Service SHALL reject the file and return an error message listing the supported formats.

### Requirement 2: Extract Content from Source Documents

**User Story:** As a design guidelines author, I want the system to extract readable text and structure from my uploaded documents, so that the content can be mapped to the correct template sections.

#### Acceptance Criteria

1. WHEN a PDF Source_Document is accepted, THE Import_Service SHALL extract the text content preserving paragraph boundaries.
2. WHEN a Source_Document contains headings or structural markers, THE Import_Service SHALL identify and preserve the hierarchical structure.
3. WHEN a Source_Document contains tables, THE Import_Service SHALL extract table data preserving rows and columns.
4. IF a Source_Document contains no extractable text (e.g., scanned image without OCR), THEN THE Import_Service SHALL return an error indicating that text extraction failed.

### Requirement 3: Convert Extracted Content to Repository Template

**User Story:** As a design guidelines author, I want uploaded content to be automatically mapped into the standard guideline template, so that new documents are consistent with the rest of the repository.

#### Acceptance Criteria

1. WHEN content is extracted from a Source_Document, THE Template_Engine SHALL generate a Target_Document conforming to the Repository_Template structure.
2. THE Template_Engine SHALL populate the Front_Matter block with inferred metadata fields: title, subdomain, experience-area, document-type, owner, last-updated, status, and tags.
3. THE Template_Engine SHALL map extracted content to the appropriate template sections (Overview, Principles in Context, Guidelines, Component Map, Examples, Research References, Decision Log, Related Areas).
4. WHILE sections have no corresponding content in the Source_Document, THE Template_Engine SHALL include those sections with placeholder text indicating content is needed.
5. THE Template_Engine SHALL set the status field to "draft" for all generated Target_Documents.
6. THE Template_Engine SHALL set the last-updated field to the current date in ISO 8601 format (YYYY-MM-DD).

### Requirement 4: Determine Target Location

**User Story:** As a design guidelines author, I want the system to suggest where the new document should be saved in the repository hierarchy, so that it is placed in the correct pillar, subdomain, and experience area.

#### Acceptance Criteria

1. WHEN a Target_Document is generated, THE Import_Service SHALL suggest a target directory path within the repository hierarchy based on the inferred subdomain and experience-area metadata.
2. WHEN a Target_Document is generated, THE Import_Service SHALL suggest a filename in kebab-case format derived from the document title.
3. IF the suggested target path does not exist in the repository, THEN THE Import_Service SHALL indicate that a new directory will be created.
4. IF a file already exists at the suggested target path, THEN THE Import_Service SHALL warn the user that saving will overwrite the existing file.

### Requirement 5: User Confirmation Before Saving

**User Story:** As a design guidelines author, I want to review and approve the converted document and its target location before it is saved, so that I can catch errors and make corrections.

#### Acceptance Criteria

1. WHEN a Target_Document and target location are determined, THE Confirmation_Interface SHALL present the proposed filename and directory path to the user.
2. WHEN a Target_Document and target location are determined, THE Confirmation_Interface SHALL present the full generated markdown content to the user for review.
3. WHEN the user approves the proposed document, THE Import_Service SHALL save the Target_Document to the confirmed file path.
4. WHEN the user rejects the proposed document, THE Import_Service SHALL discard the Target_Document without modifying the repository.
5. WHEN the user requests changes to the target location, THE Confirmation_Interface SHALL allow the user to specify an alternative directory path and filename.
6. WHEN the user requests changes to the generated content, THE Confirmation_Interface SHALL allow the user to provide editing instructions for re-generation.

### Requirement 6: Validate Generated Documents

**User Story:** As a design guidelines author, I want generated documents to be validated against the repository schema, so that imported content meets the same quality standards as manually authored content.

#### Acceptance Criteria

1. WHEN a Target_Document is generated, THE Document_Validator SHALL check that all required Front_Matter fields are present.
2. WHEN a Target_Document is generated, THE Document_Validator SHALL check that the document contains all required template sections.
3. IF validation fails, THEN THE Document_Validator SHALL return a list of specific validation errors to the user.
4. IF validation fails, THEN THE Import_Service SHALL not save the Target_Document until errors are resolved.

### Requirement 7: Update Repository Manifest

**User Story:** As a design guidelines author, I want the manifest to be updated automatically when a new document is imported, so that the repository index stays accurate without manual intervention.

#### Acceptance Criteria

1. WHEN a Target_Document is saved to the repository, THE Import_Service SHALL update the Manifest with the new document's metadata entry.
2. THE Import_Service SHALL include the document's path, title, subdomain, experience-area, document-type, owner, last-updated, status, tags, and summary in the Manifest entry.
3. WHEN a Target_Document defines relationships to other documents, THE Import_Service SHALL add corresponding entries to the Manifest relationships array.

### Requirement 8: Handle Multiple Document Types

**User Story:** As a design guidelines author, I want the system to correctly identify the document type (overview, guideline, research, patterns) from the source content, so that the appropriate template variant is applied.

#### Acceptance Criteria

1. WHEN content is extracted from a Source_Document, THE Template_Engine SHALL infer the document-type from the source content (overview, guideline, research, or patterns).
2. WHEN the document-type is inferred as "research", THE Template_Engine SHALL include research-specific sections (methodology, findings, recommendations).
3. WHEN the document-type cannot be confidently inferred, THE Confirmation_Interface SHALL ask the user to select the document-type from the available options.
