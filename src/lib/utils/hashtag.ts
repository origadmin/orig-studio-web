const HASHTAG_REGEX = /(#[\p{L}\p{N}_][\p{L}\p{N}_\-]*)/gu;

export function parseHashtags(text: string): string[] {
    if (!text) return [];
    const matches = text.match(HASHTAG_REGEX);
    if (!matches) return [];
    return matches.map(tag => tag.slice(1));
}

export function serializeTags(tags: string[]): string {
    if (!tags || tags.length === 0) return '';
    return tags.map(tag => `#${tag}`).join(' ');
}

export function parseTagsInput(text: string): string[] {
    if (!text) return [];
    const trimmed = text.trim();
    if (!trimmed) return [];

    const hashtagMatches = trimmed.match(HASHTAG_REGEX);
    if (hashtagMatches && hashtagMatches.length > 0) {
        return hashtagMatches.map(tag => tag.slice(1));
    }

    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
}

export function mergeTagsWithHashtags(existingTags: string[], title: string, description?: string): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    const addTag = (tag: string) => {
        const lower = tag.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            result.push(tag);
        }
    };

    for (const tag of existingTags) {
        addTag(tag);
    }

    const parsedTitle = parseHashtags(title);
    for (const tag of parsedTitle) {
        addTag(tag);
    }

    if (description) {
        const parsedDesc = parseHashtags(description);
        for (const tag of parsedDesc) {
            addTag(tag);
        }
    }

    return result;
}
