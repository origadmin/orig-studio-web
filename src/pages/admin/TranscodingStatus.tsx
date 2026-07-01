/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 *
 * Transcoding Status Page
 * Real-time monitoring of active, queued, and completed transcoding jobs.
 */

import {useEffect, useState, useCallback, useMemo, useRef, Fragment} from "react";
import {useLocation, useNavigate} from "@tanstack/react-router";
import {useTranslation} from "react-i18next";
import {encodingApi, type EncodeProfile, type EncodingTask, type EncodingTaskListResponse} from "../../lib/api/media";
import {useTranscoding} from "../../hooks/useTranscoding";
import {Button} from "../../components/ui/button";
import {
    Table, TableBody, TableCell, TableRow,
    TableHead, TableHeader
} from "../../components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../components/ui/select";
import {Checkbox} from "../../components/ui/checkbox";
import {Input} from "../../components/ui/input";
import {AdminPageTemplate} from "../../components/AdminPageTemplate";
import {
    Activity, RefreshCw, Clock, CheckCircle2, XCircle,
    AlertCircle, Film, RotateCcw, Eye, ChevronLeft, ChevronRight, Loader2, Search
} from "lucide-react";
import {PAGINATION_CONFIG} from '@/config/pagination';

type EncodingTaskWithMeta = EncodingTask & { profile_name?: string; media_title?: string; thumbnail?: string };

type StatusFilter = "all" | "processing" | "queued" | "completed" | "failed";

function extractTasks(res: EncodingTaskListResponse | null | undefined): EncodingTaskWithMeta[] {
    if (!res) return [];
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.tasks)) return res.tasks;
    return [];
}

function shortenId(id: string | number): string {
    if (typeof id === 'number') {
        return `TRC-${String(id).padStart(5, '0')}`;
    }
    if (id.length > 12) {
        return `${id.substring(0, 8)}...`;
    }
    return id;
}

function StatusBadge({status}: { status: string }) {
    const {t} = useTranslation();
    const config: Record<string, { label: string; className: string }> = {
        processing: {
            label: t('admin.processing', '转码中'),
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 whitespace-nowrap"
        },
        queued: {
            label: t('admin.queued', '排队中'),
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap"
        },
        completed: {
            label: t('admin.success', '成功'),
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 whitespace-nowrap"
        },
        pending: {
            label: t('admin.queued', '排队中'),
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap"
        },
        success: {
            label: t('admin.success', '成功'),
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 whitespace-nowrap"
        },
        skipped: {
            label: t('admin.skipped', '已跳过'),
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 whitespace-nowrap"
        },
        partial: {
            label: t('admin.partialComplete', '部分完成'),
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 whitespace-nowrap"
        },
        failed: {
            label: t('admin.failed', '失败'),
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 whitespace-nowrap"
        },
    };

    const cfg = config[status] || {
        label: status,
        className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap"
    };

    return <span className={cfg.className}>{cfg.label}</span>;
}

function TaskRowCells({
                           task,
                           onRetry,
                           isRetrying,
                           isSelected,
                           onToggleSelect,
                           showError,
                           onToggleError,
                           onView,
                       }: {
    task: EncodingTaskWithMeta;
    onRetry: () => void;
    isRetrying: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    showError: boolean;
    onToggleError: () => void;
    onView: () => void;
}) {
    const {t} = useTranslation();
    const isProcessing = task.status === "processing";
    const isFailed = task.status === "failed";
    const isSuccess = task.status === "success" || task.status === "completed";
    const canRetry = isFailed || task.status === "skipped";
    const hasError = isFailed && !!task.error_message;

    const progressValue = isProcessing ? (task.progress || 0) :
        isSuccess ? 100 : 0;

    return (
        <>
            <TableCell className="w-10">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggleSelect}
                    aria-label={`${t('admin.selectTask', '选择任务')} ${task.id}`}
                />
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 font-mono" title={String(task.id)}>
                        {shortenId(task.id)}
                    </span>
                    <span className="text-xs text-slate-500 truncate max-w-[200px]" title={task.media_title || task.media_id}>
                        {task.media_title || shortenId(task.media_id) || t('common.unknown', '未知')}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <StatusBadge status={task.status}/>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all ${isProcessing ? 'bg-sky-500 animate-pulse' : isSuccess ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-slate-300'}`}
                            style={{width: `${progressValue}%`}}
                        />
                    </div>
                    <span className={`font-mono text-xs w-10 text-right ${isProcessing ? 'text-sky-600' : isSuccess ? 'text-emerald-600' : isFailed ? 'text-red-600' : 'text-slate-500'}`}>
                        {progressValue}%
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <span className="text-sm text-slate-700">
                    {task.profile_name || `#${task.profile_id}`}
                </span>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    {hasError && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onToggleError}
                            title={t('admin.viewStacktrace', '查看错误堆栈')}
                            className={showError ? "text-red-600 bg-red-50" : "text-slate-500 hover:text-red-600"}
                        >
                            <AlertCircle className="w-4 h-4"/>
                        </Button>
                    )}
                    {canRetry && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onRetry}
                            disabled={isRetrying}
                            title={t('admin.retryJobNow', '立即重试')}
                            className="text-slate-500 hover:text-amber-600"
                        >
                            {isRetrying ? (
                                <RefreshCw className="w-4 h-4 animate-spin"/>
                            ) : (
                                <RotateCcw className="w-4 h-4"/>
                            )}
                        </Button>
                    )}
                    {isSuccess && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onView}
                            title={t('admin.viewOutput', '查看输出')}
                            className="text-slate-500 hover:text-emerald-600"
                        >
                            <Eye className="w-4 h-4"/>
                        </Button>
                    )}
                </div>
            </TableCell>
        </>
    );
}

