import { useMemo, useState } from 'react';
import { PAGE_SIZE } from '@/config/env';
import { localPage, matches } from '@/lib/utils';

/**
 * Client-side search + pagination for endpoints that return whole arrays.
 * `fields` must be stable (declare it at module level).
 */
export function useLocalTable<T>(
  rows: readonly T[] | undefined,
  fields: (row: T) => (string | null | undefined)[],
) {
  const [search, setSearchState] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () => (rows ?? []).filter((row) => matches(search, ...fields(row))),
    [rows, search, fields],
  );
  return {
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    filtered,
    page: localPage(filtered, page, PAGE_SIZE),
    setPage,
  };
}
