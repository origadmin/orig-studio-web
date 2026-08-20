/**
 * Comments Moderation page
 *
 * Renders the comment moderation console used by administrators to review,
 * approve, reject, or block user comments and their replies. The visual
 * structure follows the comments_moderation_unified_nav prototype 1:1.
 */
import { Spinner } from '@/components/ui/spinner';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import { adminCommentApi, type CommentStats } from '@/lib/api/comment';
import { toast } from 'sonner';
import { ReportStatusFilter } from '@/components/admin/ReportStatusFilter';
import { ReportDialog } from '@/components/admin/ReportDialog';
import { useCommentTree } from '@/hooks/useCommentTree';
import { usePagination } from '@/hooks/usePagination';
import { Button } from '@/components/ui/button';
import {FilterBar} from '@/components/admin/FilterBar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  ShieldOff,
  TrendingUp,
  AlertCircle,
  Filter,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Flag,
} from 'lucide-react';
import type { CommentTreeNode } from '@/lib/utils/commentTree';

const Comments: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [stats, setStats] = useState<CommentStats | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCommentId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { page, pageSize, total, setPage } = usePagination();

  const {
    tree,
    visibleNodes,
    expandedIds,
    loading,
    toggleExpand,
    loadComments,
  } = useCommentTree();

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await adminCommentApi.getStats();
      if (response && typeof response === 'object') {
        setStats(response as CommentStats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Load comments with current filters
  const refreshComments = useCallback(async () => {
    const params: any = {
      page,
      page_size: pageSize,
      tree: true,
    };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (reportStatusFilter !== 'all') params.report_status = reportStatusFilter;
    if (searchTerm.trim()) params.keyword = searchTerm.trim();
    await loadComments(params);
  }, [page, pageSize, statusFilter, reportStatusFilter, searchTerm, loadComments]);

  useEffect(() => {
    refreshComments();
  }, [refreshComments]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Action handlers
  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);
      await adminCommentApi.approve(id);
      toast.success(t('admin.approved', '已通过'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.approve', '通过') + ' ' + t('admin.loadFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(id);
      await adminCommentApi.reject(id);
      toast.success(t('admin.rejected', '已拒绝'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.reject', '拒绝') + ' ' + t('admin.loadFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (id: string) => {
    try {
      setActionLoading(id);
      await adminCommentApi.block(id);
      toast.success(t('admin.blocked', '已封禁'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.blocked', '已封禁') + ' ' + t('admin.loadFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      setActionLoading(id);
      await adminCommentApi.unblock(id);
      toast.success(t('admin.unblocked', '已解封'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.unblocked', '已解封') + ' ' + t('admin.loadFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      setActionLoading(id);
      await adminCommentApi.delete(id);
      toast.success(t('admin.commentDeleted'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.deleteFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewReports = (id: string) => {
    toast.info(`Viewing reports for comment ${id}`);
  };

  const handleDismissReports = async (id: string) => {
    try {
      setActionLoading(id);
      await adminCommentApi.dismissReports(id);
      toast.success(t('admin.reportsDismissed'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.loadFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportSubmit = async (data: { reason: string; description?: string }) => {
    if (!reportCommentId) return;
    await adminCommentApi.approve(reportCommentId);
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setReportStatusFilter('all');
  };

  if (loading && visibleNodes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  const pendingCount = stats?.pending ?? 0;
  const approvedCount = stats?.approved ?? 0;
  const blockedCount = stats?.blocked ?? 0;
  const totalCount = stats?.total ?? 0;

  // Build the list of top-level (root) nodes for the prototype's
  // "parent comment + nested replies" layout.
  const rootNodes: CommentTreeNode[] = tree;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, total);

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
            <BreadcrumbPage>{t('admin.breadcrumb.comments', '评论')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* 页面标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('admin.comments', '评论管理')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.manageComments') || 'Review, approve, or reject user comments and replies.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="default">
            <Filter className="w-4 h-4" />
            {t('common.filter') || 'Filters'}
          </Button>
          <Button variant="default" size="default">
            <CheckCircle className="w-4 h-4" />
            {t('admin.approve', '通过')}
          </Button>
        </div>
      </div>

      {/* 统计卡片 (Stats Bento) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Comments */}
        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {t('admin.totalComments') || 'Total Comments'}
                </p>
                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                  {totalCount.toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{pendingCount} {t('admin.today', '今日')}
                </p>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Review */}
        <Card className="border-indigo-200 ring-1 ring-indigo-500/10 hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {t('review.pending') || 'Pending Review'}
                </p>
                <h3 className="text-3xl font-extrabold tabular-nums text-indigo-600 mt-1">
                  {pendingCount.toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Action Needed
                </p>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {t('admin.approved', '已通过')}
                </p>
                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                  {approvedCount.toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-muted-foreground mt-2 flex items-center gap-1">
                  {totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : 0}% rate
                </p>
              </div>
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blocked */}
        <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {t('admin.blocked', '已封禁')}
                </p>
                <h3 className="text-3xl font-extrabold tabular-nums text-foreground mt-1">
                  {blockedCount.toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-red-600 mt-2">Spam/Abuse</p>
              </div>
              <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                <ShieldOff className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和过滤 (Filter bar) — BUG-200 unified FilterBar; search now feeds keyword filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <FilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder={t('admin.search', '搜索')}
              filters={[{
                key: 'status',
                placeholder: t('admin.allStatus', '全部状态'),
                value: statusFilter,
                options: [
                  {value: 'all', label: t('admin.allStatus', '全部状态')},
                  {value: 'pending', label: t('admin.pending', '待审核')},
                  {value: 'approved', label: t('admin.approved', '已通过')},
                  {value: 'flagged', label: t('admin.flagged', '已举报')},
                ],
                onChange: setStatusFilter,
              }]}
              onReset={handleReset}
            />
            <ReportStatusFilter value={reportStatusFilter} onChange={setReportStatusFilter} />
          </div>
        </CardContent>
      </Card>

      {/* 表格内容 (Table with nested replies) */}
      <Card className="overflow-hidden">
        <Table className="text-left">
          <TableHeader>
            <TableRow className="bg-muted border-b border-border">
              <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('admin.user', '用户')}
              </TableHead>
              <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('admin.commentContent') || 'Comment Content'}
              </TableHead>
              <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Posted
              </TableHead>
              <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('admin.status', '状态')}
              </TableHead>
              <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                {t('admin.actions', '操作')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {rootNodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  {t('admin.noComments') || 'No comments found'}
                </TableCell>
              </TableRow>
            ) : (
              rootNodes.map(parent => {
                const isExpanded = expandedIds.has(parent.id);
                const replyCount = parent.descendantCount ?? parent.children.length;

                return (
                  <React.Fragment key={parent.id}>
                    {/* Parent Comment */}
                    <TableRow className="hover:bg-muted/50 transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {parent.avatar ? (
                            <img
                              alt={parent.username || 'User'}
                              className="w-10 h-10 rounded-full border border-border object-cover"
                              src={parent.avatar}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">
                              {(parent.username || 'U')[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {parent.username || 'Unknown'}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              ID: #{parent.id}-C
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 max-w-md">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {parent.text || '-'}
                        </p>
                        {parent.hasReplies && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => toggleExpand(parent.id)}
                            className="mt-2 text-indigo-600 font-semibold text-xs p-0 h-auto"
                          >
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                            {isExpanded
                              ? t('admin.collapseAll') || 'Collapse Thread'
                              : `Expand Thread (${replyCount})`}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {parent.create_time || '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={parent.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* BUG-243: 操作按钮按状态条件渲染（只显示"可执行的下一动作"），
                              避免所有评论无差别显示 √/×（已通过再点"通过"无意义）。 */}
                          {parent.status !== 'approved' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-emerald-500 hover:bg-emerald-50"
                              title={t('admin.approve', '通过')}
                              disabled={actionLoading === parent.id}
                              onClick={() => handleApprove(parent.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {parent.status !== 'rejected' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-red-500 hover:bg-red-50"
                              title={t('admin.reject', '拒绝')}
                              disabled={actionLoading === parent.id}
                              onClick={() => handleReject(parent.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {parent.status !== 'blocked' ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:bg-muted"
                              title={t('admin.block', '封禁')}
                              disabled={actionLoading === parent.id}
                              onClick={() => handleBlock(parent.id)}
                            >
                              <ShieldOff className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:bg-muted"
                              title={t('admin.unblock', '解封')}
                              disabled={actionLoading === parent.id}
                              onClick={() => handleUnblock(parent.id)}
                            >
                              <ShieldOff className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:bg-muted"
                            title={t('admin.reports', '举报')}
                            onClick={() => handleViewReports(parent.id)}
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Replies (Nested) */}
                    {isExpanded && parent.children.length > 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell className="p-0" colSpan={5}>
                          <div className="relative pl-12">
                            <div className="tree-line-v" />
                            {parent.children.map(reply => (
                              <div
                                key={reply.id}
                                className="relative flex items-center hover:bg-muted/80 transition-colors border-l border-transparent"
                              >
                                <div className="tree-line-h" />
                                <div className="grid grid-cols-[2fr_3fr_1fr_1fr_1.5fr] w-full items-center px-6 py-3">
                                  {/* User */}
                                  <div className="flex items-center gap-3">
                                    {reply.avatar ? (
                                      <img
                                        alt={reply.username || 'User'}
                                        className="w-8 h-8 rounded-full border border-border object-cover"
                                        src={reply.avatar}
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground font-semibold text-xs">
                                        {(reply.username || 'U')[0]?.toUpperCase() || 'U'}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-[13px] font-semibold text-foreground truncate">
                                        {reply.username || 'Unknown'}
                                      </p>
                                      <p className="font-mono text-[10px] text-muted-foreground">
                                        ID: #{reply.id}-R
                                      </p>
                                    </div>
                                  </div>
                                  {/* Content */}
                                  <div className="pr-8">
                                    {reply.status === 'flagged' || reply.has_pending_reports ? (
                                      <p className="text-[13px] text-red-700 italic bg-red-50 px-2 py-1 rounded border-l-2 border-red-500">
                                        {reply.text || '-'}
                                      </p>
                                    ) : (
                                      <p className="text-[13px] text-muted-foreground">
                                        {reply.text || '-'}
                                      </p>
                                    )}
                                  </div>
                                  {/* Posted */}
                                  <div className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                                    {reply.create_time || '-'}
                                  </div>
                                  {/* Status */}
                                  <div>
                                    <StatusBadge status={reply.status} compact />
                                  </div>
                                  {/* Actions */}
                                  <div className="flex justify-end gap-1 items-center">
                                    {(reply.report_count ?? 0) > 0 && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          className="text-muted-foreground hover:text-red-500"
                                          title={t('admin.reports', '举报')}
                                          onClick={() => handleViewReports(reply.id)}
                                        >
                                          <Flag className="w-3.5 h-3.5" />
                                        </Button>
                                        <Badge variant="soft-danger" className="text-[10px] px-1.5 py-0.5 font-bold">
                                          {reply.report_count} {t('admin.reports', '举报')}
                                        </Badge>
                                      </>
                                    )}
                                    {reply.has_pending_reports && (
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="text-[10px] font-bold uppercase h-auto py-1 px-2"
                                        onClick={() => handleBlock(reply.id)}
                                      >
                                        Block User
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing{' '}
              <span className="font-semibold text-card-foreground">
                {pageStart} to {pageEnd}
              </span>{' '}
              of <span className="font-semibold text-card-foreground">{total}</span> comments
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(p => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 min-w-8 px-3 ${p !== page ? 'text-muted-foreground' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Footer (System Standard) */}
      <footer className="mt-12 py-8 border-t border-border">
        <div className="grid grid-cols-4 gap-8">
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4">OrigStudio</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Advanced media management and moderation ecosystem for enterprise-level content creators.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">
              System
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a className="hover:text-indigo-600" href="#">
                  API Documentation
                </a>
              </li>
              <li>
                <a className="hover:text-indigo-600" href="#">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">
              Support
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a className="hover:text-indigo-600" href="#">
                  Help Center
                </a>
              </li>
              <li>
                <a className="hover:text-indigo-600" href="#">
                  Contact Admin
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">
              Legal
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a className="hover:text-indigo-600" href="#">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="hover:text-indigo-600" href="#">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground font-mono">
          <p>© 2024 OrigStudio Media. All rights reserved.</p>
          <div className="flex gap-4">
            <span>STATUS: OPERATIONAL</span>
            <span>v2.4.1-STABLE</span>
          </div>
        </div>
      </footer>

      {/* Report dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        commentId={reportCommentId || ''}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
};

/**
 * StatusBadge — renders the pill-style status indicator used in the table.
 *
 * Mirrors the prototype's status pills: colored dot (with optional pulse
 * animation for "pending") and a colored background.
 */
const StatusBadge: React.FC<{ status?: string; compact?: boolean }> = ({
  status,
  compact = false,
}) => {
  const { t } = useTranslation();
  const cls = compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  switch (status) {
    case 'approved':
      return (
        <Badge variant="soft-success" className={`gap-1.5 ${cls}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {t('admin.approved', '已通过')}
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="soft-warning" className={`gap-1.5 ${cls}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          {t('admin.pending', '待审核')}
        </Badge>
      );
    case 'rejected':
    case 'flagged':
    case 'blocked':
      return (
        <Badge variant="soft-danger" className={`gap-1.5 ${cls}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {status === 'blocked'
            ? t('admin.blocked', '已封禁')
            : status === 'flagged'
            ? 'Flagged'
            : t('admin.rejected', '已拒绝')}
        </Badge>
      );
    default:
      return (
        <Badge variant="soft-neutral" className={`gap-1.5 ${cls}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          {t('admin.unspecified', '未指定') || status || '-'}
        </Badge>
      );
  }
};

export default Comments;
