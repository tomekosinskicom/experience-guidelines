/**
 * Upload Session Store — Browser Upload Feature
 *
 * Manages server-side state between API calls within a single upload flow.
 * Sessions are stored in-memory and cleaned up on expiry or explicit deletion.
 *
 * Validates: Requirements 2.1, 2.5
 */

import { randomUUID } from 'node:crypto';

import type { SupportedFormat, ExtractedContent, GeneratedDocument, FrontmatterFields } from './import-types.js';
import type { DocumentType } from './types.js';

// ─── Upload Session Interface ────────────────────────────────────────────────

/** Represents a single upload session with cached pipeline state. */
export interface UploadSession {
  id: string;
  tempFilePath: string;
  originalFilename: string;
  format: SupportedFormat;
  extractedContent: ExtractedContent;
  generatedDocument: GeneratedDocument;
  documentType: DocumentType;
  confidence: 'high' | 'medium' | 'low';
  overrides: Partial<FrontmatterFields>;
  createdAt: Date;
}

// ─── Session Store ───────────────────────────────────────────────────────────

/** Default max session age: 1 hour. */
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * In-memory store for upload sessions.
 *
 * Provides CRUD operations and a cleanup method that removes sessions
 * older than a configurable threshold.
 */
export class SessionStore {
  private sessions: Map<string, UploadSession> = new Map();

  /**
   * Creates a new session with a generated UUID and current timestamp.
   */
  create(data: Omit<UploadSession, 'id' | 'createdAt'>): UploadSession {
    const session: UploadSession = {
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Retrieves a session by ID. Returns undefined if not found.
   */
  get(id: string): UploadSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Patches an existing session with partial data.
   * Throws if session does not exist.
   */
  update(id: string, patch: Partial<UploadSession>): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    Object.assign(session, patch);
  }

  /**
   * Removes a session from the store.
   */
  delete(id: string): void {
    this.sessions.delete(id);
  }

  /**
   * Removes sessions older than the given threshold.
   * Defaults to 1 hour if no maxAgeMs is provided.
   */
  cleanup(maxAgeMs: number = DEFAULT_MAX_AGE_MS): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt.getTime() > maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }
}
