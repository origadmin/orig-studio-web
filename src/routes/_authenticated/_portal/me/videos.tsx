import {createFileRoute, redirect} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/videos')({
    beforeLoad: ({context, search}) => {
        const username = (context as any).auth?.user?.username;
        if (username) {
            throw redirect({
                to: '/$handle/$tab',
                params: {handle: `@${username}`, tab: 'videos'},
                search: search as any,
                replace: true,
            });
        }
    },
});
