import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Settings,
  History,
  Loader2,
  Mail,
  MessageSquareMore,
  X,
  Plus,
  Search,
  Filter,
  Download,
  Signal,
  Wifi,
  Battery,
  BellRing,
  Webhook,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notificationApi, type Notification } from '@/lib/api/notification';
import { adminUserApi, type User } from '@/lib/api/user';
import { formatDate, formatDateTime } from '@/lib/format';
import { Spinner } from '@/components/ui/spinner';

const AdminNotifications: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'config'>('send');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ total: 0, read: 0, unread: 0 });
  const [form, setForm] = useState({
    action: 'system',
    title: '',
    body: '',
    method: 'in_app',
    notify: true,
    sendToAll: false,
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
      const response = await notificationApi.getAll({ page_size: 50 });
      const items = response.items;
      setNotifications(items);
      const readCount = items.filter((n: Notification) => n.read).length;
      setStats({ total: items.length, read: readCount, unread: items.length - readCount });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (keyword?: string) => {
    try {
      setLoadingUsers(true);
      const response = await adminUserApi.list({ page_size: 50, keyword });
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
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const removeUser = (userId: string) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
  };

  const handleSend = async () => {
    if (!form.title || !form.body) return;
    try {
      setSending(true);
      if (form.sendToAll) {
        await notificationApi.create({
          action: form.action,
          title: form.title,
          body: form.body,
          method: form.method,
          notify: form.notify,
        });
      } else if (selectedUserIds.length > 0) {
        for (const userId of selectedUserIds) {
          await notificationApi.create({
            action: form.action,
            title: form.title,
            body: form.body,
            user_id: userId,
            method: form.method,
            notify: form.notify,
          });
        }
      }
      setForm({ action: 'system', title: '', body: '', method: 'in_app', notify: true, sendToAll: false });
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
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Spinner />
      </div>
    );
  }

  const tabs = [
    { key: 'send' as const, label: 'Send Notification' },
    { key: 'history' as const, label: 'Broadcast History' },
    { key: 'config' as const, label: 'Configuration' },
  ];

  return (
    <div className="p-8">
      {/* 页面标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            {t('admin.notifications') || 'Notification Management'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure, broadcast, and audit system-wide alerts.
          </p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Send Notification */}
      {activeTab === 'send' && (
        <section className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Compose Broadcast</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">NOTIFICATION TITLE</label>
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    placeholder="e.g., Scheduled Maintenance Downtime"
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">BODY MESSAGE</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                    placeholder="Enter the detailed notification content..."
                    rows={4}
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">TARGET AUDIENCE</label>
                  <div className="flex flex-wrap gap-2">
                    {form.sendToAll ? (
                      <button
                        className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center gap-1.5"
                        onClick={() => setForm(f => ({ ...f, sendToAll: false }))}
                      >
                        All Users <X className="w-3 h-3" />
                      </button>
                    ) : (
                      <>
                        <button
                          className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5"
                          onClick={() => setForm(f => ({ ...f, sendToAll: true }))}
                        >
                          All Users <Plus className="w-3 h-3" />
                        </button>
                        {selectedUsers.map(user => (
                          <button
                            key={user.id}
                            className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center gap-1.5"
                            onClick={() => removeUser(user.id)}
                          >
                            {user.nickname || user.username} <X className="w-3 h-3" />
                          </button>
                        ))}
                        <button
                          className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5"
                          onClick={handleOpenUserPicker}
                        >
                          Add User <Plus className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* User picker */}
                  {showUserPicker && !form.sendToAll && (
                    <div className="mt-3 border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
                      <input
                        type="text"
                        value={userSearch}
                        onChange={e => {
                          setUserSearch(e.target.value);
                          fetchUsers(e.target.value);
                        }}
                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                        placeholder="Search users..."
                      />
                      {loadingUsers ? (
                        <div className="text-center py-2 text-sm text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin inline" />
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {users
                            .filter(u => !userSearch || u.username.includes(userSearch) || (u.nickname || '').includes(userSearch))
                            .map(user => (
                              <label
                                key={user.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUserIds.includes(user.id)}
                                  onChange={() => toggleUser(user.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-700">{user.nickname || user.username}</span>
                                <span className="text-xs text-slate-400">{user.email}</span>
                              </label>
                            ))}
                        </div>
                      )}
                      <button
                        className="w-full text-sm text-slate-500 hover:text-slate-700 py-1"
                        onClick={() => setShowUserPicker(false)}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
                <div className="pt-5 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-3">DELIVERY CHANNELS</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        checked={form.method === 'in_app'}
                        onChange={() => setForm(f => ({ ...f, method: 'in_app' }))}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        type="checkbox"
                      />
                      <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">In-App</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        checked={form.method === 'email'}
                        onChange={() => setForm(f => ({ ...f, method: 'email' }))}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        type="checkbox"
                      />
                      <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">Email</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        checked={form.notify}
                        onChange={e => setForm(f => ({ ...f, notify: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        type="checkbox"
                      />
                      <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">Push</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" type="checkbox" />
                      <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">Webhook</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Save Draft
                </button>
                <button
                  className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
                  onClick={handleSend}
                  disabled={sending || !form.title || !form.body || (!form.sendToAll && selectedUserIds.length === 0)}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Broadcast Now
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="col-span-12 lg:col-span-5 flex flex-col items-center">
            <div className="relative w-[280px] h-[580px] bg-neutral-900 rounded-[3rem] border-8 border-neutral-800 shadow-2xl p-4 flex flex-col">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-b-2xl z-10" />
              <div className="flex-1 bg-black rounded-[2rem] overflow-hidden relative">
                <div className="relative z-10 p-4 pt-12">
                  <div className="flex justify-between items-center text-white/60 mb-8 px-2">
                    <span className="text-[10px] font-mono">9:41</span>
                    <div className="flex gap-1">
                      <Signal className="w-3 h-3" />
                      <Wifi className="w-3 h-3" />
                      <Battery className="w-3 h-3" />
                    </div>
                  </div>
                  {/* Notification Preview Card */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                        <Bell className="text-white w-3 h-3" />
                      </div>
                      <span className="text-white font-semibold text-[11px] flex-1">OrigStudio Console</span>
                      <span className="text-white/40 text-[10px]">now</span>
                    </div>
                    <h4 className="text-white font-bold text-sm">
                      {form.title || 'Scheduled Maintenance'}
                    </h4>
                    <p className="text-white/70 text-xs mt-1 leading-relaxed">
                      {form.body || 'The system will undergo maintenance at 02:00 UTC. Expect 15 mins downtime.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-2 w-24 h-1 bg-neutral-700 mx-auto rounded-full" />
            </div>
            <p className="mt-4 text-xs font-mono text-slate-400">Live Mobile Channel Preview</p>
          </div>
        </section>
      )}

      {/* Tab 2: Broadcast History */}
      {activeTab === 'history' && (
        <section className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">TOTAL BROADCASTS</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-extrabold tabular-nums text-slate-800">{stats.total.toLocaleString()}</span>
                <span className="text-emerald-600 text-xs font-semibold mb-1">+12%</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">AVG READ RATE</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-extrabold tabular-nums text-slate-800">
                  {stats.total > 0 ? ((stats.read / stats.total) * 100).toFixed(1) : '0.0'}%
                </span>
                <div className="w-16 h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600"
                    style={{ width: `${stats.total > 0 ? (stats.read / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">DELIVERY RATE</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-extrabold tabular-nums text-slate-800">99.9%</span>
                <span className="text-emerald-600 text-[10px] font-bold mb-1">STABLE</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ACTIVE ALERTS</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-extrabold tabular-nums text-slate-800">{stats.unread}</span>
                <span className="text-indigo-600 text-[10px] font-bold mb-1">PRIORITY</span>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-semibold text-slate-800">Recent History</h3>
              <div className="flex gap-2">
                <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  {t('notifications.noNotifications') || 'No notifications found'}
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className="p-6 flex flex-col lg:flex-row lg:items-center gap-6 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {notification.read ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            PENDING
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-400">ID: NT-{notification.id}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800">{notification.title}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {notification.body}
                      </p>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">READ RATE</p>
                        <p className="text-xl font-bold text-slate-800 tabular-nums">
                          {notification.read ? '82%' : '--'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TARGETS</p>
                        <p className="text-xl font-bold text-slate-800 tabular-nums">1</p>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <p className="text-sm text-slate-500">{formatDate(notification.create_time)}</p>
                        <p className="text-xs font-mono text-slate-400">{formatDateTime(notification.create_time)}</p>
                      </div>
                      <button
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => handleDelete(notification.id)}
                        title={t('common.delete') || 'Delete'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: Configuration */}
      {activeTab === 'config' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
            {/* Email SMTP */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex gap-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-slate-800">Email SMTP</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={config.emailEnabled}
                      onChange={e => setConfig(c => ({ ...c, emailEnabled: e.target.checked }))}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>
                <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
                  Master switch for transactional and broadcast emails via SendGrid API.
                </p>
                <div className="space-y-3 border-t border-slate-50 pt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Rate Limit (per min)</span>
                    <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">500</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Sender Identity</span>
                    <span className="font-mono text-xs text-slate-500">noreply@origstudio.io</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Firebase Push */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex gap-6">
              <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
                <BellRing className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-slate-800">Firebase Push</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={config.pushEnabled}
                      onChange={e => setConfig(c => ({ ...c, pushEnabled: e.target.checked }))}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>
                <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
                  Manage FCM tokens and delivery for iOS/Android native apps.
                </p>
                <div className="space-y-3 border-t border-slate-50 pt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Badge Count Sync</span>
                    <span className="text-xs font-semibold text-emerald-600">ENABLED</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">TTL (Hours)</span>
                    <span className="font-mono text-xs text-slate-500">48h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Webhooks */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex gap-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <Webhook className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-slate-800">Webhooks</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={config.webhookEnabled}
                      onChange={e => setConfig(c => ({ ...c, webhookEnabled: e.target.checked }))}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>
                <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
                  Outbound HTTP calls to services like Slack or Microsoft Teams.
                </p>
                <div className="space-y-3 border-t border-slate-50 pt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Active Endpoints</span>
                    <span className="font-mono text-xs text-slate-500">12</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SMS */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex gap-6">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <MessageSquareMore className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-slate-800">Twilio SMS</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={config.smsEnabled}
                      onChange={e => setConfig(c => ({ ...c, smsEnabled: e.target.checked }))}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>
                <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
                  Critical alert delivery via SMS. Global emergency coverage.
                </p>
                <div className="space-y-3 border-t border-slate-50 pt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Current Balance</span>
                    <span className="font-mono text-xs text-emerald-600 font-bold">$412.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-6 border-t border-slate-200 max-w-5xl">
            <button className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md transition-all active:scale-[0.98]">
              Save Global Settings
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminNotifications;
