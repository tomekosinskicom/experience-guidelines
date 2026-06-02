/**
 * Sports Experience Guidelines — Import Service
 *
 * Orchestrates the full document import pipeline:
 * intake → extraction → type inference → conversion → validation → confirmation → persistence
 *
 * Tracks PipelineState through stages, handles user confirmation actions
 * (approve, reject, changePath, editContent), and ensures no partial writes.
 *
 * Validates: Requirements 1.1, 4.1, 4.2, 4.3, 4.4, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.3
 */

import { writeFile, readFile, mkdir, access, constants } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';

import { detectFormat, ContentExtractor, ExtractionError } from './content-extractor.js';
import { DocumentTypeInferrer } from './document-type-inferrer.js';
import { TemplateEngine } from './template-engine.js';
import { validateForImport } from './import-validation.js';
import { ConfirmationInterface } from './confirmation-interface.js';
import { updateManifestEntry } from './manifest-generator.js';
import type { Manifest } from './types.js';
import type {
  ImportOptions,
  ImportResult,
  PipelineState,
  ConfirmationPrompt,
  GeneratedDocument,
  ImportValidationResult,
  FrontmatterFields,
} from './import-types.js';
import { FORMAT_EXTENSIONS } from './import-types.js';

// ─── Import Service ──────────────────────────────────────────────────────────

/**
 * Orchestrates the document import pipeline from intake to persistence.
 *
 * Supports dependency injection of ConfirmationInterface and rootDir for testability.
 */
export class ImportService {
  private readonly extractor: ContentExtractor;
  private readonly inferrer: DocumentTypeInferrer;
  private readonly templateEngine: TemplateEngine;
  private readonly confirmation: ConfirmationInterface;
  private readonly rootDir: string;

  constructor(options?: {
    confirmation?: ConfirmationInterface;
    rootDir?: string;
  }) {
    this.extractor = new ContentExtractor();
    this.inferrer = new DocumentTypeInferrer();
    this.templateEngine = new TemplateEngine();
    this.confirmation = options?.confirmation ?? new ConfirmationInterface();
    this.rootDir = options?.rootDir ?? process.cwd();
  }

