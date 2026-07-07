import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItemType {
  label: string;
  path?: string;
  isLast?: boolean;
}

const ROUTE_PATH_MAP: Record<string, string> = {
  '/admin': '/admin',
  '/admin/media': '/admin/media',
  '/admin/users': '/admin/users',
  '/admin/categories': '/admin/categories',
  '/admin/channels': '/admin/channels',
  '/admin/tags': '/admin/tags',
  '/admin/comments': '/admin/comments',
  '/admin/articles': '/admin/articles',
  '/admin/playlists': '/admin/playlists',
  '/admin/settings': '/admin/settings',
  '/admin/transcoding/profiles': '/admin/transcoding/profiles',
  '/admin/transcoding/status': '/admin/transcoding/status',
  '/admin/notifications': '/admin/notifications',
  '/admin/drm': '/admin/drm',
  '/admin/permissions': '/admin/permissions',
  '/admin/payment': '/admin/payment',
  '/admin/promotion': '/admin/promotion',
  '/admin/ads': '/admin/ads',
  '/admin/live-rooms': '/admin/live-rooms',
  '/admin/portal': '/admin/portal',
  '/admin/pages': '/admin/pages',
  '/admin/analytics': '/admin/analytics',
  '/admin/content-structure': '/admin/content-structure',
};

function getRouteLabel(seg: string, t: TFunction): string {
  const key = `admin.breadcrumb.${seg.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}`;
  const fallback = seg.charAt(0).toUpperCase() + seg.slice(1);
  return t(key, fallback);
}

function buildBreadcrumbs(pathname: string, t: TFunction): BreadcrumbItemType[] {
  if (pathname === '/admin') {
    return [{ label: t('admin.breadcrumb.dashboard', '仪表盘'), path: '/admin', isLast: true }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItemType[] = [];

  crumbs.push({ label: t('admin.breadcrumb.dashboard', '仪表盘'), path: '/admin', isLast: false });

  if (segments.length >= 2) {
    const secondLevel = '/' + segments[1];
    if (segments[1] === 'transcoding' && segments.length >= 3) {
      crumbs.push({
        label: getRouteLabel(segments[1], t),
        path: secondLevel,
        isLast: false,
      });
      const fullPath = '/' + segments.slice(0, 3).join('/');
      const lastLabel = getRouteLabel(segments[2], t);
      crumbs.push({
        label: lastLabel,
        path: fullPath,
        isLast: true,
      });
    } else {
      const label = getRouteLabel(segments[1], t);
      crumbs.push({
        label,
        path: secondLevel,
        isLast: segments.length === 2,
      });

      if (segments.length > 2) {
        for (let i = 2; i < segments.length; i++) {
          const subPath = '/' + segments.slice(0, i + 1).join('/');
          const isLast = i === segments.length - 1;
          const isDynamic = segments[i].match(/^[0-9a-f]{8}-|[0-9]+$/);
          if (isDynamic && isLast) {
            crumbs.push({ label: t('admin.breadcrumb.details', '详情'), path: subPath, isLast: true });
          } else {
            const subLabel = getRouteLabel(segments[i], t);
            crumbs.push({
              label: subLabel,
              path: subPath,
              isLast,
            });
          }
        }
      }
    }
  }

  return crumbs;
}

export interface AdminPageTemplateProps {
  title: string;
  titleIcon?: React.ReactNode;
  /** Page-level theme color (Tailwind color name, e.g. "indigo", "rose"). Applied to titleIcon and primaryAction. */
  themeColor?: string;
  titleExtra?: React.ReactNode;
  subtitle?: string;
  description?: string;
  /** @deprecated Use primaryAction instead for bottom-positioned primary button */
  actions?: React.ReactNode;
  /** Primary action button, rendered at the bottom of the page (after children) */
  primaryAction?: React.ReactNode;
  stats?: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  filters?: React.ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItemType[];
  showBreadcrumbs?: boolean;
  children?: React.ReactNode;
}

export const AdminPageTemplate: React.FC<AdminPageTemplateProps> = ({
  title,
  titleIcon,
  themeColor,
  titleExtra,
  subtitle,
  description,
  actions,
  primaryAction,
  stats,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  filters,
  className,
  breadcrumbs: customBreadcrumbs,
  showBreadcrumbs = true,
  children,
}) => {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hasSearchBar = onSearchChange || onSearchSubmit;

  const autoBreadcrumbs = React.useMemo(() => buildBreadcrumbs(pathname, t), [pathname, t]);
  const breadcrumbItems = customBreadcrumbs || autoBreadcrumbs;

  // Static map — Tailwind JIT cannot detect dynamic template literals like `text-${themeColor}-600`
  const THEME_COLOR_MAP: Record<string, string> = {
    indigo: 'text-indigo-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    violet: 'text-violet-600',
    teal: 'text-teal-600',
    cyan: 'text-cyan-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
  };
  const titleIconColor = (themeColor && THEME_COLOR_MAP[themeColor]) ? THEME_COLOR_MAP[themeColor] : 'text-primary';

  return (
    <div className={cn('space-y-6 p-6', className)}>
      {showBreadcrumbs && (
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => {
              const isLast = item.isLast !== undefined ? item.isLast : index === breadcrumbItems.length - 1;
              return (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={item.path || '#'}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {titleIcon ? (
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <span className={cn('h-8 w-8 shrink-0 flex items-center justify-center', titleIconColor)}>
                {titleIcon}
              </span>
              <span className="shrink-0">{title}</span>
              {titleExtra && <span className="shrink-0">{titleExtra}</span>}
            </h1>
          ) : (
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <span className="shrink-0">{title}</span>
              {titleExtra && <span className="shrink-0">{titleExtra}</span>}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm font-medium text-foreground/80 mt-1">{subtitle}</p>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 pt-1">{actions}</div>}
      </div>

      {stats}

      {hasSearchBar && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder || t('common.search', '搜索...')}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
                className="pl-9"
              />
            </div>
            {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
          </div>
        </div>
      )}

      {children}

      {primaryAction && (
        <div className="flex justify-end pt-6 border-t border-border">
          {primaryAction}
        </div>
      )}
    </div>
  );
};

export default AdminPageTemplate;
