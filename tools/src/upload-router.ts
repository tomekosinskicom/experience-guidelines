/**
 * Upload Router — Browser Upload Feature
 *
 * Express Router that handles all upload API endpoints:
 * - POST /api/upload — Upload and process a file through the import pipeline
 * - POST /api/upload/regenerate — Re-generate with type/metadata overrides
 * - POST /api/upload/validate — Re-validate path/filename
 * - POST /api/upload/save — Persist document to disk
 * - DELETE /api/upload/:sessionId — Discard session and clean up
 * - GET /upload — Serve the upload UI page
 *
 * Validates: Requirements 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import express, { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, resolve, relative, join } from 'node:path';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';

import { ContentExtractor, ExtractionError } from './content-extractor.js';
import { DocumentTypeInferrer } from './document-type-inferrer.js';
import { TemplateEngine } from './template-engine.js';
import { validateForImport } from './import-validation.js';
import { SessionStore } from './upload-session.js';
import { generateManifest } from './manifest-generator.js';
import type { SupportedFormat, FrontmatterFields, ImportValidationResult } from './import-types.js';
import type { DocumentType } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** All available document types for override selection. */
const AVAILABLE_DOCUMENT_TYPES: DocumentType[] = [
  'overview', 'principles', 'patterns', 'research',
  'decisions', 'guidelines', 'examples',
];

/** Maximum upload file size: 20 MB. */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** Extension-to-format mapping. */
const EXTENSION_FORMAT_MAP: Record<string, SupportedFormat> = {
  '.pdf': 'pdf',
  '.txt': 'txt',
  '.text': 'txt',
  '.md': 'md',
  '.markdown': 'md',
};

// ─── Response Interfaces ─────────────────────────────────────────────────────

interface UploadProcessResponse {
  sessionId: string;
  markdown: string;
  suggestedPath: string;
  suggestedFilename: string;
  documentType: DocumentType;
  confidence: 'high' | 'medium' | 'low';
  availableTypes: DocumentType[];
  frontmatter: FrontmatterFields;
  validation: ImportValidationResult;
}

interface UploadErrorResponse {
  error: string;
  stage?: 'intake' | 'extraction' | 'conversion' | 'validation';
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Creates an Express Router with all upload endpoints.
 *
 * @param rootDir - Absolute path to the repository root directory
 * @returns Configured Express Router
 */
export function createUploadRouter(rootDir: string): Router {
  const router = Router();

  // JSON body parsing for non-multipart endpoints
  router.use(express.json());

  const sessionStore = new SessionStore();
  const contentExtractor = new ContentExtractor();
  const documentTypeInferrer = new DocumentTypeInferrer();
  const templateEngine = new TemplateEngine();

  // ─── Multer Configuration ──────────────────────────────────────────────

  const uploadDir = resolve(rootDir, 'tmp/uploads');
  mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename(_req, file, cb) {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
  });

  // ─── Helper: Map extension to format ───────────────────────────────────

  function getFormatFromExtension(filename: string): SupportedFormat | undefined {
    const ext = extname(filename).toLowerCase();
    return EXTENSION_FORMAT_MAP[ext];
  }

  // ─── POST /api/upload — Upload and Process ─────────────────────────────

