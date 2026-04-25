import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api";

describe("apiRequest", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes the saved bearer token in authenticated requests", async () => {
    localStorage.setItem(
      "prepiq_session",
      JSON.stringify({
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
        token: "sample-token",
      }),
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const payload = await apiRequest<{ status: string }>("/api/health");

    expect(payload).toEqual({ status: "ok" });
    const [, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options?.headers);
    expect(headers.get("Authorization")).toBe("Bearer sample-token");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("surfaces backend error messages from the JSON detail field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid credentials" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/api/auth/login", { method: "POST" })).rejects.toThrow("Invalid credentials");
  });
});
