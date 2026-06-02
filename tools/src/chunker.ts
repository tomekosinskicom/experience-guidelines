/**
 * Sports Experience Guidelines — Document Chunker
 *
 * Splits documents into chunks of ≤500 words each, respecting section
 * boundaries (no chunk spans two sections) and ensuring complete coverage
 * without loss or duplication.
 *
 * Uses `parseSections` from the structure-validator to identify section
 * boundaries and `countWords` for word counting.
 *
 * Validates: Requirements 8.3
 */

import { parseSections, stripFrontmatter, countWords } from './structure-validator.js';
import type { DocumentChunk } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum words per chunk. */
export const MAX_CHUNK_WORDS = 500;

// ─── Chunking Logic ──────────────────────────────────────────────────────────

/**
 * Splits a section's content into multiple chunks at paragraph boundaries
 * (double newline), each containing at most MAX_CHUNK_WORDS words.
 *
 * @param sectionName - The name of the section these chunks belong to
 * @param content - The full content of the section
 * @returns Array of DocumentChunk objects
 */
export function splitSectionIntoChunks(
  sectionName: string,
  content: string
): DocumentChunk[] {
  const trimmedContent = content.trim();

  // If the section is empty, return a single empty chunk
  if (trimmedContent.length === 0) {
    return [
      {
        section: sectionName,
        content: '',
        wordCount: 0,
      },
    ];
  }

  const wordCount = countWords(trimmedContent);

  // If the section fits in one chunk, return it directly
  if (wordCount <= MAX_CHUNK_WORDS) {
    return [
      {
        section: sectionName,
        content: trimmedContent,
        wordCount,
      },
    ];
  }

  // Split at paragraph boundaries (double newline)
  const paragraphs = trimmedContent.split(/\n\n+/);
  const chunks: DocumentChunk[] = [];
  let currentParagraphs: string[] = [];
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphWordCount = countWords(paragraph);

    // If a single paragraph exceeds the limit, it becomes its own chunk
    if (paragraphWordCount > MAX_CHUNK_WORDS) {
      // Flush current accumulated paragraphs first
      if (currentParagraphs.length > 0) {
        const chunkContent = currentParagraphs.join('\n\n');
        chunks.push({
          section: sectionName,
          content: chunkContent,
          wordCount: currentWordCount,
        });
        currentParagraphs = [];
        currentWordCount = 0;
      }

      // Split the oversized paragraph by sentences or words
      const words = paragraph.split(/\s+/);
      let wordBatch: string[] = [];

      for (const word of words) {
        if (wordBatch.length >= MAX_CHUNK_WORDS) {
          const chunkContent = wordBatch.join(' ');
          chunks.push({
            section: sectionName,
            content: chunkContent,
            wordCount: wordBatch.length,
          });
          wordBatch = [];
        }
        wordBatch.push(word);
      }

      if (wordBatch.length > 0) {
        const chunkContent = wordBatch.join(' ');
        chunks.push({
          section: sectionName,
          content: chunkContent,
          wordCount: wordBatch.length,
        });
      }

      continue;
    }

    // If adding this paragraph would exceed the limit, flush current chunk
    if (currentWordCount + paragraphWordCount > MAX_CHUNK_WORDS && currentParagraphs.length > 0) {
      const chunkContent = currentParagraphs.join('\n\n');
      chunks.push({
        section: sectionName,
        content: chunkContent,
        wordCount: currentWordCount,
      });
      currentParagraphs = [];
      currentWordCount = 0;
    }

    currentParagraphs.push(paragraph);
    currentWordCount += paragraphWordCount;
  }

  // Flush remaining paragraphs
  if (currentParagraphs.length > 0) {
    const chunkContent = currentParagraphs.join('\n\n');
    chunks.push({
      section: sectionName,
      content: chunkContent,
      wordCount: currentWordCount,
    });
  }

  return chunks;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Chunks a Markdown document into section-bounded pieces of ≤500 words each.
 *
 * The function:
 * 1. Strips frontmatter
 * 2. Parses sections using `parseSections`
 * 3. For each section, if wordCount ≤500, it becomes one chunk
 * 4. If wordCount >500, splits into multiple chunks at paragraph boundaries
 *
 * @param markdown - The full Markdown document content (with or without frontmatter)
 * @returns Array of DocumentChunk objects covering the entire document
 */
export function chunkDocument(markdown: string): DocumentChunk[] {
  const body = stripFrontmatter(markdown);
  const sections = parseSections(body);

  // If no sections found, treat the entire body as a single unnamed section
  if (sections.length === 0) {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      return [];
    }
    return splitSectionIntoChunks('_body', trimmed);
  }

  const allChunks: DocumentChunk[] = [];

  for (const section of sections) {
    const sectionChunks = splitSectionIntoChunks(section.name, section.content);
    allChunks.push(...sectionChunks);
  }

  return allChunks;
}
