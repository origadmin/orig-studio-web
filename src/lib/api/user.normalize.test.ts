import {normalizeUser} from './user';

// Real payload shape from GET /api/v1/users/{id}: the bio is stored in
// users.title while users.description holds the user-settings JSON blob.
const RAW = {
  id: 'u1',
  username: 'admin',
  nickname: 'UAT 336215',
  title: 'vvvv',
  description: '{"theme":"light"}',
};

describe('normalizeUser', () => {
  it('takes the bio from title, never from the settings blob in description', () => {
    expect(normalizeUser(RAW).bio).toBe('vvvv');
  });

  it('never surfaces the settings blob as any string field', () => {
    const values = Object.values(normalizeUser(RAW)).filter((v) => typeof v === 'string') as string[];
    expect(values.some((v) => v.includes('{') || v.includes('theme'))).toBe(false);
  });

  it('keeps an explicit bio field when the backend provides one', () => {
    expect(normalizeUser({...RAW, bio: 'from-bio'}).bio).toBe('from-bio');
  });
});
