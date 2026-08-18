/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import React, {useState, useMemo, memo, useCallback} from 'react';
import {Outlet, Link, useRouterState, useNavigate} from '@tanstack/react-router';
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
    Tv2,
    Layers,
    Layout,
    Plus,
    Zap,
    PanelLeft,
    Search,
    BadgeDollarSign,
    ClipboardCheck,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useFeatureFlags} from '@/contexts/FeatureFlagsContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import NotificationBadge from '@/components/common/NotificationBadge';
import UploadCenter from '@/components/common/UploadCenter';
import {Input} from '@/components/ui/input';

interface NavItem {
    id: string;
    icon: React.ComponentType<{size?: number; className?: string}>;
    label: string;
    path: string;
    tabMatch?: string;
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
                {id: "review", icon: ClipboardCheck, label: t('admin.review', '内容审核'), path: "/admin/review"},
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
            ],
        },
        {
            header: t('admin.sectionPortal', '站点与门户'),
            items: [
                {id: "portal", icon: Layout, label: t('admin.portalConfig', '门户配置'), path: "/admin/portal", tabMatch: "navigation"},
            ],
        },
        {
            header: t('admin.sectionSystem', '系统'),
            items: [
                ...(featureFlags.notifications ? [{id: "notifications", icon: Bell, label: t('admin.notifications', '通知管理'), path: "/admin/notifications"}] : []),
                // R-S3: internal style-guide is dev/staging only — hidden in production builds.
                ...(import.meta.env.DEV ? [{id: "style-guide", icon: Layers, label: t('admin.styleGuide', '组件规范'), path: "/admin/style-guide"}] : []),
                {id: "settings", icon: Settings, label: t('admin.settings'), path: "/admin/settings"},
            ],
        },
    ], [t, featureFlags]);

    const isActive = (item: NavItem) => {
        if (item.path === "/admin") return pathname === "/admin";
        if (item.tabMatch) {
            const sp = new URLSearchParams(window.location.search);
            return pathname === item.path && sp.get("tab") === item.tabMatch;
        }
        return pathname.startsWith(item.path);
    };

    return (
        <aside className={`${collapsed ? 'w-20' : 'w-[240px]'} bg-sidebar flex-shrink-0 flex flex-col transition-all duration-300 border-r border-sidebar-border fixed left-0 top-0 h-full z-40`}>
            {/* Logo */}
            <div className={`flex items-center border-b border-sidebar-border flex-shrink-0 ${collapsed ? 'justify-center py-4' : 'p-4'}`}>
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
            <nav className="flex-1 overflow-y-auto sidebar-scrollbar py-4">
                {navSections.map((section, si) => (
                    <div key={si}>
                        {section.header && !collapsed && (
                            <div className="pt-4 pb-2 px-4 text-[11px] uppercase tracking-[0.05em] font-bold text-sidebar-foreground/50">
                                {section.header}
                            </div>
                        )}
                        <ul className="space-y-0.5">
                            {section.items.map((item) => {
                                const active = isActive(item);
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

            {/* System Health */}
            {!collapsed && (
                <div className="p-4 bg-sidebar-accent/10 flex-shrink-0">
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

            {/* Bottom Actions: Exit only (collapse moved to TopBar near search) */}
            <div className={`${collapsed ? 'p-2' : 'px-4 py-2'} border-t border-sidebar-border flex-shrink-0`}>
                <Link
                    to="/"
                    className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2 py-2'} text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/10 rounded-lg transition-colors`}
                >
                    <LogOut size={20}/>
                    {!collapsed && <span className="text-sm font-medium">{t('admin.exitAdmin')}</span>}
                </Link>
            </div>
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
    const navigate = useNavigate();

    const handleNewUpload = useCallback(() => {
        navigate({to: '/admin/media', search: {upload: 1}});
    }, [navigate]);

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
        if (pathname.startsWith('/admin/portal')) return t('admin.portalConfig', '门户配置');
        if (pathname.startsWith('/admin/playlists')) return t('admin.playlists');
        if (pathname.startsWith('/admin/categories')) return t('admin.categories');
        if (pathname.startsWith('/admin/tags')) return t('admin.tags');
        if (pathname.startsWith('/admin/comments')) return t('admin.comments');
        if (pathname.startsWith('/admin/transcoding')) return t('admin.transcodingProfiles', '转码预设');
        if (pathname.startsWith('/admin/notifications')) return t('admin.notifications', '通知管理');
        if (pathname.startsWith('/admin/review')) return t('admin.review', '内容审核');
        if (pathname.startsWith('/admin/settings')) return t('admin.settings');
        return t('admin.dashboard');
    }, [pathname, t]);

    return (
        <header
            className="h-14 bg-background border-b border-border flex items-center justify-between px-6 fixed top-0 right-0 z-50 transition-all duration-300"
            style={{left: collapsed ? '80px' : '240px'}}
        >
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleCollapse}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                    title={collapsed ? t('nav.expand', '展开菜单') : t('nav.collapse', '收起菜单')}
                >
                    <PanelLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}/>
                </button>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
                    <Input
                        className="w-64 pl-10 rounded-full bg-muted/50"
                        placeholder={t('admin.searchPlaceholder', '搜索...')}
                        type="text"
                    />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <LanguageSwitcher variant="compact"/>
                <NotificationBadge/>
                <UploadCenter onNewUpload={handleNewUpload}/>
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
                <main className="flex-grow overflow-auto bg-muted/30">
                    <Outlet/>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
