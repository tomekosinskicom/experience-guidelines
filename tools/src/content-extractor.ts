/**
 * Sports Experience Guidelines — Content Extractor
 *
 * Extracts text, structure, and metadata from source documents (PDF, plain text,
 * markdown). Handles format detection, size validation, and produces a structured
 * `ExtractedContent` object for downstream processing by the Template Engine.
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4
 */

import { readFile, stat, access, constants } from 'node:fs/promises';
import { extname } from 'node:path';

import type {
  SupportedFormat,
  ExtractedContent,
  HeadingNode,
  TableData,
  InferredMetadata,
} from './import-types.js';
import { FORMAT_EXTENSIONS, MAX_FILE_SIZE_BYTES } from './import-types.js';

// ─── Error Classes ───────────────────────────────────────────────────────────

/** Error thrown when content extraction fails. */
export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

// ─── Format Detection ────────────────────────────────────────────────────────

/**
 * Detects the supported format from a file extension.
 * Returns undefined if the extension is not supported.
 */
export function detectFormat(filePath: string): SupportedFormat | undefined {
  const ext = extname(filePath).toLowerCase();
  for (const [format, extensions] of Object.entries(FORMAT_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return format as SupportedFormat;
    }
  }
  return undefined;
}

// ─── Heading Tree Builder ────────────────────────────────────────────────────

/**
 * Builds a hierarchical `HeadingNode` tree from a flat list of headings.
 * Lower-level headings become children of the nearest preceding higher-level heading.
 */
export function buildHeadingTree(flatHeadings: { level: number; text: string }[]): HeadingNode[] {
  const roots: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const { level, text } of flatHeadings) {
    const node: HeadingNode = { level, text, children: [] };

    // Pop stack until we find a parent with a lower level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return roots;
}

// ─── Markdown Parsing Utilities ──────────────────────────────────────────────

/**
 * Parses headings from markdown text.
 * Recognises ATX-style headings (lines starting with `#` markers).
 */
function parseMarkdownHeadings(text: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  }

  return headings;
}

/**
 * Extracts tables from markdown text.
 * Recognises GFM-style tables (pipe-delimited with separator row).
 */
function parseMarkdownTables(text: string): TableData[] {
  const tables: TableData[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect a table: a line with pipes, followed by a separator line
    if (line.includes('|') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();

      // Check if next line is a separator (contains dashes and pipes)
      if (/^\|?[\s\-:|]+\|[\s\-:|]+\|?$/.test(nextLine)) {
        // Parse header row
        const headers = parsePipeRow(line);

        if (headers.length > 0) {
          const rows: string[][] = [];

          // Skip header and separator
          let j = i + 2;

          // Parse data rows
          while (j < lines.length) {
            const rowLine = lines[j].trim();
            if (!rowLine.includes('|') || rowLine === '') {
              break;
            }
            const cells = parsePipeRow(rowLine);
            if (cells.length > 0) {
              rows.push(cells);
            }
            j++;
          }

          tables.push({ headers, rows });
          i = j;
          continue;
        }
      }
    }

    i++;
  }

  return tables;
}

/**
 * Parses a pipe-delimited row into cell values.
 */
function parsePipeRow(line: string): string[] {
  // Remove leading/trailing pipes and split
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);

  return trimmed.split('|').map((cell) => cell.trim());
}

// ─── Metadata Inference ──────────────────────────────────────────────────────

/**
 * Infers metadata from extracted content.
 * - Title: from the first H1 heading
 * - Tags: from recurring keywords in the text
 */
function inferMetadata(
  text: string,
  headings: { level: number; text: string }[]
): InferredMetadata {
  const metadata: InferredMetadata = {};

  // Title from first H1
  const firstH1 = headings.find((h) => h.level === 1);
  if (firstH1) {
    metadata.title = firstH1.text;
  }

  // Extract possible tags from keywords
  const keywords = extractKeywords(text);
  if (keywords.length > 0) {
    metadata.possibleTags = keywords;
  }

  return metadata;
}

/**
 * Extracts recurring keywords from text for tag suggestions.
 * Looks for words that appear frequently (excluding common stop words).
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'not', 'no', 'so', 'if', 'as', 'all',
    'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
    'than', 'too', 'very', 'just', 'also', 'then', 'there', 'here', 'when',
    'where', 'how', 'what', 'which', 'who', 'whom', 'why', 'about', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'under', 'over', 'out', 'up', 'down', 'off', 'any', 'only', 'own',
  ]);

  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  const freq = new Map<string, number>();

  for (const word of words) {
    if (!stopWords.has(word)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  // Return top keywords by frequency (minimum 3 occurrences)
  return [...freq.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// ─── Text Splitting ──────────────────────────────────────────────────────────

/**
 * Splits text into paragraphs on double newlines.
 * Trims each paragraph and filters out empty entries.
 */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// ─── Content Extractor ───────────────────────────────────────────────────────

