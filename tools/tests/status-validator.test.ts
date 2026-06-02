import { describe, it, expect } from 'vitest';
import {
  checkStatusTransition,
  type StatusValidationError,
} from '../src/status-validator.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeError(field: string, rule: string, message: string): StatusValidationError {
  return { field, rule, message };
}

// ─── Tests: Allowed transitions (non-guarded statuses) ───────────────────────

describe('checkStatusTransition', () => {
  describe('non-guarded statuses (draft, in-review, published, deprecated)', () => {
    const nonGuardedStatuses = ['draft', 'in-review', 'published', 'deprecated'];

    for (const status of nonGuardedStatuses) {
      it(`allows transition to "${status}" even with validation errors`, () => {
        const validationErrors = [
          makeError('overview', 'required', 'Section "overview" is missing'),
        ];
        const frontmatterErrors = [
          makeError('title', 'required', "Required field 'title' is missing"),
        ];

        const result = checkStatusTransition(status, validationErrors, frontmatterErrors);

        expect(result.allowed).toBe(true);
      });

      it(`allows transition to "${status}" with no errors`, () => {
        const result = checkStatusTransition(status, [], []);

        expect(result.allowed).toBe(true);
        expect(result.metadataComplete).toBe(true);
        expect(result.missingFields).toHaveLength(0);
        expect(result.blockingErrors).toHaveLength(0);
      });
    }
  });

  // ─── Guarded status: "validated" ─────────────────────────────────────────

  describe('guarded status: "validated"', () => {
    it('allows transition to "validated" when there are no errors', () => {
      const result = checkStatusTransition('validated', [], []);

      expect(result.allowed).toBe(true);
      expect(result.metadataComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.blockingErrors).toHaveLength(0);
    });

    it('blocks transition to "validated" when there are validation errors', () => {
      const validationErrors = [
        makeError('overview', 'required', 'Section "overview" is missing'),
      ];

      const result = checkStatusTransition('validated', validationErrors, []);

      expect(result.allowed).toBe(false);
      expect(result.blockingErrors).toHaveLength(1);
      expect(result.blockingErrors[0]).toContain('overview');
    });

    it('blocks transition to "validated" when there are frontmatter errors', () => {
      const frontmatterErrors = [
        makeError('title', 'required', "Required field 'title' is missing"),
      ];

      const result = checkStatusTransition('validated', [], frontmatterErrors);

      expect(result.allowed).toBe(false);
      expect(result.blockingErrors).toHaveLength(1);
      expect(result.blockingErrors[0]).toContain('title');
    });

    it('blocks transition to "validated" when both error types are present', () => {
      const validationErrors = [
        makeError('word-count', 'maxWords', 'Content exceeds 3000 words'),
      ];
      const frontmatterErrors = [
        makeError('status', 'enum', "Invalid status value 'archived'"),
        makeError('tags', 'minItems', 'Tags must contain at least 1 item'),
      ];

      const result = checkStatusTransition('validated', validationErrors, frontmatterErrors);

      expect(result.allowed).toBe(false);
      expect(result.blockingErrors).toHaveLength(3);
    });

    it('includes all blocking errors in the result', () => {
      const validationErrors = [
        makeError('overview', 'required', 'Section "overview" is missing'),
        makeError('guidelines', 'required', 'Section "guidelines" is missing'),
      ];
      const frontmatterErrors = [
        makeError('summary', 'maxWords', 'Summary exceeds 200 words'),
      ];

      const result = checkStatusTransition('validated', validationErrors, frontmatterErrors);

      expect(result.allowed).toBe(false);
      expect(result.blockingErrors).toHaveLength(3);
      expect(result.blockingErrors[0]).toContain('overview');
      expect(result.blockingErrors[1]).toContain('guidelines');
      expect(result.blockingErrors[2]).toContain('summary');
    });
  });

  // ─── Metadata completeness ───────────────────────────────────────────────

  describe('metadata completeness', () => {
    it('reports metadataComplete as true when no frontmatter errors', () => {
      const result = checkStatusTransition('draft', [], []);

      expect(result.metadataComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('reports metadataComplete as false when frontmatter errors exist', () => {
      const frontmatterErrors = [
        makeError('title', 'required', "Required field 'title' is missing"),
        makeError('owner', 'pattern', "Field 'owner' must be kebab-case"),
      ];

      const result = checkStatusTransition('draft', [], frontmatterErrors);

      expect(result.metadataComplete).toBe(false);
      expect(result.missingFields).toEqual(['title', 'owner']);
    });

    it('lists all missing/invalid fields from frontmatter errors', () => {
      const frontmatterErrors = [
        makeError('title', 'required', "Required field 'title' is missing"),
        makeError('subdomain', 'enum', "Invalid subdomain value"),
        makeError('tags', 'minItems', 'Tags must contain at least 1 item'),
      ];

      const result = checkStatusTransition('published', [], frontmatterErrors);

      expect(result.metadataComplete).toBe(false);
      expect(result.missingFields).toEqual(['title', 'subdomain', 'tags']);
    });

    it('metadata flag is independent of allowed status for non-guarded transitions', () => {
      const frontmatterErrors = [
        makeError('summary', 'maxWords', 'Summary exceeds 200 words'),
      ];

      const result = checkStatusTransition('in-review', [], frontmatterErrors);

      // Transition is allowed (non-guarded status)
      expect(result.allowed).toBe(true);
      // But metadata is flagged as incomplete
      expect(result.metadataComplete).toBe(false);
      expect(result.missingFields).toEqual(['summary']);
    });

    it('metadata flag is correct for guarded status with no errors', () => {
      const result = checkStatusTransition('validated', [], []);

      expect(result.allowed).toBe(true);
      expect(result.metadataComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });
  });

  // ─── Blocking error format ───────────────────────────────────────────────

  describe('blocking error format', () => {
    it('formats blocking errors with field, rule, and message', () => {
      const validationErrors = [
        makeError('overview', 'required', 'Section "overview" is missing'),
      ];

      const result = checkStatusTransition('validated', validationErrors, []);

      expect(result.blockingErrors[0]).toBe(
        '[overview] required: Section "overview" is missing'
      );
    });

    it('returns empty blockingErrors for non-guarded statuses', () => {
      const validationErrors = [
        makeError('overview', 'required', 'Section "overview" is missing'),
      ];

      const result = checkStatusTransition('draft', validationErrors, []);

      expect(result.blockingErrors).toHaveLength(0);
    });

    it('returns empty blockingErrors when validated with no errors', () => {
      const result = checkStatusTransition('validated', [], []);

      expect(result.blockingErrors).toHaveLength(0);
    });
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty arrays for both error inputs', () => {
      const result = checkStatusTransition('validated', [], []);

      expect(result.allowed).toBe(true);
      expect(result.metadataComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.blockingErrors).toHaveLength(0);
    });

    it('handles unknown target status as non-guarded (allowed)', () => {
      const result = checkStatusTransition('unknown-status', [], []);

      expect(result.allowed).toBe(true);
    });

    it('handles unknown target status with errors (still allowed)', () => {
      const validationErrors = [
        makeError('content', 'maxWords', 'Content exceeds limit'),
      ];

      const result = checkStatusTransition('some-other-status', validationErrors, []);

      expect(result.allowed).toBe(true);
      expect(result.blockingErrors).toHaveLength(0);
    });

    it('only validation errors (no frontmatter errors) still block validated', () => {
      const validationErrors = [
        makeError('ai-markers', 'count', 'Expected 5 AI markers, found 3'),
      ];

      const result = checkStatusTransition('validated', validationErrors, []);

      expect(result.allowed).toBe(false);
      expect(result.metadataComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.blockingErrors).toHaveLength(1);
    });
  });
});
