import path from 'node:path';

/**
 * Single source for Playwright evidence screenshots (BUG-252).
 * Specs must never hardcode the evidence directory — they call
 * evidencePath('name.png') and the location is decided here.
 */
export function evidencePath(name: string): string {
    return path.join(__dirname, '..', 'e2e-evidence', name);
}
