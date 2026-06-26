/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import React, {useState, useMemo, memo} from 'react';
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
    FileText,
    Bell,
    Shield,
    Key,
    CreditCard,
    Megaphone,
    Target,
    Tv2,
    Plus,
    Zap,
    PanelLeft,
    Search,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useFeatureFlags} from '@/contexts/FeatureFlagsContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

interface NavItem {
    id: string;
    icon: React.ComponentType<{size?: number; className?: string}>;
    label: string;
    path: string;
}

interface NavSection {
    header?: string;
    items: NavItem[];
}

// ─── Sidebar (memoized — only re-renders when pathname or collapse state changes) ───

interface SidebarProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
}

const AdminSidebar = memo(function AdminSidebar({collapsed, onToggleCollapse}: SidebarProps) {
    const {t} = useTranslation();
    const pathname = useRouterState({select: (s) => s.location.pathname});
    const featureFlags = useFeatureFlags();

    const navSections: NavSection[] = useMemo(() => [
        {
            // Core video business features (always visible - primary focus)
            header: t('admin.sectionCore', '核心功能'),
            items: [
                {id: "dashboard", icon: LayoutDashboard, label: t('admin.dashboard'), path: "/admin"},
                {id: "media", icon: Film, label: t('admin.media'), path: "/admin/media"},
                {id: "transcoding-profiles", icon: Cpu, label: t('admin.transcodingProfiles', '转码预设'), path: "/admin/transcoding/profiles"},
                {id: "transcoding-status", icon: Activity, label: t('admin.transcodingStatus', '转码状态'), path: "/admin/transcoding/status"},
            ],
        },
        {
            header: t('admin.sectionDistribution', '分发'),
            items: [
                {id: "channels", icon: Radio, label: t('admin.channels'), path: "/admin/channels"},
                ...(featureFlags.liveRooms ? [{id: "live-rooms", icon: Tv2, label: t('admin.liveRooms', '直播间'), path: "/admin/live-rooms"}] : []),
            ],
        },
        {
            header: t('admin.sectionContent', '内容管理'),
            items: [
                ...(featureFlags.playlists ? [{id: "playlists", icon: PlayCircle, label: t('admin.playlists'), path: "/admin/playlists"}] : []),
                {id: "categories", icon: FolderTree, label: t('admin.categories'), path: "/admin/categories"},
                {id: "tags", icon: Tags, label: t('admin.tags'), path: "/admin/tags"},
                ...(featureFlags.comments ? [{id: "comments", icon: MessageSquare, label: t('admin.comments'), path: "/admin/comments"}] : []),
                ...(featureFlags.articles ? [{id: "articles", icon: FileText, label: t('admin.articles'), path: "/admin/articles"}] : []),
            ],
        },
        {
            header: t('admin.sectionSecurity', '安全与权限'),
            items: [
                ...(featureFlags.drm ? [{id: "drm", icon: Shield, label: t('admin.drm', 'DRM保护'), path: "/admin/drm"}] : []),
                ...(featureFlags.users ? [{id: "users", icon: Users, label: t('admin.users'), path: "/admin/users"}] : []),
                ...(featureFlags.permissions ? [{id: "permissions", icon: Key, label: t('admin.permissions', '权限管理'), path: "/admin/permissions"}] : []),
            ],
        },
        {
            header: t('admin.sectionCommerce', '商业化'),
            items: [
                ...(featureFlags.payment ? [{id: "payment", icon: CreditCard, label: t('admin.payment', '付费管理'), path: "/admin/payment"}] : []),
                ...(featureFlags.promotion ? [{id: "promotion", icon: Megaphone, label: t('admin.promotion', '推广管理'), path: "/admin/promotion"}] : []),
                ...(featureFlags.ads ? [{id: "ads", icon: Target, label: t('admin.ads', '广告管理'), path: "/admin/ads"}] : []),
            ],
        },
        {
            header: t('admin.sectionSystem', '系统'),
            items: [
                ...(featureFlags.notifications ? [{id: "notifications", icon: Bell, label: t('admin.notifications', '通知管理'), path: "/admin/notifications"}] : []),
                {id: "settings", icon: Settings, label: t('admin.settings'), path: "/admin/settings"},
            ],
        },
    ], [t, featureFlags]);

    const isActive = (path: string) => {
        if (path === "/admin") return pathname === "/admin";
        return pathname.startsWith(path);
    };

    return (
        <aside className={`${collapsed ? 'w-20' : 'w-[240px]'} bg-sidebar flex-shrink-0 flex flex-col transition-all duration-300 border-r border-sidebar-border fixed left-0 top-0 h-full z-40 overflow-y-auto`}>
            {/* Logo */}
            <div className={`flex items-center border-b border-sidebar-border ${collapsed ? 'justify-center py-4' : 'p-4'}`}>
                <Link to="/admin" className="flex items-center gap-3">
                    <img
                        src="/logo.svg"
                        alt="OrigStudio"
                        className="h-10 w-10 flex-shrink-0"
                    />
                    {!collapsed && (
                        <div>
                            <div className="font-black text-[20px] leading-tight text-sidebar-foreground">OrigStudio</div>
                            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">企业版</div>
                        </div>
                    )}
                </Link>
            </div>



            {/* Navigation */}
            <nav className="flex-1 py-4">
                {navSections.map((section, si) => (
                    <div key={si}>
                        {section.header && !collapsed && (
                            <div className="pt-4 pb-2 px-4 text-[11px] uppercase tracking-[0.05em] font-bold text-sidebar-foreground/50">
                                {section.header}
                            </div>
                        )}
                        <ul className="space-y-0.5">
                            {section.items.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            className={`cursor-pointer flex items-center gap-3 w-full transition-all ${
                                                collapsed ? 'justify-center px-2 py-2 mx-auto' : 'px-4 py-2'
                                            } ${
                                                active
                                                    ? 'bg-sidebar-accent/20 text-sidebar-accent-foreground border-l-4 border-sidebar-accent font-semibold'
                                                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/10 border-l-4 border-transparent'
                                            }`}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <item.icon size={20} className="flex-shrink-0"/>
                                            {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Exit */}
            <div className={`${collapsed ? 'p-3' : 'px-4 py-3'} border-t border-sidebar-border`}>
                <Link
                    to="/"
                    className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4 py-2'} text-sidebar-foreground/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors`}
                >
                    <LogOut size={20}/>
                    {!collapsed && <span className="text-sm font-medium">{t('admin.exitAdmin')}</span>}
                </Link>
            </div>

            {/* System Health */}
            {!collapsed && (
                <div className="p-4 bg-sidebar-accent/10">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-sidebar-accent/20 flex items-center justify-center">
                            <Zap size={16} className="text-sidebar-accent"/>
                        </div>
                        <div>
                            <div className="text-[12px] font-bold text-sidebar-foreground">{t('admin.systemHealth', '系统健康')}</div>
                            <div className="text-[10px] text-sidebar-accent">99.98% {t('admin.operational', '运行正常')}</div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
});

// ─── TopBar (memoized — only re-renders when pathname or collapse state changes) ───

interface TopBarProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
}

const AdminTopBar = memo(function AdminTopBar({collapsed, onToggleCollapse}: TopBarProps) {
    const {t} = useTranslation();
    const pathname = useRouterState({select: (s) => s.location.pathname});

    // Derive current page label from pathname
    const currentPageLabel = useMemo(() => {
        if (pathname === '/admin') return t('admin.dashboard');
        if (pathname.startsWith('/admin/media')) return t('admin.media');
        if (pathname.startsWith('/admin/articles')) return t('admin.articles');
        if (pathname.startsWith('/admin/channels')) return t('admin.channels');
        if (pathname.startsWith('/admin/live-rooms')) return t('admin.liveRooms', '直播间');
        if (pathname.startsWith('/admin/drm')) return t('admin.drm', 'DRM保护');
        if (pathname.startsWith('/admin/users')) return t('admin.users');
        if (pathname.startsWith('/admin/permissions')) return t('admin.permissions', '权限管理');
        if (pathname.startsWith('/admin/payment')) return t('admin.payment', '付费管理');
        if (pathname.startsWith('/admin/promotion')) return t('admin.promotion', '推广管理');
        if (pathname.startsWith('/admin/ads')) return t('admin.ads', '广告管理');
        if (pathname.startsWith('/admin/playlists')) return t('admin.playlists');
        if (pathname.startsWith('/admin/categories')) return t('admin.categories');
        if (pathname.startsWith('/admin/tags')) return t('admin.tags');
        if (pathname.startsWith('/admin/comments')) return t('admin.comments');
        if (pathname.startsWith('/admin/transcoding')) return t('admin.transcodingProfiles', '转码预设');
        if (pathname.startsWith('/admin/notifications')) return t('admin.notifications', '通知管理');
        if (pathname.startsWith('/admin/settings')) return t('admin.settings');
        return t('admin.dashboard');
    }, [pathname, t]);

    return (
        <header
            className="h-14 bg-background border-b border-border flex items-center justify-between px-6 fixed top-0 right-0 z-50 transition-all duration-300"
            style={{left: collapsed ? '80px' : '240px'}}
        >
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                    <input
                        className="bg-muted/50 border-none rounded-full py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary w-64 placeholder:text-muted-foreground"
                        placeholder={t('admin.searchPlaceholder', '搜索...')}
                        type="text"
                    />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <LanguageSwitcher variant="compact"/>
                <button
                    onClick={onToggleCollapse}
                    className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground"
                >
                    <PanelLeft size={18}/>
                </button>
                <button className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground">
                    <Bell size={18}/>
                </button>
                <button className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground">
                    <Settings size={18}/>
                </button>
                <div className="h-8 w-8 rounded-full border border-border bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">A</div>
            </div>
        </header>
    );
});

// ─── Layout shell (stable — only manages collapse state) ───

const AdminLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            <AdminSidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(c => !c)}
            />
            <div className={`${sidebarCollapsed ? 'pl-20' : 'pl-[240px]'} pt-14 flex-grow flex flex-col min-w-0 transition-all duration-300`}>
                <AdminTopBar
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(c => !c)}
                />
                <main className="flex-grow overflow-auto bg-muted/30 p-6">
                    <Outlet/>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
