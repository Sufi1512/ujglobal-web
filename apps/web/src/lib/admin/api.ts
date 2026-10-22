"use client";

import { API_URL } from "@/lib/api";

/*
 * Admin API client. The access token lives only in memory; the refresh token is an httpOnly cookie the
 * browser sends to /v1/auth on its own. On a 401 the client refreshes once and retries the request.
 */

export type Role = "owner" | "editor" | "sales";
export type AdminUser = { id: string; email: string; name: string; role: Role; last_login_at: string | null };

export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSource = "contact" | "wizard" | "chat" | "booking";

export type LeadSummary = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  services: string[];
  assignee_id: string | null;
  created_at: string;
};

export type LeadNote = { id: string; body: string; author_id: string | null; author_name: string | null; created_at: string };

export type LeadDetail = LeadSummary & {
  phone: string | null;
  message: string;
  budget_range: string | null;
  timeline: string | null;
  brief: Record<string, unknown> | null;
  landing_page: string | null;
  referrer: string | null;
  utm: Record<string, string> | null;
  consent: boolean;
  ai_summary: string | null;
  ai_score: number | null;
  updated_at: string;
  notes: LeadNote[];
};

export type LeadPage = {
  items: LeadSummary[];
  total: number;
  page: number;
  page_size: number;
  status_counts: Record<LeadStatus, number>;
};

export type Assignee = { id: string; name: string; role: Role };

export type LeadFilters = {
  status?: LeadStatus;
  source?: LeadSource;
  assignee?: string;
  q?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
};

type TokenResponse = { access_token: string; expires_in: number; user: AdminUser };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const CSRF_HEADER = { "X-Requested-With": "ujglobal-admin" };

let accessToken: string | null = null;
let refreshing: Promise<TokenResponse | null> | null = null;
let onSignedOut: (() => void) | null = null;

export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    // not JSON
  }
  return `Request failed (${res.status})`;
}

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<TokenResponse | null> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: CSRF_HEADER,
      });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const data: TokenResponse = await res.json();
      accessToken = data.access_token;
      return data;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function login(email: string, password: string): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  const data: TokenResponse = await res.json();
  accessToken = data.access_token;
  return data.user;
}

export async function logout(): Promise<void> {
  accessToken = null;
  await fetch(`${API_URL}/v1/auth/logout`, { method: "POST", credentials: "include", headers: CSRF_HEADER }).catch(
    () => undefined,
  );
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...init.headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    });

  if (!accessToken) await refreshSession();
  let res = await send();
  if (res.status === 401 && (await refreshSession())) {
    res = await send();
  }
  if (res.status === 401) {
    onSignedOut?.();
  }
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return res;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authedFetch(path, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
  });
  return res.json() as Promise<T>;
}

function query(filters: LeadFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const adminApi = {
  me: () => request<AdminUser>("/v1/auth/me"),
  leads: (filters: LeadFilters) => request<LeadPage>(`/v1/admin/leads${query(filters)}`),
  lead: (id: string) => request<LeadDetail>(`/v1/admin/leads/${id}`),
  updateLead: (id: string, changes: { status?: LeadStatus; assignee_id?: string | null }) =>
    request<LeadDetail>(`/v1/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
  addNote: (id: string, body: string) =>
    request<LeadNote>(`/v1/admin/leads/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) }),
  assignees: () => request<Assignee[]>("/v1/admin/leads/assignees"),
  async exportCsv(filters: LeadFilters): Promise<Blob> {
    const { page: _page, ...rest } = filters;
    void _page;
    const res = await authedFetch(`/v1/admin/leads/export.csv${query(rest)}`);
    return res.blob();
  },
};
