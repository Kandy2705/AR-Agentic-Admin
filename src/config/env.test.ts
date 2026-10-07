import { describe, expect, it } from 'vitest';
import { normalizeBase } from './env';

describe('normalizeBase', () => {
  it('appends /api/v1 exactly once', () => {
    expect(normalizeBase('https://api.example.test/')).toBe('https://api.example.test/api/v1');
    expect(normalizeBase('https://api.example.test/api/v1/')).toBe(
      'https://api.example.test/api/v1',
    );
    expect(normalizeBase('http://localhost:5100')).toBe('http://localhost:5100/api/v1');
    expect(normalizeBase('/__backend')).toBe('/__backend/api/v1');
  });

  it('rejects unsafe protocols, credentials and non-local HTTP', () => {
    for (const value of [
      'javascript:alert(1)',
      'http://example.test',
      'https://user:pass@example.test',
      'https://example.test/?secret=x',
      'https://example.test/#fragment',
    ]) {
      expect(() => normalizeBase(value)).toThrow();
    }
  });
});
