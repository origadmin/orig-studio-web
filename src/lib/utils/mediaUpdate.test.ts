import {toChannelIdPayload, toCategoryIdPayload} from './mediaUpdate';

/**
 * Regression gate for the portal media-edit channel reset bug (2026-09-11).
 *
 * The defect was `Number(form.channel_id)` -> NaN -> `null` on the wire ->
 * backend read it as "clear the channel". These assertions fail loudly if
 * anyone reintroduces numeric coercion for the channel id.
 */
describe('toChannelIdPayload', () => {
    const UUID = '01a085cc-76ba-725c-86f9-dc2c2bbfe645';

    it('passes a UUID through untouched (never numeric-coerced)', () => {
        expect(toChannelIdPayload(UUID)).toBe(UUID);
        // the bug: Number() of a UUID is NaN, JSON.stringify(NaN) is null
        expect(Number.isNaN(Number(UUID))).toBe(true);
    });

    it('normalises the _none_ sentinel and empties to the clear value', () => {
        expect(toChannelIdPayload('_none_')).toBe('');
        expect(toChannelIdPayload('')).toBe('');
        expect(toChannelIdPayload('   ')).toBe('');
        expect(toChannelIdPayload(null)).toBe('');
        expect(toChannelIdPayload(undefined)).toBe('');
    });

    it('never returns a non-string (would serialise to null/NaN on the wire)', () => {
        for (const input of [UUID, '_none_', '', null, undefined, 0]) {
            expect(typeof toChannelIdPayload(input)).toBe('string');
        }
    });

    it('passes unexpected values through loudly instead of silently clearing', () => {
        // A non-empty but non-UUID value must reach the backend so it can reject
        // with CHANNEL_NOT_FOUND — mapping it to '' would silently clear the
        // assignment, which is the exact defect class this helper prevents.
        expect(toChannelIdPayload('0')).toBe('0');
        expect(toChannelIdPayload(0)).toBe('0');
        expect(toChannelIdPayload('not-a-uuid')).toBe('not-a-uuid');
    });
});

describe('toCategoryIdPayload', () => {
    it('parses int64 ids', () => {
        expect(toCategoryIdPayload('5')).toBe(5);
        expect(toCategoryIdPayload(5)).toBe(5);
    });

    it('returns undefined for empty / non-numeric values', () => {
        expect(toCategoryIdPayload('')).toBeUndefined();
        expect(toCategoryIdPayload(null)).toBeUndefined();
        expect(toCategoryIdPayload(undefined)).toBeUndefined();
        expect(toCategoryIdPayload('abc')).toBeUndefined();
    });
});
