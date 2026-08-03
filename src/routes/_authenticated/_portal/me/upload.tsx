import {createFileRoute, redirect} from '@tanstack/react-router';

// 书签兼容层：一次性 redirect 到最终 URL，避免旧的 <Navigate to="/me/videos"> 造成 DOUBLE redirect（me/upload → me/videos → /@u）
export const Route = createFileRoute('/_authenticated/_portal/me/upload')({
    beforeLoad: ({context}) => {
        const username = context.auth.user?.username;
        if (username) {
            throw redirect({
                to: '/$handle',
                params: {handle: '@' + username},
                search: {tab: 'videos'},
                replace: true,
            });
        }
        throw redirect({to: '/auth/signin', replace: true});
    },
});
