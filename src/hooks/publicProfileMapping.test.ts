import {mapPublicProfile} from './publicProfileMapping';

// Real payload shape from GET /api/v1/users/admin (production):
//   title='vvvv'  description='{"theme":"light"}'  name='UAT 336215'
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
};

describe('mapPublicProfile', () => {
    it('takes the bio from title (the real storage column), not from description', () => {
        const p = mapPublicProfile(RAW);
        expect(p.bio).toBe('vvvv');
    });

    it('never surfaces the settings blob stored in description', () => {
        const p = mapPublicProfile(RAW);
        const rendered = Object.values(p).filter((v) => typeof v === 'string') as string[];
        expect(rendered.some((v) => v.includes('{') || v.includes('theme'))).toBe(false);
    });

    it('does not map title as well, so the bio is not rendered twice', () => {
        const p = mapPublicProfile(RAW) as Record<string, unknown>;
        expect(p.title).toBeUndefined();
    });

    it('falls back to an explicit bio field when title is empty', () => {
        const p = mapPublicProfile({...RAW, title: '', bio: 'from-bio-field'});
        expect(p.bio).toBe('from-bio-field');
    });

    it('leaves the bio undefined when the user has neither title nor bio', () => {
        const p = mapPublicProfile({...RAW, title: '', description: '{"theme":"dark"}'});
        expect(p.bio).toBeUndefined();
    });
});
