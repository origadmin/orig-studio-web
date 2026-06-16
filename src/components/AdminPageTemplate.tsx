import React from 'react';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {Link} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {useRouterState} from '@tanstack/react-router';

interface AdminPageTemplateProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    breadcrumbItems?: {label: string; href?: string}[];
}

const AdminPageTemplate: React.FC<AdminPageTemplateProps> = ({
    title,
    description,
    children,
    actions,
    breadcrumbItems = [],
}) => {
    const {t} = useTranslation();
    const pathname = useRouterState({select: (s) => s.location.pathname});

    const autoBreadcrumbs = React.useMemo(() => {
        const parts = pathname.split('/').filter(p => p);
        const items: {label: string; href: string}[] = [];
        
        if (parts.length > 0) {
            let currentPath = '';
            for (const part of parts) {
                currentPath += `/${part}`;
                let label = t(`admin.${part}`, part.charAt(0).toUpperCase() + part.slice(1));
                
                if (part === 'admin') {
                    label = t('admin.dashboard', 'Dashboard');
                } else if (part === 'media') {
                    label = t('admin.media', 'Media');
                } else if (part === 'articles') {
                    label = t('admin.articles', 'Articles');
                } else if (part === 'transcoding') {
                    label = t('admin.transcodingProfiles', 'Transcoding');
                }
                
                items.push({label, href: currentPath});
            }
        }
        
        return items;
    }, [pathname, t]);

    const breadcrumbs = breadcrumbItems.length > 0 ? breadcrumbItems : autoBreadcrumbs;

    return (
        <div className="p-8">
            <Breadcrumb className="mb-6">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.dashboard', 'Dashboard')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.map((item, index) => (
                        <React.Fragment key={index}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {item.href ? (
                                    <BreadcrumbLink asChild>
                                        <Link to={item.href}>{item.label}</Link>
                                    </BreadcrumbLink>
                                ) : (
                                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
                    {description && (
                        <p className="text-sm text-slate-500 mt-1">{description}</p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {children}
        </div>
    );
};

export {AdminPageTemplate};