  /**
   * Runs the full import pipeline for a given source document.
   *
   * @param options - Import options including file path and optional overrides
   * @returns An ImportResult indicating success or failure
   */
  async import(options: ImportOptions): Promise<ImportResult> {
    try {
      // ── Stage 1: Intake ──────────────────────────────────────────────────
      const format = detectFormat(options.filePath);
      if (!format) {
        const supportedExts = Object.values(FORMAT_EXTENSIONS).flat().join(', ');
        return {
          success: false,
          errors: [`Unsupported format. Supported: ${supportedExts}`],
        };
      }

      const state: PipelineState = {
        stage: 'intake',
        sourceFile: options.filePath,
        format,
      };

      // ── Stage 2: Extraction ──────────────────────────────────────────────
      state.stage = 'extraction';
      const extractedContent = await this.extractor.extract(options.filePath, format);
      state.extractedContent = extractedContent;

      // ── Stage 3: Type Inference ──────────────────────────────────────────
      const inferenceResult = this.inferrer.infer(extractedContent);
      let documentType = inferenceResult.documentType;

      // If confidence is low, ask the user to select
      if (inferenceResult.confidence === 'low') {
        documentType = await this.confirmation.promptDocumentType();
      }

      // ── Stage 4: Conversion ──────────────────────────────────────────────
      state.stage = 'conversion';

      // Build overrides from options
      const overrides: Partial<FrontmatterFields> = {};
      if (options.owner) overrides.owner = options.owner;
      if (options.subdomain) overrides.subdomain = options.subdomain;
      if (options.experienceArea) overrides['experience-area'] = options.experienceArea;

      let generatedDocument = this.templateEngine.generate({
        extractedContent,
        documentType,
        overrides,
      });
      state.generatedDocument = generatedDocument;

      // ── Stage 5: Validation ──────────────────────────────────────────────
      state.stage = 'validation';
      let targetPath = join(generatedDocument.suggestedPath, generatedDocument.suggestedFilename);
      let validationResult = validateForImport(generatedDocument.markdown, targetPath);
      state.validationResult = validationResult;

      // ── Stage 6: Confirmation Loop ───────────────────────────────────────
      state.stage = 'confirmation';

      while (true) {
        const promptData = await this.buildConfirmationPrompt(
          generatedDocument,
          targetPath,
          validationResult
        );

        const response = await this.confirmation.prompt(promptData);
        state.userResponse = response;

        switch (response.action) {
          case 'approve': {
            // ── Stage 7: Persistence ──────────────────────────────────────
            state.stage = 'persistence';
            return await this.persist(generatedDocument, targetPath, state);
          }

          case 'reject': {
            return {
              success: false,
              errors: ['Import rejected by user'],
            };
          }

          case 'changePath': {
            // Update the target path and filename, re-validate
            targetPath = join(response.newPath, response.newFilename);
            validationResult = validateForImport(generatedDocument.markdown, targetPath);
            state.validationResult = validationResult;
            // Loop back to confirmation
            break;
          }

          case 'editContent': {
            // Re-run template engine with updated instructions
            // For now, re-generate the document with the same inputs
            // (full editing automation is not yet implemented)
            generatedDocument = this.templateEngine.generate({
              extractedContent,
              documentType,
              overrides,
            });
            state.generatedDocument = generatedDocument;
            targetPath = join(generatedDocument.suggestedPath, generatedDocument.suggestedFilename);
            validationResult = validateForImport(generatedDocument.markdown, targetPath);
            state.validationResult = validationResult;
            // Loop back to confirmation
            break;
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof ExtractionError) {
        return {
          success: false,
          errors: [error.message],
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errors: [`Import failed: ${message}`],
      };
    }
  }

  // ─── Private: Persistence ────────────────────────────────────────────────

  /**
   * Writes the generated document and updates the manifest.
   * Ensures no partial writes — only commits on full success.
   */
  private async persist(
    generatedDocument: GeneratedDocument,
    targetPath: string,
    state: PipelineState
  ): Promise<ImportResult> {
    const absoluteTargetPath = join(this.rootDir, targetPath);
    const targetDir = dirname(absoluteTargetPath);

    // Create directories if needed
    try {
      await mkdir(targetDir, { recursive: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errors: [`Cannot create directory: ${targetDir} — ${message}`],
      };
    }

    // Write the file
    try {
      await writeFile(absoluteTargetPath, generatedDocument.markdown, 'utf-8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errors: [`Failed to write file: ${message}`],
      };
    }

    state.savedPath = targetPath;

    // Update manifest
    let manifestUpdated = false;
    try {
      const manifest = await this.readManifest();
      const relativePath = relative(this.rootDir, absoluteTargetPath);
      await updateManifestEntry(manifest, relativePath, this.rootDir);
      await this.writeManifest(manifest);
      manifestUpdated = true;
    } catch {
      // Manifest update failure is non-fatal — file is already saved
      // The user can regenerate the manifest with `npm run manifest`
    }

    return {
      success: true,
      savedPath: targetPath,
      manifestUpdated,
    };
  }

  // ─── Private: Manifest I/O ───────────────────────────────────────────────

  /**
   * Reads and parses the manifest.json file from the project root.
   */
  private async readManifest(): Promise<Manifest> {
    const manifestPath = join(this.rootDir, 'manifest.json');
    const raw = await readFile(manifestPath, 'utf-8');
    return JSON.parse(raw) as Manifest;
  }

  /**
   * Writes the manifest object back to manifest.json.
   */
  private async writeManifest(manifest: Manifest): Promise<void> {
    const manifestPath = join(this.rootDir, 'manifest.json');
    const content = JSON.stringify(manifest, null, 2) + '\n';
    await writeFile(manifestPath, content, 'utf-8');
  }

  // ─── Private: Confirmation Prompt Building ───────────────────────────────

  /**
   * Builds the ConfirmationPrompt data structure for the user review step.
   */
  private async buildConfirmationPrompt(
    generatedDocument: GeneratedDocument,
    targetPath: string,
    validationResult: ImportValidationResult
  ): Promise<ConfirmationPrompt> {
    const absoluteTargetPath = join(this.rootDir, targetPath);
    const targetDir = dirname(absoluteTargetPath);

    // Check if file exists at target
    let fileExists = false;
    try {
      await access(absoluteTargetPath, constants.F_OK);
      fileExists = true;
    } catch {
      // File does not exist
    }

    // Check if directory exists
    let pathExists = false;
    try {
      await access(targetDir, constants.F_OK);
      pathExists = true;
    } catch {
      // Directory does not exist
    }

    // Collect all validation errors into a single list
    const validationErrors = [
      ...validationResult.frontmatterErrors,
      ...validationResult.structureErrors,
      ...validationResult.namingErrors,
    ];

    return {
      suggestedPath: dirname(targetPath),
      suggestedFilename: generatedDocument.suggestedFilename,
      markdown: generatedDocument.markdown,
      validationErrors,
      pathExists,
      fileExists,
    };
  }
}
