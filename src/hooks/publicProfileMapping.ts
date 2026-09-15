import type {PublicProfile} from '@/lib/api/user';

/** Raw user payload shape returned by `GET /api/v1/users/{id}` (loose: protojson). */
export type RawPublicUser = Record<string, any>;

export type MappedPublicProfile = Omit<PublicProfile, 'is_owner'> & { is_me?: boolean };

/**
 * Map the raw user payload onto the portal's public profile.
 *
 * Source of truth is the CONTRACT, not a raw column:
 * - `GET /api/v1/users/{id}?with_profile=true` returns `types.User.user.profile`
 *   (`types.UserProfile`), and that is where `bio` lives. `GetUserRequest` declares
 *   `with_profile` for exactly this reason; without the flag the backend leaves
 *   `user.profile` nil.
 * - `users.title` / `users.description` are NOT read here. They are internal
 *   columns that the same response also carries (`description` currently holds the
 *   user-settings blob), and reading them is what put `{"theme":"light"}` and then
 *   the legacy `title` value on screen as the intro.
 */
export function mapPublicProfile(raw: RawPublicUser): MappedPublicProfile {
    // `profile` is the designed carrier for bio/location/website/avatar.
    const profile = (raw.profile ?? {}) as Record<string, any>;
    return {
        id: raw.id,
        username: raw.username,
        nickname: raw.nickname || profile.name || undefined,
        avatar: profile.avatar || raw.avatar || undefined,
        slug: raw.slug || undefined,
        bio: profile.bio || undefined,
        location: profile.location || raw.location || undefined,
        website: profile.website || raw.website || undefined,
        is_featured: raw.is_verified || false,
        media_count: raw.media_count || 0,
        subscriber_count: raw.subscriber_count || 0,
        created_at: raw.create_time || raw.created_at,
        default_channel_token: raw.default_channel_token || undefined,
        // BUG-085: preserve backend-provided is_me so is_owner can be derived
        // authoritatively without auth-state race conditions.
        is_me: raw.is_me,
        is_subscribed: raw.is_subscribed || false,
    };
}
