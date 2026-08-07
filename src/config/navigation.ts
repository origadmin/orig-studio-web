import {
    Home,
    Radio,
    UserCircle,
    CreditCard,
    Compass,
    Tags,
    LayoutGrid,
    Bell,
} from 'lucide-react';
import type {NavSection} from '@/types/nav';

export const NAV_CONFIG: NavSection[] = [
    {
        id: 'browse',
        title: 'nav.browse',
        items: [
            {id: 'home', label: 'nav.home', to: '/', icon: Home},
            {id: 'live', label: 'nav.live', to: '/live', icon: Radio, module: 'live'},
        ],
    },
    {
        id: 'discover',
        title: 'nav.discover',
        items: [
            {id: 'categories', label: 'nav.browse', to: '/browse', icon: LayoutGrid},
            {id: 'tags', label: 'nav.tags', to: '/tags', icon: Tags},
            {id: 'explore', label: 'nav.explore', to: '/explore', icon: Compass},
        ],
    },
    {
        id: 'subscriptions',
        title: 'nav.subscriptions',
        requiresAuth: true,
        items: [
            {
                id: 'subs-feed',
                label: 'nav.subsFeed',
                to: '/subscriptions',
                icon: Radio,
                module: 'videos',
            },
        ],
    },
    {
        id: 'you',
        title: 'nav.you',
        requiresAuth: true,
        items: [
            {
                id: 'my-home',
                label: 'nav.myHome',
                to: '/@__handle__',
                icon: UserCircle,
                isDynamic: true,
            },
            {
                id: 'notifications',
                label: 'nav.notifications',
                to: '/notifications',
                icon: Bell,
            },
            {id: 'my-subscription', label: 'nav.mySubscription', to: '/me/subscription', icon: CreditCard, module: 'payment'},
        ],
    },
];
