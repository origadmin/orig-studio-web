// Admin Tags API Client
import { api } from "../request";

export interface Tag {
  id: string;
  title: string;
  slug: string;
  description?: string;
  color?: string;
  /**
   * BUG-180: the backend field is `media_count` (int64 → protojson string).
   * `count` was never populated, so the admin table showed 0 for every tag and
   * the "unused tags" stat counted the whole table.
   */
  media_count?: number | string;
  /** @deprecated legacy alias, never returned by the API — use media_count */
  count?: number;
  status: string;
  create_time: string;
  update_time: string;
}

/** Normalised video count for an admin tag row. */
export const tagMediaCount = (tag: Pick<Tag, "media_count" | "count">): number => {
  const raw = tag.media_count ?? tag.count ?? 0;
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : raw;
  return Number.isFinite(n) ? n : 0;
};

export interface TagListResponse {
  items: Tag[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TagQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateTagRequest {
  title: string;
  slug?: string; // Optional: auto-generated from title when empty
  description?: string;
  color?: string;
  status?: string; // Optional: defaults to active
}

export interface UpdateTagRequest {
  title?: string;
  slug?: string;
  description?: string;
  color?: string;
  status?: string;
}

export interface BulkTagOperationRequest {
  ids: string[];
  action: 'delete' | 'activate' | 'deactivate';
}

export interface BulkOperationResponse {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface ImportResponse {
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export const adminTagApi = {
  // List tags with pagination and filters
  list: async (params?: TagQueryParams): Promise<TagListResponse> => {
    const response = await api.get<TagListResponse>('/admin/tags', params as Record<string, unknown> | undefined);
    return response;
  },

  // Get single tag
  get: async (id: string): Promise<Tag> => {
    const response = await api.get<Tag>(`/admin/tags/${id}`);
    return response;
  },

  // Create tag
  // BUG-180 (creation path): the admin feature's own POST /admin/tags write
  // endpoint is unreachable through the gateway — the gateway's gRPC-gateway
  // mux consumes the request body before the admin handler runs, so every
  // admin tag create arrives with an empty title and 500s
  // ("validator failed for field Tag.title"). The public TagService
  // (POST /api/v1/tags) is the only tag write path that survives the gateway
  // and now carries description/color, so we route creation there.
  create: async (data: CreateTagRequest): Promise<Tag> => {
    const {status: _status, ...rest} = data;
    const response = await api.post<{ tag: Tag }>('/tags', {tag: rest});
    const envelope = response as { tag?: Tag };
    return envelope.tag ?? (response as unknown as Tag);
  },

  // Update tag
  update: async (id: string, data: UpdateTagRequest): Promise<Tag> => {
    const response = await api.put<Tag>(`/admin/tags/${id}`, data);
    return response;
  },

  // Delete tag
  delete: async (id: string): Promise<void> => {
    await api.del(`/admin/tags/${id}`);
  },

  // Bulk operations
  bulk: async (data: BulkTagOperationRequest): Promise<BulkOperationResponse> => {
    const response = await api.post<BulkOperationResponse>('/admin/tags/bulk', data);
    return response;
  },

  // Export tags
  export: async (params?: { status?: string }): Promise<Blob> => {
    // TODO: Implement export when backend supports it
    throw new Error('Export functionality is not yet implemented on the server');
  },

  // Import tags
  import: async (file: File): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportResponse>('/admin/tags/import', formData);
    return response;
  },
};
