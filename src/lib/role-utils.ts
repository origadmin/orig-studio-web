import type {User} from '@/contexts/auth/types';

interface ApiUserFields {
    id?: string;
    username?: string;
    nickname?: string;
    role?: string;
    is_superuser?: boolean;
    is_staff?: boolean;
    is_editor?: boolean;
    advanced_user?: boolean;
}

// 后端 /me 实际返回的管理类角色与能力标识（见 internal/features/user/dto/user_entity_dto.go）：
//   Role 枚举：user / admin / editor
//   能力标识：is_superuser / is_editor / advanced_user
// 原实现仅硬编码 role === 'admin' | 'superadmin'，导致 editor 等其他命名的管理员被静默
// 重定向首页（BUG-001）。改为"角色在管理集合 或 任一管理能力标识命中即视为管理员"。
const ADMIN_ROLES = new Set(['admin', 'superadmin', 'editor']);

export function resolveUserRoles(apiUser: ApiUserFields): Pick<User, 'roles' | 'isSuperuser'> {
    const isSuperuser = apiUser.is_superuser === true;
    const isAdmin = ADMIN_ROLES.has((apiUser.role ?? '').toLowerCase())
        || isSuperuser
        || apiUser.is_editor === true
        || apiUser.is_staff === true; // 向前兼容：后端当前未下发 is_staff

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
