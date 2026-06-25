const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const API_PORT = (() => {
  try {
    return new URL(API_BASE_URL).port || "80";
  }
  catch{
    return "8000";
  }
}) ();
export const SESSION_KEY = "prepiq_session";
export const AUTH_EXPIRED_EVENT = "prepiq:auth-expired";

interface SessionPayload {
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
}

function getAuthToken() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SessionPayload;
    return session.token ?? null;
  } catch {
    return null;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
    // Handle array of validation errors from FastAPI
    if (Array.isArray(payload?.detail)) {
      return payload.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(", ");
    }
  } catch {
    // Ignore parse failures and fall back to status text.
  }

  return response.statusText || "Request failed";
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    // Network error - backend might not be running
    if (error instanceof TypeError) {
      throw new Error(
         `Unable to connect to server. Please ensure the backend is running on port ${API_PORT}.`
      );
    }
    throw new Error(error instanceof Error ? error.message : "Network request failed");
  }

  if (!response.ok) {
    if (response.status === 401 && !path.includes("/api/auth/")) {
      localStorage.removeItem(SESSION_KEY);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
    }
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Upload a file via FormData — does NOT set Content-Type so the browser adds the multipart boundary. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
  }
  catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Unable to connect to server. Please ensure the backend is running on port ${API_PORT}.`
      );
    }
    throw new Error(error instanceof Error ? error.message : "Network request failed");

  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
}
