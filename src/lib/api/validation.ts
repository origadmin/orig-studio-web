import { z } from 'zod';
import type { ZodType } from 'zod';

const isDev = process.env.NODE_ENV === 'development';

export function safeValidate<T>(schema: ZodType<T>, data: unknown, label: string): T {
  if (isDev) {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.error(`[${label}] Validation errors:`, result.error.flatten());
    }
    return result.success ? result.data : (data as T);
  }
  return data as T;
}