import {createFileRoute, redirect} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/notifications')({
    beforeLoad: () => {
        throw redirect({
            to: '/notifications',
            replace: true,
        });
    },
});
