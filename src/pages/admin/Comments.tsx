import { Spinner } from '@/components/ui/spinner';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminCommentApi, type CommentStats } from '@/lib/api/comment';
import { toast } from 'sonner';
import { CommentTreeTable } from '@/components/admin/CommentTreeTable';
import { ReportStatusFilter } from '@/components/admin/ReportStatusFilter';
import { ReportDialog } from '@/components/admin/ReportDialog';
import { useCommentTree } from '@/hooks/useCommentTree';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/common/TablePagination';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  ShieldOff,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';

const Comments: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [stats, setStats] = useState<CommentStats | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { page, pageSize, total, setPage, setTotal, getParams } = usePagination();

  const {
    visibleNodes,
    expandedIds,
    loading,
    toggleExpand,
    expandAll,
    collapseAll,
    loadComments,
  } = useCommentTree();

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await adminCommentApi.getStats();
      if (response) {
        setStats(response as any);
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
    await loadComments(params);
  }, [page, pageSize, statusFilter, reportStatusFilter, loadComments]);

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
      toast.success(t('admin.approved'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.approve') + ' ' + t('admin.loadFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(id);
      await adminCommentApi.reject(id);
      toast.success(t('admin.rejected'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.reject') + ' ' + t('admin.loadFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (id: string) => {
    try {
      setActionLoading(id);
      await adminCommentApi.block(id);
      toast.success(t('admin.blocked'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.blocked') + ' ' + t('admin.loadFailed'), { description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      setActionLoading(id);
      await adminCommentApi.unblock(id);
      toast.success(t('admin.unblocked'));
      await refreshComments();
      await fetchStats();
    } catch (err: any) {
      toast.error(t('admin.unblocked') + ' ' + t('admin.loadFailed'), { description: err.message });
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

  return (
    <div className="p-8">
      {/* 页面标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            {t('admin.comments') || 'Comments Moderation'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('admin.manageComments') || 'Review, approve, or reject user comments and replies.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors">
            <CheckCircle className="w-4 h-4" />
            Batch Approve
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Comments */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Comments</p>
              <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">
                {totalCount.toLocaleString()}
              </h3>
              <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{stats?.pending ?? 0} today
              </p>
            </div>
            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group ring-1 ring-indigo-500/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Review</p>
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
        </div>

        {/* Approved */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Approved</p>
              <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">
                {approvedCount.toLocaleString()}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1">
                {totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : 0}% rate
              </p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Blocked */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Blocked</p>
              <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">
                {blockedCount.toLocaleString()}
              </h3>
              <p className="text-xs font-semibold text-red-600 mt-2">Spam/Abuse</p>
            </div>
            <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
              <ShieldOff className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
              placeholder={t('admin.search') || 'Search comments, users or IDs...'}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="flagged">Flagged</option>
          </select>
          <ReportStatusFilter value={reportStatusFilter} onChange={setReportStatusFilter} />
          <button
            className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors"
            onClick={handleReset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* 表格内容 */}
      <CommentTreeTable
        nodes={visibleNodes}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onApprove={handleApprove}
        onReject={handleReject}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onDelete={handleDelete}
        onViewReports={handleViewReports}
        onDismissReports={handleDismissReports}
        loading={loading}
      />

      <TablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />

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

export default Comments;