  router.post('/api/upload', upload.single('file'), async (req, res) => {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        error: 'No file provided',
        stage: 'intake',
      } satisfies UploadErrorResponse);
      return;
    }

    // Check file extension → format mapping
    const format = getFormatFromExtension(file.originalname);
    if (!format) {
      // Clean up the uploaded file
      try { unlinkSync(file.path); } catch {}
      res.status(400).json({
        error: `Unsupported file format. Supported extensions: .pdf, .txt, .text, .md, .markdown`,
        stage: 'intake',
      } satisfies UploadErrorResponse);
      return;
    }

    // Run extraction
    let extractedContent;
    try {
      extractedContent = await contentExtractor.extract(file.path, format);
    } catch (err) {
      // Clean up the uploaded file
      try { unlinkSync(file.path); } catch {}
      const message = err instanceof ExtractionError
        ? err.message
        : (err instanceof Error ? err.message : 'Unknown extraction error');
      res.status(400).json({
        error: message,
        stage: 'extraction',
      } satisfies UploadErrorResponse);
      return;
    }

    // Run type inference
    const inferenceResult = documentTypeInferrer.infer(extractedContent);

    // Run template generation
    let generatedDocument;
    try {
      generatedDocument = templateEngine.generate({
        extractedContent,
        documentType: inferenceResult.documentType,
      });
    } catch (err) {
      // Clean up the uploaded file
      try { unlinkSync(file.path); } catch {}
      const message = err instanceof Error ? err.message : 'Unknown conversion error';
      res.status(500).json({
        error: message,
        stage: 'conversion',
      } satisfies UploadErrorResponse);
      return;
    }

    // Run validation
    let validation: ImportValidationResult;
    try {
      const targetPath = join(
        generatedDocument.suggestedPath,
        generatedDocument.suggestedFilename
      );
      validation = validateForImport(generatedDocument.markdown, targetPath);
    } catch (err) {
      // Clean up the uploaded file
      try { unlinkSync(file.path); } catch {}
      const message = err instanceof Error ? err.message : 'Unknown validation error';
      res.status(500).json({
        error: message,
        stage: 'validation',
      } satisfies UploadErrorResponse);
      return;
    }

    // Create session
    const session = sessionStore.create({
      tempFilePath: file.path,
      originalFilename: file.originalname,
      format,
      extractedContent,
      generatedDocument,
      documentType: inferenceResult.documentType,
      confidence: inferenceResult.confidence,
      overrides: {},
    });

    // Return response
    const response: UploadProcessResponse = {
      sessionId: session.id,
      markdown: generatedDocument.markdown,
      suggestedPath: generatedDocument.suggestedPath,
      suggestedFilename: generatedDocument.suggestedFilename,
      documentType: inferenceResult.documentType,
      confidence: inferenceResult.confidence,
      availableTypes: AVAILABLE_DOCUMENT_TYPES,
      frontmatter: generatedDocument.frontmatter,
      validation,
    };

    res.status(200).json(response);
  });

  // ─── POST /api/upload/regenerate — Re-generate with Overrides ──────────

  router.post('/api/upload/regenerate', (req, res) => {
    const { sessionId, documentType, overrides } = req.body;

    const session = sessionStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const newType: DocumentType = documentType ?? session.documentType;
    const newOverrides: Partial<FrontmatterFields> = {
      ...session.overrides,
    };

    if (overrides) {
      if (overrides.owner) newOverrides.owner = overrides.owner;
      if (overrides.subdomain) newOverrides.subdomain = overrides.subdomain;
      if (overrides.experienceArea) newOverrides['experience-area'] = overrides.experienceArea;
    }

    // Re-run template engine
    let generatedDocument;
    try {
      generatedDocument = templateEngine.generate({
        extractedContent: session.extractedContent,
        documentType: newType,
        overrides: newOverrides,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown conversion error';
      res.status(500).json({
        error: message,
        stage: 'conversion',
      } satisfies UploadErrorResponse);
      return;
    }

    // Re-run validation
    let validation: ImportValidationResult;
    try {
      const targetPath = join(
        generatedDocument.suggestedPath,
        generatedDocument.suggestedFilename
      );
      validation = validateForImport(generatedDocument.markdown, targetPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown validation error';
      res.status(500).json({
        error: message,
        stage: 'validation',
      } satisfies UploadErrorResponse);
      return;
    }

    // Update session
    sessionStore.update(session.id, {
      generatedDocument,
      documentType: newType,
      overrides: newOverrides,
    });

    res.status(200).json({
      markdown: generatedDocument.markdown,
      suggestedPath: generatedDocument.suggestedPath,
      suggestedFilename: generatedDocument.suggestedFilename,
      documentType: newType,
      confidence: session.confidence,
      availableTypes: AVAILABLE_DOCUMENT_TYPES,
      frontmatter: generatedDocument.frontmatter,
      validation,
    });
  });

  // ─── POST /api/upload/validate — Re-validate Path ──────────────────────

  router.post('/api/upload/validate', (req, res) => {
    const { sessionId, targetPath, filename } = req.body;

    const session = sessionStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const namingErrors: string[] = [];
    const SEGMENT_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const FILENAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/;
    const MAX_SEGMENT_LENGTH = 64;

    // Validate path segments
    if (!targetPath || targetPath.trim() === '') {
      namingErrors.push('Path is required');
    } else {
      // Check path traversal
      const resolved = resolve(rootDir, targetPath);
      const rel = relative(rootDir, resolved);
      if (rel.startsWith('..') || resolve(rootDir, rel) !== resolved) {
        namingErrors.push('Path must be within the repository root');
      } else {
        // Validate each segment
        const segments = targetPath.split('/').filter((s: string) => s.length > 0);
        for (const segment of segments) {
          if (segment.length > MAX_SEGMENT_LENGTH) {
            namingErrors.push(`Folder segment '${segment}' exceeds maximum length of ${MAX_SEGMENT_LENGTH} characters`);
          } else if (!SEGMENT_PATTERN.test(segment)) {
            namingErrors.push(`Folder segment '${segment}' must be kebab-case`);
          }
        }
      }
    }

    // Validate filename
    if (!filename || filename.trim() === '') {
      namingErrors.push('Filename is required');
    } else if (filename.length > MAX_SEGMENT_LENGTH) {
      namingErrors.push(`Filename exceeds maximum length of ${MAX_SEGMENT_LENGTH} characters`);
    } else if (!FILENAME_PATTERN.test(filename)) {
      namingErrors.push('Filename must match kebab-case pattern (e.g. my-document.md)');
    }

    const validation: ImportValidationResult = {
      valid: namingErrors.length === 0,
      frontmatterErrors: [],
      structureErrors: [],
      namingErrors,
    };

    res.status(200).json({ validation });
  });

  // ─── POST /api/upload/save — Persist Document ──────────────────────────

  router.post('/api/upload/save', async (req, res) => {
    const { sessionId, targetPath, filename } = req.body;

    const session = sessionStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Re-validate path before writing
    const resolved = resolve(rootDir, targetPath, filename);
    const rel = relative(rootDir, resolved);
    if (rel.startsWith('..') || !rel) {
      res.status(400).json({
        success: false,
        error: 'Path must be within the repository root',
      });
      return;
    }

    // Create directory and write file
    const targetDir = resolve(rootDir, targetPath);
    const fullPath = resolve(targetDir, filename);

    try {
      mkdirSync(targetDir, { recursive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: `Cannot create directory: ${message}`,
      });
      return;
    }

    try {
      writeFileSync(fullPath, session.generatedDocument.markdown, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: `Failed to write file: ${message}`,
      });
      return;
    }

    // Update manifest
    let manifestUpdated = false;
    try {
      const manifest = await generateManifest(rootDir);
      writeFileSync(
        resolve(rootDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf-8'
      );
      manifestUpdated = true;
    } catch {
      // Manifest update failed but file was saved — still success
      manifestUpdated = false;
    }

    // Clean up temp file and session
    try { unlinkSync(session.tempFilePath); } catch {}
    sessionStore.delete(session.id);

    const savedPath = relative(rootDir, fullPath);
    res.status(200).json({
      success: true,
      savedPath,
      manifestUpdated,
    });
  });

  // ─── DELETE /api/upload/:sessionId — Discard Session ───────────────────

  router.delete('/api/upload/:sessionId', (req, res) => {
    const { sessionId } = req.params;

    const session = sessionStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Clean up temp file
    try { unlinkSync(session.tempFilePath); } catch {}
    sessionStore.delete(session.id);

    res.status(200).json({ success: true });
  });

  // ─── GET /upload — Serve Upload UI ─────────────────────────────────────

  router.get('/upload', (_req, res) => {
    res.send(UPLOAD_HTML);
  });

  return router;
}

// ─── Upload UI HTML ──────────────────────────────────────────────────────────

const UPLOAD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Upload Document — Experience Design Guidelines</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f1117;color:#e1e4e8;line-height:1.6;min-height:100vh}
.app{display:flex;flex-direction:column;min-height:100vh}
.header{padding:16px 24px;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:16px}
.header h1{font-size:20px;color:#fff}
.header .subtitle{color:#8b949e;font-size:13px}
.header nav{margin-left:auto;display:flex;gap:8px}
.btn{padding:8px 16px;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.btn-secondary{background:#21262d;color:#c9d1d9;border:1px solid #30363d}
.btn-secondary:hover{background:#30363d}
.btn-primary{background:#238636;color:#fff}
.btn-primary:hover{background:#2ea043}
.main-content{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 24px}
.upload-container{width:100%;max-width:600px}
.upload-title{font-size:24px;color:#fff;margin-bottom:8px;text-align:center}
.upload-subtitle{font-size:14px;color:#8b949e;margin-bottom:32px;text-align:center}

/* Drop Zone */
.drop-zone{border:2px dashed #30363d;border-radius:12px;padding:48px 32px;text-align:center;cursor:pointer;transition:all 0.2s;background:#161b22}
.drop-zone:hover{border-color:#58a6ff;background:#1c2128}
.drop-zone.dragover{border-color:#58a6ff;background:#1f6feb22;border-style:solid}
.drop-zone-icon{font-size:48px;margin-bottom:16px;opacity:0.6}
.drop-zone-text{font-size:15px;color:#c9d1d9;margin-bottom:8px}
.drop-zone-hint{font-size:12px;color:#8b949e}
.drop-zone-formats{font-size:11px;color:#8b949e;margin-top:12px;padding-top:12px;border-top:1px solid #30363d}
.file-input{display:none}
.choose-btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#238636;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s}
.choose-btn:hover{background:#2ea043}

/* Error Message */
.error-message{margin-top:16px;padding:12px 16px;background:#2d1117;border:1px solid #da3633;border-radius:8px;color:#f85149;font-size:13px;display:none;text-align:left}
.error-message.visible{display:block}

/* Progress Indicator */
.progress-area{margin-top:24px;display:none;text-align:center}
.progress-area.visible{display:block}
.progress-spinner{width:32px;height:32px;border:3px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px}
@keyframes spin{to{transform:rotate(360deg)}}
.progress-text{font-size:13px;color:#8b949e}

/* Preview Container */
.preview-container{display:none;width:100%;max-width:1200px}
.preview-container.visible{display:block}
.preview-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.preview-header h2{font-size:20px;color:#fff}
.preview-layout{display:grid;grid-template-columns:1fr 360px;gap:24px}
@media(max-width:900px){.preview-layout{grid-template-columns:1fr}}

/* Left Column — Document Preview */
.preview-left{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:24px;overflow-y:auto;max-height:70vh}
.frontmatter-section{margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #30363d}
.frontmatter-section h3{font-size:13px;text-transform:uppercase;color:#8b949e;margin-bottom:12px;letter-spacing:0.5px}
.fm-field{display:flex;gap:8px;margin-bottom:8px;font-size:13px}
.fm-field .fm-key{color:#79c0ff;font-weight:500;min-width:120px;flex-shrink:0}
.fm-field .fm-value{color:#c9d1d9;word-break:break-word}
.markdown-body{color:#c9d1d9;font-size:14px;line-height:1.7}
.markdown-body h1{font-size:22px;color:#fff;margin:20px 0 12px;padding-bottom:8px;border-bottom:1px solid #30363d}
.markdown-body h2{font-size:18px;color:#fff;margin:18px 0 10px}
.markdown-body h3{font-size:15px;color:#fff;margin:16px 0 8px}
.markdown-body h4,.markdown-body h5,.markdown-body h6{font-size:14px;color:#e1e4e8;margin:14px 0 6px}
.markdown-body p{margin:8px 0}
.markdown-body ul,.markdown-body ol{margin:8px 0;padding-left:24px}
.markdown-body li{margin:4px 0}
.markdown-body table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
.markdown-body th,.markdown-body td{border:1px solid #30363d;padding:8px 12px;text-align:left}
.markdown-body th{background:#21262d;color:#e1e4e8;font-weight:600}
.markdown-body code{background:#21262d;padding:2px 6px;border-radius:4px;font-size:12px;color:#79c0ff}
.markdown-body blockquote{border-left:3px solid #30363d;padding-left:12px;margin:8px 0;color:#8b949e}
.empty-content-msg{color:#8b949e;font-style:italic;padding:24px;text-align:center}

/* Right Column — Controls */
.preview-right{display:flex;flex-direction:column;gap:16px}
.control-section{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px}
.control-section h4{font-size:12px;text-transform:uppercase;color:#8b949e;margin-bottom:12px;letter-spacing:0.5px}
.form-group{margin-bottom:12px}
.form-group:last-child{margin-bottom:0}
.form-group label{display:block;font-size:12px;color:#8b949e;margin-bottom:4px}
.form-group input,.form-group select{width:100%;padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;font-size:13px;outline:none;transition:border-color 0.15s}
.form-group input:focus,.form-group select:focus{border-color:#58a6ff}
.form-group input.has-error,.form-group select.has-error{border-color:#da3633}
.char-count{font-size:11px;color:#8b949e;text-align:right;margin-top:2px}
.char-count.over{color:#f85149}

/* Confidence Indicator */
.confidence-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:500}
.confidence-badge .dot{width:8px;height:8px;border-radius:50%}
.confidence-high{background:#23863622;color:#3fb950}
.confidence-high .dot{background:#3fb950}
.confidence-medium{background:#9e6a0322;color:#d29922}
.confidence-medium .dot{background:#d29922}
.confidence-low{background:#da363322;color:#f85149}
.confidence-low .dot{background:#f85149}

/* Validation Errors */
.validation-section{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px}
.validation-header{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.validation-header h4{font-size:12px;text-transform:uppercase;color:#8b949e;letter-spacing:0.5px;margin:0}
.error-badge{background:#da3633;color:#fff;font-size:11px;font-weight:600;padding:2px 7px;border-radius:10px;min-width:20px;text-align:center}
.error-badge.hidden{display:none}
.validation-group{margin-bottom:12px}
.validation-group:last-child{margin-bottom:0}
.validation-group-title{font-size:12px;color:#8b949e;margin-bottom:6px;font-weight:500}
.validation-error-item{font-size:12px;color:#f85149;padding:4px 0;padding-left:12px;border-left:2px solid #da363366}
.no-errors-msg{color:#3fb950;font-size:12px;font-style:italic}

/* Action Buttons */
.action-buttons{display:flex;gap:8px;margin-top:8px}
.btn-save{background:#238636;color:#fff;flex:1;justify-content:center}
.btn-save:hover:not(:disabled){background:#2ea043}
.btn-save:disabled{opacity:0.5;cursor:not-allowed}
.btn-discard{background:#21262d;color:#c9d1d9;border:1px solid #30363d;flex:1;justify-content:center}
.btn-discard:hover{background:#30363d}

/* Success State */
.success-container{display:none;width:100%;max-width:600px;text-align:center}
.success-container.visible{display:block}
.success-icon{font-size:56px;margin-bottom:16px;color:#3fb950}
.success-title{font-size:22px;color:#fff;margin-bottom:8px}
.success-path{font-size:14px;color:#8b949e;margin-bottom:8px;word-break:break-all}
.success-path code{background:#21262d;padding:4px 10px;border-radius:6px;font-size:13px;color:#79c0ff}
.success-manifest{font-size:12px;color:#8b949e;margin-bottom:24px}
.btn-upload-another{background:#238636;color:#fff;padding:10px 24px;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;transition:background 0.15s}
.btn-upload-another:hover{background:#2ea043}

/* Save in-progress indicator */
.btn-save.saving{opacity:0.7;cursor:wait}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <h1>Experience Design Guidelines</h1>
    <span class="subtitle">Document Upload</span>
    <nav>
      <a href="/" class="btn btn-secondary">\u2190 Dashboard</a>
    </nav>
  </div>
  <div class="main-content">
    <div class="upload-container" id="upload-container">
      <h2 class="upload-title">Upload a Document</h2>
      <p class="upload-subtitle">Import a source document into the guidelines framework</p>

      <div class="drop-zone" id="drop-zone">
        <div class="drop-zone-icon">\ud83d\udcc4</div>
        <div class="drop-zone-text">Drag and drop your file here</div>
        <div class="drop-zone-hint">or</div>
        <button type="button" class="choose-btn" id="choose-btn">Choose File</button>
        <input type="file" class="file-input" id="file-input" accept=".pdf,.txt,.text,.md,.markdown">
        <div class="drop-zone-formats">Supported formats: .pdf, .txt, .text, .md, .markdown &middot; Max 20 MB</div>
      </div>

      <div class="error-message" id="error-message"></div>

      <div class="progress-area" id="progress-area">
        <div class="progress-spinner"></div>
        <div class="progress-text" id="progress-text">Uploading file\u2026</div>
      </div>
    </div>

    <div class="success-container" id="success-container">
      <div class="success-icon">&#10003;</div>
      <h2 class="success-title">Document Saved Successfully</h2>
      <p class="success-path">Saved to: <code id="saved-path-display"></code></p>
      <p class="success-manifest" id="manifest-status"></p>
      <button type="button" class="btn-upload-another" id="btn-upload-another">Upload Another Document</button>
    </div>

    <div class="preview-container" id="preview-container">
      <div class="preview-header">
        <h2>Document Preview</h2>
      </div>
      <div class="preview-layout">
        <!-- Left Column: Document Preview -->
        <div class="preview-left">
          <div class="frontmatter-section" id="frontmatter-section">
            <h3>Frontmatter</h3>
            <div id="frontmatter-fields"></div>
          </div>
          <div class="markdown-body" id="markdown-body"></div>
        </div>

        <!-- Right Column: Controls -->
        <div class="preview-right">
          <!-- Document Type & Confidence -->
          <div class="control-section">
            <h4>Document Type</h4>
            <div class="form-group">
              <label for="doc-type-select">Type</label>
              <select id="doc-type-select">
                <option value="overview">Overview</option>
                <option value="principles">Principles</option>
                <option value="patterns">Patterns</option>
                <option value="research">Research</option>
                <option value="decisions">Decisions</option>
                <option value="guidelines">Guidelines</option>
                <option value="examples">Examples</option>
              </select>
            </div>
            <div class="form-group">
              <label>Confidence</label>
              <div id="confidence-indicator"></div>
            </div>
          </div>

          <!-- Metadata Fields -->
          <div class="control-section">
            <h4>Metadata</h4>
            <div class="form-group">
              <label for="meta-owner">Owner</label>
              <input type="text" id="meta-owner" maxlength="100" placeholder="Document owner">
              <div class="char-count" id="meta-owner-count">0/100</div>
            </div>
            <div class="form-group">
              <label for="meta-subdomain">Subdomain</label>
              <input type="text" id="meta-subdomain" maxlength="100" placeholder="Subdomain">
              <div class="char-count" id="meta-subdomain-count">0/100</div>
            </div>
            <div class="form-group">
              <label for="meta-experience-area">Experience Area</label>
              <input type="text" id="meta-experience-area" maxlength="100" placeholder="Experience area">
              <div class="char-count" id="meta-experience-area-count">0/100</div>
            </div>
          </div>

          <!-- Target Path -->
          <div class="control-section">
            <h4>Target Location</h4>
            <div class="form-group">
              <label for="target-path">Path</label>
              <input type="text" id="target-path" maxlength="256" placeholder="pillars/sports/discovery">
              <div class="char-count" id="target-path-count">0/256</div>
            </div>
            <div class="form-group">
              <label for="target-filename">Filename</label>
              <input type="text" id="target-filename" maxlength="256" placeholder="overview.md">
              <div class="char-count" id="target-filename-count">0/256</div>
            </div>
          </div>

          <!-- Validation Errors -->
          <div class="validation-section" id="validation-section">
            <div class="validation-header">
              <h4>Validation</h4>
              <span class="error-badge hidden" id="error-badge">0</span>
            </div>
            <div id="validation-content"></div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button type="button" class="btn btn-save" id="btn-save" disabled>Save Document</button>
            <button type="button" class="btn btn-discard" id="btn-discard">Discard</button>
          </div>
          <div class="error-message" id="save-error-message"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const chooseBtn = document.getElementById('choose-btn');
  const errorMessage = document.getElementById('error-message');
  const progressArea = document.getElementById('progress-area');
  const progressText = document.getElementById('progress-text');
  const uploadContainer = document.getElementById('upload-container');
  const previewContainer = document.getElementById('preview-container');

  // ─── Constants ──────────────────────────────────────────────────────
  const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.text', '.md', '.markdown'];
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  // ─── Error Display ──────────────────────────────────────────────────
  function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.add('visible');
  }

  function hideError() {
    errorMessage.textContent = '';
    errorMessage.classList.remove('visible');
  }

  // ─── Progress Display ───────────────────────────────────────────────
  function showProgress(msg) {
    progressText.textContent = msg;
    progressArea.classList.add('visible');
  }

  function hideProgress() {
    progressArea.classList.remove('visible');
  }

  // ─── Client-Side Validation ─────────────────────────────────────────
  function validateFile(file) {
    // Check file size — reject 0-byte files
    if (file.size === 0) {
      return 'The selected file is empty (0 bytes). Please choose a non-empty file.';
    }

    // Check file size — reject files exceeding 20 MB
    if (file.size > MAX_FILE_SIZE) {
      return 'File exceeds the maximum size of 20 MB. Please choose a smaller file.';
    }

    // Check extension
    const name = file.name.toLowerCase();
    const dotIndex = name.lastIndexOf('.');
    const ext = dotIndex >= 0 ? name.slice(dotIndex) : '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Unsupported file format. Supported extensions: .pdf, .txt, .text, .md, .markdown';
    }

    return null;
  }

  // ─── Simple Markdown-to-HTML Converter ──────────────────────────────
  function markdownToHtml(md) {
    if (!md || md.trim() === '') return '';

    var lines = md.split('\\n');
    var html = '';
    var inList = false;
    var listType = '';
    var inTable = false;
    var tableRows = [];

    function closeList() {
      if (inList) {
        html += '</' + listType + '>';
        inList = false;
        listType = '';
      }
    }

    function closeTable() {
      if (inTable && tableRows.length > 0) {
        html += '<table>';
        for (var i = 0; i < tableRows.length; i++) {
          var row = tableRows[i];
          var tag = i === 0 ? 'th' : 'td';
          html += '<tr>';
          for (var j = 0; j < row.length; j++) {
            html += '<' + tag + '>' + inlineFormat(row[j].trim()) + '</' + tag + '>';
          }
          html += '</tr>';
        }
        html += '</table>';
        tableRows = [];
        inTable = false;
      }
    }

    function inlineFormat(text) {
      // Bold: **text**
      text = text.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
      // Italic: *text*
      text = text.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
      // Inline code: \`text\`
      text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      return text;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Table row (starts with |)
      if (line.trim().match(/^\\|(.+)\\|\\s*$/)) {
        closeList();
        // Skip separator rows (|---|---|)
        if (line.trim().match(/^\\|[\\s\\-:|]+\\|\\s*$/)) continue;
        var cells = line.trim().slice(1, -1).split('|');
        if (!inTable) inTable = true;
        tableRows.push(cells);
        continue;
      } else {
        closeTable();
      }

      // Headings
      var headingMatch = line.match(/^(#{1,6})\\s+(.+)/);
      if (headingMatch) {
        closeList();
        var level = headingMatch[1].length;
        html += '<h' + level + '>' + inlineFormat(headingMatch[2]) + '</h' + level + '>';
        continue;
      }

      // Unordered list
      if (line.match(/^\\s*[-*]\\s+(.+)/)) {
        if (!inList || listType !== 'ul') {
          closeList();
          html += '<ul>';
          inList = true;
          listType = 'ul';
        }
        var content = line.replace(/^\\s*[-*]\\s+/, '');
        html += '<li>' + inlineFormat(content) + '</li>';
        continue;
      }

      // Ordered list
      if (line.match(/^\\s*\\d+\\.\\s+(.+)/)) {
        if (!inList || listType !== 'ol') {
          closeList();
          html += '<ol>';
          inList = true;
          listType = 'ol';
        }
        var content = line.replace(/^\\s*\\d+\\.\\s+/, '');
        html += '<li>' + inlineFormat(content) + '</li>';
        continue;
      }

      // Blockquote
      if (line.match(/^>\\s?(.*)/)) {
        closeList();
        var bqContent = line.replace(/^>\\s?/, '');
        html += '<blockquote>' + inlineFormat(bqContent) + '</blockquote>';
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        closeList();
        continue;
      }

      // Paragraph
      closeList();
      html += '<p>' + inlineFormat(line) + '</p>';
    }

    closeList();
    closeTable();
    return html;
  }

  // ─── Frontmatter Parser ─────────────────────────────────────────────
  function parseFrontmatter(markdown) {
    var fm = {};
    var body = markdown;
    if (markdown.startsWith('---')) {
      var endIdx = markdown.indexOf('---', 3);
      if (endIdx > 0) {
        var fmBlock = markdown.slice(3, endIdx).trim();
        body = markdown.slice(endIdx + 3).trim();
        var fmLines = fmBlock.split('\\n');
        for (var i = 0; i < fmLines.length; i++) {
          var colonIdx = fmLines[i].indexOf(':');
          if (colonIdx > 0) {
            var key = fmLines[i].slice(0, colonIdx).trim();
            var val = fmLines[i].slice(colonIdx + 1).trim();
            fm[key] = val;
          }
        }
      }
    }
    return { frontmatter: fm, body: body };
  }

  // ─── Render Frontmatter ─────────────────────────────────────────────
  function renderFrontmatter(frontmatter) {
    var container = document.getElementById('frontmatter-fields');
    container.innerHTML = '';
    var keys = Object.keys(frontmatter);
    if (keys.length === 0) {
      container.innerHTML = '<div class="empty-content-msg">No frontmatter fields</div>';
      return;
    }
    for (var i = 0; i < keys.length; i++) {
      var div = document.createElement('div');
      div.className = 'fm-field';
      div.innerHTML = '<span class="fm-key">' + escapeHtml(keys[i]) + '</span><span class="fm-value">' + escapeHtml(String(frontmatter[keys[i]])) + '</span>';
      container.appendChild(div);
    }
  }

  // ─── Render Markdown Body ───────────────────────────────────────────
  function renderMarkdownBody(markdown) {
    var container = document.getElementById('markdown-body');
    var parsed = parseFrontmatter(markdown);
    var body = parsed.body;
    if (!body || body.trim() === '') {
      container.innerHTML = '<div class="empty-content-msg">No content was extracted from the source document.</div>';
      return;
    }
    container.innerHTML = markdownToHtml(body);
  }

  // ─── Render Confidence ──────────────────────────────────────────────
  function renderConfidence(confidence) {
    var container = document.getElementById('confidence-indicator');
    var cls = 'confidence-' + confidence;
    var label = confidence.charAt(0).toUpperCase() + confidence.slice(1);
    container.innerHTML = '<span class="confidence-badge ' + cls + '"><span class="dot"></span>' + label + '</span>';
  }

  // ─── Render Validation Errors ───────────────────────────────────────
  function renderValidation(validation) {
    var container = document.getElementById('validation-content');
    var badge = document.getElementById('error-badge');
    var saveBtn = document.getElementById('btn-save');
    container.innerHTML = '';

    var totalErrors = 0;
    var groups = [
      { title: 'Frontmatter', errors: validation.frontmatterErrors || [] },
      { title: 'Structure', errors: validation.structureErrors || [] },
      { title: 'Naming', errors: validation.namingErrors || [] }
    ];

    for (var g = 0; g < groups.length; g++) {
      totalErrors += groups[g].errors.length;
    }

    if (totalErrors === 0) {
      container.innerHTML = '<div class="no-errors-msg">\\u2713 All checks passed</div>';
      badge.classList.add('hidden');
      saveBtn.disabled = false;
    } else {
      badge.textContent = totalErrors;
      badge.classList.remove('hidden');
      saveBtn.disabled = true;

      for (var g = 0; g < groups.length; g++) {
        if (groups[g].errors.length === 0) continue;
        var groupDiv = document.createElement('div');
        groupDiv.className = 'validation-group';
        groupDiv.innerHTML = '<div class="validation-group-title">' + groups[g].title + ' (' + groups[g].errors.length + ')</div>';
        for (var e = 0; e < groups[g].errors.length; e++) {
          var errDiv = document.createElement('div');
          errDiv.className = 'validation-error-item';
          errDiv.textContent = groups[g].errors[e];
          groupDiv.appendChild(errDiv);
        }
        container.appendChild(groupDiv);
      }
    }
  }

  // ─── Escape HTML ────────────────────────────────────────────────────
  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── Char Count Helper ──────────────────────────────────────────────
  function setupCharCount(inputId, countId, max) {
    var input = document.getElementById(inputId);
    var count = document.getElementById(countId);
    function update() {
      var len = input.value.length;
      count.textContent = len + '/' + max;
      count.classList.toggle('over', len > max);
    }
    input.addEventListener('input', update);
    update();
  }

  // ─── Populate Preview Panel ─────────────────────────────────────────
  function populatePreview(data) {
    // Render frontmatter — use response frontmatter object if available, else parse from markdown
    var fm = data.frontmatter;
    if (!fm || Object.keys(fm).length === 0) {
      var parsed = parseFrontmatter(data.markdown);
      fm = parsed.frontmatter;
    }
    renderFrontmatter(fm);

    // Render markdown body
    renderMarkdownBody(data.markdown);

    // Set document type
    var docTypeSelect = document.getElementById('doc-type-select');
    docTypeSelect.value = data.documentType || 'overview';

    // Render confidence
    renderConfidence(data.confidence || 'medium');

    // Populate metadata fields
    var owner = (data.frontmatter && data.frontmatter.owner) || '';
    var subdomain = (data.frontmatter && data.frontmatter.subdomain) || '';
    var experienceArea = (data.frontmatter && (data.frontmatter['experience-area'] || data.frontmatter.experienceArea)) || '';
    document.getElementById('meta-owner').value = owner;
    document.getElementById('meta-subdomain').value = subdomain;
    document.getElementById('meta-experience-area').value = experienceArea;

    // Populate path/filename
    document.getElementById('target-path').value = data.suggestedPath || '';
    document.getElementById('target-filename').value = data.suggestedFilename || '';

    // Setup char counts
    setupCharCount('meta-owner', 'meta-owner-count', 100);
    setupCharCount('meta-subdomain', 'meta-subdomain-count', 100);
    setupCharCount('meta-experience-area', 'meta-experience-area-count', 100);
    setupCharCount('target-path', 'target-path-count', 256);
    setupCharCount('target-filename', 'target-filename-count', 256);

    // Render validation
    renderValidation(data.validation || { valid: true, frontmatterErrors: [], structureErrors: [], namingErrors: [] });
  }

  // ─── Upload File ────────────────────────────────────────────────────
  function uploadFile(file) {
    hideError();
    showProgress('Uploading file\u2026');

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.addEventListener('progress', function(e) {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (pct < 100) {
          progressText.textContent = 'Uploading file\u2026 ' + pct + '%';
        } else {
          progressText.textContent = 'Processing document\u2026';
        }
      }
    });

    xhr.addEventListener('load', function() {
      hideProgress();
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        handleUploadSuccess(data);
      } else {
        let errMsg = 'Upload failed.';
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData.error) errMsg = errData.error;
          if (errData.stage) errMsg += ' (stage: ' + errData.stage + ')';
        } catch {}
        showError(errMsg);
      }
    });

    xhr.addEventListener('error', function() {
      hideProgress();
      showError('Network error. Please check your connection and try again.');
    });

    xhr.send(formData);
  }

  function handleUploadSuccess(data) {
    // Store session data
    window.__uploadSession = data;

    // Hide upload container, show preview
    uploadContainer.style.display = 'none';
    previewContainer.classList.add('visible');

    // Populate the preview panel
    populatePreview(data);
  }

  // ─── File Picker ────────────────────────────────────────────────────
  chooseBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', function() {
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const error = validateFile(file);
      if (error) {
        showError(error);
      } else {
        uploadFile(file);
      }
      // Reset so the same file can be selected again
      fileInput.value = '';
    }
  });

  // ─── Drag and Drop ──────────────────────────────────────────────────
  dropZone.addEventListener('click', function() {
    fileInput.click();
  });

  dropZone.addEventListener('dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    hideError();

    const files = e.dataTransfer.files;

    // Reject multi-file drops
    if (files.length > 1) {
      showError('Only one file may be uploaded at a time. Please drop a single file.');
      return;
    }

    if (files.length === 0) return;

    const file = files[0];
    const error = validateFile(file);
    if (error) {
      showError(error);
    } else {
      uploadFile(file);
    }
  });

  // Prevent default browser behavior for drag events on the whole page
  document.addEventListener('dragover', function(e) { e.preventDefault(); });
  document.addEventListener('drop', function(e) { e.preventDefault(); });

  // ─── Save Button ────────────────────────────────────────────────────
  var saveBtn = document.getElementById('btn-save');
  var successContainer = document.getElementById('success-container');
  var saveErrorMsg = document.getElementById('save-error-message');

  function showSaveError(msg) {
    saveErrorMsg.textContent = msg;
    saveErrorMsg.classList.add('visible');
  }

  function hideSaveError() {
    saveErrorMsg.textContent = '';
    saveErrorMsg.classList.remove('visible');
  }

  saveBtn.addEventListener('click', function() {
    if (saveBtn.disabled) return;
    var session = window.__uploadSession;
    if (!session || !session.sessionId) return;

    var targetPath = document.getElementById('target-path').value.trim();
    var filename = document.getElementById('target-filename').value.trim();

    // Disable save button during request
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving\u2026';
    saveBtn.classList.add('saving');
    hideSaveError();

    fetch('/api/upload/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId, targetPath: targetPath, filename: filename })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      saveBtn.classList.remove('saving');
      saveBtn.textContent = 'Save Document';
      if (data.success) {
        // Show success state
        previewContainer.classList.remove('visible');
        successContainer.classList.add('visible');
        document.getElementById('saved-path-display').textContent = data.savedPath;
        var manifestMsg = data.manifestUpdated ? 'Manifest updated.' : 'File saved (manifest update skipped).';
        document.getElementById('manifest-status').textContent = manifestMsg;
        window.__uploadSession = null;
      } else {
        // Show error, keep Save enabled for retry
        showSaveError(data.error || 'Save failed. Please try again.');
        saveBtn.disabled = false;
      }
    })
    .catch(function(err) {
      saveBtn.classList.remove('saving');
      saveBtn.textContent = 'Save Document';
      showSaveError('Network error during save. Please try again.');
      saveBtn.disabled = false;
    });
  });

  // ─── Discard Button ─────────────────────────────────────────────────
  var discardBtn = document.getElementById('btn-discard');

  discardBtn.addEventListener('click', function() {
    var session = window.__uploadSession;
    if (session && session.sessionId) {
      fetch('/api/upload/' + encodeURIComponent(session.sessionId), {
        method: 'DELETE'
      }).catch(function() { /* ignore cleanup errors */ });
    }

    // Reset to initial upload state
    window.__uploadSession = null;
    previewContainer.classList.remove('visible');
    uploadContainer.style.display = '';
    hideError();
    hideProgress();
    document.getElementById('frontmatter-fields').innerHTML = '';
    document.getElementById('markdown-body').innerHTML = '';
  });

  // ─── Upload Another Button ──────────────────────────────────────────
  document.getElementById('btn-upload-another').addEventListener('click', function() {
    successContainer.classList.remove('visible');
    uploadContainer.style.display = '';
    hideError();
    hideProgress();
    document.getElementById('frontmatter-fields').innerHTML = '';
    document.getElementById('markdown-body').innerHTML = '';
  });

  // ─── Path/Filename Blur → Re-validate ───────────────────────────────
  function revalidatePath() {
    var session = window.__uploadSession;
    if (!session || !session.sessionId) return;

    var targetPath = document.getElementById('target-path').value.trim();
    var filename = document.getElementById('target-filename').value.trim();

    fetch('/api/upload/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId, targetPath: targetPath, filename: filename })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      if (data.validation) {
        // Merge naming errors with existing frontmatter/structure errors from session
        var currentValidation = session.validation || { frontmatterErrors: [], structureErrors: [], namingErrors: [] };
        var merged = {
          valid: (currentValidation.frontmatterErrors.length === 0 && currentValidation.structureErrors.length === 0 && data.validation.namingErrors.length === 0),
          frontmatterErrors: currentValidation.frontmatterErrors || [],
          structureErrors: currentValidation.structureErrors || [],
          namingErrors: data.validation.namingErrors || []
        };
        renderValidation(merged);
        // Update session validation
        session.validation = merged;
      }
    })
    .catch(function() { /* silently ignore network errors during re-validation */ });
  }

  document.getElementById('target-path').addEventListener('blur', revalidatePath);
  document.getElementById('target-filename').addEventListener('blur', revalidatePath);

  // ─── Document Type Change → Regenerate ──────────────────────────────
  document.getElementById('doc-type-select').addEventListener('change', function() {
    var session = window.__uploadSession;
    if (!session || !session.sessionId) return;

    var newType = document.getElementById('doc-type-select').value;

    fetch('/api/upload/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId, documentType: newType })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      if (data.error) return; // ignore errors silently
      // Update session
      window.__uploadSession.markdown = data.markdown;
      window.__uploadSession.documentType = data.documentType;
      window.__uploadSession.frontmatter = data.frontmatter;
      window.__uploadSession.validation = data.validation;
      window.__uploadSession.suggestedPath = data.suggestedPath;
      window.__uploadSession.suggestedFilename = data.suggestedFilename;
      // Re-render preview
      renderFrontmatter(data.frontmatter);
      renderMarkdownBody(data.markdown);
      renderConfidence(data.confidence);
      renderValidation(data.validation);
      // Update path/filename from regenerated response
      document.getElementById('target-path').value = data.suggestedPath || '';
      document.getElementById('target-filename').value = data.suggestedFilename || '';
    })
    .catch(function() { /* silently ignore */ });
  });

  // ─── Metadata Field Change → Regenerate ─────────────────────────────
  function regenerateWithMetadata() {
    var session = window.__uploadSession;
    if (!session || !session.sessionId) return;

    var owner = document.getElementById('meta-owner').value.trim();
    var subdomain = document.getElementById('meta-subdomain').value.trim();
    var experienceArea = document.getElementById('meta-experience-area').value.trim();

    fetch('/api/upload/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        overrides: { owner: owner, subdomain: subdomain, experienceArea: experienceArea }
      })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      if (data.error) return;
      // Update session
      window.__uploadSession.markdown = data.markdown;
      window.__uploadSession.frontmatter = data.frontmatter;
      window.__uploadSession.validation = data.validation;
      window.__uploadSession.suggestedPath = data.suggestedPath;
      window.__uploadSession.suggestedFilename = data.suggestedFilename;
      // Re-render preview
      renderFrontmatter(data.frontmatter);
      renderMarkdownBody(data.markdown);
      renderValidation(data.validation);
      // Update path/filename from regenerated response
      document.getElementById('target-path').value = data.suggestedPath || '';
      document.getElementById('target-filename').value = data.suggestedFilename || '';
    })
    .catch(function() { /* silently ignore */ });
  }

  document.getElementById('meta-owner').addEventListener('blur', regenerateWithMetadata);
  document.getElementById('meta-subdomain').addEventListener('blur', regenerateWithMetadata);
  document.getElementById('meta-experience-area').addEventListener('blur', regenerateWithMetadata);

})();
</script>
</body>
</html>`;

