import {createFileRoute, redirect} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/channels')({
    beforeLoad: ({context}) => {
        const username = context.auth.user?.username;
        if (username) {
            throw redirect({
                to: '/$handle',
                params: {handle: '@' + username},
                search: {tab: 'channels'},
                replace: true,
            });
        }
        throw redirect({
            to: '/auth/signin',
            replace: true,
        });
    },
});
