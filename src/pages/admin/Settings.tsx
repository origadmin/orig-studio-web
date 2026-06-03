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
} from 'lucide-react';
import {settingsApi, type GroupedSettings} from '@/lib/api/system';
import {api} from '@/lib/request';
import {ThemeSwitcher} from '@/themes';

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
};

const tabs = [
    {id: 'general', label: 'General'},
    {id: 'storage', label: 'Storage'},
    {id: 'media', label: 'Media'},
    {id: 'email', label: 'Email'},
    {id: 'security', label: 'Security'},
    {id: 'modules', label: 'Modules'},
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
                        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"/>
                        <div className="h-4 w-64 bg-slate-100 rounded animate-pulse mt-2"/>
                    </div>
                    <div className="flex gap-3">
                        <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse"/>
                        <div className="h-9 w-28 bg-slate-100 rounded-lg animate-pulse"/>
                    </div>
                </div>
                <div className="h-12 bg-slate-100 rounded-t-xl animate-pulse mb-6"/>
                <div className="space-y-6">
                    {[1, 2].map(i => (
                        <div key={i} className="p-6 rounded-xl border border-slate-200 bg-white animate-pulse">
                            <div className="h-5 w-40 bg-slate-100 rounded mb-4"/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(j => (
                                    <div key={j} className="space-y-2">
                                        <div className="h-3 w-20 bg-slate-100 rounded"/>
                                        <div className="h-9 bg-slate-50 rounded-lg"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Message Toast */}
            {message && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${
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

            {/* Page Title & Actions */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">System Settings</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure core system parameters and integrations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        onClick={fetchSettings}
                    >
                        Discard
                    </button>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin"/>
                        ) : (
                            <Save className="w-4 h-4"/>
                        )}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Secondary Navigation (Tabs) */}
            <div className="flex border-b border-slate-200 bg-white rounded-t-xl mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`px-6 py-3.5 text-sm ${
                            activeTab === tab.id
                                ? 'font-semibold border-b-2 border-indigo-600 text-indigo-600'
                                : 'font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 hover:border-slate-300 transition-colors'
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="space-y-6">
                {/* Tab: General */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200 bg-white">
                                <h3 className="text-base font-semibold text-slate-800 mb-4">Base URL Configuration</h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">CMS CORE API</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                                type="text"
                                                value={formData.base_urls[0] || ''}
                                                onChange={(e) => handleBaseUrlChange(0, e.target.value)}
                                                placeholder="https://api.example.com/v3"
                                            />
                                            <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Link2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">CDN DELIVERY ENDPOINT</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                                type="text"
                                                value={formData.primary_url}
                                                onChange={(e) => handleInputChange('primary_url', e.target.value)}
                                                placeholder="https://cdn.example.net/edge"
                                            />
                                            <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Link2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">ENCODING WORKER POOL</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                                type="text"
                                                value={formData.s3_endpoint}
                                                onChange={(e) => handleInputChange('s3_endpoint', e.target.value)}
                                                placeholder="https://transcode-cluster.aws.internal"
                                            />
                                            <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Link2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 rounded-xl border border-slate-200 bg-white">
                                <h3 className="text-base font-semibold text-slate-800 mb-4 text-center">Instance Health</h3>
                                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-4">
                                    <CheckCircle className="w-6 h-6 text-emerald-500"/>
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-700">Production Ready</p>
                                        <p className="text-xs text-slate-500">Uptime: 99.98% (42 days)</p>
                                    </div>
                                </div>
                                <div className="mt-6 space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            <span>Latency</span>
                                            <span className="text-slate-700 font-mono">14ms</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="w-[15%] h-full bg-indigo-600"/>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            <span>Error Rate</span>
                                            <span className="text-slate-700 font-mono">0.002%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="w-[2%] h-full bg-emerald-500"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Site Info */}
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Site Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">SITE NAME</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                        value={formData.site_name}
                                        onChange={(e) => handleInputChange('site_name', e.target.value)}
                                        placeholder="Enter site name"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">SITE DESCRIPTION</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                        value={formData.site_description}
                                        onChange={(e) => handleInputChange('site_description', e.target.value)}
                                        placeholder="Enter site description"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Appearance */}
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Appearance</h3>
                            <ThemeSwitcher/>
                        </div>
                    </div>
                )}

                {/* Tab: Storage */}
                {activeTab === 'storage' && (
                    <div className="space-y-6">
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-base font-semibold text-slate-800">S3 Cloud Storage Configuration</h3>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                    Active Provider: {formData.storage_type === 's3' ? 'AWS' : formData.storage_type === 'hybrid' ? 'Hybrid' : 'Local'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">ACCESS KEY ID</label>
                                        <input
                                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            type="password"
                                            value={formData.s3_access_key}
                                            onChange={(e) => handleInputChange('s3_access_key', e.target.value)}
                                            placeholder="AKIA****************"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">SECRET ACCESS KEY</label>
                                        <input
                                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            type="password"
                                            value={formData.s3_secret_key}
                                            onChange={(e) => handleInputChange('s3_secret_key', e.target.value)}
                                            placeholder="********************************"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">REGION</label>
                                        <select
                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                            value={formData.s3_region}
                                            onChange={(e) => handleInputChange('s3_region', e.target.value)}
                                        >
                                            <option value="us-east-1">us-east-1</option>
                                            <option value="eu-west-1">eu-west-1</option>
                                            <option value="ap-southeast-2">ap-southeast-2</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">BUCKET NAME</label>
                                        <input
                                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            type="text"
                                            value={formData.s3_bucket}
                                            onChange={(e) => handleInputChange('s3_bucket', e.target.value)}
                                            placeholder="origstudio-assets-production-v3"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button className="mt-6 inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:underline">
                                <CloudLightning className="w-4 h-4"/>Test Connection
                            </button>
                        </div>

                        {/* Local Storage Config */}
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Local Storage</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">STORAGE BASE PATH</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="text"
                                        value={formData.storage_base_path}
                                        onChange={(e) => handleInputChange('storage_base_path', e.target.value)}
                                        placeholder="/var/media"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">STORAGE TYPE</label>
                                    <select
                                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                        value={formData.storage_type}
                                        onChange={(e) => handleInputChange('storage_type', e.target.value)}
                                    >
                                        <option value="local">Local</option>
                                        <option value="s3" disabled={!storageCaps.s3_available}>S3{!storageCaps.s3_available ? ' (Not Available)' : ''}</option>
                                        <option value="hybrid" disabled={!storageCaps.hybrid_available}>Hybrid{!storageCaps.hybrid_available ? ' (Not Available)' : ''}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {['originals/', 'temp/', 'thumbnails/', 'hls/', 'previews/', 'sprites/'].map(dir => (
                                    <code key={dir} className="px-2 py-1 text-xs rounded bg-slate-50 border border-slate-200 font-mono text-slate-500">
                                        {formData.storage_base_path ? `${formData.storage_base_path}/${dir}` : dir}
                                    </code>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Media */}
                {activeTab === 'media' && (
                    <div className="space-y-6">
                        <div className="max-w-3xl p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-6">Media Upload & Processing Limits</h3>
                            <div className="space-y-8">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-slate-700">Maximum Upload Size</label>
                                        <span className="text-sm font-mono text-indigo-600 font-bold">{uploadSizeGB.toFixed(1)} GB</span>
                                    </div>
                                    <input
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        max="100"
                                        min="1"
                                        type="range"
                                        value={uploadSizeGB * 20}
                                        onChange={(e) => setUploadSizeGB(Number(e.target.value) / 20)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">CONCURRENT TRANSCODES</label>
                                        <input
                                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            type="number"
                                            value={formData.max_upload_size_video}
                                            onChange={(e) => handleInputChange('max_upload_size_video', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">RETAIN TEMP FILES (HOURS)</label>
                                        <input
                                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            type="number"
                                            value={formData.max_video_duration}
                                            onChange={(e) => handleInputChange('max_video_duration', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            checked={formData.auto_transcode === 'true'}
                                            className="sr-only peer"
                                            type="checkbox"
                                            onChange={(e) => handleInputChange('auto_transcode', String(e.target.checked))}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"/>
                                    </label>
                                    <label className="text-sm text-slate-700 font-medium">Automatically apply forensic watermarking to internal screener previews</label>
                                </div>
                            </div>
                        </div>

                        {/* Upload Limits */}
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Upload Limits</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">MAX UPLOAD SIZE VIDEO (MB)</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="number"
                                        value={formData.max_upload_size_video}
                                        onChange={(e) => handleInputChange('max_upload_size_video', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">MAX UPLOAD SIZE IMAGE (MB)</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="number"
                                        value={formData.max_upload_size_image}
                                        onChange={(e) => handleInputChange('max_upload_size_image', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">ALLOWED VIDEO FORMATS</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        value={formData.allowed_video_formats}
                                        onChange={(e) => handleInputChange('allowed_video_formats', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">ALLOWED IMAGE FORMATS</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        value={formData.allowed_image_formats}
                                        onChange={(e) => handleInputChange('allowed_image_formats', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Thumbnail & Sprite */}
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Thumbnail & Sprite Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">THUMBNAIL QUALITY</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="number"
                                        value={formData.thumbnail_quality}
                                        onChange={(e) => handleInputChange('thumbnail_quality', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">THUMBNAIL RESOLUTION</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        value={formData.thumbnail_resolution}
                                        onChange={(e) => handleInputChange('thumbnail_resolution', e.target.value)}
                                        placeholder="320x180"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">SPRITE FRAME INTERVAL</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="number"
                                        value={formData.sprite_frame_interval}
                                        onChange={(e) => handleInputChange('sprite_frame_interval', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">SPRITE COLUMNS</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="number"
                                        value={formData.sprite_columns}
                                        onChange={(e) => handleInputChange('sprite_columns', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Email */}
                {activeTab === 'email' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">SMTP Configuration</h3>
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">HOST</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="text"
                                        value={formData.smtp_host}
                                        onChange={(e) => handleInputChange('smtp_host', e.target.value)}
                                        placeholder="smtp.postmarkapp.com"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">PORT</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="text"
                                        value={formData.smtp_port}
                                        onChange={(e) => handleInputChange('smtp_port', e.target.value)}
                                        placeholder="587"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">USERNAME</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        value={formData.smtp_user}
                                        onChange={(e) => handleInputChange('smtp_user', e.target.value)}
                                        placeholder="noreply@example.com"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">PASSWORD</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        type="password"
                                        value={formData.smtp_password}
                                        onChange={(e) => handleInputChange('smtp_password', e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">SENDER NAME</label>
                                    <input
                                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        value={formData.smtp_sender_name}
                                        onChange={(e) => handleInputChange('smtp_sender_name', e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            checked={formData.smtp_use_tls === 'true'}
                                            className="sr-only peer"
                                            type="checkbox"
                                            onChange={(e) => handleInputChange('smtp_use_tls', String(e.target.checked))}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"/>
                                    </label>
                                    <label className="text-sm text-slate-700 font-medium">Use TLS</label>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">SMTP Diagnostics</h3>
                            <p className="text-sm text-slate-500 mb-6">Send a test email to verify your outgoing mail server configuration.</p>
                            <div className="flex flex-col gap-4">
                                <input
                                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    placeholder="recipient@example.com"
                                    type="email"
                                    value={emailTestTo}
                                    onChange={(e) => setEmailTestTo(e.target.value)}
                                />
                                <button
                                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    onClick={handleEmailTest}
                                    disabled={emailTestSending || !emailTestTo}
                                >
                                    {emailTestSending ? (
                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                    ) : (
                                        <Send className="w-4 h-4"/>
                                    )}
                                    Run SMTP Test
                                </button>
                            </div>
                            {emailStatus.configured && (
                                <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500"/>
                                    <span className="text-xs font-medium text-emerald-700">Email is configured and ready</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Security */}
                {activeTab === 'security' && (
                    <div className="space-y-6">
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-6">API Rate Limiting</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Standard Users</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">Non-admin API tokens</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            type="text"
                                            value={formData.api_rate_limit}
                                            onChange={(e) => handleInputChange('api_rate_limit', e.target.value)}
                                        />
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">req/min</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">External Integrations</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">Public webhooks</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            type="text"
                                            value="5000"
                                            readOnly
                                        />
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">req/min</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex gap-4 mt-4">
                                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0"/>
                                    <p className="text-xs text-red-700 leading-relaxed font-medium">Changing these values may affect system stability under high load. Ensure your infrastructure scale policy is aligned before applying higher limits.</p>
                                </div>
                            </div>
                        </div>

                        {/* Auth Settings */}
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-6">Authentication</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Allow Registration</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">Enable new user sign-up</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            checked={formData.allow_registration === 'true'}
                                            className="sr-only peer"
                                            type="checkbox"
                                            onChange={(e) => handleInputChange('allow_registration', String(e.target.checked))}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"/>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Require Email Verification</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">Verify email before access</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            checked={formData.require_email_verification === 'true'}
                                            className="sr-only peer"
                                            type="checkbox"
                                            onChange={(e) => handleInputChange('require_email_verification', String(e.target.checked))}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"/>
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">MIN PASSWORD LENGTH</label>
                                        <input
                                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            type="number"
                                            value={formData.min_password_length}
                                            onChange={(e) => handleInputChange('min_password_length', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">AUTO APPROVE</label>
                                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    checked={formData.auto_approve === 'true'}
                                                    className="sr-only peer"
                                                    type="checkbox"
                                                    onChange={(e) => {
                                                        handleInputChange('auto_approve', String(e.target.checked));
                                                        handleInputChange('require_review', String(!e.target.checked));
                                                    }}
                                                />
                                                <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"/>
                                            </label>
                                            <span className="text-sm text-slate-700">Auto-approve content</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Modules */}
                {activeTab === 'modules' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-800">Homepage Layout (2x3 Grid)</h3>
                            <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors uppercase tracking-widest">
                                <Plus className="w-3 h-3"/>Custom Grid
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="p-6 aspect-[4/3] rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4 cursor-grab hover:border-indigo-400 hover:shadow-sm transition-all group">
                                <BarChart3 className="w-12 h-12 text-slate-300 group-hover:text-indigo-600 transition-colors"/>
                                <p className="text-sm font-semibold text-slate-700">Real-time Analytics</p>
                            </div>
                            <div className="p-6 aspect-[4/3] rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4 cursor-grab hover:border-indigo-400 hover:shadow-sm transition-all group">
                                <Play className="w-12 h-12 text-slate-300 group-hover:text-indigo-600 transition-colors"/>
                                <p className="text-sm font-semibold text-slate-700">Video Player Health</p>
                            </div>
                            <div className="p-6 aspect-[4/3] rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4 cursor-grab hover:border-indigo-400 hover:shadow-sm transition-all group">
                                <ShieldCheck className="w-12 h-12 text-slate-300 group-hover:text-indigo-600 transition-colors"/>
                                <p className="text-sm font-semibold text-slate-700">Audit Stream</p>
                            </div>
                            <div className="p-6 aspect-[4/3] rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4 cursor-grab hover:border-indigo-400 hover:shadow-sm transition-all group">
                                <Server className="w-12 h-12 text-slate-300 group-hover:text-indigo-600 transition-colors"/>
                                <p className="text-sm font-semibold text-slate-700">Storage Nodes</p>
                            </div>
                            <div className="p-6 aspect-[4/3] rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4 cursor-grab hover:border-indigo-400 hover:shadow-sm transition-all group">
                                <CloudSun className="w-12 h-12 text-slate-300 group-hover:text-indigo-600 transition-colors"/>
                                <p className="text-sm font-semibold text-slate-700">S3 Object Monitor</p>
                            </div>
                            <div className="p-6 aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group">
                                <PlusCircle className="w-6 h-6 text-slate-400 group-hover:text-indigo-600"/>
                                <p className="text-sm font-semibold text-slate-400 group-hover:text-indigo-600">Add Module</p>
                            </div>
                        </div>

                        {/* Content Modules Toggle */}
                        <div className="p-6 rounded-xl border border-slate-200 bg-white">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Content Modules</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Articles Module</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">Blog & article system</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            checked={formData.module_articles}
                                            className="sr-only peer"
                                            type="checkbox"
                                            onChange={(e) => setFormData(prev => ({...prev, module_articles: e.target.checked}))}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"/>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Videos Module</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">Video streaming system</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            checked={formData.module_videos}
                                            className="sr-only peer"
                                            type="checkbox"
                                            onChange={(e) => setFormData(prev => ({...prev, module_videos: e.target.checked}))}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"/>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Music Module</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">Audio streaming system</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            checked={formData.module_music}
                                            className="sr-only peer"
                                            type="checkbox"
                                            onChange={(e) => setFormData(prev => ({...prev, module_music: e.target.checked}))}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"/>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: System */}
                {activeTab === 'system' && (
                    <div className="space-y-8">
                        {/* Resource Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPU USAGE</span>
                                    <span className="text-sm font-mono font-bold text-indigo-600">{systemInfo?.cpuUsage || '64%'}</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="w-[64%] h-full bg-indigo-600 rounded-full"/>
                                </div>
                            </div>
                            <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MEMORY</span>
                                    <span className="text-sm font-mono font-bold text-emerald-600">{systemInfo?.memoryUsage?.toFixed(0) || '42'}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{width: `${systemInfo?.memoryUsage || 42}%`}}/>
                                </div>
                            </div>
                            <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DISK I/O</span>
                                    <span className="text-sm font-mono font-bold text-amber-600">88%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="w-[88%] h-full bg-amber-500 rounded-full"/>
                                </div>
                            </div>
                            <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NETWORK</span>
                                    <span className="text-sm font-mono font-bold text-slate-700">12%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="w-[12%] h-full bg-slate-600 rounded-full"/>
                                </div>
                            </div>
                        </div>

                        {/* Process Table */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="text-base font-semibold text-slate-800">Active System Processes</h3>
                            </div>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">PROCESS ID</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">SERVICE</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">STATUS</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">MEMORY</th>
                                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">81920</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">Media-Worker-A1</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>RUNNING
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">1,024 MB</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <XCircle className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">44211</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">Distribution-Edge-UK</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>RUNNING
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">512 MB</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <XCircle className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">09212</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">Ingest-Proxy-Service</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>IDLE
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">256 MB</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <XCircle className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Server Info */}
                        {systemInfo && (
                            <div className="p-6 rounded-xl border border-slate-200 bg-white">
                                <h3 className="text-base font-semibold text-slate-800 mb-4">Server Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        {label: 'Version', value: systemInfo.version || '-'},
                                        {label: 'Go Version', value: systemInfo.goVersion || '-'},
                                        {label: 'Database', value: systemInfo.database || '-'},
                                        {label: 'OS', value: systemInfo.os || '-'},
                                        {label: 'Uptime', value: systemInfo.uptime || '-'},
                                        {label: 'CPUs', value: String(systemInfo.numCPU ?? '-')},
                                        {label: 'Goroutines', value: String(systemInfo.numGoroutine ?? '-')},
                                        {label: 'Total Memory', value: systemInfo.totalMemory || '-'},
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                                            <span className="text-sm font-medium text-slate-700 font-mono">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
