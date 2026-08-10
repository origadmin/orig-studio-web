/**
 * Quote-free search serialization for TanStack Router.
 *
 * WHY: TanStack Router v1's default search pipeline coerces values in TWO
 * places, which together produced the recurring `?v="1"` bug the user kept
 * hitting (tags 1/2/3/4 …):
 *   1. `qss.decode`'s `toValue('1')` → number 1 (numeric-looking strings are
 *      coerced before any parseSearch runs);
 *   2. `defaultStringifySearch` JSON.stringify's ANY string that JSON.parse can
 *      decode → `'1'` became `'"1"'` in the URL.
 *
 * These are symmetric: `?v=1` read back as the NUMBER 1, and writing `{v:'1'}`
 * produced `?v="1"`. `?v=music` looked fine only because "music" is not
 * JSON-parseable — which is why this bug "kept coming back" after fixes that
 * only touched tag-link call sites.
 *
 * Rules here:
 * - strings: serialized VERBATIM (`{v:'1'}` → `?v=1`, never `?v="1"`)
 * - objects/arrays: still JSON-serialized (structured search params keep working)
 * - parse: values stay plain strings unless they look like JSON (`{`, `[`, or a
 *   legacy quoted `"`), so `?v=1` reads back as the STRING "1" and old
 *   bookmarked `?v="1"` URLs still decode to "1".
 */
import {stringifySearchWith} from '@tanstack/react-router';

const looksLikeJSON = (v: string): boolean => {
  const c = v[0];
  return c === '{' || c === '[' || c === '"';
};

/**
 * parseSearch that keeps plain strings verbatim.
 * Written from scratch because parseSearchWith internally runs qss.decode,
 * whose toValue() coerces '1'→1 / 'true'→true before our parser ever runs.
 */
export function plainParseSearch(searchStr: string): Record<string, unknown> {
  if (!searchStr) return {};
  const cleaned = searchStr[0] === '?' ? searchStr.substring(1) : searchStr;
  const params = new URLSearchParams(cleaned);
  const result: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    if (looksLikeJSON(value)) {
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch {
        // fall through: keep the raw string
      }
    }
    result[key] = value;
  }
  return result;
}

/**
 * stringifySearch that never wraps plain strings in JSON quotes.
 * (qss.encode keeps the value returned by stringifyValue as-is, so verbatim
 * strings stay verbatim.)
 */
export const plainStringifySearch = stringifySearchWith(
  (v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)),
  () => {
    // Throw so plain strings fall through to the verbatim branch.
    throw new Error('plain-stringify: strings are kept verbatim');
  },
);
