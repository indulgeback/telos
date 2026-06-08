import type { Context } from 'hono'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export function ok<T>(c: Context, data: T, status = 200) {
  return c.json<ApiResponse<T>>(
    {
      code: 0,
      message: 'success',
      data,
    },
    status as any
  )
}

export function created<T>(c: Context, data: T) {
  return ok(c, data, 201)
}

export function fail(c: Context, status: number, message: string) {
  return c.json<ApiResponse>(
    {
      code: status,
      message,
    },
    status as any
  )
}

export async function parseJson<T extends Record<string, unknown>>(
  c: Context
): Promise<T> {
  try {
    return (await c.req.json()) as T
  } catch {
    return {} as T
  }
}
