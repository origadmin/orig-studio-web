import {createFileRoute, redirect} from '@tanstack/react-router';

export const Route = createFileRoute('/_portal/$handle/$')({
    beforeLoad: ({params}) => {
        const {handle} = params;
        throw redirect({
            to: '/$handle',
            params: {handle},
            replace: true,
        });
    },
});
