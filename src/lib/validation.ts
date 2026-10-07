import { z } from 'zod';
import { safeHttpUrl } from './utils';

/** Optional numeric input kept as string in the form; validated range. */
export const optionalNumber = (min = -Number.MAX_VALUE, max = Number.MAX_VALUE) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const n = Number(value);
      return Number.isFinite(n) && n >= min && n <= max;
    }, 'Enter a valid number in range.');

/** Optional http(s) URL. */
export const optionalUrl = z
  .string()
  .trim()
  .max(1000, 'Too long (max 1000 characters).')
  .refine((value) => !value || safeHttpUrl(value) !== null, 'Enter a valid http(s) URL.');

/** Form string → number | null (after validation). */
export const toNumberOrNull = (value: string): number | null =>
  value.trim() ? Number(value) : null;
