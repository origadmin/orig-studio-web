import {createFileRoute, lazyRouteComponent} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/playlists')({
    component: lazyRouteComponent(() => import('@/pages/home/me/Playlists')),
});
