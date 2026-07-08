import React, {useState, useEffect} from 'react';
import {
    Bell,
    Send,
    Plus,
    Loader2,
    Mail,
    MessageSquareMore,
    X,
    Filter,
    Download,
    Signal,
    Wifi,
    Battery,
    BellRing,
    Webhook,
    Trash2,
    Inbox,
    Smartphone,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {notificationApi, type Notification} from '@/lib/api/notification';
import {adminUserApi, type User} from '@/lib/api/user';
import {settingsApi} from '@/lib/api/system';
import {formatDateTime} from '@/lib/format';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Switch} from '@/components/ui/switch';
import {Checkbox} from '@/components/ui/checkbox';
import {AdminPageTemplate} from '@/components/AdminPageTemplate';
import {useNotificationState} from '@/contexts/NotificationContext';
import {usePagination} from '@/hooks/usePagination';

type TabKey = 'send' | 'history' | 'config';
type ChannelKey = 'in_app' | 'email' | 'push' | 'webhook';

const AdminNotifications: React.FC = () => {
    const {t} = useTranslation();
    const {refresh: refreshBell} = useNotificationState();

    const channelLabels: Record<ChannelKey, { label: string; desc: string; icon: React.ReactNode }> = {
        in_app: { label: t('admin.notificationsChannelInApp', '站内通知'), desc: t('admin.notificationsChannelInAppDesc', '网页右上角铃铛显示'), icon: <Bell className="w-5 h-5"/> },
        email: { label: t('admin.notificationsChannelEmail', '邮件通知'), desc: t('admin.notificationsChannelEmailDesc', '发送邮件到用户邮箱'), icon: <Mail className="w-5 h-5"/> },
        push: { label: t('admin.notificationsChannelPush', '移动推送'), desc: t('admin.notificationsChannelPushDesc', '推送到手机App'), icon: <Smartphone className="w-5 h-5"/> },
        webhook: { label: t('admin.notificationsChannelWebhook', 'Webhook回调'), desc: t('admin.notificationsChannelWebhookDesc', '通知第三方系统'), icon: <Webhook className="w-5 h-5"/> },
    };

    const typeLabels: Record<string, string> = {
        system: t('admin.notificationsTypeSystem', 'SYSTEM'),
        user: t('admin.notificationsTypeUser', 'USER'),
        comment: t('admin.notificationsTypeComment', 'COMMENT'),
        media: t('admin.notificationsTypeMedia', 'MEDIA'),
    };

    // Tab state
    const [activeTab, setActiveTab] = useState<TabKey>('send');

    // Data state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const {page, pageSize, total, totalPages, setPage, setTotal, getParams} = usePagination({initialPageSize: 20});

    // Compose form state
    const [form, setForm] = useState({
        title: '',
        body: '',
        channels: {in_app: true, email: false, push: false, webhook: false} as Record<ChannelKey, boolean>,
        sendToAll: true,
    });
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [showUserPicker, setShowUserPicker] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Config state
    const [config, setConfig] = useState({
        emailEnabled: true,
        pushEnabled: true,
        webhookEnabled: false,
        smsEnabled: false,
    });
    const [savingConfig, setSavingConfig] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchData();
        }
    }, [page, activeTab]);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await notificationApi.adminGetAll(getParams());
            const items = response?.items ?? [];
            setNotifications(items);
            setTotal(response?.total ?? items.length);
            setUnreadCount(response?.unread_count ?? items.filter((n: Notification) => !n.read).length);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const settings = await settingsApi.get();
            const moduleSettings = settings.module || [];
            const getBool = (key: string, fallback: boolean) => {
                const item = moduleSettings.find((s: any) => s.key === key);
                if (!item) return fallback;
                return item.value === 'true' || item.value === '1';
            };
            setConfig({
                emailEnabled: getBool('notification.email_enabled', true),
                pushEnabled: getBool('notification.push_enabled', true),
                webhookEnabled: getBool('notification.webhook_enabled', false),
                smsEnabled: getBool('notification.sms_enabled', false),
            });
        } catch (err) {
            console.error('Failed to fetch notification config:', err);
        }
    };

    const saveConfig = async () => {
        try {
            setSavingConfig(true);
            await settingsApi.update({
                settings: [
                    {key: 'notification.email_enabled', value: String(config.emailEnabled)},
                    {key: 'notification.push_enabled', value: String(config.pushEnabled)},
                    {key: 'notification.webhook_enabled', value: String(config.webhookEnabled)},
                    {key: 'notification.sms_enabled', value: String(config.smsEnabled)},
                ],
            });
        } catch (err) {
            console.error('Failed to save notification config:', err);
        } finally {
            setSavingConfig(false);
        }
    };

    const handleSendTest = async () => {
        try {
            setSendingTest(true);
            await notificationApi.adminSendTest();
            refreshBell();
        } catch (err) {
            console.error('Failed to send test notification:', err);
        } finally {
            setSendingTest(false);
        }
    };

    const fetchUsers = async (keyword?: string) => {
        try {
            setLoadingUsers(true);
            const response = await adminUserApi.list({page_size: 50, keyword});
            const items = (response as any)?.items || response || [];
            setUsers(items);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleOpenUserPicker = () => {
        setShowUserPicker(true);
        fetchUsers();
    };

    const toggleUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId],
        );
    };

    const removeUser = (userId: string) => {
        setSelectedUserIds(prev => prev.filter(id => id !== userId));
    };

    const handleSend = async () => {
        if (!form.title || !form.body) return;
        if (!form.sendToAll && selectedUserIds.length === 0) return;

        try {
            setSending(true);
            const primaryChannel = (Object.keys(form.channels) as ChannelKey[]).find(c => form.channels[c]) || 'in_app';
            const data = {
                action: 'system',
                title: form.title,
                body: form.body,
                method: primaryChannel,
                notify: primaryChannel !== 'in_app',
            };

            if (form.sendToAll) {
                await notificationApi.adminBroadcast(data);
            } else {
                await notificationApi.adminSend({...data, user_ids: selectedUserIds});
            }

            setForm({
                title: '',
                body: '',
                channels: {in_app: true, email: false, push: false, webhook: false},
                sendToAll: true,
            });
            setSelectedUserIds([]);
            setShowUserPicker(false);
            setPage(1);
            fetchData();
            refreshBell();
        } catch (err) {
            console.error('Failed to send notification:', err);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await notificationApi.adminDelete(id);
            fetchData();
            refreshBell();
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));

    // ── Stats (Sent / Delivered / Opened / Clicked) ──
    const pageTotal = notifications.length;
    const read = notifications.filter(n => n.read).length;
    const stats = {
        sent: total,
        delivered: total > 0 ? total : 0,
        opened: read,
        clicked: read,
    };

    return (
        <AdminPageTemplate
            title={t('admin.notifications', 'Notification Management')}
            titleIcon={<Bell className="h-8 w-8" />}
            themeColor="rose"
            description={t('admin.notificationsDesc', 'Configure, broadcast, and audit system-wide alerts.')}
        >
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                <TabsList>
                    <TabsTrigger value="send" className="flex items-center gap-2">
                        <Send className="h-4 w-4"/>
                        {t('admin.notificationsTabSend', 'Send Notification')}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <Inbox className="h-4 w-4"/>
                        {t('admin.notificationsTabHistory', 'Broadcast History')}
                    </TabsTrigger>
                    <TabsTrigger value="config" className="flex items-center gap-2">
                        <BellRing className="h-4 w-4"/>
                        {t('admin.notificationsTabConfig', 'Configuration')}
                    </TabsTrigger>
                </TabsList>

                {/* Stats Bento (Sent / Delivered / Opened / Clicked) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">
                                        {t('admin.notificationsStatSent', 'Sent')}
                                    </p>
                                    <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                        {stats.sent.toLocaleString()}
                                    </h3>
                                    <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                        +12%
                                    </p>
                                </div>
                                <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Send className="w-5 h-5"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">
                                        {t('admin.notificationsStatDelivered', 'Delivered')}
                                    </p>
                                    <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                        {stats.delivered.toLocaleString()}
                                    </h3>
                                    <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                        99.9% {t('admin.notificationsStatStable', 'Stable')}
                                    </p>
                                </div>
                                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <Mail className="w-5 h-5"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">
                                        {t('admin.notificationsStatOpened', 'Opened')}
                                    </p>
                                    <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                        {stats.opened.toLocaleString()}
                                    </h3>
                                    <div className="mt-2 w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600"
                                            style={{width: `${total > 0 ? (stats.opened / total) * 100 : 0}%`}}
                                        />
                                    </div>
                                </div>
                                <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                    <Inbox className="w-5 h-5"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">
                                        {t('admin.notificationsStatClicked', 'Clicked')}
                                    </p>
                                    <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                                        {stats.clicked.toLocaleString()}
                                    </h3>
                                    <p className="text-xs font-semibold text-indigo-600 mt-2 flex items-center gap-1">
                                        {t('admin.notificationsStatPriority', 'Priority')}
                                    </p>
                                </div>
                                <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                    <BellRing className="w-5 h-5"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <>
                    {/* Tab 1: Send Notification */}
                    <TabsContent value="send">
                            <section className="grid grid-cols-12 gap-8">
                                <div className="col-span-12 lg:col-span-7 space-y-6">
                                    <Card>
                                        <CardContent className="p-8">
                                            <h3 className="text-lg font-semibold text-foreground mb-6">
                                                {t('admin.notificationsCompose', 'Compose Broadcast')}
                                            </h3>
                                            <div className="space-y-5">
                                                <div>
                                                    <Label className="block text-sm font-medium text-card-foreground mb-2">
                                                        {t('admin.notificationsFieldTitle', 'NOTIFICATION TITLE')}
                                                    </Label>
                                                    <Input
                                                        placeholder={t('admin.notificationsFieldTitlePlaceholder', 'e.g., Scheduled Maintenance Downtime')}
                                                        type="text"
                                                        value={form.title}
                                                        onChange={e => setForm(f => ({...f, title: e.target.value}))}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="block text-sm font-medium text-card-foreground mb-2">
                                                        {t('admin.notificationsFieldBody', 'BODY MESSAGE')}
                                                    </Label>
                                                    <Textarea
                                                        placeholder={t('admin.notificationsFieldBodyPlaceholder', 'Enter the detailed notification content...')}
                                                        rows={4}
                                                        value={form.body}
                                                        onChange={e => setForm(f => ({...f, body: e.target.value}))}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="block text-sm font-medium text-card-foreground mb-2">
                                                        {t('admin.notificationsFieldAudience', 'TARGET AUDIENCE')}
                                                    </Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {form.sendToAll ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="rounded-full"
                                                                onClick={() => setForm(f => ({...f, sendToAll: false}))}
                                                            >
                                                                {t('admin.notificationsAllUsers', 'All Users')} <X className="w-3 h-3"/>
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-full"
                                                                    onClick={() => setForm(f => ({...f, sendToAll: true}))}
                                                                >
                                                                    {t('admin.notificationsAllUsers', 'All Users')} <Plus className="w-3 h-3"/>
                                                                </Button>
                                                                {selectedUsers.map(user => (
                                                                    <Button
                                                                        key={user.id}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="rounded-full"
                                                                        onClick={() => removeUser(user.id)}
                                                                    >
                                                                        {user.nickname || user.username} <X className="w-3 h-3"/>
                                                                    </Button>
                                                                ))}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-full"
                                                                    onClick={handleOpenUserPicker}
                                                                >
                                                                    {t('admin.notificationsAddUser', 'Add User')} <Plus className="w-3 h-3"/>
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                    {/* User picker */}
                                                    {showUserPicker && !form.sendToAll && (
                                                        <Card className="mt-3">
                                                            <CardContent className="p-3 space-y-2">
                                                                <Input
                                                                    type="text"
                                                                    value={userSearch}
                                                                    onChange={e => {
                                                                        setUserSearch(e.target.value);
                                                                        fetchUsers(e.target.value);
                                                                    }}
                                                                    placeholder={t('admin.notificationsSearchUsers', 'Search users...')}
                                                                />
                                                                {loadingUsers ? (
                                                                    <div className="text-center py-2 text-sm text-muted-foreground">
                                                                        <Loader2 className="w-4 h-4 animate-spin inline"/>
                                                                    </div>
                                                                ) : (
                                                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                                                        {users
                                                                            .filter(u => !userSearch || u.username.includes(userSearch) || (u.nickname || '').includes(userSearch))
                                                                            .map(user => (
                                                                                <Label
                                                                                    key={user.id}
                                                                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                                                                                >
                                                                                    <Checkbox
                                                                                        checked={selectedUserIds.includes(user.id)}
                                                                                        onCheckedChange={() => toggleUser(user.id)}
                                                                                    />
                                                                                    <span className="text-sm text-card-foreground">{user.nickname || user.username}</span>
                                                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                                                </Label>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="w-full"
                                                                    onClick={() => setShowUserPicker(false)}
                                                                >
                                                                    {t('admin.notificationsClose', 'Close')}
                                                                </Button>
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </div>
                                                <div className="pt-5 border-t border-border">
                                                    <Label className="block text-sm font-medium text-card-foreground mb-3">
                                                        {t('admin.notificationsFieldChannels', '发送渠道')}
                                                    </Label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        {(['in_app', 'email', 'push', 'webhook'] as ChannelKey[]).map(channel => {
                                                            const ch = channelLabels[channel];
                                                            const selected = form.channels[channel];
                                                            return (
                                                                <div
                                                                    key={channel}
                                                                    onClick={() => setForm(f => ({
                                                                        ...f,
                                                                        channels: {...f.channels, [channel]: !f.channels[channel]},
                                                                    }))}
                                                                    className={
                                                                        'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ' +
                                                                        (selected
                                                                            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                                                            : 'border-border bg-card hover:border-indigo-200 hover:bg-indigo-50/30')
                                                                    }
                                                                >
                                                                    <div className={
                                                                        'w-10 h-10 rounded-lg flex items-center justify-center transition-colors ' +
                                                                        (selected ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground')
                                                                    }>
                                                                        {ch.icon}
                                                                    </div>
                                                                    <span className={'text-sm font-medium ' + (selected ? 'text-indigo-700' : 'text-foreground')}>
                                                                        {ch.label}
                                                                    </span>
                                                                    <span className="text-[11px] text-muted-foreground text-center leading-tight">
                                                                        {ch.desc}
                                                                    </span>
                                                                    {selected && (
                                                                        <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-8 flex justify-end gap-3">
                                                <Button variant="outline">
                                                    {t('admin.notificationsSaveDraft', 'Save Draft')}
                                                </Button>
                                                <Button
                                                    onClick={handleSend}
                                                    disabled={
                                                        sending ||
                                                        !form.title ||
                                                        !form.body ||
                                                        (!form.sendToAll && selectedUserIds.length === 0) ||
                                                        !Object.values(form.channels).some(Boolean)
                                                    }
                                                >
                                                    {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                                                    {t('admin.notificationsBroadcastNow', 'Broadcast Now')}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Live Preview */}
                                <div className="col-span-12 lg:col-span-5 flex flex-col items-center">
                                    <div className="relative w-[280px] h-[580px] bg-neutral-900 rounded-[3rem] border-8 border-neutral-800 shadow-2xl p-4 flex flex-col">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-b-2xl z-10"/>
                                        <div className="flex-1 bg-black rounded-[2rem] overflow-hidden relative">
                                            <div className="relative z-10 p-4 pt-12">
                                                <div className="flex justify-between items-center text-white/60 mb-8 px-2">
                                                    <span className="text-[10px] font-mono">9:41</span>
                                                    <div className="flex gap-1">
                                                        <Signal className="w-3 h-3"/>
                                                        <Wifi className="w-3 h-3"/>
                                                        <Battery className="w-3 h-3"/>
                                                    </div>
                                                </div>
                                                {/* Notification Preview Card */}
                                                <div className="bg-card/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                                                            <Bell className="text-white w-3 h-3"/>
                                                        </div>
                                                        <span className="text-white font-semibold text-[11px] flex-1">OrigStudio Console</span>
                                                        <span className="text-white/40 text-[10px]">now</span>
                                                    </div>
                                                    <h4 className="text-white font-bold text-sm">
                                                        {form.title || t('admin.notificationsPreviewTitle', 'Scheduled Maintenance')}
                                                    </h4>
                                                    <p className="text-white/70 text-xs mt-1 leading-relaxed">
                                                        {form.body || t('admin.notificationsPreviewBody', 'The system will undergo maintenance at 02:00 UTC. Expect 15 mins downtime.')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 w-24 h-1 bg-neutral-700 mx-auto rounded-full"/>
                                    </div>
                                    <p className="mt-4 text-xs font-mono text-muted-foreground">
                                        {t('admin.notificationsPreviewLabel', 'Live Mobile Channel Preview')}
                                    </p>
                                </div>
                            </section>
                        </TabsContent>

                        {/* Tab 2: Broadcast History */}
                        <TabsContent value="history">
                            {loading ? (
                                <div className="flex items-center justify-center min-h-[200px]">
                                    <Spinner/>
                                </div>
                            ) : (
                            <section className="space-y-6">
                                <Card className="overflow-hidden">
                                    <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted">
                                        <h3 className="text-base font-semibold text-foreground">
                                            {t('admin.notificationsHistory', 'Recent History')}
                                        </h3>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon-sm">
                                                <Filter className="w-4 h-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon-sm">
                                                <Download className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('admin.notificationsColSubject', 'Subject')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('admin.notificationsColType', 'Type')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('admin.notificationsColChannel', 'Channel')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('admin.notificationsColStatus', 'Status')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('admin.notificationsColRecipients', 'Recipients')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('admin.notificationsColSentAt', 'Sent At')}
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    {t('admin.notificationsColActions', 'Actions')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {notifications.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="py-16">
                                                        <div className="flex flex-col items-center justify-center text-center">
                                                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                                                <Inbox className="w-8 h-8 text-muted-foreground"/>
                                                              </div>
                                                              <h3 className="text-base font-semibold text-card-foreground mb-1">
                                                                {t('admin.notificationsEmpty', 'No notifications yet')}
                                                              </h3>
                                                              <p className="text-sm text-muted-foreground max-w-sm">
                                                                {t('admin.notificationsEmptyDesc', 'Broadcasts you send will appear here with full delivery details.')}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                notifications.map(notification => {
                                                    const channel = (notification as any).method || 'in_app';
                                                    const channelKey = (['in_app', 'email', 'push', 'webhook'] as ChannelKey[]).includes(channel as ChannelKey)
                                                        ? (channel as ChannelKey)
                                                        : 'in_app';
                                                    return (
                                                        <TableRow key={notification.id}>
                                                            {/* Subject */}
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Bell className="w-4 h-4 text-muted-foreground shrink-0"/>
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-semibold text-foreground truncate max-w-xs">
                                                                            {notification.title}
                                                                        </div>
                                                                        <div className="text-xs font-mono text-muted-foreground">
                                                                            {t('admin.notificationsNotificationId', 'ID: NT-')}{notification.id}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            {/* Type */}
                                                            <TableCell>
                                                                <Badge variant="soft-neutral" className="uppercase text-[10px] font-bold border border-border">
                                                                    {typeLabels[notification.action] || (notification.action || 'SYSTEM').toUpperCase()}
                                                                </Badge>
                                                            </TableCell>
                                                            {/* Channel */}
                                                            <TableCell>
                                                                <Badge variant="soft-info">
                                                                    {channelLabels[channelKey].label}
                                                                </Badge>
                                                            </TableCell>
                                                            {/* Status */}
                                                            <TableCell>
                                                                {notification.read ? (
                                                                    <Badge variant="soft-success" className="flex items-center gap-1.5 w-fit">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                                                                        {t('admin.notificationsStatusSent', 'SENT')}
                                                                    </Badge>
                                                                ) : unreadCount > 0 && notification.id <= notifications[0]?.id ? (
                                                                    <Badge variant="soft-warning" className="flex items-center gap-1.5 w-fit">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/>
                                                                        {t('admin.notificationsStatusPending', 'PENDING')}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="soft-success" className="flex items-center gap-1.5 w-fit">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                                                                        {t('admin.notificationsStatusSent', 'SENT')}
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            {/* Recipients */}
                                                            <TableCell className="text-sm text-card-foreground tabular-nums font-mono">
                                                                {notification.user_id && notification.user_id !== 'all' ? '1' : t('admin.notificationsRecipientAll', 'ALL')}
                                                            </TableCell>
                                                            {/* Sent At */}
                                                            <TableCell>
                                                                <div className="text-sm text-card-foreground">
                                                                    {formatDateTime(notification.create_time)}
                                                                </div>
                                                            </TableCell>
                                                            {/* Actions */}
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    onClick={() => handleDelete(notification.id)}
                                                                    title={t('common.delete', 'Delete')}
                                                                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="w-4 h-4"/>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                    {total > 0 && (() => {
                                        const startItem = (page - 1) * pageSize + 1;
                                        const endItem = Math.min(page * pageSize, total);
                                        return (
                                            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('admin.showing') || 'Showing'} {startItem} {t('admin.to') || 'to'} {endItem} {t('admin.of') || 'of'} {total} {t('admin.notifications', 'notifications')}
                                                </p>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        disabled={page <= 1}
                                                        onClick={() => setPage(page - 1)}
                                                    >
                                                        <ChevronLeft className="w-4 h-4"/>
                                                    </Button>
                                                    {Array.from({length: Math.min(totalPages, 3)}, (_, i) => {
                                                        let pageNum: number;
                                                        if (totalPages <= 3) {
                                                            pageNum = i + 1;
                                                        } else if (page <= 2) {
                                                            pageNum = i + 1;
                                                        } else if (page >= totalPages - 1) {
                                                            pageNum = totalPages - 2 + i;
                                                        } else {
                                                            pageNum = page - 1 + i;
                                                        }
                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                variant={pageNum === page ? 'default' : 'outline'}
                                                                size="sm"
                                                                onClick={() => setPage(pageNum)}
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        );
                                                    })}
                                                    {totalPages > 3 && page < totalPages - 1 && (
                                                        <span className="text-slate-300 mx-1">...</span>
                                                    )}
                                                    {totalPages > 3 && page < totalPages - 1 && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setPage(totalPages)}
                                                        >
                                                            {totalPages}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        disabled={page >= totalPages}
                                                        onClick={() => setPage(page + 1)}
                                                    >
                                                        <ChevronRight className="w-4 h-4"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </Card>
                            </section>
                            )}
                        </TabsContent>

                        {/* Tab 3: Configuration */}
                        <TabsContent value="config">
                            <section className="space-y-6">
                                <div className="max-w-3xl">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {t('admin.notificationsConfigDesc', 'Configure which notification channels are enabled for system notifications.')}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                                    {/* In-App (always enabled - core channel) */}
                                    <Card>
                                        <CardContent className="p-6 flex gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                                <Bell className="w-5 h-5"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-foreground">{t('admin.notificationsChannelInApp', 'In-App Notifications')}</h3>
                                                        <Badge variant="soft-success" className="mt-1 text-[11px]">{t('admin.notificationsChannelActive', 'Active')}</Badge>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {t('admin.notificationsChannelInAppDesc', 'Browser bell icon notifications, always enabled for all users.')}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Email */}
                                    <Card>
                                        <CardContent className="p-6 flex gap-4">
                                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
                                                <Mail className="w-5 h-5"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-foreground">{t('admin.notificationsConfigEmail', 'Email SMTP')}</h3>
                                                        <Badge variant="secondary" className="mt-1 text-[11px]">{t('admin.notificationsChannelComingSoon', 'Coming soon')}</Badge>
                                                    </div>
                                                    <Switch
                                                        checked={config.emailEnabled}
                                                        onCheckedChange={(checked) => setConfig(c => ({...c, emailEnabled: !!checked}))}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {t('admin.notificationsConfigEmailDesc', 'Transactional and broadcast emails via SMTP.')}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Push */}
                                    <Card>
                                        <CardContent className="p-6 flex gap-4">
                                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
                                                <BellRing className="w-5 h-5"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-foreground">{t('admin.notificationsConfigPush', 'Mobile Push')}</h3>
                                                        <Badge variant="secondary" className="mt-1 text-[11px]">{t('admin.notificationsChannelComingSoon', 'Coming soon')}</Badge>
                                                    </div>
                                                    <Switch
                                                        checked={config.pushEnabled}
                                                        onCheckedChange={(checked) => setConfig(c => ({...c, pushEnabled: !!checked}))}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {t('admin.notificationsConfigPushDesc', 'FCM/APNs push notifications for iOS/Android apps.')}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Webhooks */}
                                    <Card>
                                        <CardContent className="p-6 flex gap-4">
                                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
                                                <Webhook className="w-5 h-5"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-foreground">{t('admin.notificationsConfigWebhook', 'Webhooks')}</h3>
                                                        <Badge variant="secondary" className="mt-1 text-[11px]">{t('admin.notificationsChannelComingSoon', 'Coming soon')}</Badge>
                                                    </div>
                                                    <Switch
                                                        checked={config.webhookEnabled}
                                                        onCheckedChange={(checked) => setConfig(c => ({...c, webhookEnabled: !!checked}))}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {t('admin.notificationsConfigWebhookDesc', 'Outbound HTTP callbacks to Slack, Teams, or custom endpoints.')}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* SMS */}
                                    <Card>
                                        <CardContent className="p-6 flex gap-4">
                                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
                                                <MessageSquareMore className="w-5 h-5"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-foreground">{t('admin.notificationsConfigSMS', 'SMS (Twilio)')}</h3>
                                                        <Badge variant="secondary" className="mt-1 text-[11px]">{t('admin.notificationsChannelComingSoon', 'Coming soon')}</Badge>
                                                    </div>
                                                    <Switch
                                                        checked={config.smsEnabled}
                                                        onCheckedChange={(checked) => setConfig(c => ({...c, smsEnabled: !!checked}))}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {t('admin.notificationsConfigSMSDesc', 'Critical alert delivery via SMS for emergency notifications.')}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-border max-w-3xl">
                                    <Button variant="outline" onClick={handleSendTest} disabled={sendingTest}>
                                        {sendingTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <BellRing className="w-4 h-4 mr-2"/>}
                                        {t('admin.notificationsSendTest', 'Send Test Notification')}
                                    </Button>
                                    <Button onClick={saveConfig} disabled={savingConfig}>
                                        {savingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                                        {t('admin.notificationsSaveSettings', 'Save Global Settings')}
                                    </Button>
                                </div>
                            </section>
                        </TabsContent>
                </>
            </Tabs>
        </AdminPageTemplate>
    );
};

export default AdminNotifications;
