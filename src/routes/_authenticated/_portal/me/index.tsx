import {createFileRoute, redirect} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/')({
    beforeLoad: () => {
        throw redirect({
            to: '/me/videos',
            replace: true,
        });
    },
});
