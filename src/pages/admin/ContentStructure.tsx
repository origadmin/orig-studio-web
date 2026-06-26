import React from 'react';
import {useTranslation} from 'react-i18next';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Link} from '@tanstack/react-router';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import Categories from '@/pages/admin/Categories';
import Tags from '@/pages/admin/Tags';
import Channels from '@/pages/admin/Channels';

const ContentStructure: React.FC = () => {
    const {t} = useTranslation();

    return (
        <Tabs defaultValue="categories" className="space-y-0">
            <div className="border-b border-border bg-background px-4 pt-4 md:px-6 md:pt-6">
                <Breadcrumb className="mb-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator/>
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t('admin.breadcrumb.contentStructure', '内容结构')}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <TabsList>
                    <TabsTrigger value="categories">{t('admin.categories')}</TabsTrigger>
                    <TabsTrigger value="tags">{t('admin.tags')}</TabsTrigger>
                    <TabsTrigger value="channels">{t('admin.channels')}</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="categories" className="mt-0">
                <Categories/>
            </TabsContent>
            <TabsContent value="tags" className="mt-0">
                <Tags/>
            </TabsContent>
            <TabsContent value="channels" className="mt-0">
                <Channels/>
            </TabsContent>
        </Tabs>
    );
};

export default ContentStructure;
