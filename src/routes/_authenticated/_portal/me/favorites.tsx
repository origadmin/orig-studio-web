import {createFileRoute, lazyRouteComponent} from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_portal/me/favorites')({
    component: lazyRouteComponent(() => import('@/pages/home/me/Favorites')),
});
