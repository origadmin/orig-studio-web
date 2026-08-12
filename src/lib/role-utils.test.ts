import {resolveUserRoles} from './role-utils';

describe('resolveUserRoles (BUG-001)', () => {
    it('treats role "admin" as admin', () => {
        const {roles, isSuperuser} = resolveUserRoles({role: 'admin'});
        expect(roles).toContain('admin');
        expect(isSuperuser).toBe(false);
    });

    it('treats role "superadmin" as admin', () => {
        const {roles} = resolveUserRoles({role: 'superadmin'});
        expect(roles).toContain('admin');
    });

    it('treats role "editor" as admin (BUG-001 core fix)', () => {
        // 后端 user_entity_dto.go 的 Role 枚举含 editor，原实现硬编码仅 admin/superadmin，
        // 导致 editor 类管理员被静默重定向首页。
        const {roles} = resolveUserRoles({role: 'editor'});
        expect(roles).toContain('admin');
    });

    it('treats mixed-case "Editor" as admin', () => {
        const {roles} = resolveUserRoles({role: 'Editor'});
        expect(roles).toContain('admin');
    });

    it('treats is_editor:true (no explicit role) as admin', () => {
        const {roles} = resolveUserRoles({is_editor: true});
        expect(roles).toContain('admin');
    });

    it('treats is_superuser:true as admin + superuser', () => {
        const {roles, isSuperuser} = resolveUserRoles({is_superuser: true});
        expect(roles).toContain('admin');
        expect(roles).toContain('superuser');
        expect(isSuperuser).toBe(true);
    });

    it('keeps is_staff forward-compatible as admin', () => {
        const {roles} = resolveUserRoles({is_staff: true});
        expect(roles).toContain('admin');
    });

    it('role "user" is NOT admin', () => {
        const {roles} = resolveUserRoles({role: 'user'});
        expect(roles).not.toContain('admin');
    });

    it('empty user object is NOT admin', () => {
        const {roles} = resolveUserRoles({});
        expect(roles).not.toContain('admin');
    });

    it('always includes base "user" role', () => {
        const {roles} = resolveUserRoles({role: 'editor'});
        expect(roles).toContain('user');
    });
});
