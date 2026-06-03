/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import React, {useState} from 'react';
import {Outlet, Link, useRouterState} from '@tanstack/react-router';
import {
    LayoutDashboard,
    Film,
    Users,
    Settings,
    LogOut,
    FolderTree,
    Radio,
    Tags,
    MessageSquare,
    PlayCircle,
    Cpu,
    Activity,
    Home,
    FileText,
    Bell,
    Shield,
    CreditCard,
    Megaphone,
    Tv2,
    ChevronLeft,
    Globe,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useFeatureFlags} from '@/contexts/FeatureFlagsContext';

const AdminLayout = () => {
    const {t, i18n} = useTranslation();
    const routerState = useRouterState();
    const featureFlags = useFeatureFlags();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const menuItems = [
        {id: "dashboard", icon: LayoutDashboard, label: t('admin.dashboard'), path: "/admin"},
        {id: "media", icon: Film, label: t('admin.media'), path: "/admin/media"},
        {
            id: "transcoding-profiles",
            icon: Cpu,
            label: t('admin.transcodingProfiles') || "Transcoding Profiles",
            path: "/admin/transcoding/profiles"
        },
        {
            id: "transcoding-status",
            icon: Activity,
            label: t('admin.transcodingStatus') || "Transcoding Status",
            path: "/admin/transcoding/status"
        },
        {id: "users", icon: Users, label: t('admin.users'), path: "/admin/users"},
        {id: "categories", icon: FolderTree, label: t('admin.categories'), path: "/admin/categories"},
        {id: "channels", icon: Radio, label: t('admin.channels'), path: "/admin/channels"},
        {id: "tags", icon: Tags, label: t('admin.tags'), path: "/admin/tags"},
        {id: "comments", icon: MessageSquare, label: t('admin.comments'), path: "/admin/comments"},
        {id: "notifications", icon: Bell, label: t('admin.notifications') || "Notifications", path: "/admin/notifications"},
        {id: "playlists", icon: PlayCircle, label: t('admin.playlists'), path: "/admin/playlists"},
        {id: "articles", icon: FileText, label: t('admin.articles'), path: "/admin/articles"},
        // EE features — only shown when feature flag is enabled
        ...(featureFlags.liveRooms ? [{id: "live-rooms", icon: Tv2, label: t('admin.liveRooms', 'Live Rooms'), path: "/admin/live-rooms"}] : []),
        ...(featureFlags.drm ? [{id: "drm", icon: Shield, label: t('admin.drm', 'DRM'), path: "/admin/drm"}] : []),
        ...(featureFlags.payment ? [{id: "payment", icon: CreditCard, label: t('admin.payment', 'Payment'), path: "/admin/payment"}] : []),
        ...(featureFlags.promotion ? [{id: "promotion", icon: Megaphone, label: t('admin.promotion', 'Promotion'), path: "/admin/promotion"}] : []),
        ...(featureFlags.ads ? [{id: "ads", icon: Megaphone, label: t('admin.ads', 'Ads'), path: "/admin/ads"}] : []),
        {id: "settings", icon: Settings, label: t('admin.settings'), path: "/admin/settings"},
    ];

    // Breadcrumbs
    const getBreadcrumbs = () => {
        const path = routerState.location.pathname;
        const breadcrumbs: {label: string; path: string}[] = [
            {label: t('nav.home'), path: "/admin"}
        ];

        if (path.startsWith("/admin/media")) {
            breadcrumbs.push({label: t('admin.media'), path: "/admin/media"});
        } else if (path.startsWith("/admin/transcoding")) {
            breadcrumbs.push({label: t('admin.transcodingProfiles') || "Transcoding", path: "/admin/transcoding/profiles"});
        } else if (path.startsWith("/admin/users")) {
            breadcrumbs.push({label: t('admin.users'), path: "/admin/users"});
        } else if (path.startsWith("/admin/categories")) {
            breadcrumbs.push({label: t('admin.categories'), path: "/admin/categories"});
        } else if (path.startsWith("/admin/channels")) {
            breadcrumbs.push({label: t('admin.channels'), path: "/admin/channels"});
        } else if (path.startsWith("/admin/tags")) {
            breadcrumbs.push({label: t('admin.tags'), path: "/admin/tags"});
        } else if (path.startsWith("/admin/comments")) {
            breadcrumbs.push({label: t('admin.comments'), path: "/admin/comments"});
        } else if (path.startsWith("/admin/notifications")) {
            breadcrumbs.push({label: t('admin.notifications') || "Notifications", path: "/admin/notifications"});
        } else if (path.startsWith("/admin/playlists")) {
            breadcrumbs.push({label: t('admin.playlists'), path: "/admin/playlists"});
        } else if (path.startsWith("/admin/articles")) {
            breadcrumbs.push({label: t('admin.articles'), path: "/admin/articles"});
        } else if (path.startsWith("/admin/settings")) {
            breadcrumbs.push({label: t('admin.settings'), path: "/admin/settings"});
        } else if (path.startsWith("/admin/live-rooms")) {
            breadcrumbs.push({label: t('admin.liveRooms', 'Live Rooms'), path: "/admin/live-rooms"});
        } else if (path.startsWith("/admin/payment")) {
            breadcrumbs.push({label: t('admin.payment', 'Payment'), path: "/admin/payment"});
        } else if (path.startsWith("/admin/drm")) {
            breadcrumbs.push({label: t('admin.drm', 'DRM'), path: "/admin/drm"});
        } else if (path.startsWith("/admin/promotion")) {
            breadcrumbs.push({label: t('admin.promotion', 'Promotion'), path: "/admin/promotion"});
        } else if (path.startsWith("/admin/ads")) {
            breadcrumbs.push({label: t('admin.ads', 'Ads'), path: "/admin/ads"});
        } else if (path.startsWith("/admin/permissions")) {
            breadcrumbs.push({label: t('admin.permissions'), path: "/admin/permissions"});
        } else if (path.startsWith("/admin/portal")) {
            breadcrumbs.push({label: t('admin.portal', 'Portal'), path: "/admin/portal"});
        }

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar — matching prototype: bg-[#0F172A] w-64 */}
            <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-[#0F172A] flex-shrink-0 flex flex-col transition-all duration-300`}>
                {/* Logo */}
                <div className={`flex items-center border-b border-white/10 ${sidebarCollapsed ? 'justify-center py-4' : 'px-5 py-4'}`}>
                    <Link to="/admin" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">OS</span>
                        </div>
                        {!sidebarCollapsed && (
                            <span className="text-white font-semibold text-[15px] tracking-tight">OrigStudio</span>
                        )}
                    </Link>
                </div>

                {/* Nav Items */}
                <nav className={`flex-grow py-4 space-y-0.5 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
                    {menuItems.map((item) => {
                        const isActive = item.path === "/admin"
                            ? routerState.location.pathname === "/admin"
                            : routerState.location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 rounded-lg transition-all duration-150 ${
                                    sidebarCollapsed ? 'justify-center w-12 h-11 mx-auto' : 'px-3 py-2.5'
                                } ${
                                    isActive
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <item.icon size={20} className="flex-shrink-0"/>
                                {!sidebarCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Exit */}
                <div className={`${sidebarCollapsed ? 'p-3' : 'px-3 py-4'} border-t border-white/10`}>
                    <Link
                        to="/"
                        className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3 py-2.5'} text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors`}
                    >
                        <LogOut size={20}/>
                        {!sidebarCollapsed && <span className="text-sm font-medium">{t('admin.exitAdmin')}</span>}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow flex flex-col min-w-0">
                {/* TopBar — matching prototype: h-16 bg-white border-b */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
                    <div className="flex items-center gap-2">
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.path}>
                                {index > 0 && <span className="text-slate-300 mx-1">/</span>}
                                <Link
                                    to={crumb.path}
                                    className={`text-sm ${
                                        index === breadcrumbs.length - 1
                                            ? 'text-slate-800 font-semibold'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {crumb.label}
                                </Link>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Language Switcher */}
                        <button
                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
                        >
                            <Globe className="w-4 h-4"/>
                            <span>{i18n.language === 'zh' ? '中文' : 'EN'}</span>
                        </button>
                        {/* Collapse toggle */}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}/>
                        </button>
                        {/* User */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">A</div>
                            <span className="text-sm font-medium text-slate-700">{t('admin.administrator')}</span>
                        </div>
                    </div>
                </header>
                <main className="flex-grow overflow-auto">
                    <Outlet/>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
