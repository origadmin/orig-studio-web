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
} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {notificationApi, type Notification} from '@/lib/api/notification';
import {adminUserApi, type User} from '@/lib/api/user';
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

type TabKey = 'send' | 'history' | 'config';
type ChannelKey = 'in_app' | 'email' | 'push' | 'webhook';

const AdminNotifications: React.FC = () => {
    const {t} = useTranslation();

    const channelLabels: Record<ChannelKey, string> = {
        in_app: t('admin.notificationsChannelInApp', 'In-App'),
        email: t('admin.notificationsChannelEmail', 'Email'),
        push: t('admin.notificationsChannelPush', 'Push'),
        webhook: t('admin.notificationsChannelWebhook', 'Webhook'),
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
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await notificationApi.getAll({page_size: 50});
            const items = response?.items ?? [];
            setNotifications(items);
            setUnreadCount(response?.unread_count ?? items.filter(n => !n.read).length);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
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
        const enabledChannels = (Object.keys(form.channels) as ChannelKey[]).filter(c => form.channels[c]);
        if (enabledChannels.length === 0) return;

        try {
            setSending(true);
            const recipients = form.sendToAll ? [] : selectedUserIds;
            for (const channel of enabledChannels) {
                if (recipients.length === 0) {
                    await notificationApi.create({
                        action: 'system',
                        title: form.title,
                        body: form.body,
                        method: channel,
                        notify: channel !== 'in_app',
                    });
                } else {
                    for (const userId of recipients) {
                        await notificationApi.create({
                            action: 'system',
                            title: form.title,
                            body: form.body,
                            user_id: userId,
                            method: channel,
                            notify: channel !== 'in_app',
                        });
                    }
                }
            }
            setForm({
                title: '',
                body: '',
                channels: {in_app: true, email: false, push: false, webhook: false},
                sendToAll: true,
            });
            setSelectedUserIds([]);
            setShowUserPicker(false);
            fetchData();
        } catch (err) {
            console.error('Failed to send notification:', err);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await notificationApi.delete(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const handleCompose = () => {
        setActiveTab('send');
    };

    const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));

    // ── Stats (Sent / Delivered / Opened / Clicked) ──
    const total = notifications.length;
    const read = notifications.filter(n => n.read).length;
    const stats = {
        sent: total,
        delivered: total > 0 ? total : 0,
        opened: read,
        clicked: read,
    };

    return (
        <div className="p-8 space-y-6">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.notifications', '通知管理')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Page Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Bell className="h-7 w-7 text-indigo-600"/>
                        {t('admin.notifications', 'Notification Management')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('admin.notificationsDesc', 'Configure, broadcast, and audit system-wide alerts.')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleCompose}>
                        <Plus className="w-4 h-4"/>
                        {t('admin.notificationsCompose', 'Compose')}
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
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

                {loading ? (
                    <div className="flex items-center justify-center min-h-[200px]">
                        <Spinner/>
                    </div>
                ) : (
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
                                                        {t('admin.notificationsFieldChannels', 'DELIVERY CHANNELS')}
                                                    </Label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        {(['in_app', 'email', 'push', 'webhook'] as ChannelKey[]).map(channel => (
                                                            <Label key={channel} className="flex items-center gap-3 cursor-pointer group">
                                                                <Checkbox
                                                                    checked={form.channels[channel]}
                                                                    onCheckedChange={(checked) => setForm(f => ({
                                                                        ...f,
                                                                        channels: {...f.channels, [channel]: !!checked},
                                                                    }))}
                                                                />
                                                                <span className="text-sm text-muted-foreground group-hover:text-indigo-600 transition-colors">
                                                                    {channelLabels[channel]}
                                                                </span>
                                                            </Label>
                                                        ))}
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
                                                                    {channelLabels[channelKey]}
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
                                </Card>
                            </section>
                        </TabsContent>

                        {/* Tab 3: Configuration */}
                        <TabsContent value="config">
                            <section className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                                    {/* Email SMTP */}
                                    <Card>
                                        <CardContent className="p-8 flex gap-6">
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                                <Mail className="w-6 h-6"/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-lg font-semibold text-foreground">{t('admin.notificationsConfigEmail', 'Email SMTP')}</h3>
                                                    <Switch
                                                        checked={config.emailEnabled}
                                                        onCheckedChange={(checked) => setConfig(c => ({...c, emailEnabled: !!checked}))}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
                                                    {t('admin.notificationsConfigEmailDesc', 'Master switch for transactional and broadcast emails via SendGrid API.')}
                                                </p>
                                                <div className="space-y-3 border-t border-slate-50 pt-4">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">{t('admin.notificationsConfigRateLimit', 'Rate Limit (per min)')}</span>
                                                        <Badge variant="soft-primary" className="font-mono text-xs">500</Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">{t('admin.notificationsConfigSenderId', 'Sender Identity')}</span>
                                                        <span className="font-mono text-xs text-muted-foreground">noreply@origstudio.io</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Firebase Push */}
                                    <Card>
                                        <CardContent className="p-8 flex gap-6">
                                            <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
                                                <BellRing className="w-6 h-6"/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-lg font-semibold text-foreground">{t('admin.notificationsConfigPush', 'Firebase Push')}</h3>
                                                    <Switch
                                                        checked={config.pushEnabled}
                                                        onCheckedChange={(checked) => setConfig(c => ({...c, pushEnabled: !!checked}))}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
                                                    {t('admin.notificationsConfigPushDesc', 'Manage FCM tokens and delivery for iOS/Android native apps.')}
                                                </p>
                                                <div className="space-y-3 border-t border-slate-50 pt-4">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">Badge Count Sync</span>
                                                        <span className="text-xs font-semibold text-emerald-600">{t('admin.notificationsConfigEnabled', 'ENABLED')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">{t('admin.notificationsConfigTTL', 'TTL (Hours)')}</span>
                                                        <span className="font-mono text-xs text-muted-foreground">48h</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Webhooks */}
                                    <Card>
                                        <CardContent className="p-8 flex gap-6">
                                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                                <Webhook className="w-6 h-6"/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-lg font-semibold text-foreground">{t('admin.notificationsConfigWebhook', 'Webhooks')}</h3>
                                                    <Switch
                                                        checked={config.webhookEnabled}
                                                        onCheckedChange={(checked) => setConfig(c => ({...c, webhookEnabled: !!checked}))}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
                                                    {t('admin.notificationsConfigWebhookDesc', 'Outbound HTTP calls to services like Slack or Microsoft Teams.')}
                                                </p>
                                                <div className="space-y-3 border-t border-muted pt-4">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">{t('admin.notificationsConfigEndpoints', 'Active Endpoints')}</span>
                                                        <span className="font-mono text-xs text-muted-foreground">12</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* SMS */}
                                    <Card>
                                        <CardContent className="p-8 flex gap-6">
                                            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                                                <MessageSquareMore className="w-6 h-6"/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-lg font-semibold text-foreground">{t('admin.notificationsConfigSMS', 'Twilio SMS')}</h3>
                                                    <Switch
                                                        checked={config.smsEnabled}
                                                        onCheckedChange={(checked) => setConfig(c => ({...c, smsEnabled: !!checked}))}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
                                                    {t('admin.notificationsConfigSMSDesc', 'Critical alert delivery via SMS. Global emergency coverage.')}
                                                </p>
                                                <div className="space-y-3 border-t border-slate-50 pt-4">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">{t('admin.notificationsConfigBalance', 'Current Balance')}</span>
                                                        <span className="font-mono text-xs text-emerald-600 font-bold">$412.00</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                                <div className="flex justify-end pt-6 border-t border-border max-w-5xl">
                                    <Button>
                                        {t('admin.notificationsSaveSettings', 'Save Global Settings')}
                                    </Button>
                                </div>
                            </section>
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
};

export default AdminNotifications;
