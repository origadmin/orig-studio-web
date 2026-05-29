import {api} from "../request";

export interface DrmPolicy {
    id: string;
    name: string;
    type: string;
    hls_key_url?: string;
    widevine_pssh?: string;
    fairplay_cert_url?: string;
    is_default: boolean;
    description?: string;
    create_time?: string;
    update_time?: string;
}

export interface DrmKey {
    id: string;
    policy_id: string;
    content_id: string;
    key_id: string;
    iv?: string;
    created_at?: string;
    expires_at?: string;
}

export interface DrmLicense {
    id: string;
    key_id: string;
    user_id?: string;
    device_id?: string;
    status: string;
    issued_at?: string;
    expires_at?: string;
}

export interface CreateDrmPolicyRequest {
    name: string;
    type: string;
    hls_key_url?: string;
    widevine_pssh?: string;
    fairplay_cert_url?: string;
    is_default?: boolean;
    description?: string;
}

export interface UpdateDrmPolicyRequest {
    name?: string;
    type?: string;
    hls_key_url?: string;
    widevine_pssh?: string;
    fairplay_cert_url?: string;
    is_default?: boolean;
    description?: string;
}

export interface GenerateDrmKeyRequest {
    content_id: string;
    expires_at?: string;
}

export interface DrmLicenseListResponse {
    items: DrmLicense[];
    total: number;
    page: number;
    page_size: number;
}

export const adminDrmApi = {
    listPolicies: () =>
        api.get<DrmPolicy[]>('/admin/drm-policies'),

    createPolicy: (data: CreateDrmPolicyRequest) =>
        api.post<DrmPolicy>('/admin/drm-policies', data),

    updatePolicy: (id: string, data: UpdateDrmPolicyRequest) =>
        api.put<DrmPolicy>(`/admin/drm-policies/${id}`, data),

    deletePolicy: (id: string) =>
        api.del<void>(`/admin/drm-policies/${id}`),

    listKeys: (policyId: string) =>
        api.get<DrmKey[]>(`/admin/drm-policies/${policyId}/keys`),

    generateKey: (policyId: string, data: GenerateDrmKeyRequest) =>
        api.post<DrmKey>(`/admin/drm-policies/${policyId}/keys`, data),

    deleteKey: (id: string) =>
        api.del<void>(`/admin/drm-keys/${id}`),

    listLicenses: (page?: number, pageSize?: number) =>
        api.get<DrmLicenseListResponse>(`/admin/drm-licenses?page=${page || 1}&page_size=${pageSize || 20}`),
};
