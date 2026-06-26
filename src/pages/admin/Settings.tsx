import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {
    Settings as SettingsIcon,
    Database,
    Server,
    Mail,
    Shield,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle,
    Blocks,
    LayoutGrid,
    Plus,
    X,
    Send,
    Link2,
    CloudLightning,
    AlertTriangle,
    BarChart3,
    Play,
    ShieldCheck,
    CloudSun,
    PlusCircle,
    XCircle,
    Download,
    Trash2,
    Sun,
    Moon,
    Monitor,
    FileText,
    Video,
    Music2,
    Film,
    ShieldAlert,
    BookOpen,
    Upload,
    Radio,
    FolderTree,
    Tags,
    MessageSquare,
    PlayCircle,
    Key,
    Bell,
    Tv2,
    CreditCard,
    Megaphone,
    Target,
    Cpu,
    Users,
} from 'lucide-react';
import {settingsApi, type GroupedSettings} from '@/lib/api/system';
import {api} from '@/lib/request';
import {ThemeSwitcher} from '@/themes';
import {Button} from '@/components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectTrigger, SelectContent, SelectItem, SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Badge} from '@/components/ui/badge';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {Separator} from '@/components/ui/separator';
import {Progress} from '@/components/ui/progress';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Link} from '@tanstack/react-router';

interface FormData {
    site_name: string;
    site_description: string;
    base_urls: string[];
    primary_url: string;
    allow_registration: string;
    allow_upload: string;
    storage_base_path: string;
    storage_type: string;
    s3_endpoint: string;
    s3_region: string;
    s3_bucket: string;
    s3_access_key: string;
    s3_secret_key: string;
    s3_use_path_style: string;
    max_upload_size_video: string;
    max_upload_size_image: string;
    auto_transcode: string;
    transcode_method: string;
    allowed_video_formats: string;
    allowed_image_formats: string;
    max_video_duration: string;
    sprite_frame_interval: string;
    sprite_columns: string;
    sprite_frame_width: string;
    sprite_frame_height: string;
    sprite_max_frames: string;
    thumbnail_quality: string;
    thumbnail_resolution: string;
    thumbnail_position: string;
    auto_approve: string;
    require_review: string;
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_password: string;
    smtp_sender_name: string;
    smtp_use_tls: string;
    min_password_length: string;
    require_email_verification: string;
    api_rate_limit: string;
    module_articles: boolean;
    module_videos: boolean;
    module_music: boolean;
    homepage_layout: string;
    // Feature flags for admin menu visibility
    feature_articles: boolean;
    feature_comments: boolean;
    feature_playlists: boolean;
    feature_users: boolean;
    feature_permissions: boolean;
    feature_notifications: boolean;
    feature_drm: boolean;
    feature_live_rooms: boolean;
    feature_payment: boolean;
    feature_promotion: boolean;
    feature_ads: boolean;
}

interface SystemInfo {
    version: string;
    goVersion: string;
    database: string;
    os: string;
    uptime: string;
    totalMemory: string;
    usedMemory: string;
    cpuUsage: string;
    memoryUsage: number;
    numCPU: number;
    numGoroutine: number;
}

interface StorageCapabilities {
    current_type: string;
    available_types: string[];
    s3_configured: boolean;
    s3_available: boolean;
    hybrid_available: boolean;
}

interface EmailStatus {
    configured: boolean;
}

const defaultFormData: FormData = {
    site_name: '',
    site_description: '',
    base_urls: [],
    primary_url: '',
    allow_registration: 'true',
    allow_upload: 'true',
    storage_base_path: '/var/media',
    storage_type: 'local',
    s3_endpoint: '',
    s3_region: '',
    s3_bucket: '',
    s3_access_key: '',
    s3_secret_key: '',
    s3_use_path_style: 'false',
    max_upload_size_video: '5120',
    max_upload_size_image: '20',
    auto_transcode: 'true',
    transcode_method: 'ffmpeg',
    allowed_video_formats: 'mp4, webm, mkv, avi, mov',
    allowed_image_formats: 'jpg, png, gif, webp',
    max_video_duration: '120',
    sprite_frame_interval: '10',
    sprite_columns: '10',
    sprite_frame_width: '120',
    sprite_frame_height: '68',
    sprite_max_frames: '100',
    thumbnail_quality: '85',
    thumbnail_resolution: '320x180',
    thumbnail_position: '00:00:01',
    auto_approve: 'true',
    require_review: 'false',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_sender_name: '',
    smtp_use_tls: 'true',
    min_password_length: '8',
    require_email_verification: 'false',
    api_rate_limit: '60',
    module_articles: true,
    module_videos: true,
    module_music: false,
    homepage_layout: 'auto',
    // Feature flags - secondary features enabled by default
    feature_articles: true,
    feature_comments: true,
    feature_playlists: true,
    feature_users: true,
    feature_permissions: true,
    feature_notifications: true,
    feature_drm: true,
    feature_live_rooms: true,
    feature_payment: true,
    feature_promotion: true,
    feature_ads: true,
};

const tabs = [
    {id: 'general', label: 'General'},
    {id: 'storage', label: 'Storage'},
    {id: 'media', label: 'Media'},
    {id: 'email', label: 'Email'},
    {id: 'security', label: 'Security'},
    {id: 'modules', label: 'Modules'},
    {id: 'features', label: 'Features'},
    {id: 'system', label: 'System'},
];

