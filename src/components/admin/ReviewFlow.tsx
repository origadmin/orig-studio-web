import React, {useState, useEffect} from 'react';
import {Check, X, Clock, File, Search, Trash2, ShieldCheck} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Skeleton} from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {formatDateTime} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {toast} from 'sonner';
import {reviewApi, type ReviewItem} from '@/lib/api/review';
import ErrorPage from '@/components/common/ErrorPage';
import {TablePagination} from '@/components/common/TablePagination';
import AdminPageTemplate from '@/components/AdminPageTemplate';

const ReviewFlow: React.FC = () => {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [showBatchDialog, setShowBatchDialog] = useState(false);
    const [batchStatus, setBatchStatus] = useState<'approve' | 'reject'>('approve');
    const [batchReason, setBatchReason] = useState('');
    const [batchSubmitting, setBatchSubmitting] = useState(false);
    const [showSingleDialog, setShowSingleDialog] = useState(false);
    const [currentItem, setCurrentItem] = useState<ReviewItem | null>(null);
    const [singleStatus, setSingleStatus] = useState<'approve' | 'reject'>('approve');
    const [singleReason, setSingleReason] = useState('');
    const [singleSubmitting, setSingleSubmitting] = useState(false);

    useEffect(() => {
        fetchReviewItems();
        // BUG-138 G6 #2: switching tabs clears any stale selection so the batch
        // bar doesn't bleed across (pending) → (history) tab boundaries.
        setSelectedItems([]);
        // BUG-138: search is wired to the backend `keyword` param so the
        // search box is no longer a dead control; reset page on filter change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, pageSize, search, typeFilter, statusFilter]);

    const fetchReviewItems = async () => {
        try {
            setLoading(true);
            setError(null);
            let response;
            if (activeTab === 'pending') {
                response = await reviewApi.getPending({
                    page,
                    page_size: pageSize,
                    keyword: search,
                    type: typeFilter,
                });
            } else {
                response = await reviewApi.getHistory({
                    page,
                    page_size: pageSize,
                    keyword: search,
                    type: typeFilter,
                    status: statusFilter,
                });
            }
            setReviewItems(response.items || []);
            setTotal(response.total || 0);
        } catch (err) {
            setError(t('review.fetchFailed', 'Failed to fetch review items'));
            console.error('Failed to fetch review items:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id: string, action: 'approve' | 'reject', comment?: string) => {
        try {
            await reviewApi.review(id, {action, comment});
            toast.success(action === 'approve'
                ? t('review.approveSuccess', '审核已通过')
                : t('review.rejectSuccess', '已拒绝'));
            await fetchReviewItems();
        } catch (err) {
            console.error('Failed to review item:', err);
            toast.error(t('review.reviewFailed', '审核操作失败'));
        }
    };

    const handleBatchReview = async () => {
        if (selectedItems.length === 0) return;

        setBatchSubmitting(true);
        try {
            // BUG-138: no backend batch RPC (proto frozen) — loop the single
            // ReviewMedia endpoint per selected media, then refresh the list.
            await Promise.all(selectedItems.map((id) =>
                reviewApi.review(id, {action: batchStatus, comment: batchReason})
            ));
            toast.success(t('review.batchSuccess', '已批量{{count}}项', {count: selectedItems.length}));
            await fetchReviewItems();
            setShowBatchDialog(false);
            setSelectedItems([]);
            setBatchStatus('approve');
            setBatchReason('');
        } catch (err) {
            console.error('Failed to batch review items:', err);
            toast.error(t('review.batchFailed', '批量审核部分失败，请重试'));
        } finally {
            setBatchSubmitting(false);
        }
    };

    const handleSelectItem = (id: string) => {
        setSelectedItems(prev => {
            if (prev.includes(id)) {
                return prev.filter(itemId => itemId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedItems(reviewItems.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    const openSingleDialog = (item: ReviewItem, presetStatus: 'approve' | 'reject' = 'approve') => {
        setCurrentItem(item);
        setSingleStatus(presetStatus);
        setSingleReason('');
        setShowSingleDialog(true);
    };

    const handleSingleReview = async () => {
        if (!currentItem) return;
        setSingleSubmitting(true);
        try {
            await handleReview(currentItem.id, singleStatus, singleReason);
            setShowSingleDialog(false);
            setCurrentItem(null);
        } finally {
            setSingleSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="soft-warning">{t('review.pending', '待审核')}</Badge>;
            case 'approved':
                return <Badge variant="soft-success">{t('review.approved', '已通过')}</Badge>;
            case 'rejected':
                return <Badge variant="soft-danger">{t('review.rejected', '已拒绝')}</Badge>;
            default:
                return <Badge variant="soft-neutral">{status}</Badge>;
        }
    };

    const renderTableHeader = () => (
        <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-[40px]">
                    {activeTab === 'pending' && (
                        <Checkbox
                            checked={selectedItems.length === reviewItems.length && reviewItems.length > 0}
                            onCheckedChange={(v) => handleSelectAll(!!v)}
                            aria-label={t('review.selectAll', '全选')}
                        />
                    )}
                </TableHead>
                <TableHead className="font-semibold">{t('review.media', '媒体')}</TableHead>
                <TableHead className="font-semibold">{t('review.user', '用户')}</TableHead>
                <TableHead className="font-semibold">{t('review.status', '状态')}</TableHead>
                <TableHead className="font-semibold">{t('review.created', '创建时间')}</TableHead>
                {activeTab === 'history' && (
                    <TableHead className="font-semibold">{t('review.reviewedBy', '审核人')}</TableHead>
                )}
                <TableHead className="text-right font-semibold">{t('review.actions', '操作')}</TableHead>
            </TableRow>
        </TableHeader>
    );

    const renderFilters = () => (
        <>
            <Select value={typeFilter || 'all'} onValueChange={(value) => { setTypeFilter(value === 'all' ? '' : value); setPage(1); }}>
                <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('common.type', '类型')}/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('review.typeAll', '全部类型')}</SelectItem>
                    <SelectItem value="video">{t('review.typeVideo', '视频')}</SelectItem>
                    <SelectItem value="image">{t('review.typeImage', '图片')}</SelectItem>
                    <SelectItem value="audio">{t('review.typeAudio', '音频')}</SelectItem>
                </SelectContent>
            </Select>
            {activeTab === 'history' && (
                <Select value={statusFilter || 'all'} onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setPage(1); }}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder={t('common.status', '状态')}/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('review.statusAll', '全部状态')}</SelectItem>
                        <SelectItem value="approved">{t('review.approved', '已通过')}</SelectItem>
                        <SelectItem value="rejected">{t('review.rejected', '已拒绝')}</SelectItem>
                    </SelectContent>
                </Select>
            )}
        </>
    );

    return (
        <AdminPageTemplate
            title={t('admin.review', '内容审核')}
            titleIcon={<ShieldCheck className="h-8 w-8"/>}
            themeColor="indigo"
            description={t('review.pageDescription', '审核用户提交的媒体：通过即发布，拒绝即退回。')}
            searchPlaceholder={t('common.search', '搜索媒体标题...')}
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            filters={renderFilters()}
        >
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'history')}>
                <TabsList>
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                        <Clock className="w-4 h-4"/>
                        {t('review.pending', '待审核')}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <Check className="w-4 h-4"/>
                        {t('review.history', '审核历史')}
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Batch Actions — BUG-138 G6 #3: bottom-sheet style fixed bar
                (user: "选中可以使用底部弹出式") instead of an inline card. */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3">
                    <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            {t('review.selectedItems', '已选择 {{count}} 项', {count: selectedItems.length})}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setSelectedItems([])}>
                                <Trash2 className="w-4 h-4 mr-2"/>
                                {t('common.clear', '清空')}
                            </Button>
                            <Button onClick={() => setShowBatchDialog(true)}>
                                {t('review.batchReview', '批量审核')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <Card>
                    <CardContent>
                        <div className="space-y-4">
                            <Table>
                                {renderTableHeader()}
                                <TableBody>
                                    {Array.from({length: 5}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-4"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-64"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                                            {activeTab === 'history' && <TableCell><Skeleton className="h-4 w-24"/></TableCell>}
                                            <TableCell><Skeleton className="h-8 w-32"/></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : error ? (
                <ErrorPage message={error}/>
            ) : (
                <Card>
                    <CardContent>
                        <Table>
                            {renderTableHeader()}
                            <TableBody>
                                {reviewItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={activeTab === 'history' ? 6 : 5} className="text-center">
                                            {t('review.noItems', '未找到项目')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reviewItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {activeTab === 'pending' && (
                                                    <Checkbox
                                                        checked={selectedItems.includes(item.id)}
                                                        onCheckedChange={() => handleSelectItem(item.id)}
                                                        aria-label={t('review.selectItem', '选择项目')}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-foreground">{item.media_title}</p>
                                                    <p className="text-xs text-muted-foreground">{item.media_type}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-foreground">{item.username}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('review.userId', 'ID: {{id}}', {id: item.user_id})}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(item.review_status)}
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-muted-foreground">{formatDateTime(item.create_time)}</p>
                                            </TableCell>
                                            {activeTab === 'history' && (
                                                <TableCell>
                                                    <p className="text-sm text-muted-foreground">
                                                        {item.reviewer_name || t('review.notAvailable', 'N/A')}
                                                    </p>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    {activeTab === 'pending' ? (
                                                        <>
                                                            {/* BUG-138 G6 #2: action verbs (通过/拒绝) instead of
                                                                past-tense state (已通过/已拒绝) so they don't read
                                                                like a status that contradicts the 待审核 badge. */}
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleReview(item.id, 'approve')}
                                                            >
                                                                <Check className="w-4 h-4 mr-1"/>
                                                                {t('review.actionApprove', '通过')}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => openSingleDialog(item, 'reject')}
                                                            >
                                                                <X className="w-4 h-4 mr-1"/>
                                                                {t('review.actionReject', '拒绝')}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openSingleDialog(item)}
                                                        >
                                                            {t('common.details', '详情')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <TablePagination
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            onPageChange={setPage}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Batch Review Dialog */}
            <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('review.batchReview', '批量审核')}</DialogTitle>
                        <DialogDescription>
                            {t('review.batchReviewDescription', '审核 {{count}} 个选定项目', {count: selectedItems.length})}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4">
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-2">
                                {t('common.status', '状态')}
                            </h4>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={batchStatus === 'approve' ? 'default' : 'outline'}
                                    onClick={() => setBatchStatus('approve')}
                                >
                                    <Check className="w-4 h-4 mr-2"/>
                                    {t('review.approved', '已通过')}
                                </Button>
                                <Button
                                    variant={batchStatus === 'reject' ? 'destructive' : 'outline'}
                                    onClick={() => setBatchStatus('reject')}
                                >
                                    <X className="w-4 h-4 mr-2"/>
                                    {t('review.rejected', '已拒绝')}
                                </Button>
                            </div>
                        </div>
                        {batchStatus === 'reject' && (
                            <div>
                                <h4 className="text-sm font-medium text-foreground mb-2">
                                    {t('review.reason', '原因')}
                                </h4>
                                <Textarea
                                    placeholder={t('review.reasonPlaceholder', '输入拒绝原因')}
                                    value={batchReason}
                                    onChange={(e) => setBatchReason(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                            {t('common.cancel', '取消')}
                        </Button>
                        <Button onClick={handleBatchReview} disabled={batchSubmitting}>
                            {t('review.submit', '提交')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Single Review Dialog */}
            <Dialog open={showSingleDialog} onOpenChange={setShowSingleDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('review.reviewItem', '审核项目')}</DialogTitle>
                        <DialogDescription>
                            {currentItem?.media_title}
                        </DialogDescription>
                    </DialogHeader>
                    {currentItem && (
                        <div className="space-y-4 px-6 py-4">
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-foreground">
                                    {t('common.media', '媒体')}
                                </h4>
                                <p className="text-sm text-foreground">{currentItem.media_title}</p>
                                <p className="text-xs text-muted-foreground">{currentItem.media_type}</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-foreground">
                                    {t('common.user', '用户')}
                                </h4>
                                <p className="text-sm text-foreground">{currentItem.username}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t('review.userId', 'ID: {{id}}', {id: currentItem.user_id})}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-foreground">
                                    {t('common.status', '状态')}
                                </h4>
                                {getStatusBadge(currentItem.review_status)}
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-foreground">
                                    {t('common.createdAt', '创建时间')}
                                </h4>
                                <p className="text-sm text-muted-foreground">{formatDateTime(currentItem.create_time)}</p>
                            </div>
                            {currentItem.reason && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-foreground">
                                        {t('review.reason', '原因')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">{currentItem.reason}</p>
                                </div>
                            )}
                            {activeTab === 'pending' && (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-foreground mb-2">
                                            {t('review.action', '操作')}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant={singleStatus === 'approve' ? 'default' : 'outline'}
                                                onClick={() => setSingleStatus('approve')}
                                            >
                                                <Check className="w-4 h-4 mr-2"/>
                                                {t('review.approved', '已通过')}
                                            </Button>
                                            <Button
                                                variant={singleStatus === 'reject' ? 'destructive' : 'outline'}
                                                onClick={() => setSingleStatus('reject')}
                                            >
                                                <X className="w-4 h-4 mr-2"/>
                                                {t('review.rejected', '已拒绝')}
                                            </Button>
                                        </div>
                                    </div>
                                    {singleStatus === 'reject' && (
                                        <div>
                                            <h4 className="text-sm font-medium text-foreground mb-2">
                                                {t('review.reason', '原因')}
                                            </h4>
                                            <Textarea
                                                placeholder={t('review.reasonPlaceholder', '输入拒绝原因')}
                                                value={singleReason}
                                                onChange={(e) => setSingleReason(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSingleDialog(false)}>
                            {t('common.close', '关闭')}
                        </Button>
                        {activeTab === 'pending' && (
                            <Button onClick={handleSingleReview} disabled={singleSubmitting}>
                                {t('review.submit', '提交')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPageTemplate>
    );
};

export default ReviewFlow;
