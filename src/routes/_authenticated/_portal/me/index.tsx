import {createFileRoute, redirect} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/')({
    beforeLoad: ({context}) => {
        const username = (context as any).auth?.user?.username;
        if (username) {
            throw redirect({
                to: '/$handle/$tab',
                params: {handle: `@${username}`, tab: 'videos'},
                replace: true,
            });
        }
    },
});
