import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  imageError,
  safeReturnTo,
  userPath,
  withPage,
} from "../lib/sociality/api";
afterEach(() => vi.unstubAllGlobals());
describe("API contract", () => {
  it.each(["/api/feed?page=1", "/api/me/posts?page=2"])(
    "normalizes the private items collection for %s",
    async (path) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              data: { items: [{ id: 3 }], pagination: { page: 1 } },
            }),
          ),
        ),
      );
      expect(await api(path)).toMatchObject({
        posts: [{ id: 3 }],
        pagination: { page: 1 },
      });
    },
  );
  it("attaches bearer token, serializes JSON and unwraps data", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { id: 7 } })),
      );
    vi.stubGlobal("fetch", fetch);
    expect(
      await api("/api/posts/7/like", {
        token: "test-token",
        method: "POST",
        body: { text: "Hello" },
      }),
    ).toEqual({ id: 7 });
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: '{"text":"Hello"}',
    });
  });
  it("lets the browser set multipart boundaries", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: {} })),
      );
    vi.stubGlobal("fetch", fetch);
    const body = new FormData();
    body.append("caption", "Test");
    await api("/api/posts", { method: "POST", body });
    expect(fetch.mock.calls[0][1].body).toBe(body);
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Content-Type");
  });
  it("preserves actionable validation messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            message: "Invalid email or password",
          }),
          { status: 401 },
        ),
      ),
    );
    await expect(
      api("/api/auth/login", { method: "POST" }),
    ).rejects.toMatchObject({
      status: 401,
      message: "Invalid email or password",
    });
  });
  it("handles a non-JSON rate limit response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Rate limited", { status: 429 })),
    );
    await expect(api("/api/posts")).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining("wait"),
    });
  });
  it("reports network failures and preserves query cancellation", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetch);
    await expect(api("/api/posts")).rejects.toMatchObject({ status: 0 });
    fetch.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    await expect(api("/api/posts")).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
describe("navigation and upload boundaries", () => {
  it.each([
    null,
    "https://bad.example",
    "//bad.example",
    "/\\bad.example",
    "/\nbad.example",
    "/login?returnTo=/me",
    "/register#form",
    "/login/",
  ])("rejects unsafe return target %s", (value) =>
    expect(safeReturnTo(value)).toBe("/feed"),
  );
  it("retains local detail routes and escapes usernames", () => {
    expect(safeReturnTo("/posts/42?comments=1")).toBe("/posts/42?comments=1");
    expect(userPath("a/b")).toBe("/api/users/a%2Fb");
    expect(withPage("/api/users/search?q=ria", 2)).toBe(
      "/api/users/search?q=ria&page=2&limit=12",
    );
  });
  it("accepts supported images up to exactly 5MB", () => {
    expect(
      imageError(
        new File([new Uint8Array(5 * 1024 * 1024)], "photo.png", {
          type: "image/png",
        }),
      ),
    ).toBeUndefined();
  });
  it("rejects missing, empty, oversized and non-image uploads", () => {
    expect(imageError(undefined)).toBeTruthy();
    expect(
      imageError(new File([], "empty.jpg", { type: "image/jpeg" })),
    ).toContain("empty");
    expect(
      imageError(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).toContain("5 MB");
    expect(
      imageError(new File(["test"], "file.svg", { type: "image/svg+xml" })),
    ).toContain("JPG");
  });
});
