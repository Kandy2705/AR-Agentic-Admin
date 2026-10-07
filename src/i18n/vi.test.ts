import { describe, expect, it } from 'vitest';
import { vi as dictionary } from './vi';

const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('Vietnamese dictionary', () => {
  it('translates every t("…") literal used in the source', () => {
    const missing = new Set<string>();
    for (const source of Object.values(sources)) {
      for (const match of source.matchAll(/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) {
        const key = match[2].replace(/\\'/g, "'");
        if (!(key in dictionary)) missing.add(key);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
