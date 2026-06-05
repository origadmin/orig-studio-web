import {createFileRoute, redirect} from '@tanstack/react-router';
import Page from '@/pages/auth/SignIn/index';

/**
 * Sign-in route.
 *
 * Redirects authenticated users to the home page.
 * Supports a redirect search param to return to the original target
 * after successful login.
 */
export const Route = createFileRoute('/auth/signin')({
    validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
        redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    }),
    beforeLoad: ({context}) => {
        if (context.auth.isAuthenticated) {
            throw redirect({to: '/'});
        }
    },
    component: Page,
});
