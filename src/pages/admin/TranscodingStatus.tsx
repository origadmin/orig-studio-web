/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 *
 * Transcoding Status Page — Aligned with prototype design
 * Real-time monitoring of active, queued, and completed transcoding jobs.
 */

import {useEffect, useState, useCallback, useMemo, useRef, Fragment} from "react";
import {useLocation, useNavigate, Link} from "@tanstack/react-router";
import {useTranslation} from "react-i18next";
import {encodingApi, type EncodeProfile, type EncodingTask, type EncodingTaskListResponse} from "../../lib/api/media";
import {useAuth} from "../../hooks/useAuth";
import {useTranscoding} from "../../hooks/useTranscoding";
import {Badge} from "../../components/ui/badge";
import {Button} from "../../components/ui/button";
import {Progress} from "../../components/ui/progress";
import {Skeleton} from "../../components/ui/skeleton";
import {
    Table, TableBody, TableCell, TableRow,
    TableHead, TableHeader
} from "../../components/ui/table";
import {Input} from "../../components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../components/ui/select";
import {Checkbox} from "../../components/ui/checkbox";
import {AdminPageTemplate} from "../../components/AdminPageTemplate";
import {
    Activity, RefreshCw, Plus, Search, Clock, CheckCircle2, XCircle,
    AlertCircle, Film, Trash2, RotateCcw, Eye
} from "lucide-react";
import {TablePagination} from '@/components/common/TablePagination';
import {PAGINATION_CONFIG} from '@/config/pagination';

// ─── Types ─────────────────────────────────────────────

type EncodingTaskWithMeta = EncodingTask & { profile_name?: string; media_title?: string; thumbnail?: string };

type StatusFilter = "all" | "processing" | "queued" | "completed" | "failed";

// ─── Status Badge Component ─────────────────────────────

function StatusBadge({status}: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        processing: {
            label: "Processing",
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700"
        },
        queued: {
            label: "Queued",
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
        },
        completed: {
            label: "Completed",
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"
        },
        pending: {
            label: "Queued",
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
        },
        success: {
            label: "Completed",
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"
        },
        skipped: {
            label: "Skipped",
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"
        },
        partial: {
            label: "Partial",
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"
        },
        failed: {
            label: "Failed",
            className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700"
        },
    };

    const cfg = config[status] || {label: status, className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"};

    return <span className={cfg.className}>{cfg.label}</span>;
}

// ─── Task Row Component ─────────────────────────────────

function TaskRowCells({
                           task,
                           onRetry,
                           isRetrying,
                           isSelected,
                           onToggleSelect,
                           showError,
                           onToggleError,
                       }: {
    task: EncodingTaskWithMeta;
    onRetry: () => void;
    isRetrying: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    showError: boolean;
    onToggleError: () => void;
}) {
    const isProcessing = task.status === "processing";
    const isFailed = task.status === "failed";
    const isSuccess = task.status === "success" || task.status === "completed";
    const canRetry = isFailed || task.status === "skipped";

    const progressValue = isProcessing ? (task.progress || 0) :
        isSuccess ? 100 : 0;

    return (
        <>
            <TableCell className="w-10">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggleSelect}
                    aria-label={`Select task ${task.id}`}
                />
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">
                        {typeof task.id === 'number' ? `TRC-${String(task.id).padStart(5, '0')}` : task.id}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                        {task.media_title || task.media_id || 'N/A'}
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
                    <span className={`font-mono text-xs ${isProcessing ? 'text-sky-600' : isSuccess ? 'text-emerald-600' : isFailed ? 'text-red-600' : 'text-slate-500'}`}>
                        {progressValue}%
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <span className="text-sm text-slate-700">
                    {task.profile_name || task.profile_id || '-'}
                </span>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    {canRetry && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleError}
                                title="Show Details"
                            >
                                <AlertCircle className="w-4 h-4"/>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onRetry}
                                disabled={isRetrying}
                                title="Retry"
                            >
                                {isRetrying ? (
                                    <RefreshCw className="w-4 h-4 animate-spin"/>
                                ) : (
                                    <RotateCcw className="w-4 h-4"/>
                                )}
                            </Button>
                        </>
                    )}
                    {isSuccess && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="View Output"
                        >
                            <Eye className="w-4 h-4"/>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4"/>
                    </Button>
                </div>
            </TableCell>
        </>
    );
}

