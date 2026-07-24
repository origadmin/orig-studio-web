import React, {useState, useEffect, useMemo, useRef} from 'react';
import {Link, useLocation} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/hooks/useAuth';
import {useSubscribedChannels, type ChannelSummary} from '@/hooks/useSubscriptions';
import {useModuleState} from '@/contexts/ModuleConfigContext';
import {NAV_CONFIG} from '@/config/navigation';
import type {NavSection, NavItem} from '@/types/nav';
import type {User as AuthUser} from '@/contexts/auth/types';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {ChevronDown, ChevronUp, ChevronRight} from 'lucide-react';

interface SidebarProps {
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

interface RenderNavItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    to: string;
    params?: Record<string, string>;
    children?: RenderNavItem[];
}

const SUBS_DEFAULT_SHOW = 5;

function resolveNavItem(item: NavItem, currentUser?: AuthUser | null): RenderNavItem {
    let to = item.to;
    let params: Record<string, string> | undefined;
    if (item.isDynamic && item.to.includes('__dynamic__')) {
        const username = currentUser?.username;
        if (username) {
            to = '/u/$id';
            params = {id: username};
        } else {
            to = '/auth/signin';
        }
    }
    return {
        id: item.id,
        icon: item.icon ? <item.icon size={22}/> : null,
        label: item.label,
        to,
        params,
        children: item.children ? item.children.map(child => resolveNavItem(child, currentUser)) : undefined,
    };
}

function toRenderItems(items: NavItem[], currentUser?: AuthUser | null): RenderNavItem[] {
    const safeItems = Array.isArray(items) ? items : [];
    return safeItems.map((item) => resolveNavItem(item, currentUser));
}

