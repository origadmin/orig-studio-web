import React from 'react';
import {useTranslation} from 'react-i18next';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import Categories from '@/pages/admin/Categories';
import Tags from '@/pages/admin/Tags';
import Channels from '@/pages/admin/Channels';

const ContentStructure: React.FC = () => {
    const {t} = useTranslation();

    return (
        <Tabs defaultValue="categories" className="space-y-0">
            <div className="border-b border-border bg-background px-4 pt-4 md:px-6 md:pt-6">
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
