/**
 * Tests for the Document Validator CLI entry point.
 *
 * Validates: Requirements 9.4, 9.5, 2.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runValidation } from '../src/validate.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

let tmpDir: string;

function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'validate-test-'));
}

function writeFile(relativePath: string, content: string): void {
  const fullPath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

/** Creates a valid markdown document with all required sections and markers. */
function validDocument(overrides?: { title?: string; subdomain?: string; status?: string }): string {
  const title = overrides?.title ?? 'Test Document';
  const subdomain = overrides?.subdomain ?? 'discovery';
  const status = overrides?.status ?? 'draft';

  return `---
title: "${title}"
subdomain: ${subdomain}
experience-area: test-area
document-type: overview
owner: Test Designer
last-updated: 2025-01-15
status: ${status}
tags:
  - test-tag
summary: "A test document summary for validation purposes."
---

<!-- ai:summary -->
<!-- ai:keywords -->
<!-- ai:constraints -->
<!-- ai:relationships -->
<!-- ai:scope -->

## Overview

This is the overview section with some content.

## Principles in Context

Principles in context content here.

## Current State

Current state description goes here.

## Guidelines

Guidelines content for the document.

## Examples

Example content here.

## Research References

References listed here.

## Decision Log

Decision log entries here.

## Related Areas

Related areas content.
`;
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  tmpDir = createTmpDir();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Document Validator CLI', () => {
  describe('runValidation', () => {
    it('should return valid report for a well-formed document', () => {
      writeFile('discovery/test-area/overview.md', validDocument());

      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(report.summary.documentsChecked).toBe(1);
      expect(report.summary.documentsValid).toBe(1);
      expect(report.summary.documentsFailed).toBe(0);
    });

    it('should detect naming convention violations', () => {
      writeFile('Discovery/TestArea/Overview.md', validDocument());

      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      expect(report.valid).toBe(false);
      const namingErrors = report.errors.filter((e) => e.category === 'naming');
      expect(namingErrors.length).toBeGreaterThan(0);
    });

    it('should detect missing frontmatter fields', () => {
      const content = `---
title: "Incomplete"
---

## Overview

Some content.
`;
      writeFile('discovery/test-area/overview.md', content);

      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      expect(report.valid).toBe(false);
      const fmErrors = report.errors.filter((e) => e.category === 'frontmatter');
      expect(fmErrors.length).toBeGreaterThan(0);
    });

    it('should detect structure violations (missing required sections)', () => {
      const content = `---
title: "Test"
subdomain: discovery
experience-area: test-area
document-type: overview
owner: Test Designer
last-updated: 2025-01-15
status: draft
tags:
  - test
summary: "A summary."
---

<!-- ai:summary -->
<!-- ai:keywords -->
<!-- ai:constraints -->
<!-- ai:relationships -->
<!-- ai:scope -->

## Overview

Content here.
`;
      writeFile('discovery/test-area/overview.md', content);

      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      expect(report.valid).toBe(false);
      const structErrors = report.errors.filter((e) => e.category === 'structure');
      expect(structErrors.length).toBeGreaterThan(0);
    });

    it('should validate cross-references and detect broken links', () => {
      const docWithRef = `---
title: "Doc With Ref"
subdomain: discovery
experience-area: test-area
document-type: overview
owner: Test Designer
last-updated: 2025-01-15
status: draft
tags:
  - test
summary: "A summary."
relationships:
  depends-on:
    - "nonexistent/path.md"
---

<!-- ai:summary -->
<!-- ai:keywords -->
<!-- ai:constraints -->
<!-- ai:relationships -->
<!-- ai:scope -->

## Overview

Content here.

## Principles in Context

Content.

## Current State

Content.

## Guidelines

Content.
`;
      writeFile('discovery/test-area/overview.md', docWithRef);

      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      const refErrors = report.errors.filter((e) => e.category === 'reference');
      expect(refErrors.length).toBeGreaterThan(0);
      expect(refErrors[0].rule).toBe('broken-reference');
    });

    it('should handle empty directories gracefully', () => {
      // tmpDir is empty (no .md files)
      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      expect(report.valid).toBe(true);
      expect(report.summary.documentsChecked).toBe(0);
    });

    it('should recursively find files in nested directories', () => {
      writeFile('discovery/area-one/overview.md', validDocument());
      writeFile('transactional/area-two/overview.md', validDocument({ subdomain: 'transactional' }));

      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      expect(report.summary.documentsChecked).toBe(2);
    });

    it('should skip node_modules and .git directories', () => {
      writeFile('node_modules/some-pkg/readme.md', '# Not validated');
      writeFile('.git/objects/info.md', '# Not validated');
      writeFile('discovery/test-area/overview.md', validDocument());

      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      expect(report.summary.documentsChecked).toBe(1);
    });

    it('should produce JSON output format', () => {
      writeFile('discovery/test-area/overview.md', validDocument());

      const report = runValidation({ path: tmpDir, report: 'json', fix: false });

      // The report object should be serializable to JSON
      const json = JSON.stringify(report);
      const parsed = JSON.parse(json);
      expect(parsed.valid).toBe(true);
      expect(parsed.summary.documentsChecked).toBe(1);
    });

    it('should count failed documents correctly when multiple files have errors', () => {
      writeFile('discovery/test-area/overview.md', validDocument());
      writeFile('Bad-Name/overview.md', validDocument());
      writeFile('discovery/another/overview.md', '---\ntitle: "Incomplete"\n---\n\n## Overview\n\nContent.');

      const report = runValidation({ path: tmpDir, report: 'text', fix: false });

      expect(report.summary.documentsChecked).toBe(3);
      expect(report.summary.documentsFailed).toBeGreaterThanOrEqual(2);
    });
  });
});
