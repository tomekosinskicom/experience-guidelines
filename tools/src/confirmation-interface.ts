/**
 * Sports Experience Guidelines — Confirmation Interface
 *
 * CLI-based user review and approval flow for the document import pipeline.
 * Presents the generated document, validation status, and target path to the user
 * and collects their decision (approve, reject, change path, or edit content).
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.3
 */

import * as readline from 'node:readline/promises';
import type { ConfirmationPrompt, ConfirmationResponse } from './import-types.js';
import type { DocumentType } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum number of markdown lines shown in the preview. */
const PREVIEW_MAX_LINES = 30;

/** Available document types for user selection. */
const DOCUMENT_TYPES: DocumentType[] = [
  'overview',
  'principles',
  'patterns',
  'research',
  'decisions',
  'guidelines',
  'examples',
];

// ─── ConfirmationInterface ───────────────────────────────────────────────────

/**
 * CLI interface for user confirmation during the document import workflow.
 *
 * Supports dependency injection of the readline interface for testability.
 */
export class ConfirmationInterface {
  private rl: readline.Interface | null = null;
  private readonly input: NodeJS.ReadableStream;
  private readonly output: NodeJS.WritableStream;

  constructor(options?: { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream }) {
    this.input = options?.input ?? process.stdin;
    this.output = options?.output ?? process.stdout;
  }

  /**
   * Creates (or reuses) the readline interface for interactive prompts.
   */
  private getReadline(): readline.Interface {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: this.input,
        output: this.output,
      });
    }
    return this.rl;
  }

  /**
   * Closes the readline interface when done.
   */
  close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Displays the confirmation prompt and collects the user's decision.
   *
   * Shows:
   * - Proposed filename and directory path
   * - Truncated markdown preview
   * - Validation errors (if any)
   * - Overwrite warning (if file exists)
   * - New directory notice (if path doesn't exist)
   *
   * Returns the user's chosen action.
   */
  async prompt(data: ConfirmationPrompt): Promise<ConfirmationResponse> {
    const rl = this.getReadline();

    this.displayHeader();
    this.displayPathInfo(data);
    this.displayMarkdownPreview(data.markdown);
    this.displayValidationErrors(data.validationErrors);
    this.displayWarnings(data);
    this.displayActions();

    const response = await this.collectAction(rl);
    return response;
  }

  /**
   * Prompts the user to select a document type when inference confidence is low.
   *
   * Validates: Requirement 8.3
   */
  async promptDocumentType(): Promise<DocumentType> {
    const rl = this.getReadline();

    this.write('\n┌─────────────────────────────────────────────┐\n');
    this.write('│  Document Type Selection                    │\n');
    this.write('└─────────────────────────────────────────────┘\n\n');
    this.write('Could not confidently determine the document type.\n');
    this.write('Please select from the available types:\n\n');

    for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
      this.write(`  ${i + 1}. ${DOCUMENT_TYPES[i]}\n`);
    }

    this.write('\n');

    while (true) {
      const answer = await rl.question('Select type (1-7): ');
      const num = parseInt(answer.trim(), 10);

      if (num >= 1 && num <= DOCUMENT_TYPES.length) {
        return DOCUMENT_TYPES[num - 1];
      }

      this.write('Invalid selection. Please enter a number between 1 and 7.\n');
    }
  }

  // ─── Display Helpers ─────────────────────────────────────────────────────

  private displayHeader(): void {
    this.write('\n┌─────────────────────────────────────────────┐\n');
    this.write('│  Document Import — Review & Confirm         │\n');
    this.write('└─────────────────────────────────────────────┘\n\n');
  }

  private displayPathInfo(data: ConfirmationPrompt): void {
    this.write(`📁 Directory: ${data.suggestedPath}\n`);
    this.write(`📄 Filename:  ${data.suggestedFilename}\n\n`);
  }

  private displayMarkdownPreview(markdown: string): void {
    this.write('── Markdown Preview ──────────────────────────────────\n\n');

    const lines = markdown.split('\n');
    const previewLines = lines.slice(0, PREVIEW_MAX_LINES);

    for (const line of previewLines) {
      this.write(`  ${line}\n`);
    }

    if (lines.length > PREVIEW_MAX_LINES) {
      this.write(`\n  ... (${lines.length - PREVIEW_MAX_LINES} more lines truncated)\n`);
    }

    this.write('\n──────────────────────────────────────────────────────\n\n');
  }

  private displayValidationErrors(errors: string[]): void {
    if (errors.length === 0) return;

    this.write('⚠️  Validation Errors:\n');
    for (const error of errors) {
      this.write(`   • ${error}\n`);
    }
    this.write('\n');
  }

  private displayWarnings(data: ConfirmationPrompt): void {
    if (data.fileExists) {
      this.write('⚠  Warning: A file already exists at this location. Saving will overwrite it.\n');
    }

    if (!data.pathExists) {
      this.write('ℹ  Note: The target directory does not exist and will be created.\n');
    }

    if (data.fileExists || !data.pathExists) {
      this.write('\n');
    }
  }

  private displayActions(): void {
    this.write('Actions:\n');
    this.write('  [A] Approve — save the document\n');
    this.write('  [R] Reject — discard and cancel\n');
    this.write('  [C] Change path — specify a different location\n');
    this.write('  [E] Edit content — provide editing instructions\n\n');
  }

  // ─── Input Collection ────────────────────────────────────────────────────

  private async collectAction(rl: readline.Interface): Promise<ConfirmationResponse> {
    while (true) {
      const answer = await rl.question('Your choice (A/R/C/E): ');
      const choice = answer.trim().toLowerCase();

      switch (choice) {
        case 'a':
          return { action: 'approve' };

        case 'r':
          return { action: 'reject' };

        case 'c':
          return this.collectChangePath(rl);

        case 'e':
          return this.collectEditInstructions(rl);

        default:
          this.write('Invalid choice. Please enter A, R, C, or E.\n');
      }
    }
  }

  private async collectChangePath(rl: readline.Interface): Promise<ConfirmationResponse> {
    const newPath = await rl.question('New directory path: ');
    const newFilename = await rl.question('New filename: ');

    return {
      action: 'changePath',
      newPath: newPath.trim(),
      newFilename: newFilename.trim(),
    };
  }

  private async collectEditInstructions(rl: readline.Interface): Promise<ConfirmationResponse> {
    const instructions = await rl.question('Editing instructions: ');

    return {
      action: 'editContent',
      instructions: instructions.trim(),
    };
  }

  // ─── Output Helpers ──────────────────────────────────────────────────────

  private write(text: string): void {
    if ('write' in this.output && typeof this.output.write === 'function') {
      this.output.write(text);
    }
  }
}
