/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * 管理端 - 用户管理页面 (Enterprise Edition)
 */

import {useState, useEffect, useCallback} from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  Filter,
  Download,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Label} from '@/components/ui/label';
import {Separator} from '@/components/ui/separator';
import {Checkbox} from '@/components/ui/checkbox';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Card, CardContent} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {Spinner} from '@/components/ui/spinner';
import {
  adminUserApi,
  User,
  AdminCreateUserRequest,
  UpdateUserRequest,
  getUserStatusLabel,
} from '@/lib/api/user';
import {formatRelativeTime, formatDateTime} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getFullUrl} from '@/lib/utils';
import {PAGINATION_CONFIG} from '@/config/pagination';

// ---------------------------------------------------------------------------
// RBAC Permission definition
// ---------------------------------------------------------------------------
interface RbacPermission {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const RBAC_PERMISSIONS: RbacPermission[] = [
  {
    id: 'system_config',
    name: 'System Configuration',
    description: 'Full Read/Write access to core settings',
    icon: <Shield className="h-4 w-4 text-primary" />,
  },
  {
    id: 'user_provisioning',
    name: 'User Provisioning',
    description: 'Ability to invite and manage team members',
    icon: <UserCheck className="h-4 w-4 text-primary" />,
  },
  {
    id: 'data_export',
    name: 'Data Export',
    description: 'Permission to bulk export audit logs',
    icon: <Download className="h-4 w-4 text-muted-foreground" />,
  },
];

// Role-to-permission mapping (default permissions per role)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['system_config', 'user_provisioning', 'data_export'],
  editor: ['user_provisioning', 'data_export'],
  user: ['data_export'],
};

