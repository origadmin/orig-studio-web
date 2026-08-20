import React, {useState, useEffect, useMemo} from 'react';
import {
    Bell,
    Send,
    Plus,
    Loader2,
    Mail,
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
    Users,
    Shield,
    UserRound,
    Group,
    Edit,
} from 'lucide-react';
import {useTranslation, Trans} from 'react-i18next';
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
type AudienceMode = 'all' | 'role' | 'group' | 'users';

type RoleOption = { value: string; labelKey: string; icon: React.ReactNode };

const ROLE_OPTIONS: RoleOption[] = [
    {value: 'admin', labelKey: 'admin.notificationsRoleAdmin', icon: <Shield className="w-4 h-4"/>},
    {value: 'user', labelKey: 'admin.notificationsRoleUser', icon: <UserRound className="w-4 h-4"/>},
    {value: 'editor', labelKey: 'admin.notificationsRoleEditor', icon: <Edit className="w-4 h-4"/>},
];

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
        audienceMode: 'all' as AudienceMode,
        roleList: [] as string[],
        groupIdList: [] as string[],
    });
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [showUserPicker, setShowUserPicker] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [groups, setGroups] = useState<Array<{id: string; name: string; description?: string; member_count?: number}>>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

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
            const m = settings.settings || {};
            const getBool = (key: string, fallback: boolean) => {
                if (!(key in m)) return fallback;
                return m[key] === 'true' || m[key] === '1';
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
                settings: {
                    'notification.email_enabled': String(config.emailEnabled),
                    'notification.push_enabled': String(config.pushEnabled),
                    'notification.webhook_enabled': String(config.webhookEnabled),
                    'notification.sms_enabled': String(config.smsEnabled),
                },
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

    const fetchGroups = async () => {
        try {
            setLoadingGroups(true);
            const response = await notificationApi.adminGetGroups({page_size: 100});
            const items = (response as any)?.items || response || [];
            setGroups(items);
        } catch (err) {
            console.error('Failed to fetch permission groups:', err);
        } finally {
            setLoadingGroups(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

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

    const isSendDisabled = useMemo(() => {
        if (!form.title || !form.body) return true;
        if (!Object.values(form.channels).some(Boolean)) return true;
        if (form.audienceMode === 'role' && form.roleList.length === 0) return true;
        if (form.audienceMode === 'group' && form.groupIdList.length === 0) return true;
        if (form.audienceMode === 'users' && selectedUserIds.length === 0) return true;
        return false;
    }, [form, selectedUserIds]);

    const handleSend = async () => {
        if (!form.title || !form.body) return;

        try {
            setSending(true);
            const primaryChannel = (Object.keys(form.channels) as ChannelKey[]).find(c => form.channels[c]) || 'in_app';
            const baseData = {
                action: 'system',
                title: form.title,
                body: form.body,
                method: primaryChannel,
                notify: primaryChannel !== 'in_app',
            };

            if (form.audienceMode === 'all') {
                await notificationApi.adminBroadcast(baseData);
            } else if (form.audienceMode === 'role') {
                await notificationApi.adminBroadcast({...baseData, role_list: form.roleList});
            } else if (form.audienceMode === 'group') {
                await notificationApi.adminBroadcast({...baseData, group_id_list: form.groupIdList});
            } else {
                // explicit users
                await notificationApi.adminSend({...baseData, user_ids: selectedUserIds});
            }

            setForm({
                title: '',
                body: '',
                channels: {in_app: true, email: false, push: false, webhook: false},
                audienceMode: 'all',
                roleList: [],
                groupIdList: [],
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

                <>
                    {/* Tab 1: Send Notification */}
                    <TabsContent value="send" className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                        <Send className="w-4 h-4"/>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('admin.notificationsStatSent', 'Sent')}</p>
                                        <p className="text-xl font-bold text-foreground">{stats.sent.toLocaleString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                                        <Mail className="w-4 h-4"/>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('admin.notificationsStatDelivered', 'Delivered')}</p>
                                        <p className="text-xl font-bold text-foreground">{stats.delivered.toLocaleString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center shrink-0">
                                        <Inbox className="w-4 h-4"/>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('admin.notificationsStatOpened', 'Opened')}</p>
                                        <p className="text-xl font-bold text-foreground">{stats.opened.toLocaleString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                                        <BellRing className="w-4 h-4"/>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('admin.notificationsStatClicked', 'Clicked')}</p>
                                        <p className="text-xl font-bold text-foreground">{stats.clicked.toLocaleString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
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
                                                    {/* Audience mode tabs */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                                        {([
                                                            {mode: 'all', label: t('admin.notificationsAllUsers'), icon: <Users className="w-4 h-4"/>},
                                                            {mode: 'role', label: t('admin.notificationsAudienceRole'), icon: <Shield className="w-4 h-4"/>},
                                                            {mode: 'group', label: t('admin.notificationsAudienceGroup'), icon: <Group className="w-4 h-4"/>},
                                                            {mode: 'users', label: t('admin.notificationsAudienceUsers'), icon: <UserRound className="w-4 h-4"/>},
                                                        ] as const).map(opt => {
                                                            const selected = form.audienceMode === opt.mode;
                                                            return (
                                                                <button
                                                                    key={opt.mode}
                                                                    type="button"
                                                                    onClick={() => setForm(f => ({...f, audienceMode: opt.mode}))}
                                                                    className={
                                                                        'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ' +
                                                                        (selected
                                                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                                            : 'border-border bg-card text-muted-foreground hover:border-indigo-200 hover:text-foreground')
                                                                    }
                                                                >
                                                                    {opt.icon}
                                                                    {opt.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* All users */}
                                                    {form.audienceMode === 'all' && (
                                                        <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                                                            <Trans i18nKey="admin.notificationsAllUsersHint" components={{strong: <strong className="text-foreground"/>}}/>
                                                        </div>
                                                    )}

                                                    {/* By role */}
                                                    {form.audienceMode === 'role' && (
                                                        <div className="space-y-2">
                                                            <p className="text-xs text-muted-foreground">
                                                                {t('admin.notificationsRoleHint')}
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {ROLE_OPTIONS.map(role => {
                                                                    const checked = form.roleList.includes(role.value);
                                                                    return (
                                                                        <button
                                                                            key={role.value}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setForm(f => ({
                                                                                    ...f,
                                                                                    roleList: checked
                                                                                        ? f.roleList.filter(r => r !== role.value)
                                                                                        : [...f.roleList, role.value],
                                                                                }))
                                                                            }
                                                                            className={
                                                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ' +
                                                                                (checked
                                                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                                                    : 'border-border bg-card text-muted-foreground hover:border-indigo-200')
                                                                            }
                                                                        >
                                                                            {role.icon}
                                                                            {t(role.labelKey)}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* By group */}
                                                    {form.audienceMode === 'group' && (
                                                        <div className="space-y-2">
                                                            <p className="text-xs text-muted-foreground">
                                                                {t('admin.notificationsGroupHint')}
                                                            </p>
                                                            {loadingGroups ? (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                                                                    <Loader2 className="w-4 h-4 animate-spin"/> {t('admin.notificationsLoadingGroups')}
                                                                </div>
                                                            ) : groups.length === 0 ? (
                                                                <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                                                                    {t('admin.notificationsNoGroups')}
                                                                </div>
                                                            ) : (
                                                                <div className="max-h-40 overflow-y-auto space-y-1">
                                                                    {groups.map(g => {
                                                                        const checked = form.groupIdList.includes(g.id);
                                                                        return (
                                                                            <button
                                                                                key={g.id}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setForm(f => ({
                                                                                        ...f,
                                                                                        groupIdList: checked
                                                                                            ? f.groupIdList.filter(id => id !== g.id)
                                                                                            : [...f.groupIdList, g.id],
                                                                                    }))
                                                                                }
                                                                                className={
                                                                                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ' +
                                                                                    (checked
                                                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                                                        : 'border-border bg-card hover:border-indigo-200')
                                                                                }
                                                                            >
                                                                                <span className="flex items-center gap-2 min-w-0">
                                                                                    <Group className="w-4 h-4 shrink-0"/>
                                                                                    <span className="truncate">{g.name}</span>
                                                                                </span>
                                                                                {typeof g.member_count === 'number' && (
                                                                                    <span className="text-xs text-muted-foreground shrink-0">{t('admin.notificationsMemberCount', {count: g.member_count})}</span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Explicit users */}
                                                    {form.audienceMode === 'users' && (
                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap gap-2 min-h-[32px]">
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
                                                                    <Plus className="w-3 h-3"/> {t('admin.notificationsAddUser')}
                                                                </Button>
                                                            </div>
                                                            {/* User picker */}
                                                            {showUserPicker && (
                                                                <Card className="mt-3">
                                                                    <CardContent className="p-3 space-y-2">
                                                                        <Input
                                                                            type="text"
                                                                            value={userSearch}
                                                                            onChange={e => {
                                                                                setUserSearch(e.target.value);
                                                                                fetchUsers(e.target.value);
                                                                            }}
                                                                            placeholder={t('admin.notificationsSearchUsers')}
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
                                                                            {t('admin.notificationsClose')}
                                                                        </Button>
                                                                    </CardContent>
                                                                </Card>
                                                            )}
                                                        </div>
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
                                                        isSendDisabled
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
                        <TabsContent value="config" className="space-y-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.notificationsConfigTitle')}</h3>
                                    <p className="text-sm text-muted-foreground mb-5">{t('admin.notificationsConfigDesc')}</p>
                                    <div className="divide-y divide-border">
                                        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                                    <Bell className="w-5 h-5"/>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-foreground">{t('admin.notificationsChannelInAppLabel')}</span>
                                                        <Badge variant="soft-success" className="text-[10px]">{t('admin.notificationsEnabled')}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{t('admin.notificationsChannelInAppDesc')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={true} disabled/>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg flex items-center justify-center shrink-0">
                                                    <Mail className="w-5 h-5"/>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-muted-foreground">{t('admin.notificationsChannelEmailLabel')}</span>
                                                        <Badge variant="secondary" className="text-[10px]">{t('admin.notificationsComingSoon')}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground/70 mt-0.5">{t('admin.notificationsChannelEmailDesc')}</p>
                                                </div>
                                            </div>
                                            <Switch checked={false} disabled/>
                                        </div>
                                        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg flex items-center justify-center shrink-0">
                                                    <BellRing className="w-5 h-5"/>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-muted-foreground">{t('admin.notificationsChannelPushLabel')}</span>
                                                        <Badge variant="secondary" className="text-[10px]">{t('admin.notificationsComingSoon')}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground/70 mt-0.5">{t('admin.notificationsChannelPushDesc')}</p>
                                                </div>
                                            </div>
                                            <Switch checked={false} disabled/>
                                        </div>
                                        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg flex items-center justify-center shrink-0">
                                                    <Webhook className="w-5 h-5"/>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-muted-foreground">{t('admin.notificationsChannelWebhookLabel')}</span>
                                                        <Badge variant="secondary" className="text-[10px]">{t('admin.notificationsComingSoon')}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground/70 mt-0.5">{t('admin.notificationsChannelWebhookDesc')}</p>
                                                </div>
                                            </div>
                                            <Switch checked={false} disabled/>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-base font-semibold text-foreground mb-1">{t('admin.notificationsTestTitle')}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">{t('admin.notificationsTestDesc')}</p>
                                    <Button variant="outline" onClick={handleSendTest} disabled={sendingTest}>
                                        {sendingTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <BellRing className="w-4 h-4 mr-2"/>}
                                        {t('admin.notificationsTestSend')}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                </>
            </Tabs>
        </AdminPageTemplate>
    );
};

export default AdminNotifications;
