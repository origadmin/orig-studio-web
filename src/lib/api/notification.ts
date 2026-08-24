import {z} from 'zod';
import {api} from "../request";


export const notificationSchema = z.object({
    id: z.number(),
    user_id: z.string(),
    action: z.string(),
    title: z.string(),
    body: z.string(),
    read: z.boolean(),
    create_time: z.string(),
    update_time: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const notificationListResponseSchema = z.object({
    items: z.array(notificationSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    unread_count: z.number(),
});

export interface NotificationListResponse {
    items: Notification[];
    total: number;
    page: number;
    page_size: number;
    unread_count: number;
}

function normalizeNotificationList(raw: unknown): unknown {
    if (raw === null || raw === undefined) return {items: [], total: 0, page: 1, page_size: 0, unread_count: 0};

    if (Array.isArray(raw)) {
        return {items: raw, total: raw.length, page: 1, page_size: raw.length, unread_count: 0};
    }

    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const items = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.notifications) ? obj.notifications : [];
        return {
            items,
            total: obj.total ?? items.length,
            page: obj.page ?? 1,
            page_size: obj.page_size ?? items.length,
            unread_count: obj.unread_count ?? 0,
        };
    }

    return {items: [], total: 0, page: 1, page_size: 0, unread_count: 0};
}

export const notificationApi = {
    getAll: async (params?: { page?: number; page_size?: number; read?: boolean }) => {
        const response = await api.get<unknown>('/notifications', params);
        const normalized = normalizeNotificationList(response);
        return normalized as any;
    },

    getUnreadCount: async (): Promise<number> => {
        const response = await api.get<unknown>('/notifications/unread-count');
        if (response && typeof response === 'object') {
            const obj = response as Record<string, unknown>;
            if (typeof obj.unread_count === 'number') return obj.unread_count;
            if (typeof obj.count === 'number') return obj.count;
        }
        return 0;
    },

    markAsRead: (id: number) =>
        api.post<Notification>(`/notifications/${id}/read`),

    markAllAsRead: () =>
        api.post<{ success: boolean }>('/notifications/read-all'),

    delete: (id: number) =>
        api.del<void>(`/notifications/${id}`),

    deleteAll: () =>
        api.del<{ deleted_count: number }>('/notifications'),

    deleteRead: () =>
        api.del<{ deleted_count: number }>('/notifications/read'),

    // Admin APIs
    adminGetAll: async (params?: { page?: number; page_size?: number }) => {
        const response = await api.get<unknown>('/admin/notifications', params);
        const normalized = normalizeNotificationList(response);
        return normalized as any;
    },

    adminSend: (data: { action: string; title: string; body: string; user_ids?: string[]; role_list?: string[]; group_id_list?: string[]; method?: string; notify?: boolean }) =>
        api.post<{ items: Notification[]; sent_count: number }>('/admin/notifications', data),

    adminBroadcast: (data: { action: string; title: string; body: string; role_list?: string[]; group_id_list?: string[]; method?: string; notify?: boolean }) =>
        api.post<{ items: Notification[]; sent_count: number }>('/admin/notifications/broadcast', data),

    adminSendTest: () =>
        api.post<Notification>('/admin/notifications/test'),

    adminDelete: (id: number) =>
        api.del<void>(`/admin/notifications/${id}`),

    adminGetGroups: async (params?: { page?: number; page_size?: number }) => {
        const response = await api.get<unknown>('/admin/permission-groups', params);
        if (response && typeof response === 'object') {
            const obj = response as Record<string, unknown>;
            return {
                items: Array.isArray(obj.items) ? obj.items : [],
                total: typeof obj.total === 'number' ? obj.total : 0,
            };
        }
        return {items: [], total: 0};
    },

    // BUG-265: 受控通知类型清单（管理端发送下拉 + 类型开关设置页）。
    adminGetTypes: async () => {
        const response = await api.get<unknown>('/admin/notifications/types');
        if (response && typeof response === 'object') {
            const obj = response as Record<string, unknown>;
            const items = Array.isArray(obj.items) ? obj.items : [];
            return items as Array<{action: string; label_key: string; category: string; category_label_key: string; status: string; default_enabled: boolean}>;
        }
        return [];
    },
};