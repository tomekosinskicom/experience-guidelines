/**
 * Integration tests for the full document import pipeline.
 *
 * Tests the ImportService end-to-end: file → extraction → conversion → validation → save.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 4.1, 5.3, 5.4, 7.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ImportService } from '../src/import-service.js';
import { ConfirmationInterface } from '../src/confirmation-interface.js';
import type { ConfirmationPrompt, ConfirmationResponse } from '../src/import-types.js';
import type { DocumentType } from '../src/types.js';

// ─── Mock Confirmation Interface ─────────────────────────────────────────────

/**
 * A mock ConfirmationInterface that returns a predetermined response
 * without requiring interactive input. Tracks prompt data for assertions.
 */
class MockConfirmation extends ConfirmationInterface {
  private response: ConfirmationResponse;
  private documentType: DocumentType;
  public lastPromptData: ConfirmationPrompt | null = null;

  constructor(response: ConfirmationResponse, documentType: DocumentType = 'overview') {
    super({ input: process.stdin, output: process.stdout });
    this.response = response;
    this.documentType = documentType;
  }

  override async prompt(data: ConfirmationPrompt): Promise<ConfirmationResponse> {
    this.lastPromptData = data;
    return this.response;
  }

  override async promptDocumentType(): Promise<DocumentType> {
    return this.documentType;
  }

