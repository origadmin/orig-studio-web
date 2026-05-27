import { Spinner } from '@/components/ui/spinner';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { adminCommentApi, type CommentStats } from '@/lib/api/comment';
import { toast } from 'sonner';
import { CommentTreeTable } from '@/components/admin/CommentTreeTable';
import { CommentStatsCards } from '@/components/admin/CommentStatsCards';
import { ReportStatusFilter } from '@/components/admin/ReportStatusFilter';
import { ReportDialog } from '@/components/admin/ReportDialog';
import { useCommentTree } from '@/hooks/useCommentTree';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/common/TablePagination';
import { AdminPageTemplate } from '@/components/admin/AdminPageTemplate';

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

    // Update total from the last load
    useEffect(() => {
        // total is managed by usePagination, we update it when comments load
    }, [loading]);

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
        await adminCommentApi.approve(reportCommentId); // placeholder - report API is on portal side
        // Actually, the admin report is done via the portal API
        // For admin page, we just use the report dialog for reference
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

    return (
        <AdminPageTemplate
            title={t('admin.comments')}
            description={t('admin.manageComments')}
            searchPlaceholder={t('admin.search') || 'Search comments...'}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            filters={
                <>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] h-8 rounded-btn-sm">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                {statusFilter === 'all' ? (
                                    <span className="text-muted-foreground">{t('admin.status')}</span>
                                ) : (
                                    <SelectValue placeholder={t('admin.status')} />
                                )}
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">--- {t('admin.allStatus')} ---</SelectItem>
                            <SelectItem value="approved">{t('admin.approved')}</SelectItem>
                            <SelectItem value="pending">{t('admin.pending')}</SelectItem>
                            <SelectItem value="rejected">{t('admin.rejected')}</SelectItem>
                            <SelectItem value="blocked">{t('admin.blocked')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <ReportStatusFilter value={reportStatusFilter} onChange={setReportStatusFilter} />
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t('admin.reset')}
                    </Button>
                </>
            }
            stats={<CommentStatsCards stats={stats} loading={loading} />}
        >
            {/* Tree table */}
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
        </AdminPageTemplate>
    );
};

export default Comments;