// ---------------------------------------------------------------------------
// Role badge styling
// ---------------------------------------------------------------------------
function getRoleBadgeClasses(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-primary/10 text-primary';
    case 'editor':
      return 'bg-info/10 text-info';
    case 'user':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getRoleLabel(role: string, t: (key: string) => string): string {
  switch (role) {
    case 'admin':
      return t('admin.admin') || 'Admin';
    case 'editor':
      return t('admin.editor') || 'Editor';
    case 'user':
      return t('admin.user') || 'Viewer';
    default:
      return role;
  }
}

// ---------------------------------------------------------------------------
// Status indicator
// ---------------------------------------------------------------------------
function StatusIndicator({status}: { status: string }) {
  const label = getUserStatusLabel(status);
  switch (label) {
    case 'active':
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-sm text-success">{label}</span>
        </div>
      );
    case 'pending':
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-sm text-warning">{label}</span>
        </div>
      );
    case 'inactive':
    case 'suspended':
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export default function UsersPage() {
  const {t} = useTranslation();

  // ---- Data state ----
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    role: 'all',
    status: 'all',
    page: 1,
    page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
  });
  const [total, setTotal] = useState(0);

  // ---- Selection state ----
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);

  // ---- Dialog state ----
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ---- Detail panel state ----
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailPermissions, setDetailPermissions] = useState<Set<string>>(new Set());

  // ---- Form state ----
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user',
    message: '',
  });
  const [editForm, setEditForm] = useState<Partial<UpdateUserRequest & { nickname?: string; avatar?: string; phone?: string }>>({
    username: '',
    nickname: '',
    email: '',
    role: 'user',
    status: 'active',
  });

  // ---- Computed stats ----
  const activeCount = users.filter(u => getUserStatusLabel(u.status) === 'active').length;
  const pendingCount = users.filter(u => getUserStatusLabel(u.status) === 'pending').length;

  // ---- Load users ----
  const loadUsers = useCallback(async (params = searchParams) => {
    try {
      setLoading(true);
      const apiParams: Record<string, unknown> = {
        page: params.page,
        page_size: params.page_size,
      };
      if (params.keyword) {
        apiParams.keyword = params.keyword;
      }
      if (params.role && params.role !== 'all') {
        apiParams.role = params.role;
      }
      if (params.status && params.status !== 'all') {
        apiParams.status = params.status;
      }
      const response = await adminUserApi.list(apiParams as Parameters<typeof adminUserApi.list>[0]);
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
  }, [searchParams]);

  useEffect(() => {
    loadUsers();
  }, [searchParams.page, searchParams.role, searchParams.status]);

  // ---- Search handler ----
  const handleSearch = () => {
    setSearchParams(prev => ({...prev, page: 1}));
    loadUsers({...searchParams, page: 1});
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ---- Selection handlers ----
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      setAllSelected(false);
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
      setAllSelected(true);
    }
  };

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    setAllSelected(next.size === users.length && users.length > 0);
  };

  // ---- Detail panel ----
  const openDetailPanel = (user: User) => {
    setDetailUser(user);
    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    setDetailPermissions(new Set(rolePerms));
  };

  const closeDetailPanel = () => {
    setDetailUser(null);
    setDetailPermissions(new Set());
  };

  const toggleDetailPermission = (permId: string) => {
    setDetailPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  // ---- Invite user ----
  const handleInvite = async () => {
    if (!inviteForm.email?.trim()) return;
    try {
      const createData: AdminCreateUserRequest = {
        username: inviteForm.email.split('@')[0],
        email: inviteForm.email,
        role: inviteForm.role,
      };
      await adminUserApi.create(createData);
      await loadUsers();
      setShowInviteDialog(false);
      setInviteForm({email: '', role: 'user', message: ''});
    } catch (err) {
      console.error('Failed to invite user:', err);
    }
  };

  // ---- Edit user ----
  const openEditDialog = (user: User) => {
    setCurrentUser(user);
    setEditForm({
      username: user.username,
      nickname: user.nickname || '',
      email: user.email,
      role: user.role,
      status: getUserStatusLabel(user.status),
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!currentUser) return;
    try {
      await adminUserApi.update(currentUser.id, editForm as UpdateUserRequest);
      await loadUsers();
      setShowEditDialog(false);
      setCurrentUser(null);
      // Refresh detail panel if open for this user
      if (detailUser?.id === currentUser.id) {
        setDetailUser({...currentUser, ...editForm} as User);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  // ---- Delete user ----
  const openDeleteDialog = (user: User) => {
    setCurrentUser(user);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    try {
      await adminUserApi.delete(currentUser.id);
      await loadUsers();
      setShowDeleteDialog(false);
      setCurrentUser(null);
      if (detailUser?.id === currentUser.id) {
        closeDetailPanel();
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  // ---- Deactivate user from detail panel ----
  const handleDeactivate = async () => {
    if (!detailUser) return;
    try {
      await adminUserApi.updateStatus(detailUser.id, 'inactive');
      await loadUsers();
      closeDetailPanel();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
  };

  // ---- Save permissions from detail panel ----
  const handleSavePermissions = async () => {
    if (!detailUser) return;
    // Determine the highest role based on permissions
    let newRole = 'user';
    if (detailPermissions.has('system_config')) {
      newRole = 'admin';
    } else if (detailPermissions.has('user_provisioning')) {
      newRole = 'editor';
    }
    try {
      if (newRole !== detailUser.role) {
        await adminUserApi.updateRole(detailUser.id, newRole);
      }
      await loadUsers();
      closeDetailPanel();
    } catch (err) {
      console.error('Failed to save permissions:', err);
    }
  };

  // ---- Export handler ----
  const handleExport = () => {
    // Placeholder: export users as CSV
    const csvHeader = 'Username,Nickname,Email,Role,Status,Created\n';
    const csvRows = users.map(u =>
      `${u.username},${u.nickname || ''},${u.email},${u.role},${getUserStatusLabel(u.status)},${formatDateTime(u.create_time)}`
    ).join('\n');
    const blob = new Blob([csvHeader + csvRows], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Reset filters ----
  const resetFilters = () => {
    const newParams = {
      keyword: '',
      role: 'all',
      status: 'all',
      page: 1,
      page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    };
    setSearchParams(newParams);
    loadUsers(newParams);
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ----------------------------------------------------------------- */}
      {/* Page Header                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('admin.users') || 'User Management'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.manageUsers') || 'Manage access control and identity for your enterprise tenant.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="rounded-btn"
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('admin.filters') || 'Filters'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="rounded-btn"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('admin.export') || 'Export'}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowInviteDialog(true)}
            className="rounded-btn"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t('admin.addUser') || 'Add User'}
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats Row (3 cards)                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users */}
        <Card className="rounded-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {t('admin.totalUsers') || 'Total Users'}
                </p>
                <p className="text-2xl font-bold">{total || users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Now */}
        <Card className="rounded-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {t('admin.activeNow') || 'Active Now'}
                </p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="rounded-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {t('admin.pending') || 'Pending'}
                </p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Filter Bar                                                         */}
      {/* ----------------------------------------------------------------- */}
      <Card className="rounded-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.searchUsers') || 'Search users, roles, or permissions...'}
                value={searchParams.keyword}
                onChange={e => setSearchParams(prev => ({...prev, keyword: e.target.value}))}
                onKeyDown={handleSearchKeyDown}
                className="pl-10 h-9 rounded-input"
              />
            </div>

            {/* Role filter */}
            <Select
              value={searchParams.role}
              onValueChange={v => setSearchParams(prev => ({...prev, role: v, page: 1}))}
            >
              <SelectTrigger className="w-[150px] h-9 rounded-input">
                <SelectValue placeholder={t('admin.roles') || 'Roles'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.all') || 'All Roles'}</SelectItem>
                <SelectItem value="admin">{t('admin.admin') || 'Admin'}</SelectItem>
                <SelectItem value="editor">{t('admin.editor') || 'Editor'}</SelectItem>
                <SelectItem value="user">{t('admin.user') || 'Viewer'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={searchParams.status}
              onValueChange={v => setSearchParams(prev => ({...prev, status: v, page: 1}))}
            >
              <SelectTrigger className="w-[150px] h-9 rounded-input">
                <SelectValue placeholder={t('admin.status') || 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.all') || 'All Status'}</SelectItem>
                <SelectItem value="active">{t('admin.active') || 'Active'}</SelectItem>
                <SelectItem value="pending">{t('admin.pending') || 'Pending'}</SelectItem>
                <SelectItem value="inactive">{t('admin.inactive') || 'Inactive'}</SelectItem>
                <SelectItem value="suspended">{t('admin.suspended') || 'Suspended'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Search button */}
            <Button
              size="sm"
              onClick={handleSearch}
              className="h-9 rounded-btn"
            >
              <Search className="h-4 w-4 mr-2" />
              {t('admin.search') || 'Search'}
            </Button>

            {/* Clear filters */}
            {(searchParams.keyword || searchParams.role !== 'all' || searchParams.status !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 rounded-btn"
              >
                <X className="h-4 w-4 mr-1" />
                {t('admin.clear') || 'Clear'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* User Table                                                         */}
      {/* ----------------------------------------------------------------- */}
      <Card className="rounded-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Spinner className="mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('admin.userIdentity') || 'User Identity'}
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('admin.rolePermissions') || 'Role & Permissions'}
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('admin.status') || 'Status'}
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('admin.lastActive') || 'Last Active'}
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('admin.tenant') || 'Tenant'}
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                    {t('admin.actions') || 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? users.map(user => (
                  <TableRow
                    key={user.id}
                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openDetailPanel(user)}
                  >
                    {/* Checkbox */}
                    <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={() => toggleSelectUser(user.id)}
                      />
                    </TableCell>

                    {/* User Identity */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-full">
                          <AvatarImage src={user.avatar ? getFullUrl(user.avatar) : undefined} />
                          <AvatarFallback className="bg-muted text-primary font-semibold">
                            {(user.nickname || user.username || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">
                            {user.nickname || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role & Permissions */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium ${getRoleBadgeClasses(user.role)}`}
                      >
                        {getRoleLabel(user.role, t)}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusIndicator status={user.status} />
                    </TableCell>

                    {/* Last Active */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(user.update_time || user.create_time)}
                    </TableCell>

                    {/* Tenant */}
                    <TableCell className="text-sm text-muted-foreground">
                      {user.channel_id || 'Default'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailPanel(user)}>
                              <Shield className="h-4 w-4 mr-2" />
                              {t('admin.viewPermissions') || 'View Permissions'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t('admin.edit') || 'Edit'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('admin.delete') || 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-10 w-10 opacity-30" />
                        <p>{t('admin.noUsersFound') || 'No users found'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between bg-background border-t border-border">
          <p className="text-xs text-muted-foreground">
            {t('admin.showing') || 'Showing'} {((searchParams.page - 1) * searchParams.page_size) + 1} {t('admin.to') || 'to'}{' '}
            {Math.min(searchParams.page * searchParams.page_size, total)} {t('admin.of') || 'of'} {total} {t('admin.entries') || 'entries'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-btn"
              disabled={searchParams.page <= 1}
              onClick={() => setSearchParams(prev => ({...prev, page: prev.page - 1}))}
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
            {Array.from({length: Math.min(3, Math.ceil(total / searchParams.page_size))}, (_, i) => i + 1).map(p => (
              <Button
                key={p}
                variant={p === searchParams.page ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0 rounded-btn"
                onClick={() => setSearchParams(prev => ({...prev, page: p}))}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-btn"
              disabled={searchParams.page >= Math.ceil(total / searchParams.page_size)}
              onClick={() => setSearchParams(prev => ({...prev, page: prev.page + 1}))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* User Detail Slide-in Panel                                         */}
      {/* ----------------------------------------------------------------- */}
      <Sheet open={!!detailUser} onOpenChange={open => { if (!open) closeDetailPanel(); }}>
        <SheetContent
          side="right"
          className="w-full sm:w-[560px] sm:max-w-[560px] p-0 flex flex-col"
        >
          {/* Panel Header */}
          <SheetHeader className="p-6 border-b border-border flex flex-row items-center justify-between space-y-0">
            <SheetTitle className="text-lg font-semibold">
              {t('admin.userDetails') || 'User Details'}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={closeDetailPanel}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          {/* Panel Body */}
          {detailUser && (
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Profile Overview */}
              <div className="text-center">
                <Avatar className="h-24 w-24 mx-auto border-4 border-primary/10 shadow-md">
                  <AvatarImage src={detailUser.avatar ? getFullUrl(detailUser.avatar) : undefined} />
                  <AvatarFallback className="text-2xl font-bold bg-muted text-primary">
                    {(detailUser.nickname || detailUser.username || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h4 className="mt-4 text-lg font-semibold">{detailUser.nickname || detailUser.username}</h4>
                <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                <Badge
                  className={`mt-2 ${getRoleBadgeClasses(detailUser.role)}`}
                >
                  {getRoleLabel(detailUser.role, t)}
                </Badge>
              </div>

              <Separator />

              {/* RBAC Permissions */}
              <div className="space-y-4">
                <h5 className="text-xs font-medium uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                  {t('admin.rbacPermissions') || 'RBAC Permissions'}
                </h5>
                <div className="space-y-3">
                  {RBAC_PERMISSIONS.map(perm => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {perm.icon}
                        <div>
                          <p className="text-sm font-semibold">{perm.name}</p>
                          <p className="text-[11px] text-muted-foreground">{perm.description}</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={detailPermissions.has(perm.id)}
                        onCheckedChange={() => toggleDetailPermission(perm.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Recent Activity */}
              <div className="space-y-4">
                <h5 className="text-xs font-medium uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                  {t('admin.recentActivity') || 'Recent Activity'}
                </h5>
                <div className="space-y-4">
                  {/* Activity item 1: Account created */}
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <p className="text-sm">
                        {t('admin.accountCreated') || 'Account created'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(detailUser.create_time)}
                      </p>
                    </div>
                  </div>
                  {/* Activity item 2: Last update */}
                  {detailUser.update_time && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary/30 mt-2 shrink-0" />
                      <div>
                        <p className="text-sm">
                          {t('admin.profileUpdated') || 'Profile updated'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(detailUser.update_time)}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Activity item 3: Status */}
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary/30 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm">
                        {t('admin.statusSet') || 'Status set to'} {getUserStatusLabel(detailUser.status)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(detailUser.update_time || detailUser.create_time)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Panel Footer */}
          <div className="p-6 border-t border-border bg-background flex gap-3">
            <Button
              className="flex-1 rounded-btn"
              onClick={handleSavePermissions}
            >
              {t('admin.saveChanges') || 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              className="border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-btn"
              onClick={handleDeactivate}
            >
              {t('admin.deactivate') || 'Deactivate'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ----------------------------------------------------------------- */}
      {/* Invite User Dialog                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="rounded-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {t('admin.inviteUser') || 'Invite User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t('admin.email') || 'Email'}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@company.com"
                value={inviteForm.email}
                onChange={e => setInviteForm(prev => ({...prev, email: e.target.value}))}
                className="rounded-input"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>{t('admin.role') || 'Role'}</Label>
              <Select
                value={inviteForm.role}
                onValueChange={v => setInviteForm(prev => ({...prev, role: v}))}
              >
                <SelectTrigger className="rounded-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('admin.user') || 'Viewer'}</SelectItem>
                  <SelectItem value="editor">{t('admin.editor') || 'Editor'}</SelectItem>
                  <SelectItem value="admin">{t('admin.admin') || 'Admin'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="invite-message">
                {t('admin.message') || 'Message'} <span className="text-muted-foreground text-xs">({t('admin.optional') || 'Optional'})</span>
              </Label>
              <Input
                id="invite-message"
                placeholder={t('admin.inviteMessagePlaceholder') || 'Add a personal message to the invitation...'}
                value={inviteForm.message}
                onChange={e => setInviteForm(prev => ({...prev, message: e.target.value}))}
                className="rounded-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              className="rounded-btn"
            >
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleInvite}
              className="rounded-btn"
            >
              <Mail className="h-4 w-4 mr-2" />
              {t('admin.sendInvite') || 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Edit User Dialog                                                   */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-card">
          <DialogHeader>
            <DialogTitle>{t('admin.editUser') || 'Edit User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.username') || 'Username'}</Label>
              <Input
                value={editForm.username || ''}
                disabled
                className="bg-muted rounded-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.nickname') || 'Nickname'}</Label>
              <Input
                value={editForm.nickname || ''}
                onChange={e => setEditForm(prev => ({...prev, nickname: e.target.value}))}
                className="rounded-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.email') || 'Email'}</Label>
              <Input
                type="email"
                value={editForm.email || ''}
                onChange={e => setEditForm(prev => ({...prev, email: e.target.value}))}
                className="rounded-input"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.role') || 'Role'}</Label>
              <Select
                value={editForm.role}
                onValueChange={v => setEditForm(prev => ({...prev, role: v}))}
              >
                <SelectTrigger className="rounded-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('admin.user') || 'Viewer'}</SelectItem>
                  <SelectItem value="editor">{t('admin.editor') || 'Editor'}</SelectItem>
                  <SelectItem value="admin">{t('admin.admin') || 'Admin'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.status') || 'Status'}</Label>
              <Select
                value={editForm.status}
                onValueChange={v => setEditForm(prev => ({...prev, status: v}))}
              >
                <SelectTrigger className="rounded-input">
                  <SelectValue />
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
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="rounded-btn"
            >
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleUpdate} className="rounded-btn">
              {t('admin.save') || 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Delete User Alert Dialog                                           */}
      {/* ----------------------------------------------------------------- */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteUser') || 'Delete User'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.deleteUserConfirm') || 'Are you sure you want to delete this user? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-btn">
              {t('admin.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 rounded-btn"
              onClick={handleDelete}
            >
              {t('admin.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
