/**
 * Document Import Workflow — Type Definitions and Constants
 *
 * Shared interfaces, type aliases, and constants for the import pipeline
 * that converts source documents into the repository's standardised markdown format.
 */

import type { DocumentType } from './types.js';

// ─── Supported Formats ───────────────────────────────────────────────────────

/** File formats supported by the import pipeline. */
export type SupportedFormat = 'pdf' | 'txt' | 'md';

/** Mapping of supported formats to their file extensions. */
export const FORMAT_EXTENSIONS: Record<SupportedFormat, string[]> = {
  pdf: ['.pdf'],
  txt: ['.txt', '.text'],
  md: ['.md', '.markdown'],
};

/** Maximum file size in bytes (20 MB). */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// ─── Template Constants ──────────────────────────────────────────────────────

/** Canonical template sections in required order. */
export const TEMPLATE_SECTIONS = [
  'overview',
  'principles-in-context',
  'current-state',
  'guidelines',
  'component-map',
  'examples',
  'research-references',
  'decision-log',
  'related-areas',
] as const;

/** Additional sections included for research-type documents. */
export const RESEARCH_EXTRA_SECTIONS = [
  'methodology',
  'findings',
  'recommendations',
] as const;

/** Placeholder text for sections with no corresponding source content. */
export const PLACEHOLDER_TEXT = 'TODO: Add content for this section.';

// ─── Document Type Inference ─────────────────────────────────────────────────

/** Signal keywords used to infer document type from source content. */
export const TYPE_SIGNALS: Record<DocumentType, string[]> = {
  research: ['methodology', 'findings', 'participants', 'sample size', 'usability study'],
  patterns: ['pattern', 'when to use', 'anatomy', 'variants', 'do/don\'t'],
  guidelines: ['guidelines', 'must', 'should', 'recommended', 'do not'],
  overview: ['overview', 'introduction', 'scope', 'context'],
  principles: ['principle', 'rationale', 'evaluation', 'anti-pattern'],
  decisions: ['decision', 'alternatives', 'rationale', 'trade-off'],
  examples: ['example', 'demonstration', 'sample', 'showcase'],
};

// ─── Import Service Interfaces ───────────────────────────────────────────────

/** Options for initiating a document import. */
export interface ImportOptions {
  filePath: string;
  owner?: string;
  subdomain?: string;
  experienceArea?: string;
}

/** Result returned after completing (or failing) an import. */
export interface ImportResult {
  success: boolean;
  savedPath?: string;
  manifestUpdated?: boolean;
  errors?: string[];
}

// ─── Content Extraction Interfaces ───────────────────────────────────────────

/** Structured content extracted from a source document. */
export interface ExtractedContent {
  rawText: string;
  paragraphs: string[];
  headings: HeadingNode[];
  tables: TableData[];
  metadata: InferredMetadata;
}

/** A heading in the document's hierarchical structure. */
export interface HeadingNode {
  level: number; // 1-6
  text: string;
  children: HeadingNode[];
}

/** Tabular data extracted from a source document. */
export interface TableData {
  headers: string[];
  rows: string[][];
}

/** Metadata inferred from source document content. */
export interface InferredMetadata {
  title?: string;
  possibleTags?: string[];
  possibleSubdomain?: string;
  possibleExperienceArea?: string;
}

// ─── Template Engine Interfaces ──────────────────────────────────────────────

/** Options for the template engine to generate a target document. */
export interface TemplateOptions {
  extractedContent: ExtractedContent;
  documentType: DocumentType;
  overrides?: Partial<FrontmatterFields>;
}

/** The generated target document with all its components. */
export interface GeneratedDocument {
  markdown: string;
  frontmatter: FrontmatterFields;
  sections: SectionContent[];
  suggestedPath: string;
  suggestedFilename: string;
}

/** A single section of the generated document. */
export interface SectionContent {
  name: string;
  content: string;
  isPlaceholder: boolean;
}

/** Required frontmatter fields for a generated target document. */
export interface FrontmatterFields {
  title: string;
  subdomain: string;
  'experience-area': string;
  'document-type': DocumentType;
  owner: string;
  'last-updated': string;
  status: 'draft';
  tags: string[];
  summary: string;
}

// ─── Document Type Inference Interfaces ──────────────────────────────────────

/** Result of document type inference from content signals. */
export interface InferenceResult {
  documentType: DocumentType;
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
}

// ─── Confirmation Interface Types ────────────────────────────────────────────

/** Data presented to the user for review before saving. */
export interface ConfirmationPrompt {
  suggestedPath: string;
  suggestedFilename: string;
  markdown: string;
  validationErrors: string[];
  pathExists: boolean;
  fileExists: boolean;
}

/** User's response to the confirmation prompt. */
export type ConfirmationResponse =
  | { action: 'approve' }
  | { action: 'reject' }
  | { action: 'changePath'; newPath: string; newFilename: string }
  | { action: 'editContent'; instructions: string };

// ─── Validation Interfaces ───────────────────────────────────────────────────

/** Result of validating a generated document for import. */
export interface ImportValidationResult {
  valid: boolean;
  frontmatterErrors: string[];
  structureErrors: string[];
  namingErrors: string[];
}

// ─── Pipeline State ──────────────────────────────────────────────────────────

/** Tracks progress through the import pipeline stages. */
export interface PipelineState {
  stage: 'intake' | 'extraction' | 'conversion' | 'validation' | 'confirmation' | 'persistence';
  sourceFile: string;
  format: SupportedFormat;
  extractedContent?: ExtractedContent;
  generatedDocument?: GeneratedDocument;
  validationResult?: ImportValidationResult;
  userResponse?: ConfirmationResponse;
  savedPath?: string;
}
