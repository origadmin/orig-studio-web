import {
    Home,
    Star,
    Clock,
    Video,
    History,
    Heart,
    ListVideo,
    Radio,
    UserCircle,
    FileText,
    Tv,
    CreditCard,
    Shield,
    Compass,
    Tags,
    LayoutGrid,
} from 'lucide-react';
import type {NavSection} from '@/types/nav';

export const NAV_CONFIG: NavSection[] = [
    {
        id: 'browse',
        title: 'nav.browse',
        items: [
            {id: 'home', label: 'nav.home', to: '/', icon: Home},
            {id: 'featured', label: 'nav.featured', to: '/featured', icon: Star, module: 'videos'},
            {id: 'latest', label: 'nav.latest', to: '/latest', icon: Clock, module: 'videos'},
            {id: 'live', label: 'nav.live', to: '/live', icon: Radio, module: 'live'},
        ],
    },
    {
        id: 'discover',
        title: 'nav.discover',
        items: [
            {id: 'categories', label: 'nav.categories', to: '/categories', icon: LayoutGrid},
            {id: 'tags', label: 'nav.tags', to: '/tags', icon: Tags},
            {id: 'explore', label: 'nav.explore', to: '/explore', icon: Compass},
        ],
    },
    {
        id: 'create',
        title: 'nav.create',
        requiresAuth: true,
        items: [
            {id: 'my-channels', label: 'nav.myChannels', to: '/me/channels', icon: Tv, module: 'videos'},
            {id: 'my-videos', label: 'nav.myVideos', to: '/me/videos', icon: Video, module: 'videos'},
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
            {id: 'my-profile', label: 'nav.myProfile', to: '/@__dynamic__', icon: UserCircle, isDynamic: true},
            {id: 'my-articles', label: 'nav.myArticles', to: '/me/articles', icon: FileText, module: 'articles'},
            {id: 'my-subscription', label: 'nav.mySubscription', to: '/me/subscription', icon: CreditCard, module: 'payment'},
            {id: 'history', label: 'nav.history', to: '/me/history', icon: History},
            {id: 'favorites', label: 'nav.favorites', to: '/me/favorites', icon: Heart},
            {id: 'playlists', label: 'nav.playlists', to: '/me/playlists', icon: ListVideo, module: 'videos'},
        ],
    },
];
