import type {User} from '@/contexts/auth/types';

interface ApiUserFields {
    id?: string;
    username?: string;
    nickname?: string;
    role?: string;
    is_superuser?: boolean;
    is_staff?: boolean;
}

export function resolveUserRoles(apiUser: ApiUserFields): Pick<User, 'roles' | 'isSuperuser'> {
    const isSuperuser = apiUser.is_superuser === true;
    const isAdmin = apiUser.role === 'admin'
        || apiUser.role === 'superadmin'
        || isSuperuser;

    const roles: string[] = [];
    if (isSuperuser) roles.push('superuser');
    if (isAdmin) roles.push('admin');
    roles.push('user');

    return {roles, isSuperuser};
}

export function isUserAdmin(user: User | null): boolean {
    return user?.roles?.includes('admin') ?? false;
}

export function isUserSuperuser(user: User | null): boolean {
    return user?.isSuperuser === true;
}
