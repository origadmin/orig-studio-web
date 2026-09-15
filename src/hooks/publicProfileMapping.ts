import type {PublicProfile} from '@/lib/api/user';

/** Raw user payload shape returned by `GET /api/v1/users/{id}` (loose: protojson). */
export type RawPublicUser = Record<string, any>;

export type MappedPublicProfile = Omit<PublicProfile, 'is_owner'> & { is_me?: boolean };

/**
 * Map the raw user payload onto the portal's public profile.
 *
 * Field sources (verified against the user service, `internal/features/user/dal/user_repo.go`):
 * - `users.title`       -> the profile bio. `UpdateUserProfile` stores the submitted
 *                          bio with `SetTitle`, and `convertUserToProfileProto`
 *                          maps `Bio: u.Title`, so title IS the bio column.
 * - `users.description` -> the USER SETTINGS blob: `UpdateUserSetting` marshals the
 *                          settings JSON into it. It must never be rendered as text
 *                          (it used to leak into the page as `{"theme":"light"}`).
 * - `users.logo` / `users.location` -> avatar / location.
 *
 * `title` is deliberately NOT mapped: it would render the same value a second time
 * (the bio is already the `bio` field).
 */
export function mapPublicProfile(raw: RawPublicUser): MappedPublicProfile {
    return {
        id: raw.id,
        username: raw.username,
        nickname: raw.nickname || undefined,
        avatar: raw.avatar || undefined,
        slug: raw.slug || undefined,
        // bio <- title (the real storage column); never `description` (settings blob).
        bio: raw.title || raw.bio || undefined,
        location: raw.location || undefined,
        website: raw.website || undefined,
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
