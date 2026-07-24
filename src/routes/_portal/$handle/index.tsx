import {createFileRoute, redirect} from '@tanstack/react-router';

export const Route = createFileRoute('/_portal/$handle/')({
    beforeLoad: ({params}) => {
        throw redirect({
            to: '/$handle/$tab',
            params: {handle: params.handle, tab: 'videos'},
            replace: true,
        });
    },
});
