import {mapPublicProfile} from './publicProfileMapping';

// Real payload shape from GET /api/v1/users/admin?with_profile=true:
//   profile.bio=''                      <- the contract carrier for the intro
//   title='vvvv'                        <- internal column, settings-free but not a bio
//   description='{"theme":"light"}'     <- the user-settings blob
//   name='UAT 336215'
const RAW = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    nickname: 'UAT 336215',
    avatar: '',
    slug: 'admin',
    title: 'vvvv',
    description: '{"theme":"light"}',
    location: '',
    create_time: '2026-06-25T10:41:53.886250Z',
    media_count: 3,
    is_me: true,
    profile: {name: 'UAT 336215', bio: '', website: '', location: '', avatar: '', gender: ''},
};

describe('mapPublicProfile', () => {
    it('renders no intro when the contract profile carries no bio', () => {
        expect(mapPublicProfile(RAW).bio).toBeUndefined();
    });

    it('renders the intro from profile.bio (the contract field)', () => {
        const p = mapPublicProfile({...RAW, profile: {...RAW.profile, bio: 'hello'}});
        expect(p.bio).toBe('hello');
    });

    it('never surfaces a raw column value (title) or the settings blob (description)', () => {
        const p = mapPublicProfile(RAW);
        const rendered = Object.values(p).filter((v) => typeof v === 'string') as string[];
        expect(rendered.some((v) => v.includes('vvvv'))).toBe(false);
        expect(rendered.some((v) => v.includes('{') || v.includes('theme'))).toBe(false);
    });

    it('does not map title as well, so the intro is not rendered twice', () => {
        const p = mapPublicProfile(RAW) as Record<string, unknown>;
        expect(p.title).toBeUndefined();
    });

    it('takes location/website/avatar from the contract profile too', () => {
        const p = mapPublicProfile({
            ...RAW,
            location: 'raw-column',
            profile: {...RAW.profile, location: 'Beijing', website: 'https://example.test', avatar: 'a.png'},
        });
        expect(p.location).toBe('Beijing');
        expect(p.website).toBe('https://example.test');
        expect(p.avatar).toBe('a.png');
    });
});
