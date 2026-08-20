/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 管理端 - 用户管理页面
 */

import {useState, useEffect} from 'react';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
  UserPlus,
  Users,
  UserCheck,
  Shield,
  Edit3,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import {adminUserApi, User, AdminCreateUserRequest, UpdateUserRequest, getUserStatusLabel} from '@/lib/api/user';
import {toast} from 'sonner';
import {formatDateTime} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getFullUrl} from '@/lib/utils';
import {PAGINATION_CONFIG} from '@/config/pagination';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {FilterBar} from '@/components/admin/FilterBar';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectTrigger, SelectContent, SelectItem, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '@/components/ui/dialog';

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
  const [formData, setFormData] = useState<Partial<AdminCreateUserRequest & UpdateUserRequest & {nickname?: string; avatar?: string; phone?: string}>>({
    username: '',
    nickname: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active',
  });

  useEffect(() => {
    loadUsers(searchParams);
    // BUG-241: keyword/role/page 任一变化都自动重新加载（显式传参，绕开
    // onClick/onKeyDown 闭包捕获旧 searchParams 导致筛选失效的问题）。
  }, [searchParams.keyword, searchParams.role, searchParams.page]);

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

  // Stats (BUG-211⑩: page-level cards = global base data; unfiltered fetch,
  // not affected by keyword/role filter or the current page)
  const [statsUsers, setStatsUsers] = useState<{total: number; active: number; admins: number; editors: number}>({total: 0, active: 0, admins: 0, editors: 0});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminUserApi.list({page: 1, page_size: PAGINATION_CONFIG.HARD_LIMIT});
        if (cancelled) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        setStatsUsers({
          total: res?.total ?? items.length,
          active: items.filter((u: User) => getUserStatusLabel(u.status) === 'active').length,
          admins: items.filter((u: User) => u.role === 'admin').length,
          editors: items.filter((u: User) => u.role === 'editor').length,
        });
      } catch {
        // Best-effort global stats; keep zeros on failure.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const exportUsers = (list: User[]) => {
    if (!list || list.length === 0) return;
    const headers = ['username', 'email', 'role', 'status', 'create_time'];
    const escapeCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = list.map((u) =>
      [u.username, u.email, u.role, u.status, u.create_time].map(escapeCsv).join(',')
    );
    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      // Contract-aligned dispatch (BUG-230):
      // - role -> PATCH /admin/users/{id}/role (role_ids[], NOT bare role)
      // - status -> PATCH /admin/users/{id}/status (numeric code)
      // - nickname/email -> PUT /admin/users/{id} FLAT body {nickname,email}
      //   (backend UpdateAdminUserRequest is flat; user wrapper + update_mask are ignored)
      const changes: string[] = [];
      if (formData.role && formData.role !== currentUser.role) {
        await adminUserApi.updateRole(currentUser.id, formData.role);
        changes.push('role');
      }
      if (formData.status && formData.status !== getUserStatusLabel(currentUser.status)) {
        await adminUserApi.updateStatus(currentUser.id, formData.status);
        changes.push('status');
      }
      const profileChanged =
        (formData.nickname !== undefined && formData.nickname !== (currentUser.nickname || '')) ||
        (formData.email !== undefined && formData.email !== currentUser.email);
      if (profileChanged) {
        const flat: Record<string, string> = {};
        if (formData.nickname !== undefined && formData.nickname !== (currentUser.nickname || '')) {
          flat.nickname = formData.nickname;
          changes.push('nickname');
        }
        if (formData.email !== undefined && formData.email !== currentUser.email) {
          flat.email = formData.email;
          changes.push('email');
        }
        await adminUserApi.update(currentUser.id, flat as unknown as UpdateUserRequest);
      }
      await loadUsers();
      setShowEditDialog(false);
      resetForm();
      setCurrentUser(null);
      if (changes.length > 0) {
        toast.success(t('admin.userUpdated') || 'User updated successfully');
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      toast.error(t('admin.userUpdateFailed') || 'Failed to update user');
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
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator/>
          <BreadcrumbItem>
            <BreadcrumbPage>{t('admin.breadcrumb.users', '用户')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* 页面标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('admin.users') || 'Users Management'}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.manageUsers') || 'Manage user accounts, roles, permissions, and account status across the network.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog}>
            <UserPlus className="w-4 h-4"/>
            {t('admin.addUser') || 'Add User'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <Card className="hover:shadow-md transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.totalUsers') || 'Total Users'}</p>
                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{statsUsers.total}</h3>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5"/>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Active Users */}
        <Card className="hover:shadow-md transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.activeUsers') || 'Active'}</p>
                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{statsUsers.active}</h3>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5"/>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Admins */}
        <Card className="hover:shadow-md transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.admins') || 'Admins'}</p>
                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{statsUsers.admins}</h3>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-400 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5"/>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Editors */}
        <Card className="hover:shadow-md transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[2.5rem]">{t('admin.editors') || 'Editors'}</p>
                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">{statsUsers.editors}</h3>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-300 rounded-xl flex items-center justify-center">
                <Edit3 className="w-5 h-5"/>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Filters — BUG-200: unified FilterBar (search-as-you-type + role select + reset) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <FilterBar
          searchValue={searchParams.keyword}
          onSearchChange={(v) => setSearchParams((prev) => ({...prev, keyword: v, page: 1}))}
          searchPlaceholder={t('admin.search') || '搜索用户名/邮箱/ID'}
          filters={[{
            key: 'role',
            placeholder: t('admin.allRoles') || '全部角色',
            value: searchParams.role,
            options: [
              {value: 'all', label: t('admin.allRoles') || '全部角色'},
              {value: 'admin', label: t('admin.admin') || '管理员'},
              {value: 'editor', label: t('admin.editor') || '编辑者'},
              {value: 'user', label: t('admin.user') || '用户'},
            ],
            onChange: (value) => setSearchParams((prev) => ({...prev, role: value, page: 1})),
          }]}
          onReset={() => setSearchParams((prev) => ({...prev, keyword: '', role: 'all', page: 1}))}
          resetDisabled={!searchParams.keyword && searchParams.role === 'all'}
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportUsers(users)} disabled={users.length === 0}>
            <Download className="w-4 h-4"/>
            {t('admin.export') || 'Export'}
          </Button>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
        <Table className="text-left">
          <TableHeader>
            <TableRow className="bg-muted border-b border-border">
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.user') || 'User'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.email') || 'Email'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.role') || 'Role'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.status') || 'Status'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.joined') || 'Joined Date'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">{t('admin.actions') || 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Spinner className="mx-auto"/>
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? users.map((user) => (
              <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        alt={user.nickname || user.username}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                        src={getFullUrl(user.avatar)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm ${user.avatar ? 'hidden' : ''}`}
                    >
                      {(user.nickname || user.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{user.nickname || user.username}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground font-mono">{user.email}</TableCell>
                <TableCell className="px-6 py-4">
                  {user.role === 'admin' ? (
                    <Badge variant="soft-primary">{t('admin.admin') || 'Admin'}</Badge>
                  ) : user.role === 'editor' ? (
                    <Badge variant="soft-neutral">{t('admin.editor') || 'Editor'}</Badge>
                  ) : (
                    <Badge variant="soft-neutral">{t('admin.user') || 'User'}</Badge>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4">
                  {getUserStatusLabel(user.status) === 'active' ? (
                    <Badge variant="soft-success" className="gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                      {t('admin.active') || 'Active'}
                    </Badge>
                  ) : (
                    <Badge variant="soft-neutral" className="gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/>
                      {t('admin.inactive') || getUserStatusLabel(user.status)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">{formatDateTime(user.create_time)}</TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t('admin.viewProfile') || 'View'}
                      onClick={() => handleViewProfile(user)}
                    >
                      <Eye className="w-4 h-4"/>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t('admin.edit') || 'Edit'}
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit3 className="w-4 h-4"/>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      title={t('admin.delete') || 'Delete'}
                      onClick={() => openDeleteDialog(user)}
                    >
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  {t('admin.noUsersFound') || 'No users found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
          <p className="text-xs text-muted-foreground">
            {t('admin.showing') || 'Showing'} <span className="font-semibold text-card-foreground">{startItem} to {endItem}</span> {t('admin.of') || 'of'} <span className="font-semibold text-card-foreground">{total.toLocaleString()}</span> {t('admin.users') || 'users'}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={searchParams.page <= 1}
              onClick={() => setSearchParams({...searchParams, page: searchParams.page - 1})}
            >
              <ChevronLeft className="w-4 h-4"/>
            </Button>
            {getPageNumbers().map((p) => (
              <Button
                key={p}
                variant={p === searchParams.page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchParams({...searchParams, page: p})}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon-sm"
              disabled={searchParams.page >= totalPages}
              onClick={() => setSearchParams({...searchParams, page: searchParams.page + 1})}
            >
              <ChevronRight className="w-4 h-4"/>
            </Button>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
          <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary"/>
              {t('admin.addUser') || 'Add New User'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {t('admin.addUserDesc') || 'Create a new user account with specified role and permissions.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t('admin.username') || 'Username'}</Label>
                <Input
                  placeholder={t('admin.usernamePlaceholder') || 'e.g. janed'}
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('admin.nickname') || 'Full Name'}</Label>
                <Input
                  placeholder={t('admin.nicknamePlaceholder') || 'e.g. Jane Doe'}
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('admin.email') || 'Email Address'}</Label>
              <Input
                placeholder="jane@origstudio.com"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.password') || 'Password'} <span className="text-muted-foreground text-xs">({t('admin.optional') || 'Optional'})</span></Label>
              <Input
                placeholder={t('admin.passwordPlaceholder') || 'Min 6 characters, leave blank for auto-generated'}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.role') || 'Assign Role'}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({...formData, role: value})}
              >
                <SelectTrigger>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('admin.user') || 'User'}</SelectItem>
                  <SelectItem value="editor">{t('admin.editor') || 'Editor'}</SelectItem>
                  <SelectItem value="admin">{t('admin.admin') || 'Admin'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
            <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setShowCreateDialog(false)}>
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleCreate}>
              {t('admin.createUser') || 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
          <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary"/>
              {t('admin.editUser') || 'Edit User'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {t('admin.editUserDesc') || 'Update user information, role, and account status.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1">
              <Label>{t('admin.username') || 'Username'}</Label>
              <Input
                value={formData.username}
                disabled
              />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.nickname') || 'Nickname'}</Label>
              <Input
                value={formData.nickname}
                onChange={(e) => setFormData({...formData, nickname: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.email') || 'Email Address'}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('admin.role') || 'Role'}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({...formData, role: value})}
              >
                <SelectTrigger>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('admin.user') || 'User'}</SelectItem>
                  <SelectItem value="editor">{t('admin.editor') || 'Editor'}</SelectItem>
                  <SelectItem value="admin">{t('admin.admin') || 'Admin'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('admin.status') || 'Status'}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('admin.active') || 'Active'}</SelectItem>
                  <SelectItem value="inactive">{t('admin.inactive') || 'Inactive'}</SelectItem>
                  <SelectItem value="suspended">{t('admin.suspended') || 'Suspended'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
            <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setShowEditDialog(false)}>
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleUpdate}>
              {t('admin.save') || 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500"/>
              {t('admin.deleteUser') || 'Delete User'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {t('admin.deleteUserConfirm') || 'Are you sure you want to delete this user? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
            <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setShowDeleteDialog(false)}>
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-lg shadow-lg shadow-red-500/20 h-10 px-6 font-medium" onClick={handleDelete}>
              {t('admin.delete') || 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

