import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {useTranslation} from 'react-i18next';
import TranscodingProfiles from "@/pages/admin/TranscodingProfiles";
import TranscodingStatus from "@/pages/admin/TranscodingStatus";

export default function Transcoding() {
    const {t} = useTranslation();

    return (
        <Tabs defaultValue="profiles" className="space-y-4">
            <div className="px-4 pt-4 md:px-6 md:pt-6">
                <TabsList>
                    <TabsTrigger value="profiles">{t('admin.transcodingProfiles')}</TabsTrigger>
                    <TabsTrigger value="status">{t('admin.transcodingStatus')}</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="profiles">
                <TranscodingProfiles/>
            </TabsContent>
            <TabsContent value="status">
                <TranscodingStatus/>
            </TabsContent>
        </Tabs>
    );
}
