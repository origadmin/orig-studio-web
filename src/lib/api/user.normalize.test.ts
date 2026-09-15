import {normalizeUser} from './user';

// Real payload shape from GET /api/v1/users/{id}?with_profile=true: the intro is
// carried by the contract's `profile` object, while `title` and `description`
// are internal columns that the same response happens to include.
const RAW = {
  id: 'u1',
  username: 'admin',
  nickname: 'UAT 336215',
  title: 'vvvv',
  description: '{"theme":"light"}',
  profile: {name: 'UAT 336215', bio: '', website: '', location: '', avatar: ''},
};

describe('normalizeUser', () => {
  it('renders no intro when the contract profile carries no bio', () => {
    expect(normalizeUser(RAW).bio).toBe('');
  });

  it('reads the intro from profile.bio', () => {
    expect(normalizeUser({...RAW, profile: {...RAW.profile, bio: 'hello'}}).bio).toBe('hello');
  });

  it('never surfaces a raw column value or the settings blob as any string field', () => {
    const values = Object.values(normalizeUser(RAW)).filter((v) => typeof v === 'string') as string[];
    expect(values.some((v) => v.includes('vvvv'))).toBe(false);
    expect(values.some((v) => v.includes('{') || v.includes('theme'))).toBe(false);
  });

  it('keeps the contract profile so downstream mapping reads one shape', () => {
    expect((normalizeUser(RAW) as any).profile).toEqual(RAW.profile);
  });
});
