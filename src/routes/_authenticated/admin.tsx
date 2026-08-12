import {createFileRoute, redirect} from '@tanstack/react-router';
import AdminLayout from '@/layout/AdminLayout';
import {FeatureFlagsProvider} from '@/contexts/FeatureFlagsContext';
import {toast} from 'sonner';
import i18n from '@/i18n';

/**
 * Admin layout route.
 *
 * - _authenticated already ensures the user is authenticated.
 * - This route additionally checks for the admin role.
 * - Non-admin users are redirected to the home page.
 *
 * Replaces the previous requireAdmin() function in admin/route.tsx.
 */
export const Route = createFileRoute('/_authenticated/admin')({
    beforeLoad: ({context}) => {
        if (!context.auth.isAdmin) {
            // BUG-001：越权时给出明确提示，而非静默跳转到首页。
            toast.error(i18n.t('admin.noPermission', '您没有权限访问管理后台'));
            throw redirect({to: '/'});
        }
    },
    component: () => (
        <FeatureFlagsProvider>
            <AdminLayout/>
        </FeatureFlagsProvider>
    ),
});