function StatCard({
                      label,
                      value,
                      icon: Icon,
                      color,
                      description,
                  }: {
    label: string;
    value: number;
    icon: typeof Activity;
    color: "sky" | "amber" | "emerald" | "red";
    description?: string;
}) {
    const iconColorClasses = {
        sky: "bg-sky-100 text-sky-600",
        amber: "bg-amber-100 text-amber-600",
        emerald: "bg-emerald-100 text-emerald-600",
        red: "bg-red-100 text-red-600",
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                    <h3 className="text-3xl font-extrabold tabular-nums mt-1 text-slate-800">{value}</h3>
                    {description && (
                        <p className="text-xs font-semibold text-slate-500 mt-2">{description}</p>
                    )}
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconColorClasses[color]}`}>
                    <Icon className="w-5 h-5"/>
                </div>
            </div>
        </div>
    );
}

export default function TranscodingStatus() {
    const {t} = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const urlMediaId = new URLSearchParams(location.search).get("media_id");

    const [filteredData, setFilteredData] = useState<EncodingTaskListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [retryingTaskId, setRetryingTaskId] = useState<number | string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [profileFilter, setProfileFilter] = useState<string>('all');

    const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);

    const [errorVisibleTasks, setErrorVisibleTasks] = useState<Set<string | number>>(new Set());

    const toggleErrorVisibility = (taskId: string | number) => {
        setErrorVisibleTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    const [stats, setStats] = useState<{
        active: number;
        queued: number;
        completed: number;
        failed: number;
    }>({active: 0, queued: 0, completed: 0, failed: 0});

    const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);

    const {lastEvent, sseStatus} = useTranscoding(urlMediaId ?? "");

    const fetchProfiles = useCallback(async () => {
        try {
            const response = await encodingApi.profiles.list();
            const profiles = response?.profiles;
            if (Array.isArray(profiles)) {
                const names = profiles
                    .map(p => p.name)
                    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
                setAvailableProfiles(Array.from(new Set(names)).sort());
            }
        } catch (err) {
            console.error('Failed to load profiles:', err);
        }
    }, []);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: Record<string, string | number> = {
                page: page,
                page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
            };

            if (statusFilter !== 'all') {
                const map: Record<StatusFilter, string | null> = {
                    all: null,
                    processing: 'processing',
                    queued: 'pending',
                    completed: 'success',
                    failed: 'failed',
                };
                const backendStatus = map[statusFilter];
                if (backendStatus) params.status = backendStatus;
            }

            if (urlMediaId) {
                params.media_id = urlMediaId;
            }

            if (profileFilter !== 'all') {
                params.profile = profileFilter;
            }

            if (searchQuery && searchQuery.trim()) {
                params.search = searchQuery.trim();
            }

            const response = await encodingApi.getTasks(params);
            setFilteredData(response);

            setStats({
                active: response?.processing_count || 0,
                queued: response?.pending_count || 0,
                completed: response?.success_count || 0,
                failed: response?.failed_count || 0,
            });
        } catch (err: any) {
            console.error("Failed to fetch tasks:", err);
            setError(err?.message || t('admin.loadTasksFailed', '加载转码任务失败'));
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, urlMediaId, profileFilter, searchQuery, t]);

    const fetchTasksRef = useRef(fetchTasks);
    useEffect(() => {
        fetchTasksRef.current = fetchTasks;
    }, [fetchTasks]);

    useEffect(() => {
        fetchTasks();
        fetchProfiles();
    }, [fetchTasks, fetchProfiles]);

    useEffect(() => {
        if (!lastEvent) return;
        if (urlMediaId && lastEvent.media_id !== urlMediaId) return;

        setFilteredData(prev => {
            if (!prev) return prev;
            const tasks = extractTasks(prev);
            if (tasks.length === 0) return prev;

            const updatedItems = tasks.map(task => {
                if (String(task.id) === String(lastEvent.task_id)) {
                    return {
                        ...task,
                        status: lastEvent.status || task.status,
                        progress: lastEvent.progress !== undefined ? lastEvent.progress : task.progress,
                    };
                }
                return task;
            });

            return {...prev, items: updatedItems, tasks: updatedItems};
        });

        if (lastEvent.status === 'success') {
            setTimeout(() => {
                fetchTasksRef.current();
            }, 1000);
        }
    }, [lastEvent, urlMediaId]);

    const filteredTasks = useMemo(() => {
        return extractTasks(filteredData);
    }, [filteredData]);

    const toggleSelectAll = () => {
        if (selectedRows.length === filteredTasks.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredTasks.map((t: EncodingTaskWithMeta) => t.id));
        }
    };

    const toggleSelectRow = (id: string | number) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchRetry = async () => {
        setFilteredData(prev => {
            if (!prev) return prev;
            const tasks = extractTasks(prev);
            const updatedItems = tasks.map(task => {
                if (selectedRows.includes(task.id)) {
                    return {...task, status: "pending", progress: 0, error_message: ""};
                }
                return task;
            });
            return {...prev, items: updatedItems, tasks: updatedItems};
        });

        for (const id of selectedRows) {
            setRetryingTaskId(id);
            try {
                await encodingApi.retryTask(String(id));
            } catch (err) {
                console.error("Retry task failed:", err);
            }
        }
        setRetryingTaskId(null);
        setSelectedRows([]);
        setTimeout(() => fetchTasksRef.current(), 500);
    };

    const handleRetryTask = async (taskId: string) => {
        setRetryingTaskId(taskId);
        try {
            await encodingApi.retryTask(taskId);
            setFilteredData(prev => {
                if (!prev) return prev;
                const tasks = extractTasks(prev);
                const updatedItems = tasks.map(task => {
                    if (String(task.id) === taskId) {
                        return {...task, status: "pending", progress: 0, error_message: ""};
                    }
                    return task;
                });
                return {...prev, items: updatedItems, tasks: updatedItems};
            });
        } catch (err) {
            console.error("Retry task failed:", err);
        } finally {
            setRetryingTaskId(null);
        }
        setTimeout(() => fetchTasksRef.current(), 500);
    };

    const handleViewMedia = (mediaId: string) => {
        navigate({to: '/admin/media/$id', params: {id: mediaId}});
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setProfileFilter('all');
        setPage(1);
    };

    const handleRefresh = () => {
        fetchTasks();
    };

    const totalPages = filteredData?.total_pages || Math.ceil((filteredData?.total || 0) / PAGINATION_CONFIG.DEFAULT_PAGE_SIZE);

    const pageActions = (
        <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sseStatus.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sseStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}/>
                {sseStatus.connected ? t('admin.liveConnection', '实时连接') : t('admin.disconnected', '已断开')}
            </span>
            <Button
                variant="outline"
                onClick={handleBatchRetry}
                disabled={selectedRows.length === 0}
            >
                <RotateCcw className="w-4 h-4"/>
                {selectedRows.length > 0 ? `${t('admin.retry', '重试')} (${selectedRows.length})` : t('admin.batchRetry', '批量重试')}
            </Button>
            <Button onClick={handleRefresh}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
                {t('admin.refresh', '刷新')}
            </Button>
        </div>
    );

    return (
        <AdminPageTemplate
            title={t('admin.transcodingStatus', '转码状态')}
            description={t('admin.transcodingStatusDesc', '实时监控活跃、排队和已完成的转码任务。')}
            actions={pageActions}
        >
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600"/>
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1"/>
                        {t('admin.retry', '重试')}
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    label={t('admin.activeJobs', '活跃任务')}
                    value={stats.active}
                    icon={Activity}
                    color="sky"
                    description={sseStatus.connected ? t('admin.realTime', '实时') : t('admin.latestSnapshot', '最新快照')}
                />
                <StatCard
                    label={t('admin.inQueue', '排队中')}
                    value={stats.queued}
                    icon={Clock}
                    color="amber"
                />
                <StatCard
                    label={t('admin.completed', '已完成')}
                    value={stats.completed}
                    icon={CheckCircle2}
                    color="emerald"
                />
                <StatCard
                    label={t('admin.failed', '失败')}
                    value={stats.failed}
                    icon={XCircle}
                    color="red"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[240px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setPage(1);
                            }
                        }}
                        placeholder={t('admin.searchJobs', '搜索任务（媒体ID、配置...）')}
                        className="pl-9"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(val) => {
                        setStatusFilter(val as StatusFilter);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder={t('admin.allStatus', '全部状态')}/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('admin.allStatus', '全部状态')}</SelectItem>
                        <SelectItem value="processing">{t('admin.processing', '转码中')}</SelectItem>
                        <SelectItem value="queued">{t('admin.queued', '排队中')}</SelectItem>
                        <SelectItem value="completed">{t('admin.success', '成功')}</SelectItem>
                        <SelectItem value="failed">{t('admin.failed', '失败')}</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={profileFilter}
                    onValueChange={(val) => {
                        setProfileFilter(val);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder={t('admin.allProfiles', '全部配置')}/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('admin.allProfiles', '全部配置')}</SelectItem>
                        {availableProfiles.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    <RotateCcw className="w-3.5 h-3.5"/>
                    {t('admin.reset', '重置')}
                </Button>
            </div>

            <div className="border border-border rounded-xl bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <Checkbox
                                    checked={filteredTasks.length > 0 && selectedRows.length === filteredTasks.length}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label={t('admin.selectAll', '全选')}
                                />
                            </TableHead>
                            <TableHead>
                                {t('admin.jobIdFilename', '任务ID / 文件名')}
                            </TableHead>
                            <TableHead>
                                {t('admin.status', '状态')}
                            </TableHead>
                            <TableHead>
                                {t('admin.progress', '进度')}
                            </TableHead>
                            <TableHead>
                                {t('admin.format', '格式')}
                            </TableHead>
                            <TableHead className="text-right">
                                {t('admin.actions', '操作')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="px-6 py-16 text-center">
                                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto"/>
                                </TableCell>
                            </TableRow>
                        ) : !filteredTasks.length ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Film className="w-12 h-12 text-slate-300"/>
                                        <h3 className="text-lg font-medium text-slate-700">{t('admin.noTranscodingJobs', '未找到转码任务')}</h3>
                                        <p className="text-sm text-slate-500 max-w-md">
                                            {searchQuery || statusFilter !== 'all' || profileFilter !== 'all'
                                                ? t('admin.noTasksMatchFilters', '没有任务匹配当前筛选条件，请尝试调整筛选条件。')
                                                : t('admin.uploadVideoToStart', '上传视频文件以开始生成转码任务。')}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTasks.map((task: EncodingTaskWithMeta) => {
                                const isFailed = task.status === "failed" || task.status === "skipped";
                                const showError = errorVisibleTasks.has(task.id) && isFailed && !!task.error_message;
                                return (
                                    <Fragment key={task.id}>
                                        <TableRow>
                                            <TaskRowCells
                                                task={task}
                                                onRetry={() => handleRetryTask(String(task.id))}
                                                isRetrying={retryingTaskId === task.id}
                                                isSelected={selectedRows.includes(task.id)}
                                                onToggleSelect={() => toggleSelectRow(task.id)}
                                                showError={showError}
                                                onToggleError={() => toggleErrorVisibility(task.id)}
                                                onView={() => handleViewMedia(task.media_id)}
                                            />
                                        </TableRow>
                                        {showError && (
                                            <TableRow className="bg-red-50/30 border-b border-red-100">
                                                <TableCell colSpan={6} className="px-6 py-4">
                                                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-red-400 overflow-x-auto max-h-48 overflow-y-auto">
                                                        <p className="text-slate-400 font-bold mb-2 uppercase tracking-wider text-[10px]">
                                                            {t('admin.viewStacktrace', '错误堆栈')}:
                                                        </p>
                                                        <pre className="whitespace-pre-wrap break-all">{task.error_message}</pre>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {filteredData && (filteredData.total || filteredTasks.length > 0) && (
                    <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            {t('admin.showingEntries', `显示 ${((page - 1) * PAGINATION_CONFIG.DEFAULT_PAGE_SIZE) + 1}-${Math.min(page * PAGINATION_CONFIG.DEFAULT_PAGE_SIZE, filteredData.total || filteredTasks.length)} 条，共 ${filteredData.total || filteredTasks.length} 条记录`)}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </Button>
                            <span className="h-8 px-3 flex items-center justify-center text-sm font-medium text-slate-700">
                                {page} / {totalPages || 1}
                            </span>
                            <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= totalPages}
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AdminPageTemplate>
    );
}