/**
 * Extracts text, structure, and metadata from source documents.
 *
 * Supports PDF, plain text, and markdown formats. Handles format detection,
 * file size validation, and error reporting.
 */
export class ContentExtractor {
  /**
   * Extracts content from a file at the given path.
   *
   * @param filePath - Absolute or relative path to the source file
   * @param format - The detected format of the source file
   * @returns Structured extracted content
   * @throws ExtractionError on any extraction failure
   */
  async extract(filePath: string, format: SupportedFormat): Promise<ExtractedContent> {
    // Validate file exists and is accessible
    await this.validateFileAccess(filePath);

    // Validate file size
    await this.validateFileSize(filePath);

    // Extract based on format
    switch (format) {
      case 'pdf':
        return this.extractPdf(filePath);
      case 'txt':
        return this.extractText(filePath);
      case 'md':
        return this.extractMarkdown(filePath);
      default:
        throw new ExtractionError(
          `Unsupported format '${format}'. Supported: .pdf, .txt, .md`
        );
    }
  }

  // ─── Private: Validation ─────────────────────────────────────────────────

  private async validateFileAccess(filePath: string): Promise<void> {
    try {
      await access(filePath, constants.R_OK);
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new ExtractionError(`File not found: ${filePath}`);
      }
      if (nodeError.code === 'EACCES') {
        throw new ExtractionError('Cannot read file: permission denied');
      }
      throw new ExtractionError(`File not found: ${filePath}`);
    }
  }

  private async validateFileSize(filePath: string): Promise<void> {
    const fileStat = await stat(filePath);
    if (fileStat.size > MAX_FILE_SIZE_BYTES) {
      const actualMB = (fileStat.size / (1024 * 1024)).toFixed(1);
      throw new ExtractionError(
        `File exceeds maximum size of 20 MB (${actualMB} MB)`
      );
    }
  }

  // ─── Private: PDF Extraction ─────────────────────────────────────────────

  private async extractPdf(filePath: string): Promise<ExtractedContent> {
    let pdfParse: (dataBuffer: Buffer) => Promise<{ text: string }>;
    try {
      const module = await import('pdf-parse');
      pdfParse = module.default ?? module;
    } catch {
      throw new ExtractionError('Failed to parse PDF: pdf-parse module not available');
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch {
      throw new ExtractionError(`Failed to parse PDF: cannot read file`);
    }

    let data: { text: string };
    try {
      data = await pdfParse(buffer);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ExtractionError(`Failed to parse PDF: ${message}`);
    }

    const rawText = data.text;

    if (!rawText || rawText.trim().length === 0) {
      throw new ExtractionError('Text extraction failed: no readable content found');
    }

    const paragraphs = splitParagraphs(rawText);
    // PDF doesn't have reliable heading markers, but we can try to infer from formatting
    const headings: HeadingNode[] = [];
    const tables: TableData[] = [];
    const metadata = inferMetadata(rawText, []);

    return { rawText, paragraphs, headings, tables, metadata };
  }

  // ─── Private: Plain Text Extraction ──────────────────────────────────────

  private async extractText(filePath: string): Promise<ExtractedContent> {
    const rawText = await this.readFileWithFallback(filePath);

    if (!rawText || rawText.trim().length === 0) {
      throw new ExtractionError('Text extraction failed: no readable content found');
    }

    const paragraphs = splitParagraphs(rawText);
    const headings: HeadingNode[] = [];
    const tables: TableData[] = [];
    const metadata = inferMetadata(rawText, []);

    return { rawText, paragraphs, headings, tables, metadata };
  }

  // ─── Private: Markdown Extraction ────────────────────────────────────────

  private async extractMarkdown(filePath: string): Promise<ExtractedContent> {
    const rawText = await this.readFileWithFallback(filePath);

    if (!rawText || rawText.trim().length === 0) {
      throw new ExtractionError('Text extraction failed: no readable content found');
    }

    const paragraphs = splitParagraphs(rawText);
    const flatHeadings = parseMarkdownHeadings(rawText);
    const headings = buildHeadingTree(flatHeadings);
    const tables = parseMarkdownTables(rawText);
    const metadata = inferMetadata(rawText, flatHeadings);

    return { rawText, paragraphs, headings, tables, metadata };
  }

  // ─── Private: File Reading with Encoding Fallback ────────────────────────

  /**
   * Reads a file attempting UTF-8 first, then Latin-1 fallback.
   * Throws if neither encoding produces valid content.
   */
  private async readFileWithFallback(filePath: string): Promise<string> {
    try {
      // Try UTF-8 first
      const content = await readFile(filePath, 'utf-8');
      return content;
    } catch {
      try {
        // Fallback to Latin-1
        const buffer = await readFile(filePath);
        return buffer.toString('latin1');
      } catch {
        throw new ExtractionError('Text extraction failed: no readable content found');
      }
    }
  }
}
