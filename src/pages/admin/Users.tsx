/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 管理端 - 用户管理页面
 */

import {useState, useEffect} from 'react';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
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
  Filter,
  Download,
} from 'lucide-react';
import {adminUserApi, User, AdminCreateUserRequest, UpdateUserRequest, getUserStatusLabel} from '@/lib/api/user';
import {formatDateTime} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getFullUrl} from '@/lib/utils';
import {PAGINATION_CONFIG} from '@/config/pagination';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
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
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin">{t('admin.title', 'Admin')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator/>
          <BreadcrumbItem>
            <BreadcrumbPage>{t('admin.users') || 'Users Management'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* 页面标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{t('admin.users') || 'Users Management'}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('admin.manageUsers') || 'Manage user accounts, roles, permissions, and account status across the network.'}</p>
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.totalUsers') || 'Total Users'}</p>
                <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{total}</h3>
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.activeUsers') || 'Active'}</p>
                <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{users.filter(u => getUserStatusLabel(u.status) === 'active').length}</h3>
              </div>
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.admins') || 'Admins'}</p>
                <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{users.filter(u => u.role === 'admin').length}</h3>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.editors') || 'Editors'}</p>
                <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">{users.filter(u => u.role === 'editor').length}</h3>
              </div>
              <div className="w-11 h-11 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
                <Edit3 className="w-5 h-5"/>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <Input
              className="pl-9 h-10"
              placeholder={t('admin.search') || 'Search by name, email or ID...'}
              type="text"
              value={searchParams.keyword}
              onChange={(e) => setSearchParams({...searchParams, keyword: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
            />
          </div>
          <Select
            value={searchParams.role}
            onValueChange={(value) => setSearchParams({...searchParams, role: value})}
          >
            <SelectTrigger className="h-10 w-[140px]">
              <SelectValue placeholder={t('admin.allRoles') || 'All Roles'}/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allRoles') || 'All Roles'}</SelectItem>
              <SelectItem value="admin">{t('admin.admin') || 'Admin'}</SelectItem>
              <SelectItem value="editor">{t('admin.editor') || 'Editor'}</SelectItem>
              <SelectItem value="user">{t('admin.user') || 'User'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4"/>
            {t('admin.filters') || 'Filters'}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4"/>
            {t('admin.export') || 'Export'}
          </Button>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <Table className="text-left">
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200">
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.user') || 'User'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.email') || 'Email'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.role') || 'Role'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.status') || 'Status'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('admin.joined') || 'Joined Date'}</TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">{t('admin.actions') || 'Actions'}</TableHead>
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
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-slate-600 font-mono">{user.email}</TableCell>
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
                <TableCell className="px-6 py-4 text-sm text-slate-500">{formatDateTime(user.create_time)}</TableCell>
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
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
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
                <TableCell colSpan={6} className="text-center py-8 text-sm text-slate-500">
                  {t('admin.noUsersFound') || 'No users found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <p className="text-xs text-slate-500">
            {t('admin.showing') || 'Showing'} <span className="font-semibold text-slate-700">{startItem} to {endItem}</span> {t('admin.of') || 'of'} <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> {t('admin.users') || 'users'}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.addUser') || 'Add New User'}</DialogTitle>
            <DialogDescription>{t('admin.addUser') || 'Add New User'}</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
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
              <Label>{t('admin.password') || 'Password'} <span className="text-slate-400 text-xs">({t('admin.optional') || 'Optional'})</span></Label>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleCreate}>
              {t('admin.createUser') || 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.editUser') || 'Edit User'}</DialogTitle>
            <DialogDescription>{t('admin.editUser') || 'Edit User'}</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleUpdate}>
              {t('admin.save') || 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.deleteUser') || 'Delete User'}</DialogTitle>
            <DialogDescription>
              {t('admin.deleteUserConfirm') || 'Are you sure you want to delete this user? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('admin.delete') || 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
