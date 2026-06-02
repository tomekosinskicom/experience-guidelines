import { describe, it, expect } from 'vitest';
import { validateName } from '../src/naming-validator.js';

describe('validateName', () => {
  describe('folder names', () => {
    it('accepts valid kebab-case folder names', () => {
      expect(validateName('live-betting', false)).toEqual({ valid: true, errors: [] });
      expect(validateName('post-bet', false)).toEqual({ valid: true, errors: [] });
      expect(validateName('discovery', false)).toEqual({ valid: true, errors: [] });
      expect(validateName('cross-cutting-areas', false)).toEqual({ valid: true, errors: [] });
      expect(validateName('a', false)).toEqual({ valid: true, errors: [] });
      expect(validateName('abc123', false)).toEqual({ valid: true, errors: [] });
      expect(validateName('a1-b2-c3', false)).toEqual({ valid: true, errors: [] });
    });

    it('rejects empty names', () => {
      const result = validateName('', false);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name must not be empty');
    });

    it('rejects names exceeding 64 characters', () => {
      const longName = 'a'.repeat(65);
      const result = validateName(longName, false);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum length of 64 characters');
    });

    it('accepts names at exactly 64 characters', () => {
      const name = 'a'.repeat(64);
      const result = validateName(name, false);
      expect(result.valid).toBe(true);
    });

    it('rejects uppercase characters', () => {
      const result = validateName('LiveBetting', false);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('lowercase-kebab-case');
    });

    it('rejects names with spaces', () => {
      const result = validateName('live betting', false);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('lowercase-kebab-case');
    });

    it('rejects names with underscores', () => {
      const result = validateName('live_betting', false);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('lowercase-kebab-case');
    });

    it('rejects names starting with a hyphen', () => {
      const result = validateName('-live-betting', false);
      expect(result.valid).toBe(false);
    });

    it('rejects names ending with a hyphen', () => {
      const result = validateName('live-betting-', false);
      expect(result.valid).toBe(false);
    });

    it('rejects names with consecutive hyphens', () => {
      const result = validateName('live--betting', false);
      expect(result.valid).toBe(false);
    });

    it('rejects names with special characters', () => {
      const result = validateName('live@betting', false);
      expect(result.valid).toBe(false);
    });
  });

  describe('file names', () => {
    it('accepts valid kebab-case file names with .md extension', () => {
      expect(validateName('overview.md', true)).toEqual({ valid: true, errors: [] });
      expect(validateName('bet-builder.md', true)).toEqual({ valid: true, errors: [] });
      expect(validateName('live-betting-patterns.md', true)).toEqual({ valid: true, errors: [] });
      expect(validateName('a1.md', true)).toEqual({ valid: true, errors: [] });
    });

    it('rejects file names without .md extension', () => {
      const result = validateName('overview', true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File name must end with .md extension');
    });

    it('rejects file names with wrong extension', () => {
      const result = validateName('overview.txt', true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File name must end with .md extension');
    });

    it('accepts file names at exactly 64 characters', () => {
      // 'a'.repeat(61) + '.md' = 64 chars total
      const name = 'a'.repeat(61) + '.md';
      expect(name.length).toBe(64);
      expect(validateName(name, true).valid).toBe(true);
    });

    it('rejects file names exceeding 64 characters', () => {
      const tooLong = 'a'.repeat(62) + '.md'; // 65 chars
      expect(tooLong.length).toBe(65);
      const result = validateName(tooLong, true);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum length of 64 characters');
    });

    it('rejects file names with uppercase characters', () => {
      const result = validateName('Overview.md', true);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase-kebab-case'))).toBe(true);
    });

    it('rejects file names with spaces', () => {
      const result = validateName('my file.md', true);
      expect(result.valid).toBe(false);
    });

    it('rejects file names starting with a hyphen', () => {
      const result = validateName('-overview.md', true);
      expect(result.valid).toBe(false);
    });

    it('rejects file names ending with hyphen before extension', () => {
      const result = validateName('overview-.md', true);
      expect(result.valid).toBe(false);
    });

    it('rejects file names with consecutive hyphens', () => {
      const result = validateName('live--betting.md', true);
      expect(result.valid).toBe(false);
    });

    it('reports multiple errors when applicable', () => {
      const result = validateName('A'.repeat(65) + '.txt', true);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
