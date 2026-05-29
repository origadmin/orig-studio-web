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
    Layout,
    CreditCard,
    Shield,
    ChevronDown,
    ChevronRight,
    Database,
    Megaphone,
    Lock,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@/themes';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

interface MenuGroup {
    id: string;
    label: string;
    icon: React.ElementType;
    items: { id: string; icon: React.ElementType; label: string; path: string }[];
}

const AdminLayout = () => {
    const {t} = useTranslation();
    const {isDark, toggleDark} = useTheme();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        content: true,
        media: true,
        monetization: true,
        system: true,
    });
    const routerState = useRouterState();

    const menuGroups: MenuGroup[] = [
        {
            id: 'content',
            label: t('admin.groupContent', 'Content'),
            icon: FileText,
            items: [
                {id: "media", icon: Film, label: t('admin.media'), path: "/admin/media"},
                {id: "articles", icon: FileText, label: t('admin.articles'), path: "/admin/articles"},
                {id: "playlists", icon: PlayCircle, label: t('admin.playlists'), path: "/admin/playlists"},
                {id: "categories", icon: FolderTree, label: t('admin.categories'), path: "/admin/categories"},
                {id: "channels", icon: Radio, label: t('admin.channels'), path: "/admin/channels"},
                {id: "tags", icon: Tags, label: t('admin.tags'), path: "/admin/tags"},
                {id: "comments", icon: MessageSquare, label: t('admin.comments'), path: "/admin/comments"},
            ],
        },
        {
            id: 'media',
            label: t('admin.groupMedia', 'Media Processing'),
            icon: Cpu,
            items: [
                {id: "transcoding-profiles", icon: Cpu, label: t('admin.transcodingProfiles'), path: "/admin/transcoding/profiles"},
                {id: "transcoding-status", icon: Activity, label: t('admin.transcodingStatus'), path: "/admin/transcoding/status"},
                {id: "portal", icon: Layout, label: t('admin.portal'), path: "/admin/portal"},
            ],
        },
        {
            id: 'monetization',
            label: t('admin.groupMonetization', 'Monetization'),
            icon: CreditCard,
            items: [
                {id: "live-rooms", icon: Radio, label: t('admin.liveRooms', 'Live Rooms'), path: "/admin/live-rooms"},
                {id: "payment", icon: CreditCard, label: t('admin.payment'), path: "/admin/payment"},
                {id: "drm", icon: Shield, label: t('admin.drm'), path: "/admin/drm"},
            ],
        },
        {
            id: 'system',
            label: t('admin.groupSystem', 'System'),
            icon: Database,
            items: [
                {id: "users", icon: Users, label: t('admin.users'), path: "/admin/users"},
                {id: "notifications", icon: Bell, label: t('admin.notifications'), path: "/admin/notifications"},
                {id: "permissions", icon: Lock, label: t('admin.permissions'), path: "/admin/permissions"},
                {id: "settings", icon: Settings, label: t('admin.settings'), path: "/admin/settings"},
            ],
        },
    ];

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({...prev, [groupId]: !prev[groupId]}));
    };

    const getBreadcrumbs = () => {
        const path = routerState.location.pathname;
        const breadcrumbs: { label: string; path: string; icon?: any }[] = [
            {label: t('nav.home'), path: "/admin", icon: Home},
        ];

        const allItems = menuGroups.flatMap(g => g.items);
        for (const item of allItems) {
            if (path.startsWith(item.path)) {
                breadcrumbs.push({label: item.label, path: item.path});
                break;
            }
        }

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <div className="min-h-screen bg-background flex">
            <aside
                className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-sidebar text-sidebar-foreground flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out`}>
                <div
                    className={`flex items-center border-b border-sidebar-border ${sidebarCollapsed ? 'justify-center py-3' : 'px-4 py-3'}`}>
                    <Link to="/admin" className="flex items-center gap-2 transition-all duration-300 ease-in-out">
                        <img src="/logo.svg" alt="OrigStudio" className="h-14 w-14 flex-shrink-0"/>
                        {!sidebarCollapsed && (
                            <span
                                className="text-lg font-semibold tracking-tight text-brand whitespace-nowrap">{t('admin.welcomeAdmin')}</span>
                        )}
                    </Link>
                </div>

                <nav className={`flex-grow overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-3'} py-2`}>
                    <NavItem
                        to="/admin"
                        icon={<LayoutDashboard size={24}/>}
                        label={t('admin.dashboard')}
                        exact={true}
                        collapsed={sidebarCollapsed}
                    />

                    {menuGroups.map((group) => (
                        <div key={group.id} className="mt-1">
                            {!sidebarCollapsed ? (
                                <>
                                    <button
                                        onClick={() => toggleGroup(group.id)}
                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                    >
                                        <span>{group.label}</span>
                                        {expandedGroups[group.id] ? (
                                            <ChevronDown size={14}/>) : (
                                            <ChevronRight size={14}/>)}
                                    </button>
                                    {expandedGroups[group.id] && (
                                        <div className="space-y-0.5">
                                            {group.items.map((item) => (
                                                <NavItem
                                                    key={item.path}
                                                    to={item.path}
                                                    icon={<item.icon size={20}/>}
                                                    label={item.label}
                                                    collapsed={false}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center py-1">
                                    <button
                                        onClick={() => toggleGroup(group.id)}
                                        className="w-12 h-12 flex flex-col items-center justify-center rounded-lg hover:bg-sidebar-accent/50 transition-colors"
                                        title={group.label}
                                    >
                                        <group.icon size={22} className="text-muted-foreground"/>
                                    </button>
                                    {expandedGroups[group.id] && (
                                        <div className="mt-1 space-y-0.5">
                                            {group.items.map((item) => (
                                                <NavItem
                                                    key={item.path}
                                                    to={item.path}
                                                    icon={<item.icon size={18}/>}
                                                    label={item.label}
                                                    collapsed={true}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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

            <div className="flex-grow flex flex-col min-w-0 relative">
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute top-12 z-50 w-8 h-8 bg-card border border-border rounded-full shadow-md flex items-center justify-center hover:bg-accent transition-all duration-200 hover:scale-110"
                    style={{left: -16}}
                    title={sidebarCollapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
                >
                    {sidebarCollapsed ? (
                        <PanelLeftOpen size={18} className="text-muted-foreground"/>
                    ) : (
                        <PanelLeftClose size={18} className="text-muted-foreground"/>
                    )}
                </button>

                <header className="h-16 bg-card border-b flex items-center justify-between px-8">
                    <div className="flex items-center gap-2">
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.path}>
                                {index > 0 && <span className="text-muted-foreground"> {'>'} </span>}
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
                        <LanguageSwitcher variant="compact"
                                          buttonClassName="text-muted-foreground hover:text-foreground"/>
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
                    ? 'justify-center w-12 h-10 mx-auto'
                    : 'space-x-3 px-3 py-2'
            } ${
                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            }`}
            title={collapsed ? label : undefined}
        >
            {collapsed ? React.cloneElement(icon as React.ReactElement<any>, {size: 22}) : icon}
            {!collapsed && <span className="font-medium text-sm truncate">{label}</span>}
        </Link>
    );
};

export default AdminLayout;
