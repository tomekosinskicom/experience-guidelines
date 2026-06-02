import { describe, it, expect, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';

import { ConfirmationInterface } from '../src/confirmation-interface.js';
import type { ConfirmationPrompt } from '../src/import-types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a PassThrough stream that simulates user typing line-by-line.
 * Lines are pushed asynchronously to avoid readline consuming the stream
 * before subsequent questions can be asked.
 */
function mockInput(lines: string[]): PassThrough {
  const stream = new PassThrough();

  // Push each line on next tick to let readline consume them one at a time
  let i = 0;
  const pushNext = () => {
    if (i < lines.length) {
      stream.write(lines[i] + '\n');
      i++;
      setImmediate(pushNext);
    } else {
      stream.end();
    }
  };
  setImmediate(pushNext);

  return stream;
}

/**
 * Creates a writable stream that captures all output into a buffer.
 */
function captureOutput(): PassThrough & { getOutput(): string } {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  (stream as any).getOutput = () => Buffer.concat(chunks).toString('utf-8');
  return stream as PassThrough & { getOutput(): string };
}

/**
 * Builds a minimal ConfirmationPrompt for testing.
 */
function makePrompt(overrides: Partial<ConfirmationPrompt> = {}): ConfirmationPrompt {
  return {
    suggestedPath: 'pillars/sports/discovery/market-layouts',
    suggestedFilename: 'overview.md',
    markdown: '# Overview\n\nThis is a test document.\n',
    validationErrors: [],
    pathExists: true,
    fileExists: false,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ConfirmationInterface', () => {
  let ci: ConfirmationInterface;

  afterEach(() => {
    if (ci) ci.close();
  });

  // ── Action: approve ──────────────────────────────────────────────────────

  describe('approve action', () => {
    it('returns { action: "approve" } when user types "a"', async () => {
      const input = mockInput(['a']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const response = await ci.prompt(makePrompt());

      expect(response).toEqual({ action: 'approve' });
    });

    it('handles uppercase input "A" (case-insensitive)', async () => {
      const input = mockInput(['A']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const response = await ci.prompt(makePrompt());

      expect(response).toEqual({ action: 'approve' });
    });
  });

  // ── Action: reject ───────────────────────────────────────────────────────

  describe('reject action', () => {
    it('returns { action: "reject" } when user types "r"', async () => {
      const input = mockInput(['r']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const response = await ci.prompt(makePrompt());

      expect(response).toEqual({ action: 'reject' });
    });
  });

  // ── Action: changePath ───────────────────────────────────────────────────

  describe('changePath action', () => {
    it('collects new path and filename when user types "c"', async () => {
      const input = mockInput(['c', 'pillars/sports/post-bet/cash-out', 'cash-out-overview.md']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const response = await ci.prompt(makePrompt());

      expect(response).toEqual({
        action: 'changePath',
        newPath: 'pillars/sports/post-bet/cash-out',
        newFilename: 'cash-out-overview.md',
      });
    });
  });

  // ── Action: editContent ──────────────────────────────────────────────────

  describe('editContent action', () => {
    it('collects editing instructions when user types "e"', async () => {
      const input = mockInput(['e', 'Add more detail to the overview section']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const response = await ci.prompt(makePrompt());

      expect(response).toEqual({
        action: 'editContent',
        instructions: 'Add more detail to the overview section',
      });
    });
  });

  // ── Display: validation errors ───────────────────────────────────────────

  describe('validation errors display', () => {
    it('displays validation errors when present', async () => {
      const input = mockInput(['a']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const errors = ['Missing required field: subdomain', 'Invalid status value'];
      await ci.prompt(makePrompt({ validationErrors: errors }));

      const text = output.getOutput();
      expect(text).toContain('Validation Errors');
      expect(text).toContain('Missing required field: subdomain');
      expect(text).toContain('Invalid status value');
    });
  });

  // ── Display: overwrite warning ───────────────────────────────────────────

  describe('overwrite warning', () => {
    it('displays overwrite warning when fileExists is true', async () => {
      const input = mockInput(['a']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      await ci.prompt(makePrompt({ fileExists: true }));

      const text = output.getOutput();
      expect(text).toContain('already exists');
      expect(text).toContain('overwrite');
    });
  });

  // ── Display: new directory notice ────────────────────────────────────────

  describe('new directory notice', () => {
    it('displays directory creation notice when pathExists is false', async () => {
      const input = mockInput(['a']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      await ci.prompt(makePrompt({ pathExists: false }));

      const text = output.getOutput();
      expect(text).toContain('directory does not exist');
      expect(text).toContain('will be created');
    });
  });

  // ── Document type selection ──────────────────────────────────────────────

  describe('promptDocumentType', () => {
    it('returns the correct DocumentType when user selects a number', async () => {
      // Type '4' to select "research" (1=overview, 2=principles, 3=patterns, 4=research)
      const input = mockInput(['4']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const result = await ci.promptDocumentType();

      expect(result).toBe('research');
    });

    it('returns "overview" when user selects 1', async () => {
      const input = mockInput(['1']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const result = await ci.promptDocumentType();

      expect(result).toBe('overview');
    });

    it('returns "examples" when user selects 7', async () => {
      const input = mockInput(['7']);
      const output = captureOutput();
      ci = new ConfirmationInterface({ input, output });

      const result = await ci.promptDocumentType();

      expect(result).toBe('examples');
    });
  });
});
