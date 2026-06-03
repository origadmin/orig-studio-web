import {api} from "../request";

export interface PromotionChannel {
    id: string;
    name: string;
    platform: string;
    config: Record<string, string>;
    status: string;
    is_active: boolean;
    total_published: number;
    last_published_at: string;
    create_time: string;
    update_time: string;
}

export interface PromotionTemplate {
    id: string;
    name: string;
    platform: string;
    content_template: string;
    variables: string[];
    is_active: boolean;
    usage_count: number;
    create_time: string;
    update_time: string;
}

export interface PromotionTask {
    id: string;
    title: string;
    channel_id: string;
    template_id: string;
    media_id: string;
    status: string;
    scheduled_at: string;
    published_at: string;
    result: Record<string, unknown>;
    error_message: string;
    create_time: string;
    update_time: string;
}

export interface PromotionLog {
    id: string;
    task_id: string;
    channel_id: string;
    action: string;
    status: string;
    message: string;
    create_time: string;
}

export interface PromotionChannelListResponse {
    items: PromotionChannel[];
    total: number;
    page: number;
    page_size: number;
}

export interface PromotionTaskListResponse {
    items: PromotionTask[];
    total: number;
    page: number;
    page_size: number;
}

export interface PromotionLogListResponse {
    items: PromotionLog[];
    total: number;
    page: number;
    page_size: number;
}

export interface CreatePromotionChannelRequest {
    name: string;
    platform: string;
    config: Record<string, string>;
    is_active?: boolean;
}

export interface UpdatePromotionChannelRequest {
    name?: string;
    config?: Record<string, string>;
    is_active?: boolean;
}

export interface CreatePromotionTemplateRequest {
    name: string;
    platform: string;
    content_template: string;
    variables?: string[];
    is_active?: boolean;
}

export interface UpdatePromotionTemplateRequest {
    name?: string;
    content_template?: string;
    variables?: string[];
    is_active?: boolean;
}

export interface CreatePromotionTaskRequest {
    title: string;
    channel_id: string;
    template_id: string;
    media_id: string;
    scheduled_at?: string;
}

export const adminPromotionApi = {
    listChannels: (page?: number, pageSize?: number) =>
        api.get<PromotionChannelListResponse>(`/admin/promotion-channels?page=${page || 1}&page_size=${pageSize || 20}`),

    createChannel: (data: CreatePromotionChannelRequest) =>
        api.post<PromotionChannel>('/admin/promotion-channels', data),

    updateChannel: (id: string, data: UpdatePromotionChannelRequest) =>
        api.put<PromotionChannel>(`/admin/promotion-channels/${id}`, data),

    deleteChannel: (id: string) =>
        api.del<void>(`/admin/promotion-channels/${id}`),

    listTemplates: () =>
        api.get<PromotionTemplate[]>('/admin/promotion-templates'),

    createTemplate: (data: CreatePromotionTemplateRequest) =>
        api.post<PromotionTemplate>('/admin/promotion-templates', data),

    updateTemplate: (id: string, data: UpdatePromotionTemplateRequest) =>
        api.put<PromotionTemplate>(`/admin/promotion-templates/${id}`, data),

    deleteTemplate: (id: string) =>
        api.del<void>(`/admin/promotion-templates/${id}`),

    listTasks: (page?: number, pageSize?: number) =>
        api.get<PromotionTaskListResponse>(`/admin/promotion-tasks?page=${page || 1}&page_size=${pageSize || 20}`),

    createTask: (data: CreatePromotionTaskRequest) =>
        api.post<PromotionTask>('/admin/promotion-tasks', data),

    deleteTask: (id: string) =>
        api.del<void>(`/admin/promotion-tasks/${id}`),

    listLogs: (taskId?: string, page?: number, pageSize?: number) =>
        api.get<PromotionLogListResponse>(`/admin/promotion-logs?task_id=${taskId || ''}&page=${page || 1}&page_size=${pageSize || 20}`),
};
