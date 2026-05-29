import {api} from "../request";

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    duration_days: number;
    features: Record<string, unknown>;
    is_active: boolean;
    sort_order: number;
}

export interface Order {
    id: string;
    order_no: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    paid_at: string;
    user_id: string;
    plan_id: string;
    create_time: string;
}

export interface Wallet {
    id: string;
    balance: number;
    frozen: number;
    currency: string;
    user_id: string;
}

export interface UserSubscription {
    id: string;
    status: string;
    started_at: string;
    expires_at: string;
    auto_renew: boolean;
    cancelled_at: string;
    user_id: string;
    plan_id: string;
    create_time: string;
    update_time: string;
}

export interface OrderListResponse {
    items: Order[];
    total: number;
    page: number;
    page_size: number;
}

export interface WalletListResponse {
    items: Wallet[];
    total: number;
    page: number;
    page_size: number;
}

export interface CreateSubscriptionPlanRequest {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    duration_days: number;
    features?: Record<string, unknown>;
    is_active?: boolean;
    sort_order?: number;
}

export interface UpdateSubscriptionPlanRequest {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    duration_days?: number;
    features?: Record<string, unknown>;
    is_active?: boolean;
    sort_order?: number;
}

export const adminPaymentApi = {
    listSubscriptionPlans: () =>
        api.get<SubscriptionPlan[]>('/admin/subscription-plans'),

    createSubscriptionPlan: (data: CreateSubscriptionPlanRequest) =>
        api.post<SubscriptionPlan>('/admin/subscription-plans', data),

    updateSubscriptionPlan: (id: string, data: UpdateSubscriptionPlanRequest) =>
        api.put<SubscriptionPlan>(`/admin/subscription-plans/${id}`, data),

    deleteSubscriptionPlan: (id: string) =>
        api.del<void>(`/admin/subscription-plans/${id}`),

    listOrders: (page?: number, pageSize?: number) =>
        api.get<OrderListResponse>(`/admin/orders?page=${page || 1}&page_size=${pageSize || 20}`),

    getOrder: (id: string) =>
        api.get<Order>(`/admin/orders/${id}`),

    listWallets: (page?: number, pageSize?: number) =>
        api.get<WalletListResponse>(`/admin/wallets?page=${page || 1}&page_size=${pageSize || 20}`),
};

export const paymentApi = {
    listSubscriptionPlans: () =>
        api.get<SubscriptionPlan[]>('/subscription-plans'),
};
