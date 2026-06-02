/**
 * Unit tests for the Document Chunker (Task 11.1)
 *
 * Tests that:
 * - Documents are split into chunks of ≤500 words
 * - Section boundaries are respected (no chunk spans two sections)
 * - Complete coverage without loss or duplication
 */

import { describe, it, expect } from 'vitest';
import { chunkDocument, splitSectionIntoChunks, MAX_CHUNK_WORDS } from '../src/chunker.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generates a string with the specified number of words. */
function generateWords(count: number): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(`word${i}`);
  }
  return words.join(' ');
}

/** Creates a simple Markdown document with frontmatter and sections. */
function makeDocument(sections: { name: string; wordCount: number }[]): string {
  const frontmatter = `---
title: Test Document
subdomain: discovery
experience-area: test-area
document-type: overview
owner: Test Designer
last-updated: 2025-01-15
status: draft
tags:
  - test
summary: A test document.
---`;

  const sectionContent = sections
    .map((s) => `## ${s.name}\n\n${generateWords(s.wordCount)}`)
    .join('\n\n');

  return `${frontmatter}\n\n${sectionContent}`;
}

// ─── splitSectionIntoChunks ──────────────────────────────────────────────────

describe('splitSectionIntoChunks', () => {
  it('returns a single chunk for empty content', () => {
    const chunks = splitSectionIntoChunks('Overview', '');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe('Overview');
    expect(chunks[0].content).toBe('');
    expect(chunks[0].wordCount).toBe(0);
  });

  it('returns a single chunk when content is ≤500 words', () => {
    const content = generateWords(200);
    const chunks = splitSectionIntoChunks('Overview', content);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe('Overview');
    expect(chunks[0].wordCount).toBe(200);
  });

  it('returns a single chunk for exactly 500 words', () => {
    const content = generateWords(500);
    const chunks = splitSectionIntoChunks('Overview', content);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].wordCount).toBe(500);
  });

  it('splits content >500 words at paragraph boundaries', () => {
    // Create content with multiple paragraphs totalling >500 words
    const para1 = generateWords(300);
    const para2 = generateWords(300);
    const content = `${para1}\n\n${para2}`;

    const chunks = splitSectionIntoChunks('Guidelines', content);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.wordCount).toBeLessThanOrEqual(MAX_CHUNK_WORDS);
      expect(chunk.section).toBe('Guidelines');
    }
  });

  it('handles a single paragraph exceeding 500 words', () => {
    const content = generateWords(800); // No paragraph breaks
    const chunks = splitSectionIntoChunks('Overview', content);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.wordCount).toBeLessThanOrEqual(MAX_CHUNK_WORDS);
    }

    // Verify total word count is preserved
    const totalWords = chunks.reduce((sum, c) => sum + c.wordCount, 0);
    expect(totalWords).toBe(800);
  });

  it('preserves all content without loss', () => {
    const para1 = 'First paragraph with some content here.';
    const para2 = 'Second paragraph with different content.';
    const content = `${para1}\n\n${para2}`;

    const chunks = splitSectionIntoChunks('Overview', content);
    const reconstructed = chunks.map((c) => c.content).join('\n\n');

    expect(reconstructed).toBe(content);
  });
});

// ─── chunkDocument ───────────────────────────────────────────────────────────

describe('chunkDocument', () => {
  it('returns empty array for empty document', () => {
    const chunks = chunkDocument('');
    expect(chunks).toHaveLength(0);
  });

  it('returns empty array for document with only frontmatter', () => {
    const doc = `---
title: Empty
---`;
    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(0);
  });

  it('chunks a document with small sections into one chunk per section', () => {
    const doc = makeDocument([
      { name: 'Overview', wordCount: 100 },
      { name: 'Guidelines', wordCount: 200 },
    ]);

    const chunks = chunkDocument(doc);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].section).toBe('Overview');
    expect(chunks[0].wordCount).toBe(100);
    expect(chunks[1].section).toBe('Guidelines');
    expect(chunks[1].wordCount).toBe(200);
  });

  it('splits large sections into multiple chunks', () => {
    const doc = makeDocument([
      { name: 'Overview', wordCount: 100 },
      { name: 'Guidelines', wordCount: 1000 },
    ]);

    const chunks = chunkDocument(doc);

    // Overview should be 1 chunk, Guidelines should be multiple
    const overviewChunks = chunks.filter((c) => c.section === 'Overview');
    const guidelinesChunks = chunks.filter((c) => c.section === 'Guidelines');

    expect(overviewChunks).toHaveLength(1);
    expect(guidelinesChunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      expect(chunk.wordCount).toBeLessThanOrEqual(MAX_CHUNK_WORDS);
    }
  });

  it('respects section boundaries — no chunk spans two sections', () => {
    const doc = makeDocument([
      { name: 'Overview', wordCount: 400 },
      { name: 'Principles in Context', wordCount: 400 },
      { name: 'Current State', wordCount: 400 },
    ]);

    const chunks = chunkDocument(doc);

    // Each chunk should belong to exactly one section
    const sectionNames = new Set(chunks.map((c) => c.section));
    expect(sectionNames.size).toBe(3);

    // Verify no chunk has content from another section
    for (const chunk of chunks) {
      expect(['Overview', 'Principles in Context', 'Current State']).toContain(
        chunk.section
      );
    }
  });

  it('ensures complete coverage — total word count matches', () => {
    const doc = makeDocument([
      { name: 'Overview', wordCount: 250 },
      { name: 'Guidelines', wordCount: 750 },
      { name: 'Examples', wordCount: 100 },
    ]);

    const chunks = chunkDocument(doc);
    const totalWords = chunks.reduce((sum, c) => sum + c.wordCount, 0);

    // Total should be 250 + 750 + 100 = 1100
    expect(totalWords).toBe(1100);
  });

  it('all chunks are ≤500 words', () => {
    const doc = makeDocument([
      { name: 'Overview', wordCount: 2000 },
      { name: 'Guidelines', wordCount: 1500 },
    ]);

    const chunks = chunkDocument(doc);

    for (const chunk of chunks) {
      expect(chunk.wordCount).toBeLessThanOrEqual(MAX_CHUNK_WORDS);
    }
  });
});