  override close(): void {
    // No-op for mock
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal valid manifest.json for test setup. */
const EMPTY_MANIFEST = JSON.stringify({
  version: '1.0.0',
  generatedAt: '2024-01-01T00:00:00.000Z',
  documentCount: 0,
  documents: [],
  relationships: [],
});

/** A simple plain text source file. */
const PLAIN_TEXT_CONTENT = `Introduction to Market Layouts

This document provides an overview of the market layout system used across sports betting platforms.

The discovery experience is key to helping players find relevant markets quickly.

Guidelines

Markets should be displayed in a clear hierarchical structure.
Use progressive disclosure to avoid overwhelming users.
Group related markets by sport and competition.
`;

/** A markdown source file with headings. */
const MARKDOWN_CONTENT = `# Research on Live Betting Patterns

## Overview

This research explores live betting user behaviour across mobile and desktop platforms.

## Methodology

We conducted usability studies with 25 participants over a 3-week period.

## Findings

Players prefer quick-access bet types during live events.
The average session time for live betting is 8 minutes.

## Recommendations

Implement a streamlined live betting interface with reduced tap targets.
`;

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('ImportService — Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'import-service-test-'));
    // Write the manifest.json
    await writeFile(join(tempDir, 'manifest.json'), EMPTY_MANIFEST, 'utf-8');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ── Test 1: Plain text import end-to-end ────────────────────────────────

  describe('plain text import end-to-end', () => {
    it('should import a .txt file and produce a valid markdown document', async () => {
      // Arrange: write source file
      const sourcePath = join(tempDir, 'market-layouts.txt');
      await writeFile(sourcePath, PLAIN_TEXT_CONTENT, 'utf-8');

      const confirmation = new MockConfirmation({ action: 'approve' });
      const service = new ImportService({ confirmation, rootDir: tempDir });

      // Act
      const result = await service.import({ filePath: sourcePath });

      // Assert: import succeeded
      expect(result.success).toBe(true);
      expect(result.savedPath).toBeDefined();
      expect(result.errors).toBeUndefined();

      // Assert: output file exists
      const savedFullPath = join(tempDir, result.savedPath!);
      const savedContent = await readFile(savedFullPath, 'utf-8');

      // Assert: has frontmatter
      expect(savedContent).toMatch(/^---\n/);
      expect(savedContent).toMatch(/status:\s*"?draft"?/);
      expect(savedContent).toContain('document-type:');

      // Assert: has template sections
      expect(savedContent).toContain('## Overview');
      expect(savedContent).toContain('## Guidelines');
    });
  });

  // ── Test 2: Markdown import with round-trip fidelity ────────────────────

  describe('markdown import with round-trip fidelity', () => {
    it('should import a .md file and map headings to correct sections', async () => {
      // Arrange: write source markdown file
      const sourcePath = join(tempDir, 'live-betting-research.md');
      await writeFile(sourcePath, MARKDOWN_CONTENT, 'utf-8');

      const confirmation = new MockConfirmation({ action: 'approve' });
      const service = new ImportService({ confirmation, rootDir: tempDir });

      // Act
      const result = await service.import({ filePath: sourcePath });

      // Assert: import succeeded
      expect(result.success).toBe(true);
      expect(result.savedPath).toBeDefined();

      // Assert: output file exists and has mapped content
      const savedFullPath = join(tempDir, result.savedPath!);
      const savedContent = await readFile(savedFullPath, 'utf-8');

      // The document should contain the overview content from source
      expect(savedContent).toContain('## Overview');

      // Frontmatter should have title derived from the source
      expect(savedContent).toContain('title:');
      expect(savedContent).toMatch(/status:\s*"?draft"?/);

      // The markdown should contain the source title in the frontmatter
      expect(savedContent).toContain('Live Betting');
    });
  });

  // ── Test 3: Manifest update after save ──────────────────────────────────

  describe('manifest update after save', () => {
    it('should update manifest.json with the new document entry', async () => {
      // Arrange
      const sourcePath = join(tempDir, 'market-layouts.txt');
      await writeFile(sourcePath, PLAIN_TEXT_CONTENT, 'utf-8');

      const confirmation = new MockConfirmation({ action: 'approve' });
      const service = new ImportService({ confirmation, rootDir: tempDir });

      // Act
      const result = await service.import({ filePath: sourcePath });

      // Assert: manifest was updated
      expect(result.manifestUpdated).toBe(true);

      // Read manifest and verify it has an entry
      const manifestRaw = await readFile(join(tempDir, 'manifest.json'), 'utf-8');
      const manifest = JSON.parse(manifestRaw);

      expect(manifest.documentCount).toBeGreaterThan(0);
      expect(manifest.documents.length).toBeGreaterThan(0);

      // The entry should have a path that matches the saved document
      const entry = manifest.documents[0];
      expect(entry.path).toBeDefined();
      expect(entry.status).toBe('draft');
    });
  });

  // ── Test 4: Overwrite warning when target file exists ───────────────────

  describe('overwrite warning when target file exists', () => {
    it('should set fileExists=true in prompt data when target file already exists', async () => {
      // Arrange: write source file
      const sourcePath = join(tempDir, 'overview-doc.txt');
      await writeFile(sourcePath, PLAIN_TEXT_CONTENT, 'utf-8');

      // First, run an import to create a file at the target path
      const firstConfirmation = new MockConfirmation({ action: 'approve' });
      const firstService = new ImportService({ confirmation: firstConfirmation, rootDir: tempDir });
      const firstResult = await firstService.import({ filePath: sourcePath });
      expect(firstResult.success).toBe(true);

      // Now run the import again — the target file should already exist
      const secondConfirmation = new MockConfirmation({ action: 'approve' });
      const secondService = new ImportService({ confirmation: secondConfirmation, rootDir: tempDir });
      await secondService.import({ filePath: sourcePath });

      // Assert: the confirmation prompt data should indicate file exists
      expect(secondConfirmation.lastPromptData).not.toBeNull();
      expect(secondConfirmation.lastPromptData!.fileExists).toBe(true);
    });
  });

  // ── Test 5: Directory creation when target path is new ──────────────────

  describe('directory creation when target path is new', () => {
    it('should create the target directory when it does not exist', async () => {
      // Arrange: write source file
      const sourcePath = join(tempDir, 'new-area-doc.txt');
      await writeFile(sourcePath, PLAIN_TEXT_CONTENT, 'utf-8');

      const confirmation = new MockConfirmation({ action: 'approve' });
      const service = new ImportService({ confirmation, rootDir: tempDir });

      // Act
      const result = await service.import({ filePath: sourcePath });

      // Assert: import succeeded (directory was created)
      expect(result.success).toBe(true);
      expect(result.savedPath).toBeDefined();

      // The confirmation should have shown pathExists=false (directory was new)
      expect(confirmation.lastPromptData).not.toBeNull();
      expect(confirmation.lastPromptData!.pathExists).toBe(false);

      // The file should actually exist
      const savedFullPath = join(tempDir, result.savedPath!);
      await expect(access(savedFullPath)).resolves.toBeUndefined();
    });
  });

  // ── Test 6: Rejection flow (no file written) ───────────────────────────

  describe('rejection flow', () => {
    it('should not write any file when user rejects', async () => {
      // Arrange: write source file
      const sourcePath = join(tempDir, 'rejected-doc.txt');
      await writeFile(sourcePath, PLAIN_TEXT_CONTENT, 'utf-8');

      const confirmation = new MockConfirmation({ action: 'reject' });
      const service = new ImportService({ confirmation, rootDir: tempDir });

      // Act
      const result = await service.import({ filePath: sourcePath });

      // Assert: import was not successful (rejected)
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Import rejected by user');

      // Assert: no new file was written (only manifest.json and source remain)
      expect(result.savedPath).toBeUndefined();
    });
  });
});
