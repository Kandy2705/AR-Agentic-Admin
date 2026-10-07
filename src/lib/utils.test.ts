import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';
import {
  dateRange,
  idOf,
  initials,
  localPage,
  matches,
  newest,
  nullableNumber,
  safeHttpUrl,
} from './utils';

describe('utils', () => {
  it('nullableNumber keeps zero, empties to null and checks range', () => {
    expect(nullableNumber('')).toBeNull();
    expect(nullableNumber('0')).toBe(0);
    expect(nullableNumber('10.5', -90, 90)).toBe(10.5);
    expect(() => nullableNumber('91', -90, 90)).toThrow();
    expect(() => nullableNumber('abc')).toThrow();
  });

  it('localPage clamps pages', () => {
    const page = localPage([1, 2, 3, 4, 5], 9, 2);
    expect(page).toMatchObject({ items: [5], page: 3, totalPages: 3, totalItems: 5 });
    expect(localPage([], 1, 20)).toMatchObject({ items: [], page: 1, totalPages: 0 });
  });

  it('newest sorts descending without mutating', () => {
    const rows = [{ d: '2024-01-01' }, { d: '2025-01-01' }, { d: null }];
    expect(newest(rows, (r) => r.d).map((r) => r.d)).toEqual(['2025-01-01', '2024-01-01', null]);
    expect(rows[0].d).toBe('2024-01-01');
  });

  it('dateRange validates order and builds an inclusive range', () => {
    expect(() => dateRange('2025-02-01', '2025-01-01')).toThrow();
    const range = dateRange('2025-01-01', '2025-01-01');
    expect(Date.parse(range.toDate!) - Date.parse(range.fromDate!)).toBe(86_399_999);
    expect(dateRange('', '')).toEqual({});
  });

  it('misc helpers', () => {
    expect(() => idOf({ id: null })).toThrow();
    expect(initials('Ngô Ngọc Triệu Mẫn')).toBe('NN');
    expect(initials(null)).toBe('AR');
    expect(matches('b9', 'Tòa B9', null)).toBe(true);
    expect(matches('', null)).toBe(true);
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('https://hcmut.edu.vn')).toBe('https://hcmut.edu.vn/');
  });
});

describe('csv', () => {
  it('escapes quotes/newlines and neutralizes formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell(null)).toBe('');
    expect(toCsv([{ a: 1 }], [{ header: 'A', value: (r) => r.a }])).toBe('A\r\n1');
  });
});

describe('csv numbers', () => {
  it('keeps negative numbers as numbers', () => {
    expect(csvCell(-122.4)).toBe('-122.4');
    expect(csvCell('-cmd')).toBe("'-cmd");
  });
});