// ─── Stat Card Component ────────────────────────────────

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

// ─── Main Page ─────────────────────────────────────────

export default function TranscodingStatus() {
    const {t} = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const urlMediaId = new URLSearchParams(location.search).get("media_id");
    const {isAuthenticated} = useAuth();

    // Data state
    const [filteredData, setFilteredData] = useState<EncodingTaskListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [retryingTaskId, setRetryingTaskId] = useState<number | string | null>(null);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [profileFilter, setProfileFilter] = useState<string>('all');

    // Selection state
    const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);

    // Error visibility per task
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

    // Stats
    const [stats, setStats] = useState<{
        active: number;
        queued: number;
        completed: number;
        failed: number;
    }>({active: 0, queued: 0, completed: 0, failed: 0});

    // Available profiles for filtering
    const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);

    const {lastEvent, sseStatus} = useTranscoding(urlMediaId ?? "");

    // Fetch encoding profiles for filter dropdown
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

    // Fetch tasks
    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, string | number> = {
                page: page,
                page_size: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
            };

            if (statusFilter !== 'all') {
                // Map UI statuses to backend statuses
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

            // Use backend global counts instead of current-page filtering
            setStats({
                active: response?.processing_count || 0,
                queued: response?.pending_count || 0,
                completed: response?.success_count || 0,
                failed: response?.failed_count || 0,
            });
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, urlMediaId, profileFilter, searchQuery]);

    const fetchTasksRef = useRef(fetchTasks);
    useEffect(() => {
        fetchTasksRef.current = fetchTasks;
    }, [fetchTasks]);

    // Initial load
    useEffect(() => {
        fetchTasks();
        fetchProfiles();
    }, [fetchTasks, fetchProfiles]);

    // SSE event handling - update task status
    useEffect(() => {
        if (!lastEvent) return;
        if (urlMediaId && lastEvent.media_id !== urlMediaId) return;

        setFilteredData(prev => {
            if (!prev || !prev.items) return prev;

            const updatedItems = prev.items.map(task => {
                if (String(task.id) === String(lastEvent.task_id)) {
                    return {
                        ...task,
                        status: lastEvent.status,
                        progress: lastEvent.progress !== undefined ? lastEvent.progress : task.progress,
                    };
                }
                return task;
            });

            return {...prev, items: updatedItems};
        });

        // When task succeeds, refetch to get updated data
        if (lastEvent.status === 'success') {
            setTimeout(() => {
                fetchTasksRef.current();
            }, 1000);
        }
    }, [lastEvent, urlMediaId]);

    // Filtered task list
    const filteredTasks = useMemo(() => {
        return filteredData?.items || [];
    }, [filteredData]);

    // Selection handlers
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

    // Retry handlers
    const handleBatchRetry = async () => {
        setFilteredData(prev => {
            if (!prev) return prev;
            const updatedItems = prev.items.map(task => {
                if (selectedRows.includes(task.id)) {
                    return {...task, status: "pending", progress: 0};
                }
                return task;
            });
            return {...prev, items: updatedItems};
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
    };

    const handleRetryTask = async (taskId: string) => {
        setRetryingTaskId(taskId);
        try {
            await encodingApi.retryTask(taskId);
        } catch (err) {
            console.error("Retry task failed:", err);
        } finally {
            setRetryingTaskId(null);
        }
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

    // Loading skeleton
    if (loading && !filteredData) {
        return (
            <AdminPageTemplate
                title={t('admin.transcodingStatus', 'Transcoding Status')}
                description="Loading transcoding jobs..."
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-24 rounded-xl"/>
                        ))}
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200">
                        <Skeleton className="h-64 rounded-xl"/>
                    </div>
                </div>
            </AdminPageTemplate>
        );
    }

    // Page actions
    const pageActions = (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                onClick={handleBatchRetry}
                disabled={selectedRows.length === 0}
            >
                <RotateCcw className="w-4 h-4"/>
                {selectedRows.length > 0 ? `Retry (${selectedRows.length})` : 'Batch Retry'}
            </Button>
            <Button onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4"/>
                Refresh
            </Button>
        </div>
    );

    return (
        <AdminPageTemplate
            title={t('admin.transcodingStatus', 'Transcoding Status')}
            description="Real-time monitoring of active, queued, and completed transcoding jobs."
            actions={pageActions}
        >
            {/* Live Status Badge - placed after title */}
            <div className="flex items-center gap-3 mb-8">
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${sseStatus.connected ? 'animate-pulse' : ''}`}/>
                    {sseStatus.connected ? 'Live Connection' : 'Disconnected'}
                </Badge>
            </div>

            {/* ─── Statistics Cards ──────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Active Jobs"
                    value={stats.active}
                    icon={Activity}
                    color="sky"
                    description={sseStatus.connected ? 'Real-time' : 'Latest snapshot'}
                />
                <StatCard
                    label="In Queue"
                    value={stats.queued}
                    icon={Clock}
                    color="amber"
                />
                <StatCard
                    label="Completed"
                    value={stats.completed}
                    icon={CheckCircle2}
                    color="emerald"
                />
                <StatCard
                    label="Failed"
                    value={stats.failed}
                    icon={XCircle}
                    color="red"
                />
            </div>

            {/* ─── Filter Toolbar ────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setPage(1);
                                fetchTasks();
                            }
                        }}
                        placeholder="Search jobs by media ID, profile..."
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
                        <SelectValue placeholder="All Status"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="queued">Queued</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
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
                        <SelectValue placeholder="All Profiles"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Profiles</SelectItem>
                        {availableProfiles.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    <RotateCcw className="w-3.5 h-3.5"/>
                    Reset
                </Button>
            </div>

            {/* ─── Table Container ───────────────────────────── */}
            <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <Checkbox
                                    checked={filteredTasks.length > 0 && selectedRows.length === filteredTasks.length}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>
                                Job ID / Filename
                            </TableHead>
                            <TableHead>
                                Status
                            </TableHead>
                            <TableHead>
                                Progress
                            </TableHead>
                            <TableHead>
                                Format
                            </TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!filteredTasks.length ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Film className="w-12 h-12 text-slate-300"/>
                                        <h3 className="text-lg font-medium text-slate-700">No transcoding jobs found</h3>
                                        <p className="text-sm text-slate-500 max-w-md">
                                            {searchQuery || statusFilter !== 'all' || profileFilter !== 'all'
                                                ? 'No tasks match your current filters. Try adjusting them.'
                                                : 'Upload a video file to start generating encoding tasks.'}
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
                                            />
                                        </TableRow>
                                        {showError && (
                                            <TableRow className="bg-red-50/30 border-b border-red-100">
                                                <TableCell colSpan={6} className="px-6 py-4">
                                                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-red-400 overflow-x-auto max-h-48 overflow-y-auto">
                                                        <p className="text-slate-400 font-bold mb-2 uppercase tracking-wider text-[10px]">
                                                            Error Log:
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

                {/* ─── Pagination ─────────────────────────── */}
                {filteredData && (
                    <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            Showing {filteredTasks.length} of {filteredData.total || filteredTasks.length} entries
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <span className="sr-only">Previous</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                                </svg>
                            </Button>
                            <span className="h-8 px-3 flex items-center justify-center text-sm font-medium text-slate-700">
                                {page}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setPage(p => p + 1)}
                                disabled={!filteredData || (filteredData.items?.length || 0) < (filteredData.page_size || PAGINATION_CONFIG.DEFAULT_PAGE_SIZE)}
                            >
                                <span className="sr-only">Next</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                </svg>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AdminPageTemplate>
    );
}
