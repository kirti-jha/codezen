const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : "http://localhost:4000/api");
export const TOKEN_KEY = "genpay_access_token";
const USER_KEY = "genpay_user";
const IMPERSONATED_AS_KEY = "impersonated_as";

export interface AppAuthUser {
  id: string;
  email: string;
}

export const AUTH_SESSION_EVENT = "genpay-auth-session-changed";

type AuthScope = "local" | "session";
type AuthSessionOptions = { scope?: AuthScope };

function hasSessionAuth() {
  return !!sessionStorage.getItem(TOKEN_KEY);
}

function getCurrentScope(): AuthScope {
  return hasSessionAuth() ? "session" : "local";
}

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(accessToken: string, user: AppAuthUser, options: AuthSessionOptions = {}) {
  const scope: AuthScope = options.scope || "local";
  // If the user logs in normally in a tab that previously impersonated someone,
  // clear the per-tab impersonation session so it doesn't override local login.
  if (scope === "local") {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(IMPERSONATED_AS_KEY);
  }
  const storage = scope === "session" ? sessionStorage : localStorage;
  storage.setItem(TOKEN_KEY, accessToken);
  storage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function clearAuthSession(options: AuthSessionOptions = {}) {
  const scope: AuthScope = options.scope || getCurrentScope();
  const storage = scope === "session" ? sessionStorage : localStorage;
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function getStoredUser(): AppAuthUser | null {
  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppAuthUser;
  } catch {
    return null;
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`[Frontend API Request] ${options.method || "GET"} ${url}`);
  if (options.body) {
    console.log(`[Frontend API Payload]`, JSON.parse(options.body as string));
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  console.log(`[Frontend API Response] status=${response.status}`, data);

  if (!response.ok) {
    console.error(`[Frontend API Error]`, data.error || data.message || "An error occurred");
    throw new Error(data.error || data.message || "An error occurred");
  }
  return data;
}

// ─── Settlement API Helpers ──────────────────────────────────────────────────
export async function getSettlementSummary(userId?: string) {
  const query = userId ? `?userId=${userId}` : "";
  return apiFetch(`/settlements/summary${query}`);
}

export async function getSettlementHistory(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  userId?: string;
} = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set("status", params.status);
  if (params.search) queryParams.set("search", params.search);
  if (params.page) queryParams.set("page", params.page.toString());
  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.userId) queryParams.set("userId", params.userId);

  const str = queryParams.toString();
  return apiFetch(`/settlements/history${str ? `?${str}` : ""}`);
}

export async function requestSettlement(data: {
  amount: number;
  payoutMode?: string;
  remarks?: string;
}) {
  return apiFetch("/settlements/request", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSettlementHolds(userId?: string) {
  const query = userId ? `?userId=${userId}` : "";
  return apiFetch(`/settlements/holds${query}`);
}

export async function placeSettlementHold(data: {
  targetUserId: string;
  amount: number;
  reason: string;
}) {
  return apiFetch("/settlements/holds", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function releaseSettlementHold(holdId: string) {
  return apiFetch(`/settlements/holds/${holdId}/release`, {
    method: "POST",
  });
}

export async function processSettlement(
  settlementId: string,
  data: {
    action: "complete" | "reject";
    referenceId?: string;
    failureReason?: string;
    remarks?: string;
  }
) {
  return apiFetch(`/settlements/${settlementId}/process`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSettlementConfig() {
  return apiFetch("/settlements/config");
}

export async function updateSettlementConfig(configData: any) {
  return apiFetch("/settlements/config", {
    method: "PUT",
    body: JSON.stringify(configData),
  });
}

export async function getSettlementAuditLogs() {
  return apiFetch("/settlements/audit-logs");
}

// ─── Transaction Limits API Helpers ──────────────────────────────────────────
export async function getUserLimits(params: {
  search?: string;
  role?: string;
  limitType?: string;
  page?: number;
  limit?: number;
} = {}) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set("search", params.search);
  if (params.role) queryParams.set("role", params.role);
  if (params.limitType) queryParams.set("limitType", params.limitType);
  if (params.page) queryParams.set("page", params.page.toString());
  if (params.limit) queryParams.set("limit", params.limit.toString());

  const str = queryParams.toString();
  return apiFetch(`/limits${str ? `?${str}` : ""}`);
}

export async function getMyLimit() {
  return apiFetch("/limits/my-limit");
}

export async function getSystemLimitConfig() {
  return apiFetch("/limits/config");
}

export async function updateSystemLimitConfig(data: {
  defaultDailyLimit?: number;
  defaultPerTxnLimit?: number;
  globalUnlimited?: boolean;
}) {
  return apiFetch("/limits/config", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function setUserLimit(
  targetUserId: string,
  data: {
    dailyLimit?: number | null;
    perTxnLimit?: number | null;
    isUnlimited?: boolean;
    resetDailyUsage?: boolean;
  }
) {
  return apiFetch(`/limits/user/${targetUserId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function batchUpdateUserLimits(
  updates: Array<{
    userId: string;
    dailyLimit?: number | null;
    perTxnLimit?: number | null;
    isUnlimited?: boolean;
  }>
) {
  return apiFetch("/limits/batch", {
    method: "POST",
    body: JSON.stringify({ updates }),
  });
}

export async function getLimitAuditLogs() {
  return apiFetch("/limits/audit-logs");
}

// ─── System Activity Logs API Helpers ────────────────────────────────────────
export async function getSystemLogs(params: {
  search?: string;
  module?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
} = {}) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set("search", params.search);
  if (params.module) queryParams.set("module", params.module);
  if (params.severity) queryParams.set("severity", params.severity);
  if (params.startDate) queryParams.set("startDate", params.startDate);
  if (params.endDate) queryParams.set("endDate", params.endDate);
  if (params.page) queryParams.set("page", params.page.toString());
  if (params.limit) queryParams.set("limit", params.limit.toString());

  const str = queryParams.toString();
  return apiFetch(`/system-logs${str ? `?${str}` : ""}`);
}

export async function getSystemLogStats() {
  return apiFetch("/system-logs/stats");
}

export async function clearSystemLogs(days = 30) {
  return apiFetch(`/system-logs/clear?days=${days}`, {
    method: "DELETE",
  });
}

export async function createTestLogEvent(data: {
  action: string;
  module?: string;
  severity?: string;
  details?: string;
}) {
  return apiFetch("/system-logs/test-event", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── T0 / T1 Dual-Wallet Settlement API Helpers ────────────────────────────────
export async function getT0T1SettlementSettings(userId?: string) {
  const query = userId ? `?userId=${userId}` : "";
  return apiFetch(`/settlements/t0-t1-settings${query}`);
}

export async function updateUserSettlementType(data: {
  targetUserId: string;
  settlementType?: string;
  t0DailyLimit?: number;
  isT0Enabled?: boolean;
}) {
  return apiFetch("/settlements/update-user-settlement-type", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAllUserSettlementType(data: {
  settlementType?: string;
  isT0Enabled?: boolean;
}) {
  return apiFetch("/settlements/update-all-user-settlement-type", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function triggerT1Settlement() {
  return apiFetch("/settlements/trigger-t1-settlement", {
    method: "POST",
  });
}

// ─── Commission API Helpers ────────────────────────────────────────────────
export async function getMyCommissionPlan() {
  return apiFetch("/commission/my-plan");
}