const Sidebar: React.FC<SidebarProps> = ({collapsed = false}) => {
    const {t} = useTranslation();
    const location = useLocation();
    const pathname = location.pathname;
    const {isAuthenticated, user} = useAuth();
    const {modules} = useModuleState();
    const {channels: subChannels, channelDetails} = useSubscribedChannels();
    const [hoveredSection, setHoveredSection] = useState<NavSection | null>(null);
    const [hoveredItems, setHoveredItems] = useState<RenderNavItem[]>([]);
    const [hoverPos, setHoverPos] = useState({top: 0});
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [subsExpanded, setSubsExpanded] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

    const safeChannelDetails = Array.isArray(channelDetails) ? channelDetails : [];
    const safeSubChannels = Array.isArray(subChannels) ? subChannels : [];

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const autoExpanded = new Set<string>();
        visibleSections.forEach(({items}) => {
            items.forEach(item => {
                if (item.children && item.children.length > 0) {
                    const shouldExpand = item.children.some(child =>
                        pathname === child.to || pathname.startsWith(child.to + '/')
                    ) || pathname === item.to || pathname.startsWith(item.to + '/');
                    if (shouldExpand) {
                        autoExpanded.add(item.id);
                    }
                }
            });
        });
        setExpandedMenus(autoExpanded);
    }, [pathname]);

    const isActive = (to: string) => pathname === to || pathname.startsWith(to + '/');

    const toggleMenu = (id: string) => {
        setExpandedMenus(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const filterItemByModule = (item: NavItem): boolean => {
        if (!item.module) return true;
        return modules[item.module] === true;
    };

    const visibleSections = useMemo((): { section: NavSection; items: RenderNavItem[] }[] => {
        return (Array.isArray(NAV_CONFIG) ? NAV_CONFIG : []).filter((section) => {
            if (section.requiresAuth && !isAuthenticated) return false;
            return true;
        }).map((section) => {
            const sectionItems = Array.isArray(section.items) ? section.items : [];
            const filteredItems = sectionItems.filter((item) => {
                if (!filterItemByModule(item)) return false;
                if (item.children) {
                    const filteredChildren = item.children.filter(filterItemByModule);
                    return filteredChildren.length > 0;
                }
                return true;
            }).map(item => {
                if (item.children) {
                    return {
                        ...item,
                        children: item.children.filter(filterItemByModule),
                    };
                }
                return item;
            });
            const baseItems = toRenderItems(filteredItems, user);
            return {section, items: baseItems};
        }).filter(({items}) => items.length > 0);
    }, [isAuthenticated, user, modules]);

    const handleSectionEnter = (e: React.MouseEvent, section: NavSection, items: RenderNavItem[]) => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHoverPos({top: rect.top});
        setHoveredSection(section);
        setHoveredItems(items);
    };

    const handleSectionLeave = () => {
        closeTimerRef.current = setTimeout(() => {
            setHoveredSection(null);
            setHoveredItems([]);
        }, 150);
    };

    const handlePopupEnter = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };

    const handlePopupLeave = () => {
        closeTimerRef.current = setTimeout(() => {
            setHoveredSection(null);
            setHoveredItems([]);
        }, 100);
    };

    const FullNavLink = ({item, indent = false}: { item: RenderNavItem; indent?: boolean }) => {
        const active = isActive(item.to);
        return (
            <Link
                to={item.to}
                params={item.params}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${
                    indent ? 'pl-10' : ''
                } ${
                    active
                        ? 'bg-accent font-medium text-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
            >
                {indent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60"/>
                ) : (
                    <span className={`flex-shrink-0 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {item.icon}
                    </span>
                )}
                <span className="text-[14px] truncate">{t(item.label)}</span>
            </Link>
        );
    };

    const ExpandableNavItem = ({item}: { item: RenderNavItem }) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedMenus.has(item.id);
        const isItemActive = isActive(item.to);
        const hasActiveChild = hasChildren && item.children!.some(child =>
            isActive(child.to)
        );
        const showAsActive = isItemActive || hasActiveChild;

        if (!hasChildren) {
            return <FullNavLink item={item}/>;
        }

        return (
            <div>
                <div className="flex items-stretch">
                    <Link
                        to={item.to}
                        params={item.params}
                        className={`flex-1 flex items-center gap-3 py-2.5 px-3 rounded-l-lg transition-colors ${
                            showAsActive
                                ? 'bg-accent font-medium text-foreground'
                                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <span className={`flex-shrink-0 ${showAsActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {item.icon}
                        </span>
                        <span className="text-[14px] flex-1 text-left truncate">{t(item.label)}</span>
                    </Link>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleMenu(item.id);
                        }}
                        className={`px-2 rounded-r-lg transition-colors ${
                            showAsActive
                                ? 'bg-accent text-foreground'
                                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 flex-shrink-0 opacity-60"/>
                        ) : (
                            <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-60"/>
                        )}
                    </button>
                </div>
                {isExpanded && (
                    <div className="mt-0.5 space-y-0.5">
                        {item.children!.map(child => (
                            <FullNavLink key={child.id} item={child} indent/>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const SubsChannelLink = ({channel}: { channel: ChannelSummary }) => {
        const linkTo = channel.short_token ? '/c/$id' : channel.username ? '/$handle' : '/u/$id';
        const linkParams = channel.short_token ? {id: channel.short_token} : channel.username ? {handle: `@${channel.username}`} : {id: channel.id};
        const active = channel.short_token ? isActive(`/c/${channel.short_token}`) : channel.username ? isActive(`/@${channel.username}`) : isActive(`/u/${channel.id}`);
        const displayName = channel.name || channel.username;
        return (
            <Link
                to={linkTo}
                params={linkParams}
                className={`flex items-center gap-3 py-1.5 px-3 rounded-lg transition-colors ${
                    active
                        ? 'bg-accent font-medium'
                        : 'hover:bg-accent'
                }`}
            >
                <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage
                        src={getImageUrl(channel.avatar, 'avatar')}
                        loading="lazy"
                        onError={(e) => handleImageError(e, 'avatar')}
                    />
                    <AvatarFallback className="text-[10px]">
                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                </Avatar>
                <span className={`text-[14px] truncate ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {displayName}
                </span>
            </Link>
        );
    };

    const CollapsedSectionButton = ({section, items}: { section: NavSection; items: RenderNavItem[] }) => {
        const firstItem = items[0];
        const isInThisSection = items.some(item => {
            if (isActive(item.to)) return true;
            if (item.children) {
                return item.children.some(child => isActive(child.to));
            }
            return false;
        });
        return (
            <button
                onMouseEnter={(e) => handleSectionEnter(e, section, flattenItems(items))}
                onMouseLeave={handleSectionLeave}
                className={`w-full flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg transition-colors hover:bg-accent ${
                    isInThisSection ? 'bg-accent' : ''
                }`}
            >
                {firstItem?.icon && (
                    <span className={`scale-110 ${isInThisSection ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {firstItem.icon}
                    </span>
                )}
                <span className={`text-[12px] font-medium leading-tight ${isInThisSection ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {t(section.title)}
                </span>
            </button>
        );
    };

    const flattenItems = (items: RenderNavItem[]): RenderNavItem[] => {
        const result: RenderNavItem[] = [];
        items.forEach(item => {
            result.push(item);
            if (item.children) {
                result.push(...item.children);
            }
        });
        return result;
    };

    const PopupNavLink = ({item, indent = false}: { item: RenderNavItem; indent?: boolean }) => {
        const active = isActive(item.to);
        return (
            <Link
                to={item.to}
                params={item.params}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    indent ? 'pl-10' : ''
                } ${
                    active
                        ? 'bg-accent font-medium text-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                onMouseEnter={handlePopupEnter}
            >
                {indent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60"/>
                ) : (
                    <span className={`flex-shrink-0 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {item.icon}
                    </span>
                )}
                <span className="text-sm">{t(item.label)}</span>
            </Link>
        );
    };

    const PopupSubsChannelLink = ({channel}: { channel: ChannelSummary }) => {
        const linkTo = channel.short_token ? '/c/$id' : channel.username ? '/$handle' : '/u/$id';
        const linkParams = channel.short_token ? {id: channel.short_token} : channel.username ? {handle: `@${channel.username}`} : {id: channel.id};
        const active = channel.short_token ? isActive(`/c/${channel.short_token}`) : channel.username ? isActive(`/@${channel.username}`) : isActive(`/u/${channel.id}`);
        const displayName = channel.name || channel.username;
        return (
            <Link
                to={linkTo}
                params={linkParams}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    active
                        ? 'bg-accent font-medium'
                        : 'hover:bg-accent'
                }`}
                onMouseEnter={handlePopupEnter}
            >
                <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage
                        src={getImageUrl(channel.avatar, 'avatar')}
                        loading="lazy"
                        onError={(e) => handleImageError(e, 'avatar')}
                    />
                    <AvatarFallback className="text-[10px]">
                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                </Avatar>
                <span className={`text-sm truncate ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {displayName}
                </span>
            </Link>
        );
    };

    const FullNavSection = ({items, title, sectionId}: { items: RenderNavItem[]; title?: string; sectionId?: string }) => {
        const isSubscriptions = sectionId === 'subscriptions';
        const hasChannels = isSubscriptions && safeChannelDetails.length > 0;
        const displayedChannels = hasChannels
            ? (subsExpanded ? safeChannelDetails : safeChannelDetails.slice(0, SUBS_DEFAULT_SHOW))
            : [];
        const canExpand = hasChannels && safeChannelDetails.length > SUBS_DEFAULT_SHOW;

        return (
            <div className="py-0.5">
                {title && (
                    <h3 className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {title}
                    </h3>
                )}
                <div className="space-y-0.5 px-2">
                    {items.map((item) => (
                        item.children && item.children.length > 0 ? (
                            <ExpandableNavItem key={item.id} item={item}/>
                        ) : (
                            <FullNavLink key={item.id} item={item}/>
                        )
                    ))}
                    {displayedChannels.map((channel) => (
                        <SubsChannelLink key={`ch-${channel.id}`} channel={channel}/>
                    ))}
                    {canExpand && (
                        <button
                            onClick={() => setSubsExpanded(!subsExpanded)}
                            className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-accent w-full text-left"
                        >
                            {subsExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0"/>
                            ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0"/>
                            )}
                            <span className="text-[14px] text-muted-foreground">
                                {subsExpanded ? t('nav.showLess') : t('nav.showMore')}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const FullDivider = () => (
        <div className="border-t border-border/60 my-1.5 mx-3"/>
    );

    const CollapsedDivider = () => (
        <div className="border-t border-border/60 my-1 mx-2"/>
    );

    const width = collapsed ? 72 : 240;

    const renderFullContent = () => {
        const sections: React.ReactNode[] = [];
        visibleSections.forEach(({section, items}, idx) => {
            if (idx > 0) sections.push(<FullDivider key={`d-${idx}`}/>);
            sections.push(<FullNavSection key={section.id} items={items} title={t(section.title)} sectionId={section.id}/>);
        });
        return sections;
    };

    const renderCollapsedContent = () => {
        const sections: React.ReactNode[] = [];
        visibleSections.forEach(({section, items}, idx) => {
            if (idx > 0) sections.push(<CollapsedDivider key={`d-${idx}`}/>);
            sections.push(
                <CollapsedSectionButton key={section.id} section={section} items={items}/>
            );
        });
        return sections;
    };

    const renderPopupItems = (items: RenderNavItem[]): React.ReactNode[] => {
        const nodes: React.ReactNode[] = [];
        items.forEach(item => {
            if (item.children && item.children.length > 0) {
                nodes.push(
                    <div key={item.id} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                        {t(item.label)}
                    </div>
                );
                item.children.forEach(child => {
                    nodes.push(<PopupNavLink key={child.id} item={child}/>);
                });
            } else {
                nodes.push(<PopupNavLink key={item.id} item={item}/>);
            }
        });
        return nodes;
    };

    return (
        <>
            <aside
                style={{width}}
                className="fixed left-0 top-14 bottom-0 bg-background z-40 hidden md:flex flex-col transition-all duration-200"
            >
                {collapsed ? (
                    <nav className="flex-1 overflow-hidden py-2 relative">
                        {renderCollapsedContent()}

                        {hoveredSection && hoveredItems.length > 0 && (
                            <div
                                className="fixed bg-popover rounded-xl shadow-xl border border-border/60 py-1.5 z-50 animate-in fade-in slide-in-from-left-1 duration-150"
                                style={{
                                    left: width + 6,
                                    top: Math.min(hoverPos.top, window.innerHeight - 400),
                                    minWidth: 200,
                                    maxHeight: Math.min(480, window.innerHeight - Math.min(hoverPos.top, window.innerHeight - 400) - 16),
                                    overflowY: 'auto',
                                }}
                                onMouseEnter={handlePopupEnter}
                                onMouseLeave={handlePopupLeave}
                            >
                                <div className="px-3 py-1.5 border-b border-border">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t(hoveredSection.title)}
                                    </span>
                                </div>
                                <div className="py-0.5">
                                    {hoveredSection.id === 'subscriptions' && safeChannelDetails.length > 0 ? (
                                        <>
                                            {renderPopupItems(hoveredItems)}
                                            {safeChannelDetails.map((channel) => (
                                                <PopupSubsChannelLink key={`ch-${channel.id}`} channel={channel}/>
                                            ))}
                                        </>
                                    ) : (
                                        renderPopupItems(hoveredItems)
                                    )}
                                </div>
                            </div>
                        )}
                    </nav>
                ) : (
                    <nav className="flex-1 overflow-y-auto yt-scrollbar py-2">
                        {renderFullContent()}
                    </nav>
                )}
            </aside>
        </>
    );
};

export default Sidebar;
