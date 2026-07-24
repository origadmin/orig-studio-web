import {createFileRoute, lazyRouteComponent} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/history')({
    component: lazyRouteComponent(() => import('@/pages/home/me/History')),
});
