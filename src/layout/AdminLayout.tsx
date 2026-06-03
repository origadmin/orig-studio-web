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
    FileText,
    Bell,
    Shield,
    CreditCard,
    Megaphone,
    Tv2,
    Plus,
    Zap,
    Home,
    Globe,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useFeatureFlags} from '@/contexts/FeatureFlagsContext';

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

const AdminLayout = () => {
    const {t, i18n} = useTranslation();
    const routerState = useRouterState();
    const featureFlags = useFeatureFlags();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Navigation sections — matching prototype drm_management_unified_nav/code.html
    const navSections: NavSection[] = [
        {
            // No header — top-level items
            items: [
                {id: "dashboard", icon: LayoutDashboard, label: t('admin.dashboard'), path: "/admin"},
                {id: "media", icon: Film, label: t('admin.media'), path: "/admin/media"},
                {id: "articles", icon: FileText, label: t('admin.articles'), path: "/admin/articles"},
            ],
        },
        {
            header: t('admin.sectionDistribution', 'Distribution'),
            items: [
                {id: "channels", icon: Radio, label: t('admin.channels'), path: "/admin/channels"},
                ...(featureFlags.liveRooms ? [{id: "live-rooms", icon: Tv2, label: t('admin.liveRooms', 'Live Rooms'), path: "/admin/live-rooms"}] : []),
            ],
        },
        {
            header: t('admin.sectionSecurity', 'Security & Access'),
            items: [
                ...(featureFlags.drm ? [{id: "drm", icon: Shield, label: t('admin.drm', 'DRM Management'), path: "/admin/drm"}] : []),
                {id: "users", icon: Users, label: t('admin.users'), path: "/admin/users"},
                {id: "permissions", icon: Shield, label: t('admin.permissions', 'Permissions'), path: "/admin/permissions"},
            ],
        },
        {
            header: t('admin.sectionCommerce', 'Commerce'),
            items: [
                ...(featureFlags.payment ? [{id: "payment", icon: CreditCard, label: t('admin.payment', 'Payment'), path: "/admin/payment"}] : []),
                ...(featureFlags.promotion ? [{id: "promotion", icon: Megaphone, label: t('admin.promotion', 'Promotion'), path: "/admin/promotion"}] : []),
                ...(featureFlags.ads ? [{id: "ads", icon: Megaphone, label: t('admin.ads', 'Ads'), path: "/admin/ads"}] : []),
            ],
        },
        {
            header: t('admin.sectionContent', 'Content'),
            items: [
                {id: "playlists", icon: PlayCircle, label: t('admin.playlists'), path: "/admin/playlists"},
                {id: "categories", icon: FolderTree, label: t('admin.categories'), path: "/admin/categories"},
                {id: "tags", icon: Tags, label: t('admin.tags'), path: "/admin/tags"},
                {id: "comments", icon: MessageSquare, label: t('admin.comments'), path: "/admin/comments"},
            ],
        },
        {
            header: t('admin.sectionSystem', 'System'),
            items: [
                {
                    id: "transcoding-profiles",
                    icon: Cpu,
                    label: t('admin.transcodingProfiles', 'Transcoding'),
                    path: "/admin/transcoding/profiles"
                },
                {
                    id: "transcoding-status",
                    icon: Activity,
                    label: t('admin.transcodingStatus', 'Transcoding Status'),
                    path: "/admin/transcoding/status"
                },
                {id: "notifications", icon: Bell, label: t('admin.notifications', 'Notifications'), path: "/admin/notifications"},
                {id: "settings", icon: Settings, label: t('admin.settings'), path: "/admin/settings"},
            ],
        },
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
            breadcrumbs.push({label: t('admin.transcodingProfiles', 'Transcoding'), path: "/admin/transcoding/profiles"});
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
            breadcrumbs.push({label: t('admin.notifications', 'Notifications'), path: "/admin/notifications"});
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
            breadcrumbs.push({label: t('admin.drm', 'DRM Management'), path: "/admin/drm"});
        } else if (path.startsWith("/admin/promotion")) {
            breadcrumbs.push({label: t('admin.promotion', 'Promotion'), path: "/admin/promotion"});
        } else if (path.startsWith("/admin/ads")) {
            breadcrumbs.push({label: t('admin.ads', 'Ads'), path: "/admin/ads"});
        } else if (path.startsWith("/admin/permissions")) {
            breadcrumbs.push({label: t('admin.permissions', 'Permissions'), path: "/admin/permissions"});
        } else if (path.startsWith("/admin/portal")) {
            breadcrumbs.push({label: t('admin.portal', 'Portal'), path: "/admin/portal"});
        }

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    const isActive = (path: string) => {
        if (path === "/admin") {
            return routerState.location.pathname === "/admin";
        }
        return routerState.location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-[#0c1324] text-[#dce1fb] flex">
            {/* Sidebar — matching prototype: bg-surface-container-low (#151b2d) w-[240px] */}
            <aside className={`${sidebarCollapsed ? 'w-20' : 'w-[240px]'} bg-[#151b2d] flex-shrink-0 flex flex-col transition-all duration-300 border-r border-[#464555] fixed left-0 top-0 h-full z-40 overflow-y-auto`}>
                {/* Logo — matching prototype: border-b, shield icon, "OrigStudio" + "Enterprise Edition" */}
                <div className={`flex items-center border-b border-[#464555] ${sidebarCollapsed ? 'justify-center py-4' : 'p-4'}`}>
                    <Link to="/admin" className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[#4f46e5] rounded flex items-center justify-center flex-shrink-0">
                            <Shield size={20} className="text-[#1d00a5]" style={{fill: 'currentColor'}}/>
                        </div>
                        {!sidebarCollapsed && (
                            <div>
                                <div className="font-black text-[20px] leading-tight text-[#dce1fb]">OrigStudio</div>
                                <div className="text-[10px] uppercase tracking-widest text-[#c7c4d8] opacity-70">Enterprise Edition</div>
                            </div>
                        )}
                    </Link>
                </div>

                {/* New Asset Button — matching prototype */}
                {!sidebarCollapsed && (
                    <div className="p-4 border-b border-[#464555]">
                        <button className="w-full bg-[#4f46e5] text-[#dad7ff] font-semibold text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]">
                            <Plus size={18}/>
                            New Asset
                        </button>
                    </div>
                )}

                {/* Navigation — matching prototype: section headers + items with border-l-4 active */}
                <nav className="flex-1 py-4">
                    {navSections.map((section, si) => (
                        <div key={si}>
                            {/* Section header — matching prototype: pt-4 pb-2 px-4 text-[11px] uppercase tracking-[0.05em] opacity-50 */}
                            {section.header && !sidebarCollapsed && (
                                <li className="pt-4 pb-2 px-4 text-[11px] uppercase tracking-[0.05em] font-bold text-[#c7c4d8] opacity-50 list-none">
                                    {section.header}
                                </li>
                            )}
                            {/* Section items */}
                            <ul className="space-y-0.5">
                                {section.items.map((item) => {
                                    const active = isActive(item.path);
                                    return (
                                        <li key={item.path}>
                                            <Link
                                                to={item.path}
                                                className={`cursor-pointer flex items-center gap-3 w-full transition-all ${
                                                    sidebarCollapsed ? 'justify-center px-2 py-2 mx-auto' : 'px-4 py-2'
                                                } ${
                                                    active
                                                        ? 'bg-[#4f46e5]/10 text-[#c3c0ff] border-l-4 border-[#4f46e5] font-semibold'
                                                        : 'text-[#c7c4d8] hover:bg-[#23293c] border-l-4 border-transparent'
                                                }`}
                                                title={sidebarCollapsed ? item.label : undefined}
                                            >
                                                <item.icon size={20} className="flex-shrink-0"/>
                                                {!sidebarCollapsed && <span className="text-sm truncate">{item.label}</span>}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* System Health — matching prototype: bottom section */}
                {!sidebarCollapsed && (
                    <div className="p-4 bg-[#2e3447]/20 mt-auto">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-[#67f4b7] flex items-center justify-center">
                                <Zap size={16} className="text-[#006e4b]"/>
                            </div>
                            <div>
                                <div className="text-[12px] font-bold text-[#dce1fb]">System Health</div>
                                <div className="text-[10px] text-[#4edea3]">99.98% Operational</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exit */}
                <div className={`${sidebarCollapsed ? 'p-3' : 'px-4 py-3'} border-t border-[#464555]`}>
                    <Link
                        to="/"
                        className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-4 py-2'} text-[#c7c4d8] hover:text-[#dce1fb] hover:bg-[#23293c] rounded-lg transition-colors`}
                    >
                        <LogOut size={20}/>
                        {!sidebarCollapsed && <span className="text-sm font-medium">{t('admin.exitAdmin')}</span>}
                    </Link>
                </div>
            </aside>

            {/* Main Content — matching prototype: pl-[240px] pt-14 */}
            <div className={`${sidebarCollapsed ? 'pl-20' : 'pl-[240px]'} pt-14 flex-grow flex flex-col min-w-0 transition-all duration-300`}>
                {/* TopBar — matching prototype: h-14 bg-surface border-b */}
                <header className="h-14 bg-[#0c1324] border-b border-[#464555] flex items-center justify-between px-6 fixed top-0 right-0 left-0 z-50" style={{left: sidebarCollapsed ? '80px' : '240px'}}>
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-[24px] font-bold text-[#4f46e5]">OrigStudio Enterprise</span>
                        <div className="h-6 w-px bg-[#464555] ml-4 mr-2"/>
                        <nav className="flex items-center gap-6">
                            <span className="text-[#c7c4d8] text-sm hover:bg-[#23293c] transition-colors px-2 py-1 rounded cursor-pointer">Support</span>
                            <span className="text-[#c7c4d8] text-sm hover:bg-[#23293c] transition-colors px-2 py-1 rounded cursor-pointer">Documentation</span>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Language Switcher */}
                        <button
                            className="flex items-center gap-1.5 text-sm text-[#c7c4d8] hover:text-[#dce1fb] transition-colors"
                            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
                        >
                            <Globe className="w-4 h-4"/>
                            <span>{i18n.language === 'zh' ? '中文' : 'EN'}</span>
                        </button>
                        {/* Collapse toggle */}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 rounded-full hover:bg-[#23293c] transition-colors text-[#c7c4d8]"
                        >
                            <Home size={18}/>
                        </button>
                        {/* Notifications */}
                        <button className="p-2 rounded-full hover:bg-[#23293c] transition-colors text-[#c7c4d8]">
                            <Bell size={18}/>
                        </button>
                        {/* Settings */}
                        <button className="p-2 rounded-full hover:bg-[#23293c] transition-colors text-[#c7c4d8]">
                            <Settings size={18}/>
                        </button>
                        {/* User */}
                        <div className="h-8 w-8 rounded-full border border-[#464555] bg-[#4f46e5] flex items-center justify-center text-xs font-bold text-[#dad7ff]">A</div>
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
