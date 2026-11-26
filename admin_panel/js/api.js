// API layer: every request to the backend goes through here.

// Served by FastAPI at /admin -> same origin. Opened as a file -> local dev server.
const BASE_URL = location.protocol.startsWith("http") ? "" : "http://127.0.0.1:8000";
const ADMIN_PREFIX = "/api/admin";
const TOKEN_KEY = "jobgate.adminToken";

export const auth = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

/**
 * status: HTTP status code, or 0 when the server could not be reached.
 * The UI turns the status into a translated message (see errorMessage in app.js);
 * the raw backend detail is kept in `message` for debugging.
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function describeError(detail, fallback) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join("; "); // FastAPI validation errors
  return fallback;
}

async function request(method, path, body) {
  const headers = { "X-Admin-Token": auth.get() ?? "" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(BASE_URL + ADMIN_PREFIX + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Network error");
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, describeError(data?.detail, res.statusText));
  return data;
}

export const api = {
  statuses: () => request("GET", "/statuses"),

  listApplications: ({ status, q } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString();
    return request("GET", "/applications" + (qs ? `?${qs}` : ""));
  },
  createApplication: (data) => request("POST", "/applications", data),
  updateApplication: (id, data) => request("PATCH", `/applications/${id}`, data),
  advanceApplication: (id) => request("POST", `/applications/${id}/advance`),
  deleteApplication: (id) => request("DELETE", `/applications/${id}`),

  demoState: () => request("GET", "/demo/state"),
  demoReset: () => request("POST", "/demo/reset"),
  demoClear: () => request("POST", "/demo/clear"),
  demoSetFail: (enabled) => request("PUT", "/demo/fail", { enabled }),
};
