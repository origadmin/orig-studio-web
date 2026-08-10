/**
 * Slug generation utility for frontend preview.
 *
 * This provides a client-side preview of what the slug will look like.
 * The actual slug is generated on the backend using the definitive algorithm
 * (pure ASCII -> slugify, non-ASCII -> Base58 encode).
 *
 * The frontend mirrors the backend algorithm exactly (see
 * internal/pkg/hashtag/hashtag.go) so that hashtag links built from raw text
 * resolve to the same /tag/{slug} URL the backend understands.
 */

/**
 * Bitcoin Base58 alphabet (no 0/O/I/l) — MUST match internal/pkg/hashtag.
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Max slug length — MUST match internal/pkg/hashtag.MaxSlugLength.
 */
const MAX_SLUG_LENGTH = 100;

/**
 * Fallback slug when generation yields an empty result —
 * MUST match internal/pkg/hashtag.FallbackSlug.
 */
export const FALLBACK_SLUG = 'tag';

/**
 * Checks if a string contains only ASCII characters.
 */
function isASCII(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 127) {
      return false;
    }
  }
  return true;
}

/**
 * Encodes a byte array using the Bitcoin Base58 alphabet —
 * MUST match internal/pkg/hashtag.base58Encode.
 */
function base58Encode(data: Uint8Array): string {
  if (data.length === 0) {
    return FALLBACK_SLUG;
  }

  // Count leading zero bytes (they become leading '1's in Base58)
  let leadingZeros = 0;
  for (const b of data) {
    if (b === 0) {
      leadingZeros++;
    } else {
      break;
    }
  }

  // Convert to big integer (BigInt) and encode
  let num = 0n;
  for (const b of data) {
    num = (num << 8n) | BigInt(b);
  }

  const base = 58n;
  let encoded = '';
  while (num > 0n) {
    const mod = num % base;
    encoded = BASE58_ALPHABET[Number(mod)] + encoded;
    num = num / base;
  }

  // Add leading '1's for each leading zero byte
  encoded = '1'.repeat(leadingZeros) + encoded;

  // Truncate to max slug length
  if (encoded.length > MAX_SLUG_LENGTH) {
    encoded = encoded.slice(0, MAX_SLUG_LENGTH);
  }

  return encoded || FALLBACK_SLUG;
}

/**
 * Generates a URL-friendly slug from a name string.
 * Strategy (one-size-fits-all, mirrors backend GenerateTagSlug):
 * - Pure ASCII names: slugify (lowercase, replace non-alphanum with hyphens)
 * - Names with any non-ASCII: Base58-encode the entire name (UTF-8 bytes)
 *
 * Empty results fall back to FALLBACK_SLUG ("tag").
 *
 * @param name - The tag name to generate a slug from
 * @returns The generated slug string
 */
export function generateSlug(name: string): string {
  if (!name) {
    return FALLBACK_SLUG;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return FALLBACK_SLUG;
  }

  if (!isASCII(trimmed)) {
    return base58Encode(new TextEncoder().encode(trimmed));
  }

  // Simple slugify for ASCII names
  let slug = trimmed.toLowerCase();
  // Replace non-alphanumeric characters with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');
  // Trim leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');
  // Collapse consecutive hyphens
  slug = slug.replace(/-{2,}/g, '-');

  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH);
    // Trim trailing hyphen if truncation left one
    slug = slug.replace(/-+$/, '');
  }

  return slug || FALLBACK_SLUG;
}
