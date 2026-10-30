export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://be-social-media-api-production.up.railway.app"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function api<T>(
  path: string,
  options: {
    token?: string | null;
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const form = options.body instanceof FormData;
  if (options.body && !form) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method: options.method || "GET",
      headers,
      body: options.body
        ? form
          ? (options.body as FormData)
          : JSON.stringify(options.body)
        : undefined,
      signal: options.signal || AbortSignal.timeout(30000),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      "Unable to connect. Check your connection and try again.",
      0,
    );
  }
  const result = (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: T;
  } | null;
  if (!response.ok || result?.success === false) {
    if (
      response.status === 401 &&
      options.token &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("sociality:session-expired"));
    throw new ApiError(
      result?.message ||
        (response.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : `Request failed (${response.status}). Please try again.`),
      response.status,
    );
  }
  // The private feed and own-posts endpoints return `items`; all other post
  // collections return `posts`. Normalize at the boundary for one UI contract.
  const data = result?.data;
  if (
    data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray(data.items) &&
    /^\/api\/(feed|me\/posts)(\?|$)/.test(path)
  )
    return { ...data, posts: data.items } as T;
  return data as T;
}
export const userPath = (username: string) =>
  `/api/users/${encodeURIComponent(username)}`;
export const withPage = (path: string, page: number, limit = 12) =>
  `${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=${limit}`;
export function safeReturnTo(value: string | null): string {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\u0000-\u0020\\]/.test(value) &&
    !/^\/(login|register)([/?#]|$)/.test(value)
    ? value
    : "/feed";
}
export function imageError(file: File | undefined): string | undefined {
  if (!file) return "Choose a photo to share.";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Choose a JPG, PNG, or WebP image.";
  if (file.size > 5 * 1024 * 1024) return "Your photo must be 5 MB or smaller.";
  if (!file.size) return "This image is empty.";
}