const Settings: React.FC = () => {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState<FormData>(defaultFormData);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [storageCaps, setStorageCaps] = useState<StorageCapabilities>({
        current_type: 'local',
        available_types: ['local'],
        s3_configured: false,
        s3_available: false,
        hybrid_available: false,
    });
    const [emailStatus, setEmailStatus] = useState<EmailStatus>({configured: false});
    const [emailTestSending, setEmailTestSending] = useState(false);
    const [emailTestTo, setEmailTestTo] = useState('');
    const [uploadSizeGB, setUploadSizeGB] = useState(5.0);

    useEffect(() => {
        fetchSettings();
        fetchSystemInfo();
        fetchStorageCapabilities();
        fetchEmailStatus();
    }, []);

    const fetchSettings = async () => {
        try {
            const raw = await settingsApi.get();
            let grouped: GroupedSettings | null = null;
            if (raw && typeof raw === 'object') {
                if ('code' in raw && 'data' in raw && typeof (raw as Record<string, unknown>).data === 'object') {
                    grouped = (raw as Record<string, unknown>).data as GroupedSettings;
                } else {
                    grouped = raw as GroupedSettings;
                }
            }

            if (grouped) {
                const getSettingValue = (key: string): string => {
                    for (const category of Object.values(grouped!)) {
                        if (!Array.isArray(category)) continue;
                        const found = category.find(s => s.key === key);
                        if (found) return found.value;
                    }
                    return '';
                };

                const parseBytesToMB = (val: string): string => {
                    const bytes = parseInt(val);
                    if (isNaN(bytes) || bytes <= 0) return '';
                    return String(Math.round(bytes / 1024 / 1024));
                };

                const parseBaseUrls = (val: string): string[] => {
                    if (!val) return [];
                    try {
                        const parsed = JSON.parse(val);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return val ? [val] : [];
                    }
                };

                setFormData(prev => ({
                    ...prev,
                    site_name: getSettingValue('site_name') || prev.site_name,
                    site_description: getSettingValue('site_description') || prev.site_description,
                    base_urls: parseBaseUrls(getSettingValue('base_urls')),
                    primary_url: getSettingValue('primary_url') || prev.primary_url,
                    allow_registration: getSettingValue('allow_registration') || prev.allow_registration,
                    allow_upload: getSettingValue('allow_upload') || prev.allow_upload,
                    storage_base_path: getSettingValue('storage_base_path') || prev.storage_base_path,
                    storage_type: getSettingValue('storage_type') || prev.storage_type,
                    s3_endpoint: getSettingValue('s3_endpoint') || prev.s3_endpoint,
                    s3_region: getSettingValue('s3_region') || prev.s3_region,
                    s3_bucket: getSettingValue('s3_bucket') || prev.s3_bucket,
                    s3_access_key: getSettingValue('s3_access_key') || prev.s3_access_key,
                    s3_secret_key: getSettingValue('s3_secret_key') || prev.s3_secret_key,
                    s3_use_path_style: getSettingValue('s3_use_path_style') || prev.s3_use_path_style,
                    max_upload_size_video: parseBytesToMB(getSettingValue('max_upload_size_video')) || prev.max_upload_size_video,
                    max_upload_size_image: parseBytesToMB(getSettingValue('max_upload_size_image')) || prev.max_upload_size_image,
                    auto_transcode: getSettingValue('auto_transcode') || prev.auto_transcode,
                    transcode_method: getSettingValue('transcode_method') || prev.transcode_method,
                    allowed_video_formats: getSettingValue('allowed_video_formats') || prev.allowed_video_formats,
                    allowed_image_formats: getSettingValue('allowed_image_formats') || prev.allowed_image_formats,
                    max_video_duration: getSettingValue('max_video_duration') || prev.max_video_duration,
                    sprite_frame_interval: getSettingValue('sprite_frame_interval') || prev.sprite_frame_interval,
                    sprite_columns: getSettingValue('sprite_columns') || prev.sprite_columns,
                    sprite_frame_width: getSettingValue('sprite_frame_width') || prev.sprite_frame_width,
                    sprite_frame_height: getSettingValue('sprite_frame_height') || prev.sprite_frame_height,
                    sprite_max_frames: getSettingValue('sprite_max_frames') || prev.sprite_max_frames,
                    thumbnail_quality: getSettingValue('thumbnail_quality') || prev.thumbnail_quality,
                    thumbnail_resolution: getSettingValue('thumbnail_resolution') || prev.thumbnail_resolution,
                    thumbnail_position: getSettingValue('thumbnail_position') || prev.thumbnail_position,
                    auto_approve: getSettingValue('auto_approve') || prev.auto_approve,
                    require_review: getSettingValue('require_review') || prev.require_review,
                    smtp_host: getSettingValue('smtp_host') || prev.smtp_host,
                    smtp_port: getSettingValue('smtp_port') || prev.smtp_port,
                    smtp_user: getSettingValue('smtp_user') || prev.smtp_user,
                    smtp_password: getSettingValue('smtp_password') || prev.smtp_password,
                    smtp_sender_name: getSettingValue('smtp_sender_name') || prev.smtp_sender_name,
                    smtp_use_tls: getSettingValue('smtp_use_tls') || prev.smtp_use_tls,
                    min_password_length: getSettingValue('min_password_length') || prev.min_password_length,
                    require_email_verification: getSettingValue('require_email_verification') || prev.require_email_verification,
                    api_rate_limit: getSettingValue('api_rate_limit') || prev.api_rate_limit,
                    module_articles: getSettingValue('module_articles') === 'true',
                    module_videos: getSettingValue('module_videos') === 'true',
                    module_music: getSettingValue('module_music') === 'true',
                    homepage_layout: getSettingValue('homepage_layout') || prev.homepage_layout,
                    // Feature flags
                    feature_articles: getSettingValue('feature_articles') !== 'false',
                    feature_comments: getSettingValue('feature_comments') !== 'false',
                    feature_playlists: getSettingValue('feature_playlists') !== 'false',
                    feature_users: getSettingValue('feature_users') !== 'false',
                    feature_permissions: getSettingValue('feature_permissions') !== 'false',
                    feature_notifications: getSettingValue('feature_notifications') !== 'false',
                    feature_drm: getSettingValue('feature_drm') !== 'false',
                    feature_live_rooms: getSettingValue('feature_live_rooms') !== 'false',
                    feature_payment: getSettingValue('feature_payment') !== 'false',
                    feature_promotion: getSettingValue('feature_promotion') !== 'false',
                    feature_ads: getSettingValue('feature_ads') !== 'false',
                }));
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            setMessage({type: 'error', text: t('settings.loadFailed')});
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemInfo = async () => {
        try {
            const info = await api.get<SystemInfo>('/admin/settings/info');
            setSystemInfo(info);
        } catch (error) {
            console.error('Failed to fetch system info:', error);
            setSystemInfo(null);
        }
    };

    const fetchStorageCapabilities = async () => {
        try {
            const caps = await api.get<StorageCapabilities>('/admin/settings/storage/capabilities');
            setStorageCaps(caps);
        } catch (error) {
            console.error('Failed to fetch storage capabilities:', error);
        }
    };

    const fetchEmailStatus = async () => {
        try {
            const status = await api.get<EmailStatus>('/system/settings/email/status');
            setEmailStatus(status);
        } catch (error) {
            console.error('Failed to fetch email status:', error);
        }
    };

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleBaseUrlChange = (index: number, value: string) => {
        setFormData(prev => {
            const newUrls = [...prev.base_urls];
            newUrls[index] = value;
            return {...prev, base_urls: newUrls};
        });
    };

    const handleAddBaseUrl = () => {
        setFormData(prev => ({...prev, base_urls: [...prev.base_urls, '']}));
    };

    const handleRemoveBaseUrl = (index: number) => {
        setFormData(prev => {
            const newUrls = prev.base_urls.filter((_, i) => i !== index);
            return {...prev, base_urls: newUrls};
        });
    };

    const handleSetPrimaryUrl = (index: number) => {
        setFormData(prev => {
            const url = prev.base_urls[index];
            const newUrls = prev.base_urls.filter((_, i) => i !== index);
            newUrls.unshift(url);
            return {...prev, base_urls: newUrls};
        });
    };

    const handleEmailTest = async () => {
        if (!emailTestTo) return;
        try {
            setEmailTestSending(true);
            await api.post('/system/settings/email/test', {to: emailTestTo});
            setMessage({type: 'success', text: t('settings.emailTestSuccess')});
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Failed to send test email:', error);
            setMessage({type: 'error', text: t('settings.emailTestFailed')});
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setEmailTestSending(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const mbToBytes = (mb: string): string => {
                const val = parseInt(mb);
                if (isNaN(val) || val <= 0) return '0';
                return String(val * 1024 * 1024);
            };

            const settings = [
                {key: 'site_name', value: formData.site_name},
                {key: 'site_description', value: formData.site_description},
                {key: 'base_urls', value: JSON.stringify(formData.base_urls.filter(u => u.trim()))},
                {key: 'primary_url', value: formData.primary_url},
                {key: 'allow_registration', value: formData.allow_registration},
                {key: 'allow_upload', value: formData.allow_upload},
                {key: 'storage_base_path', value: formData.storage_base_path},
                {key: 'storage_type', value: formData.storage_type},
                {key: 's3_endpoint', value: formData.s3_endpoint},
                {key: 's3_region', value: formData.s3_region},
                {key: 's3_bucket', value: formData.s3_bucket},
                {key: 's3_access_key', value: formData.s3_access_key},
                {key: 's3_secret_key', value: formData.s3_secret_key},
                {key: 's3_use_path_style', value: formData.s3_use_path_style},
                {key: 'max_upload_size_video', value: mbToBytes(formData.max_upload_size_video)},
                {key: 'max_upload_size_image', value: mbToBytes(formData.max_upload_size_image)},
                {key: 'auto_transcode', value: formData.auto_transcode},
                {key: 'transcode_method', value: formData.transcode_method},
                {key: 'allowed_video_formats', value: formData.allowed_video_formats},
                {key: 'allowed_image_formats', value: formData.allowed_image_formats},
                {key: 'max_video_duration', value: formData.max_video_duration},
                {key: 'sprite_frame_interval', value: formData.sprite_frame_interval},
                {key: 'sprite_columns', value: formData.sprite_columns},
                {key: 'sprite_frame_width', value: formData.sprite_frame_width},
                {key: 'sprite_frame_height', value: formData.sprite_frame_height},
                {key: 'sprite_max_frames', value: formData.sprite_max_frames},
                {key: 'thumbnail_quality', value: formData.thumbnail_quality},
                {key: 'thumbnail_resolution', value: formData.thumbnail_resolution},
                {key: 'thumbnail_position', value: formData.thumbnail_position},
                {key: 'auto_approve', value: formData.auto_approve},
                {key: 'require_review', value: formData.require_review},
                {key: 'smtp_host', value: formData.smtp_host},
                {key: 'smtp_port', value: formData.smtp_port},
                {key: 'smtp_user', value: formData.smtp_user},
                {key: 'smtp_password', value: formData.smtp_password},
                {key: 'smtp_sender_name', value: formData.smtp_sender_name},
                {key: 'smtp_use_tls', value: formData.smtp_use_tls},
                {key: 'min_password_length', value: formData.min_password_length},
                {key: 'require_email_verification', value: formData.require_email_verification},
                {key: 'api_rate_limit', value: formData.api_rate_limit},
                {key: 'module_articles', value: String(formData.module_articles)},
                {key: 'module_videos', value: String(formData.module_videos)},
                {key: 'module_music', value: String(formData.module_music)},
                {key: 'homepage_layout', value: formData.homepage_layout},
                // Feature flags
                {key: 'feature_articles', value: String(formData.feature_articles)},
                {key: 'feature_comments', value: String(formData.feature_comments)},
                {key: 'feature_playlists', value: String(formData.feature_playlists)},
                {key: 'feature_users', value: String(formData.feature_users)},
                {key: 'feature_permissions', value: String(formData.feature_permissions)},
                {key: 'feature_notifications', value: String(formData.feature_notifications)},
                {key: 'feature_drm', value: String(formData.feature_drm)},
                {key: 'feature_live_rooms', value: String(formData.feature_live_rooms)},
                {key: 'feature_payment', value: String(formData.feature_payment)},
                {key: 'feature_promotion', value: String(formData.feature_promotion)},
                {key: 'feature_ads', value: String(formData.feature_ads)},
            ];
            await settingsApi.update({settings});
            setMessage({type: 'success', text: t('settings.saveSuccess')});
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({type: 'error', text: t('settings.saveFailed')});
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const showS3Config = formData.storage_type === 's3' || formData.storage_type === 'hybrid';

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="h-8 w-48 bg-muted rounded animate-pulse"/>
                        <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2"/>
                    </div>
                    <div className="flex gap-3">
                        <div className="h-9 w-24 bg-muted rounded-lg animate-pulse"/>
                        <div className="h-9 w-28 bg-muted rounded-lg animate-pulse"/>
                    </div>
                </div>
                <div className="h-12 bg-muted rounded-t-xl animate-pulse mb-6"/>
                <div className="space-y-6">
                    {[1, 2].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-5 w-40 bg-muted rounded"/>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(j => (
                                        <div key={j} className="space-y-2">
                                            <div className="h-3 w-20 bg-muted rounded"/>
                                            <div className="h-9 bg-muted rounded-lg"/>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Message Toast */}
            {message && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${
                    message.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0"/>
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0"/>
                    )}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            {/* Breadcrumb */}
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.settings', '系统设置')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Page Title & Actions */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">System Settings</h2>
                    <p className="text-sm text-muted-foreground mt-1">Configure core system parameters and integrations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchSettings}
                    >
                        Discard
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin"/>
                        ) : (
                            <Save className="w-4 h-4"/>
                        )}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Secondary Navigation (Tabs) */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start rounded-t-xl rounded-b-none border-b bg-card p-0 h-auto">
                    {tabs.map(tab => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="px-6 py-3.5 text-sm data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none font-medium text-muted-foreground border-b-2 border-transparent hover:text-card-foreground hover:border-border transition-colors"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Content Area */}
                <div className="space-y-6 mt-6">

                    {/* ===== Tab: General ===== */}
                    <TabsContent value="general">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Left Column (8/12) */}
                            <div className="col-span-12 lg:col-span-8 space-y-8">
                                {/* Application Identity */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <SettingsIcon className="w-5 h-5 text-primary"/>
                                            Application Identity
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Application Name</Label>
                                            <Input
                                                value={formData.site_name}
                                                onChange={(e) => handleInputChange('site_name', e.target.value)}
                                                placeholder="Enter application name"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">System Description</Label>
                                            <Textarea
                                                value={formData.site_description}
                                                onChange={(e) => handleInputChange('site_description', e.target.value)}
                                                placeholder="Enter system description"
                                                rows={3}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Base URLs */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Link2 className="w-5 h-5 text-primary"/>
                                            Base URLs
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {formData.base_urls.map((url, index) => (
                                            <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                                                index === 0
                                                    ? 'bg-muted border-border'
                                                    : 'bg-card border-border'
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    {index === 0 ? (
                                                        <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Primary</Badge>
                                                    ) : null}
                                                    <span className={`font-mono text-sm ${index === 0 ? 'text-foreground' : 'text-foreground opacity-60'}`}>
                                                        {url || 'https://...'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {index !== 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[11px] font-bold text-primary hover:text-primary/80 hover:underline px-2 h-auto py-1"
                                                            onClick={() => handleSetPrimaryUrl(index)}
                                                        >
                                                            Set as Primary
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => handleRemoveBaseUrl(index)}
                                                        disabled={formData.base_urls.length <= 1}
                                                        className="text-muted-foreground hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            className="w-full border-dashed"
                                            onClick={handleAddBaseUrl}
                                        >
                                            <Plus className="w-4 h-4"/>
                                            Add New URL
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Maintenance Mode */}
                                <Card>
                                    <CardContent className="py-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-destructive/10 rounded-lg">
                                                    <AlertTriangle className="w-5 h-5 text-destructive"/>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
                                                    <p className="text-xs text-muted-foreground">Disable public access for all system portals and APIs.</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={formData.allow_upload === 'false'}
                                                onCheckedChange={(checked) => handleInputChange('allow_upload', String(!checked))}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* System Appearance (NOT a card) */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-foreground">System Appearance</h3>
                                    <ThemeSwitcher/>
                                </div>
                            </div>

                            {/* Right Column (4/12) */}
                            <div className="col-span-12 lg:col-span-4 space-y-8">
                                {/* API Consumption */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between text-base">
                                            API Consumption
                                            <span className="font-mono text-primary text-sm">75.2%</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <Progress value={75.2} className="h-3"/>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Cycle</p>
                                                <p className="font-mono text-sm text-foreground">3.8M / 5M</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resets In</p>
                                                <p className="font-mono text-sm text-foreground">12d 4h</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" className="w-full text-[13px]">
                                            Upgrade Quota
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* System Snapshot */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">System Snapshot</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-border">
                                            <span className="text-xs text-muted-foreground">Runtime</span>
                                            <span className="font-mono text-xs text-success">{systemInfo?.goVersion || 'Go 1.22.3'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-border">
                                            <span className="text-xs text-muted-foreground">Database</span>
                                            <span className="font-mono text-xs text-card-foreground">{systemInfo?.database || 'PostgreSQL 16.2'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-border">
                                            <span className="text-xs text-muted-foreground">Cache</span>
                                            <span className="font-mono text-xs text-card-foreground">Redis 7.2 Cloud</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-xs text-muted-foreground">Build Date</span>
                                            <span className="font-mono text-xs text-card-foreground">2024-05-18.02a</span>
                                        </div>
                                        <Button className="w-full text-[13px] mt-2">
                                            <Download className="w-4 h-4"/>
                                            Export Config JSON
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Security Alert */}
                                <div className="bg-destructive/8 border border-destructive/20 rounded-lg p-4 flex items-start gap-4">
                                    <ShieldAlert className="w-5 h-5 text-destructive/70 mt-0.5 flex-shrink-0"/>
                                    <div>
                                        <p className="text-sm font-semibold text-destructive/80">Unprotected API Endpoint</p>
                                        <p className="text-xs text-destructive/70 mt-1 leading-relaxed">External webhook receiver <code className="font-mono bg-destructive/15 px-1 rounded">/v1/hooks/stripe</code> has no signature verification enabled.</p>
                                        <Button variant="link" className="mt-2 p-0 h-auto text-xs font-bold text-foreground hover:underline">
                                            Fix Vulnerability
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ===== Tab: Storage ===== */}
                    <TabsContent value="storage">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Left Column (8/12) */}
                            <div className="col-span-12 lg:col-span-8 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Primary Storage Engine</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Storage Type</Label>
                                            <Select
                                                value={formData.storage_type}
                                                onValueChange={(value) => handleInputChange('storage_type', value)}
                                            >
                                                <SelectTrigger className="font-mono">
                                                    <SelectValue placeholder="Select storage type"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="local">Local File System</SelectItem>
                                                    <SelectItem value="s3" disabled={!storageCaps.s3_available}>Amazon S3{!storageCaps.s3_available ? ' (Not Available)' : ''}</SelectItem>
                                                    <SelectItem value="hybrid" disabled={!storageCaps.hybrid_available}>Hybrid{!storageCaps.hybrid_available ? ' (Not Available)' : ''}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* S3 Configuration (conditional) */}
                                        {showS3Config && (
                                            <div className="p-6 border border-border rounded-lg bg-muted">
                                                <h4 className="text-[11px] font-bold text-card-foreground uppercase tracking-wider mb-4">S3 Configuration</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Endpoint</Label>
                                                        <Input
                                                            className="font-mono"
                                                            value={formData.s3_endpoint}
                                                            onChange={(e) => handleInputChange('s3_endpoint', e.target.value)}
                                                            placeholder="https://s3.amazonaws.com"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Region</Label>
                                                        <Input
                                                            className="font-mono"
                                                            value={formData.s3_region}
                                                            onChange={(e) => handleInputChange('s3_region', e.target.value)}
                                                            placeholder="us-east-1"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5 col-span-2">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Bucket Name</Label>
                                                        <Input
                                                            className="font-mono"
                                                            value={formData.s3_bucket}
                                                            onChange={(e) => handleInputChange('s3_bucket', e.target.value)}
                                                            placeholder="origstudio-assets-production"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Access Key</Label>
                                                        <Input
                                                            className="font-mono"
                                                            type="password"
                                                            value={formData.s3_access_key}
                                                            onChange={(e) => handleInputChange('s3_access_key', e.target.value)}
                                                            placeholder="AKIA****************"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Secret Key</Label>
                                                        <Input
                                                            className="font-mono"
                                                            type="password"
                                                            value={formData.s3_secret_key}
                                                            onChange={(e) => handleInputChange('s3_secret_key', e.target.value)}
                                                            placeholder="********************************"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Local Storage Path */}
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Storage Base Path</Label>
                                            <Input
                                                className="font-mono"
                                                value={formData.storage_base_path}
                                                onChange={(e) => handleInputChange('storage_base_path', e.target.value)}
                                                placeholder="/var/media"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {['originals/', 'temp/', 'thumbnails/', 'hls/', 'previews/', 'sprites/'].map(dir => (
                                                <code key={dir} className="px-2 py-1 text-xs rounded bg-muted border border-border font-mono text-muted-foreground">
                                                    {formData.storage_base_path ? `${formData.storage_base_path}/${dir}` : dir}
                                                </code>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column (4/12) */}
                            <div className="col-span-12 lg:col-span-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Usage Breakdown</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs text-muted-foreground">Hot Storage</span>
                                                <span className="text-xs font-mono text-card-foreground">8.4 TB</span>
                                            </div>
                                            <Progress value={82} className="h-2"/>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs text-muted-foreground">Archival</span>
                                                <span className="text-xs font-mono text-card-foreground">112 TB</span>
                                            </div>
                                            <Progress value={45} className="h-2"/>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ===== Tab: Media ===== */}
                    <TabsContent value="media">
                        <div className="max-w-4xl space-y-6">
                            {/* Auto-Transcode Toggle */}
                            <Card>
                                <CardContent className="py-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Auto-Transcode on Upload</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Automatically process all video assets to multi-bitrate HLS.</p>
                                        </div>
                                        <Switch
                                            checked={formData.auto_transcode === 'true'}
                                            onCheckedChange={(checked) => handleInputChange('auto_transcode', String(checked))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Transcoding Engine */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Transcoding Engine</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Method</Label>
                                                <Select
                                                    value={formData.transcode_method}
                                                    onValueChange={(value) => handleInputChange('transcode_method', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select method"/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ffmpeg">Software (FFmpeg x264)</SelectItem>
                                                        <SelectItem value="nvenc">Nvidia NVENC (GPU Accelerated)</SelectItem>
                                                        <SelectItem value="quicksync">Intel QuickSync</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Output Format</Label>
                                                <Select
                                                    value={formData.homepage_layout}
                                                    onValueChange={(value) => handleInputChange('homepage_layout', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select format"/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="hls">HLS (.m3u8)</SelectItem>
                                                        <SelectItem value="dash">DASH (.mpd)</SelectItem>
                                                        <SelectItem value="mp4">MP4 Progressive</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="bg-muted p-4 rounded-lg border border-border">
                                            <h4 className="text-[11px] font-bold text-card-foreground uppercase tracking-wider mb-3">Allowed Formats</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {formData.allowed_video_formats.split(',').map(fmt => (
                                                    <span key={fmt} className="px-2 py-1 bg-card border border-border text-card-foreground text-[11px] rounded font-mono">
                                                        .{fmt.trim()}
                                                    </span>
                                                ))}
                                                <Button variant="outline" className="px-2 py-1 h-auto border-dashed text-[11px] font-mono text-primary">
                                                    + Add
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Upload Limits */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Upload Limits</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Max Upload Size Video (MB)</Label>
                                            <Input
                                                className="font-mono"
                                                type="number"
                                                value={formData.max_upload_size_video}
                                                onChange={(e) => handleInputChange('max_upload_size_video', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Max Upload Size Image (MB)</Label>
                                            <Input
                                                className="font-mono"
                                                type="number"
                                                value={formData.max_upload_size_image}
                                                onChange={(e) => handleInputChange('max_upload_size_image', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Allowed Image Formats</Label>
                                            <Input
                                                value={formData.allowed_image_formats}
                                                onChange={(e) => handleInputChange('allowed_image_formats', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Max Video Duration (min)</Label>
                                            <Input
                                                className="font-mono"
                                                type="number"
                                                value={formData.max_video_duration}
                                                onChange={(e) => handleInputChange('max_video_duration', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Thumbnail & Sprite */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Thumbnail & Sprite Settings</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Thumbnail Quality</Label>
                                            <Input
                                                className="font-mono"
                                                type="number"
                                                value={formData.thumbnail_quality}
                                                onChange={(e) => handleInputChange('thumbnail_quality', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Thumbnail Resolution</Label>
                                            <Input
                                                value={formData.thumbnail_resolution}
                                                onChange={(e) => handleInputChange('thumbnail_resolution', e.target.value)}
                                                placeholder="320x180"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Sprite Frame Interval</Label>
                                            <Input
                                                className="font-mono"
                                                type="number"
                                                value={formData.sprite_frame_interval}
                                                onChange={(e) => handleInputChange('sprite_frame_interval', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Sprite Columns</Label>
                                            <Input
                                                className="font-mono"
                                                type="number"
                                                value={formData.sprite_columns}
                                                onChange={(e) => handleInputChange('sprite_columns', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ===== Tab: Email ===== */}
                    <TabsContent value="email">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Left Column (8/12) */}
                            <div className="col-span-12 lg:col-span-8">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>SMTP Configuration</CardTitle>
                                            {emailStatus.configured && (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                                                    Connected
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Host</Label>
                                                <Input
                                                    className="font-mono"
                                                    type="text"
                                                    value={formData.smtp_host}
                                                    onChange={(e) => handleInputChange('smtp_host', e.target.value)}
                                                    placeholder="smtp.origstudio.io"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Port</Label>
                                                <Input
                                                    className="font-mono"
                                                    type="text"
                                                    value={formData.smtp_port}
                                                    onChange={(e) => handleInputChange('smtp_port', e.target.value)}
                                                    placeholder="587"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5 col-span-2">
                                                <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Username</Label>
                                                <Input
                                                    value={formData.smtp_user}
                                                    onChange={(e) => handleInputChange('smtp_user', e.target.value)}
                                                    placeholder="noreply@example.com"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5 col-span-2">
                                                <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Password</Label>
                                                <Input
                                                    type="password"
                                                    value={formData.smtp_password}
                                                    onChange={(e) => handleInputChange('smtp_password', e.target.value)}
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Sender Name</Label>
                                            <Input
                                                value={formData.smtp_sender_name}
                                                onChange={(e) => handleInputChange('smtp_sender_name', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted border border-border">
                                            <Switch
                                                checked={formData.smtp_use_tls === 'true'}
                                                onCheckedChange={(checked) => handleInputChange('smtp_use_tls', String(checked))}
                                            />
                                            <Label className="text-sm text-card-foreground font-medium">Use TLS</Label>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column (4/12) */}
                            <div className="col-span-12 lg:col-span-4">
                                <Card className="border-2 border-dashed border-border">
                                    <CardHeader>
                                        <CardTitle className="text-base">Send Test Email</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Input
                                            placeholder="Recipient Address"
                                            type="email"
                                            value={emailTestTo}
                                            onChange={(e) => setEmailTestTo(e.target.value)}
                                        />
                                        <Button
                                            className="w-full"
                                            onClick={handleEmailTest}
                                            disabled={emailTestSending || !emailTestTo}
                                        >
                                            {emailTestSending ? (
                                                <Loader2 className="w-4 h-4 animate-spin"/>
                                            ) : (
                                                <Send className="w-4 h-4"/>
                                            )}
                                            Send Test
                                        </Button>
                                        {emailStatus.configured && (
                                            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-500"/>
                                                <span className="text-xs font-medium text-emerald-700">Email is configured and ready</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ===== Tab: Security ===== */}
                    <TabsContent value="security">
                        <div className="space-y-6">
                            {/* 2-column grid of toggle cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Allow Public Registration */}
                                <Card>
                                    <CardContent className="py-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Allow Public Registration</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Allow new users to sign up without invitation.</p>
                                            </div>
                                            <Switch
                                                checked={formData.allow_registration === 'true'}
                                                onCheckedChange={(checked) => handleInputChange('allow_registration', String(checked))}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Enforce 2FA */}
                                <Card>
                                    <CardContent className="py-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Enforce 2FA</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Mandatory two-factor auth for all administrators.</p>
                                            </div>
                                            <Switch
                                                checked={formData.require_email_verification === 'true'}
                                                onCheckedChange={(checked) => handleInputChange('require_email_verification', String(checked))}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* API Rate Limiting */}
                                <Card>
                                    <CardContent className="py-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">API Rate Limiting</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Limit requests to {formData.api_rate_limit}/min per IP address.</p>
                                            </div>
                                            <Switch
                                                checked={parseInt(formData.api_rate_limit) > 0}
                                                onCheckedChange={(checked) => handleInputChange('api_rate_limit', checked ? '60' : '0')}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Session Expiry */}
                                <Card>
                                    <CardContent className="py-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Session Expiry</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Auto-logout after 24 hours of inactivity.</p>
                                            </div>
                                            <Switch
                                                checked={formData.auto_approve === 'true'}
                                                onCheckedChange={(checked) => {
                                                    handleInputChange('auto_approve', String(checked));
                                                    handleInputChange('require_review', String(!checked));
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Auth Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Authentication</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Require Email Verification</p>
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase">Verify email before access</p>
                                        </div>
                                        <Switch
                                            checked={formData.require_email_verification === 'true'}
                                            onCheckedChange={(checked) => handleInputChange('require_email_verification', String(checked))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">Min Password Length</Label>
                                            <Input
                                                className="font-mono"
                                                type="number"
                                                value={formData.min_password_length}
                                                onChange={(e) => handleInputChange('min_password_length', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-[11px] font-medium text-card-foreground uppercase tracking-wider">API Rate Limit (req/min)</Label>
                                            <Input
                                                className="font-mono"
                                                type="number"
                                                value={formData.api_rate_limit}
                                                onChange={(e) => handleInputChange('api_rate_limit', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-4">
                                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0"/>
                                        <p className="text-xs text-destructive/80 leading-relaxed font-medium">Changing these values may affect system stability under high load. Ensure your infrastructure scale policy is aligned before applying higher limits.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ===== Tab: Modules ===== */}
                    <TabsContent value="modules">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Left Column (4/12) */}
                            <div className="col-span-12 lg:col-span-4 space-y-4">
                                <h3 className="text-sm font-semibold text-foreground mb-2">Core Modules</h3>
                                <div className={`p-4 border-2 rounded-lg flex justify-between items-center ${
                                    formData.module_articles ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-primary"/>
                                        <span className="text-sm font-semibold text-foreground">Articles</span>
                                    </div>
                                    <Badge variant={formData.module_articles ? 'soft-success' : 'soft-neutral'}>
                                        {formData.module_articles ? 'Active' : 'Disabled'}
                                    </Badge>
                                </div>
                                <div className={`p-4 border-2 rounded-lg flex justify-between items-center ${
                                    formData.module_videos ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <Video className="w-5 h-5 text-primary"/>
                                        <span className="text-sm font-semibold text-foreground">Video Management</span>
                                    </div>
                                    <Badge variant={formData.module_videos ? 'soft-success' : 'soft-neutral'}>
                                        {formData.module_videos ? 'Active' : 'Disabled'}
                                    </Badge>
                                </div>
                                <div className={`p-4 border rounded-lg flex justify-between items-center ${
                                    formData.module_music ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                                } ${!formData.module_music ? 'opacity-50 grayscale' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <Music2 className="w-5 h-5 text-primary"/>
                                        <span className="text-sm font-semibold text-foreground">Audio Streaming</span>
                                    </div>
                                    <Badge variant={formData.module_music ? 'soft-success' : 'soft-neutral'}>
                                        {formData.module_music ? 'Active' : 'Disabled'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Right Column (8/12) */}
                            <div className="col-span-12 lg:col-span-8">
                                <h3 className="text-sm font-semibold text-foreground mb-6">Homepage Layout Selection</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            formData.homepage_layout === 'auto'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border bg-card hover:border-border'
                                        }`}
                                        onClick={() => handleInputChange('homepage_layout', 'auto')}
                                    >
                                        <LayoutGrid className={`w-5 h-5 mb-2 ${formData.homepage_layout === 'auto' ? 'text-primary' : 'text-muted-foreground'}`}/>
                                        <p className="text-sm font-semibold text-foreground">Mixed Mode</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Recommended for general content delivery.</p>
                                    </div>
                                    <div
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            formData.homepage_layout === 'video'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border bg-card hover:border-border'
                                        }`}
                                        onClick={() => handleInputChange('homepage_layout', 'video')}
                                    >
                                        <Film className={`w-5 h-5 mb-2 ${formData.homepage_layout === 'video' ? 'text-primary' : 'text-muted-foreground'}`}/>
                                        <p className="text-sm font-semibold text-foreground">Video Focus</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Cinema-style portal with hero slider.</p>
                                    </div>
                                    <div
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            formData.homepage_layout === 'editorial'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border bg-card hover:border-border'
                                        }`}
                                        onClick={() => handleInputChange('homepage_layout', 'editorial')}
                                    >
                                        <BookOpen className={`w-5 h-5 mb-2 ${formData.homepage_layout === 'editorial' ? 'text-primary' : 'text-muted-foreground'}`}/>
                                        <p className="text-sm font-semibold text-foreground">Editorial</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Clean typography for long-form reading.</p>
                                    </div>
                                </div>

                                {/* Content Modules Toggle */}
                                <Card className="mt-8">
                                    <CardHeader>
                                        <CardTitle>Content Modules</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Articles Module</p>
                                                <p className="text-[10px] text-muted-foreground font-mono uppercase">Blog & article system</p>
                                            </div>
                                            <Switch
                                                checked={formData.module_articles}
                                                onCheckedChange={(checked) => setFormData(prev => ({...prev, module_articles: checked}))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Videos Module</p>
                                                <p className="text-[10px] text-muted-foreground font-mono uppercase">Video streaming system</p>
                                            </div>
                                            <Switch
                                                checked={formData.module_videos}
                                                onCheckedChange={(checked) => setFormData(prev => ({...prev, module_videos: checked}))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Music Module</p>
                                                <p className="text-[10px] text-muted-foreground font-mono uppercase">Audio streaming system</p>
                                            </div>
                                            <Switch
                                                checked={formData.module_music}
                                                onCheckedChange={(checked) => setFormData(prev => ({...prev, module_music: checked}))}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ===== Tab: Features ===== */}
                    <TabsContent value="features">
                        <div className="space-y-6">
                            {/* Core Features Info */}
                            <Card className="border-primary/20 bg-primary/5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-primary"/>
                                        Core Features (Always Enabled)
                                    </CardTitle>
                                    <CardDescription>
                                        These features represent the primary video business focus and cannot be disabled.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {[
                                            {name: 'Upload', icon: Upload, desc: 'Multipart upload'},
                                            {name: 'Transcoding', icon: Cpu, desc: 'Video encoding'},
                                            {name: 'Media Browse', icon: Film, desc: 'Media library'},
                                            {name: 'Channels', icon: Radio, desc: 'Channel management'},
                                            {name: 'Categories', icon: FolderTree, desc: 'Content categories'},
                                            {name: 'Tags', icon: Tags, desc: 'Content tagging'},
                                        ].map((feature) => (
                                            <div key={feature.name} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                                                <feature.icon className="w-4 h-4 text-primary flex-shrink-0"/>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground">{feature.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{feature.desc}</p>
                                                </div>
                                                <Badge variant="soft-success" className="ml-auto">Active</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Secondary Features Toggle */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Secondary Features</CardTitle>
                                    <CardDescription>
                                        Toggle to show or hide admin menu items. Disabled features remain accessible via direct URL but are hidden from navigation.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        {key: 'feature_articles' as const, name: 'Articles', desc: 'Blog & article system', icon: FileText},
                                        {key: 'feature_comments' as const, name: 'Comments', desc: 'Comment moderation', icon: MessageSquare},
                                        {key: 'feature_playlists' as const, name: 'Playlists', desc: 'Playlist management', icon: PlayCircle},
                                        {key: 'feature_users' as const, name: 'Users', desc: 'User management', icon: Users},
                                        {key: 'feature_permissions' as const, name: 'Permissions', desc: 'Role & permission management', icon: Key},
                                        {key: 'feature_notifications' as const, name: 'Notifications', desc: 'System notifications', icon: Bell},
                                    ].map((feature) => (
                                        <div key={feature.key} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                                            <div className="flex items-center gap-3">
                                                <feature.icon className="w-5 h-5 text-muted-foreground"/>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">{feature.name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono uppercase">{feature.desc}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={formData[feature.key]}
                                                onCheckedChange={(checked) => setFormData(prev => ({...prev, [feature.key]: checked}))}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Enterprise Features Toggle */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Enterprise Features</CardTitle>
                                    <CardDescription>
                                        EE-only features. Disable to simplify the admin interface for CE-only deployments.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        {key: 'feature_drm' as const, name: 'DRM Management', desc: 'Digital rights management', icon: Shield},
                                        {key: 'feature_live_rooms' as const, name: 'Live Rooms', desc: 'Live streaming rooms', icon: Tv2},
                                        {key: 'feature_payment' as const, name: 'Payment', desc: 'Payment & subscription', icon: CreditCard},
                                        {key: 'feature_promotion' as const, name: 'Promotion', desc: 'Promotion campaigns', icon: Megaphone},
                                        {key: 'feature_ads' as const, name: 'Ads', desc: 'Advertisement management', icon: Target},
                                    ].map((feature) => (
                                        <div key={feature.key} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                                            <div className="flex items-center gap-3">
                                                <feature.icon className="w-5 h-5 text-muted-foreground"/>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">{feature.name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono uppercase">{feature.desc}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={formData[feature.key]}
                                                onCheckedChange={(checked) => setFormData(prev => ({...prev, [feature.key]: checked}))}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ===== Tab: System ===== */}
                    <TabsContent value="system">
                        <div className="space-y-8">
                            {/* 4 Stat Cards Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Memory Usage</p>
                                        <div className="flex items-end justify-between mb-4">
                                            <h4 className="text-2xl font-bold text-foreground">
                                                {systemInfo?.usedMemory ? parseFloat(systemInfo.usedMemory).toFixed(1) : '4.2'}
                                                <span className="text-base text-muted-foreground ml-1 font-normal">GB</span>
                                            </h4>
                                            <span className="text-emerald-600 text-xs font-mono">+12%</span>
                                        </div>
                                        <Progress value={systemInfo?.memoryUsage || 42} className="h-2"/>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">CPU Load</p>
                                        <div className="flex items-end justify-between mb-4">
                                            <h4 className="text-2xl font-bold text-foreground">
                                                {systemInfo?.cpuUsage ? parseInt(systemInfo.cpuUsage) : '18'}
                                                <span className="text-base text-muted-foreground ml-1 font-normal">%</span>
                                            </h4>
                                            <span className="text-muted-foreground text-xs font-mono">-2%</span>
                                        </div>
                                        <Progress value={systemInfo?.cpuUsage ? parseInt(systemInfo.cpuUsage) : 18} className="h-2"/>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Active GoRoutines</p>
                                        <div className="flex items-end justify-between mb-4">
                                            <h4 className="text-2xl font-bold text-foreground">
                                                {systemInfo?.numGoroutine?.toLocaleString() || '1,402'}
                                            </h4>
                                            <span className="text-red-500 text-xs font-mono">+84</span>
                                        </div>
                                        <Progress value={65} className="h-2"/>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Disk I/O</p>
                                        <div className="flex items-end justify-between mb-4">
                                            <h4 className="text-2xl font-bold text-foreground">
                                                240
                                                <span className="text-base text-muted-foreground ml-1 font-normal">MB/s</span>
                                            </h4>
                                            <span className="text-emerald-600 text-xs font-mono">Steady</span>
                                        </div>
                                        <Progress value={32} className="h-2"/>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Server Information (3-column grid) */}
                            {systemInfo && (
                                <Card className="overflow-hidden">
                                    <CardHeader className="border-b border-border">
                                        <CardTitle>Server Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="grid grid-cols-1 md:grid-cols-3">
                                            <div className="p-6 border-r border-border space-y-4">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">OrigStudio Core</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.version || 'v2.4.1-enterprise'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Go Runtime</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.goVersion || 'go1.22.3'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">OS Architecture</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.os || 'linux/amd64'}</span>
                                                </div>
                                            </div>
                                            <div className="p-6 border-r border-border space-y-4">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">System Uptime</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.uptime || '14d 2h 11m'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Total Memory</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.totalMemory || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">CPUs</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.numCPU || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="p-6 space-y-4">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Goroutines</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.numGoroutine || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Database</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.database || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Used Memory</span>
                                                    <span className="font-mono text-xs text-foreground">{systemInfo.usedMemory || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Active System Processes */}
                            <Card className="overflow-hidden">
                                <CardHeader className="border-b border-border">
                                    <CardTitle>Active System Processes</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PROCESS ID</TableHead>
                                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SERVICE</TableHead>
                                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">STATUS</TableHead>
                                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">MEMORY</TableHead>
                                                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">81920</TableCell>
                                                <TableCell className="px-6 py-4 text-sm font-semibold text-card-foreground">Media-Worker-A1</TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <Badge variant="soft-success">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>RUNNING
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">1,024 MB</TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-600 hover:bg-red-50">
                                                        <XCircle className="w-4 h-4"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">44211</TableCell>
                                                <TableCell className="px-6 py-4 text-sm font-semibold text-card-foreground">Distribution-Edge-UK</TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <Badge variant="soft-success">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>RUNNING
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">512 MB</TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-600 hover:bg-red-50">
                                                        <XCircle className="w-4 h-4"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">09212</TableCell>
                                                <TableCell className="px-6 py-4 text-sm font-semibold text-card-foreground">Ingest-Proxy-Service</TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <Badge variant="soft-neutral">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>IDLE
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">256 MB</TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-600 hover:bg-red-50">
                                                        <XCircle className="w-4 h-4"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default Settings;