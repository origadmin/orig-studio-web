/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 管理端 - 用户管理页面
 */

import {useState, useEffect} from 'react';
import {
  Search,
  UserPlus,
  Users,
  UserCheck,
  Shield,
  Edit3,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Download,
} from 'lucide-react';
import {adminUserApi, User, AdminCreateUserRequest, UpdateUserRequest, getUserStatusLabel} from '@/lib/api/user';
import {formatDateTime} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getFullUrl} from '@/lib/utils';
import {PAGINATION_CONFIG} from '@/config/pagination';
import {Spinner} from '@/components/ui/spinner';

export default function UsersPage() {
  const {t} = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({keyword: '', role: 'all', page: 1, page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE});
  const [total, setTotal] = useState(0);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<CreateUserRequest & UpdateUserRequest & {nickname?: string; avatar?: string; phone?: string}>>({
    username: '',
    nickname: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active',
  });

  useEffect(() => {
    loadUsers();
  }, [searchParams.page]);

  const loadUsers = async (params = searchParams) => {
    try {
      setLoading(true);
      const apiParams: any = {page: params.page, page_size: params.page_size};
      if (params.keyword) {
        apiParams.keyword = params.keyword;
      }
      if (params.role && params.role !== 'all') {
        apiParams.role = params.role;
      }
      const response = await adminUserApi.list(apiParams);
      const userList = Array.isArray(response?.items) ? response.items : [];
      setUsers(userList);
      if (response?.total !== undefined) {
        setTotal(response.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      nickname: '',
      email: '',
      password: '',
      role: 'user',
      status: 'active',
    });
  };

  const handleCreate = async () => {
    if (!formData.username?.trim()) return;
    if (!formData.email?.trim()) return;
    if (formData.password && formData.password.length < 6) return;

    try {
      const createData: AdminCreateUserRequest = {
        username: formData.username,
        email: formData.email,
        password: formData.password || undefined,
        nickname: formData.nickname || undefined,
        role: formData.role,
      };
      await adminUserApi.create(createData);
      await loadUsers();
      setShowCreateDialog(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const handleUpdate = async () => {
    if (!currentUser) return;

    try {
      await adminUserApi.update(currentUser.id, formData as UpdateUserRequest);
      await loadUsers();
      setShowEditDialog(false);
      resetForm();
      setCurrentUser(null);
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;

    try {
      await adminUserApi.delete(currentUser.id);
      await loadUsers();
      setShowDeleteDialog(false);
      setCurrentUser(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (user: User) => {
    setCurrentUser(user);
    setFormData({
      username: user.username,
      nickname: user.nickname || '',
      email: user.email,
      avatar: user.avatar || '',
      phone: user.phone || '',
      role: user.role,
      status: getUserStatusLabel(user.status),
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: User) => {
    setCurrentUser(user);
    setShowDeleteDialog(true);
  };

  const handleViewProfile = (user: User) => {
    window.open(`/members/${user.username}`, '_blank');
  };

  // Pagination helpers
  const totalPages = Math.ceil(total / searchParams.page_size);
  const startItem = total === 0 ? 0 : (searchParams.page - 1) * searchParams.page_size + 1;
  const endItem = Math.min(searchParams.page * searchParams.page_size, total);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 3;
    let start = Math.max(1, searchParams.page - 1);
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="p-8">
      {/* 页面标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('admin.users') || 'Users Management'}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('admin.manageUsers') || 'Manage user accounts, roles, permissions, and account status across the network.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
            onClick={openCreateDialog}
          >
            <UserPlus className="w-4 h-4"/>
            {t('admin.addUser') || 'Add User'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalUsers') || 'Total Users'}</p>
              <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{total}</h3>
            </div>
            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Users className="w-5 h-5"/>
            </div>
          </div>
        </div>
        {/* Active Users */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.activeUsers') || 'Active'}</p>
              <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{users.filter(u => getUserStatusLabel(u.status) === 'active').length}</h3>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <UserCheck className="w-5 h-5"/>
            </div>
          </div>
        </div>
        {/* Admins */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.admins') || 'Admins'}</p>
              <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{users.filter(u => u.role === 'admin').length}</h3>
            </div>
            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Shield className="w-5 h-5"/>
            </div>
          </div>
        </div>
        {/* Editors */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.editors') || 'Editors'}</p>
              <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{users.filter(u => u.role === 'editor').length}</h3>
            </div>
            <div className="w-11 h-11 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors">
              <Edit3 className="w-5 h-5"/>
            </div>
          </div>
        </div>
      </div>

      {/* Table Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input
              className="w-full pl-9 pr-4 h-10 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
              placeholder={t('admin.search') || 'Search by name, email or ID...'}
              type="text"
              value={searchParams.keyword}
              onChange={(e) => setSearchParams({...searchParams, keyword: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
            />
          </div>
          <select
            className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
            value={searchParams.role}
            onChange={(e) => setSearchParams({...searchParams, role: e.target.value})}
          >
            <option value="all">{t('admin.allRoles') || 'All Roles'}</option>
            <option value="admin">{t('admin.admin') || 'Admin'}</option>
            <option value="editor">{t('admin.editor') || 'Editor'}</option>
            <option value="user">{t('admin.user') || 'User'}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4"/>
            {t('admin.filters') || 'Filters'}
          </button>
          <button className="inline-flex items-center gap-1.5 h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4"/>
            {t('admin.export') || 'Export'}
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.user') || 'User'}</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.email') || 'Email'}</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.role') || 'Role'}</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status') || 'Status'}</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.joined') || 'Joined Date'}</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Spinner className="mx-auto"/>
                  </td>
                </tr>
              ) : users.length > 0 ? users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        alt={user.nickname || user.username}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        src={user.avatar ? getFullUrl(user.avatar) : undefined}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div
                        className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm hidden"
                      >
                        {(user.nickname || user.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{user.nickname || user.username}</p>
                        <p className="text-xs text-slate-400">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{user.email}</td>
                  <td className="px-6 py-4">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{t('admin.admin') || 'Admin'}</span>
                    ) : user.role === 'editor' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{t('admin.editor') || 'Editor'}</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{t('admin.user') || 'User'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getUserStatusLabel(user.status) === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                        {t('admin.active') || 'Active'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/>
                        {t('admin.inactive') || getUserStatusLabel(user.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(user.create_time)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title={t('admin.viewProfile') || 'View'}
                        onClick={() => handleViewProfile(user)}
                      >
                        <Eye className="w-4 h-4"/>
                      </button>
                      <button
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title={t('admin.edit') || 'Edit'}
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit3 className="w-4 h-4"/>
                      </button>
                      <button
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('admin.delete') || 'Delete'}
                        onClick={() => openDeleteDialog(user)}
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-slate-500">
                    {t('admin.noUsersFound') || 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {t('admin.showing') || 'Showing'} <span className="font-semibold text-slate-700">{startItem} to {endItem}</span> {t('admin.of') || 'of'} <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> {t('admin.users') || 'users'}
          </p>
          <div className="flex items-center gap-1">
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
              disabled={searchParams.page <= 1}
              onClick={() => setSearchParams({...searchParams, page: searchParams.page - 1})}
            >
              <ChevronLeft className="w-4 h-4"/>
            </button>
            {getPageNumbers().map((p) => (
              <button
                key={p}
                className={`h-8 px-3 rounded-lg text-sm ${p === searchParams.page ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setSearchParams({...searchParams, page: p})}
              >
                {p}
              </button>
            ))}
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
              disabled={searchParams.page >= totalPages}
              onClick={() => setSearchParams({...searchParams, page: searchParams.page + 1})}
            >
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)}/>
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{t('admin.addUser') || 'Add New User'}</h3>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setShowCreateDialog(false)}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{t('admin.username') || 'Username'}</label>
                  <input
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                    placeholder={t('admin.usernamePlaceholder') || 'e.g. janed'}
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{t('admin.nickname') || 'Full Name'}</label>
                  <input
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                    placeholder={t('admin.nicknamePlaceholder') || 'e.g. Jane Doe'}
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{t('admin.email') || 'Email Address'}</label>
                <input
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                  placeholder="jane@origstudio.com"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{t('admin.password') || 'Password'} <span className="text-slate-400 text-xs">({t('admin.optional') || 'Optional'})</span></label>
                <input
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                  placeholder={t('admin.passwordPlaceholder') || 'Min 6 characters, leave blank for auto-generated'}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{t('admin.role') || 'Assign Role'}</label>
                <select
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none cursor-pointer"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="user">{t('admin.user') || 'User'}</option>
                  <option value="editor">{t('admin.editor') || 'Editor'}</option>
                  <option value="admin">{t('admin.admin') || 'Admin'}</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setShowCreateDialog(false)}
              >
                {t('admin.cancel') || 'Cancel'}
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                onClick={handleCreate}
              >
                {t('admin.createUser') || 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditDialog(false)}/>
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{t('admin.editUser') || 'Edit User'}</h3>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setShowEditDialog(false)}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{t('admin.username') || 'Username'}</label>
                <input
                  className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none cursor-not-allowed"
                  value={formData.username}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{t('admin.nickname') || 'Nickname'}</label>
                <input
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{t('admin.email') || 'Email Address'}</label>
                <input
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{t('admin.role') || 'Role'}</label>
                <select
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none cursor-pointer"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="user">{t('admin.user') || 'User'}</option>
                  <option value="editor">{t('admin.editor') || 'Editor'}</option>
                  <option value="admin">{t('admin.admin') || 'Admin'}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{t('admin.status') || 'Status'}</label>
                <select
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none cursor-pointer"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">{t('admin.active') || 'Active'}</option>
                  <option value="inactive">{t('admin.inactive') || 'Inactive'}</option>
                  <option value="suspended">{t('admin.suspended') || 'Suspended'}</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setShowEditDialog(false)}
              >
                {t('admin.cancel') || 'Cancel'}
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                onClick={handleUpdate}
              >
                {t('admin.save') || 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteDialog(false)}/>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{t('admin.deleteUser') || 'Delete User'}</h3>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setShowDeleteDialog(false)}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600">
                {t('admin.deleteUserConfirm') || 'Are you sure you want to delete this user? This action cannot be undone.'}
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setShowDeleteDialog(false)}
              >
                {t('admin.cancel') || 'Cancel'}
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 shadow-sm transition-colors"
                onClick={handleDelete}
              >
                {t('admin.delete') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
