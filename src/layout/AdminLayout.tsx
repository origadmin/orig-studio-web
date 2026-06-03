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
    PanelLeftClose,
    PanelLeftOpen,
    Home,
    FileText,
    Bell,
    Shield,
    CreditCard,
    Megaphone,
    Tv2,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@/themes';
import {useFeatureFlags} from '@/contexts/FeatureFlagsContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

const AdminLayout = () => {
    const {t} = useTranslation();
    const {isDark, toggleDark} = useTheme();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const routerState = useRouterState();
    const featureFlags = useFeatureFlags();

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

    // 生成面包屑路径
    const getBreadcrumbs = () => {
        const path = routerState.location.pathname;
        const breadcrumbs: {label: string; path: string; icon?: any}[] = [
            {label: t('nav.home'), path: "/admin", icon: Home}
        ];

        if (path.startsWith("/admin/media")) {
            breadcrumbs.push({label: t('admin.media'), path: "/admin/media"});
        } else if (path.startsWith("/admin/transcoding/profiles")) {
            breadcrumbs.push({label: t('admin.media'), path: "/admin/media"});
            breadcrumbs.push({label: t('admin.transcodingProfiles'), path: "/admin/transcoding/profiles"});
        } else if (path.startsWith("/admin/transcoding/status")) {
            breadcrumbs.push({label: t('admin.media'), path: "/admin/media"});
            breadcrumbs.push({label: t('admin.transcodingStatus'), path: "/admin/transcoding/status"});
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
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside
                className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-sidebar text-sidebar-foreground flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out`}>
                <div className={`flex items-center border-b border-sidebar-border ${sidebarCollapsed ? 'justify-center py-3' : 'px-4 py-3'}`}>
                    <Link to="/admin" className="flex items-center gap-2 transition-all duration-300 ease-in-out">
                        <img src="/logo.svg" alt="OrigStudio" className="h-14 w-14 flex-shrink-0" />
                        {!sidebarCollapsed && (
                            <span className="text-lg font-semibold tracking-tight text-brand whitespace-nowrap">{t('admin.welcomeAdmin')}</span>
                        )}
                    </Link>
                </div>
                <nav className={`flex-grow space-y-2 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
                    {menuItems.map((item) => (
                        <NavItem
                            key={item.path}
                            to={item.path}
                            icon={<item.icon size={24}/>}
                            label={item.label}
                            exact={item.path === "/admin"}
                            collapsed={sidebarCollapsed}
                        />
                    ))}
                </nav>
                <div className={`${sidebarCollapsed ? 'p-3' : 'p-6'} border-t border-sidebar-border`}>
                    <Link
                        to="/"
                        className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors`}
                    >
                        <LogOut size={20}/>
                        {!sidebarCollapsed && <span>{t('admin.exitAdmin')}</span>}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-grow flex flex-col min-w-0 relative">
                {/* Floating toggle button on the divider line */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute top-12 z-50 w-8 h-8 bg-card border border-border rounded-full shadow-md flex items-center justify-center hover:bg-accent transition-all duration-200 hover:scale-110"
                    style={{ left: -16 }}
                    title={sidebarCollapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
                >
                    {sidebarCollapsed ? (
                        <PanelLeftOpen size={18} className="text-muted-foreground" />
                    ) : (
                        <PanelLeftClose size={18} className="text-muted-foreground" />
                    )}
                </button>

                <header className="h-16 bg-card border-b flex items-center justify-between px-8">
                    <div className="flex items-center gap-2">
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.path}>
                                {index > 0 && (
                                    <span className="text-muted-foreground"> {'>'} </span>
                                )}
                                <Link
                                    to={crumb.path}
                                    className={`flex items-center gap-1 text-sm ${
                                        index === breadcrumbs.length - 1
                                            ? 'text-foreground font-medium'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {crumb.icon && <crumb.icon size={14}/>}
                                    <span>{crumb.label}</span>
                                </Link>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="flex items-center space-x-4">
                        <LanguageSwitcher variant="compact" buttonClassName="text-muted-foreground hover:text-foreground" />
                        <div
                            className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center text-brand font-bold">A
                        </div>
                        <span className="text-sm font-medium text-foreground">{t('admin.administrator')}</span>
                    </div>
                </header>
                <main className="flex-grow p-8 overflow-auto">
                    <Outlet/>
                </main>
            </div>
        </div>
    );
};

const NavItem = ({to, icon, label, exact = false, collapsed = false}: {
    to: string;
    icon: React.ReactNode;
    label: string;
    exact?: boolean;
    collapsed?: boolean;
}) => {
    const state = useRouterState();
    const isActive = exact
        ? state.location.pathname === to
        : state.location.pathname.startsWith(to);
    return (
        <Link
            to={to}
            className={`flex items-center rounded-lg transition-all duration-300 ease-in-out ${
                collapsed
                    ? 'justify-center w-12 h-12 mx-auto'
                    : 'space-x-3 px-4 py-2'
            } ${
                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            }`}
            title={collapsed ? label : undefined}
        >
            {collapsed ? React.cloneElement(icon as React.ReactElement<any>, { size: 28 }) : icon}
            {!collapsed && <span className="font-medium text-sm truncate">{label}</span>}
        </Link>
    );
};

export default AdminLayout;
