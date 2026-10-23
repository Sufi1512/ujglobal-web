"use client";

import { API_URL } from "@/lib/api";

/*
 * Admin API client. The access token lives only in memory; the refresh token is an httpOnly cookie the
 * browser sends to /v1/auth on its own. On a 401 the client refreshes once and retries the request.
 */

export type Role = "owner" | "editor" | "sales";
export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  last_login_at: string | null;
  /** Two-factor sign-in is on for this account. */
  mfa_enabled: boolean;
  /** This role must use two-factor sign-in; until it's on, admin sections are blocked. */
  mfa_required: boolean;
};

export type MfaSetup = { secret: string; otpauth_uri: string; qr_data_uri: string };
/** Password accepted: either signed in, or an authenticator code is needed next. */
export type LoginResult = { kind: "signed-in"; user: AdminUser } | { kind: "mfa"; mfaToken: string };

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

export type PublishStatus = "draft" | "published";
export type ProcessStep = { title: string; text: string };
export type Faq = { question: string; answer: string };
export type ResultMetric = { metric: string; label: string };

type Seo = { meta_title: string | null; meta_description: string | null; noindex: boolean };

export type ServiceInput = Seo & {
  title: string;
  slug: string;
  tagline: string | null;
  summary: string;
  body: { problem: string | null; process: ProcessStep[]; faqs: Faq[] };
  deliverables: string[];
  tech_stack: string[];
  sort_order: number;
  status: PublishStatus;
};
export type Service = ServiceInput & { id: string; created_at: string; updated_at: string };
export type ServiceListItem = Pick<Service, "id" | "title" | "slug" | "status" | "sort_order" | "updated_at">;

export type CaseStudyInput = Seo & {
  title: string;
  slug: string;
  client_name: string | null;
  summary: string | null;
  challenge: string | null;
  solution: string | null;
  results: ResultMetric[];
  tech_stack: string[];
  live_url: string | null;
  is_demo: boolean;
  is_featured: boolean;
  status: PublishStatus;
  service_ids: string[];
};
export type CaseStudy = CaseStudyInput & { id: string; published_at: string | null; created_at: string; updated_at: string };
export type CaseStudyListItem = Pick<CaseStudy, "id" | "title" | "slug" | "status" | "is_demo" | "is_featured" | "updated_at">;

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
    /** For validation errors: message per field path, e.g. {"slug": "...", "body.faqs.0.question": "..."}. */
    public fields: Record<string, string> = {},
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

type ValidationIssue = { loc: (string | number)[]; msg: string };

function cleanMessage(msg: string): string {
  // Pydantic prefixes custom errors with "Value error, "; people don't need that.
  return msg.replace(/^Value error, /, "");
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return new ApiError(res.status, body.detail);
    if (Array.isArray(body.detail)) {
      const fields: Record<string, string> = {};
      for (const issue of body.detail as ValidationIssue[]) {
        const path = issue.loc.filter((part) => part !== "body").join(".");
        fields[path] ??= cleanMessage(issue.msg);
      }
      const count = Object.keys(fields).length;
      return new ApiError(res.status, count === 1 ? "Please fix the highlighted field." : `Please fix the ${count} highlighted fields.`, fields);
    }
  } catch {
    // not JSON
  }
  return new ApiError(res.status, `Request failed (${res.status})`);
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

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await toApiError(res);
  const data: TokenResponse | { mfa_required: true; mfa_token: string } = await res.json();
  if ("mfa_token" in data) return { kind: "mfa", mfaToken: data.mfa_token };
  accessToken = data.access_token;
  return { kind: "signed-in", user: data.user };
}

/** Second sign-in step: the code from the authenticator app, or a backup code. */
export async function verifyMfa(mfaToken: string, code: string): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/v1/auth/mfa/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfa_token: mfaToken, code }),
  });
  if (!res.ok) throw await toApiError(res);
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
  if (!res.ok) throw await toApiError(res);
  return res;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authedFetch(path, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
  });
  return (res.status === 204 ? undefined : await res.json()) as T;
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
  startMfaSetup: () => request<MfaSetup>("/v1/auth/mfa/setup", { method: "POST" }),
  enableMfa: (code: string) =>
    request<{ backup_codes: string[] }>("/v1/auth/mfa/enable", { method: "POST", body: JSON.stringify({ code }) }),
  leads: (filters: LeadFilters) => request<LeadPage>(`/v1/admin/leads${query(filters)}`),
  lead: (id: string) => request<LeadDetail>(`/v1/admin/leads/${id}`),
  updateLead: (id: string, changes: { status?: LeadStatus; assignee_id?: string | null }) =>
    request<LeadDetail>(`/v1/admin/leads/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
  addNote: (id: string, body: string) =>
    request<LeadNote>(`/v1/admin/leads/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) }),
  assignees: () => request<Assignee[]>("/v1/admin/leads/assignees"),
  deleteLead: (id: string) => request<void>(`/v1/admin/leads/${id}`, { method: "DELETE" }),
  services: () => request<ServiceListItem[]>("/v1/admin/services"),
  service: (id: string) => request<Service>(`/v1/admin/services/${id}`),
  createService: (data: ServiceInput) =>
    request<Service>("/v1/admin/services", { method: "POST", body: JSON.stringify(data) }),
  updateService: (id: string, data: ServiceInput) =>
    request<Service>(`/v1/admin/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteService: (id: string) => request<void>(`/v1/admin/services/${id}`, { method: "DELETE" }),
  caseStudies: () => request<CaseStudyListItem[]>("/v1/admin/case-studies"),
  caseStudy: (id: string) => request<CaseStudy>(`/v1/admin/case-studies/${id}`),
  createCaseStudy: (data: CaseStudyInput) =>
    request<CaseStudy>("/v1/admin/case-studies", { method: "POST", body: JSON.stringify(data) }),
  updateCaseStudy: (id: string, data: CaseStudyInput) =>
    request<CaseStudy>(`/v1/admin/case-studies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCaseStudy: (id: string) => request<void>(`/v1/admin/case-studies/${id}`, { method: "DELETE" }),
  async exportCsv(filters: LeadFilters): Promise<Blob> {
    const { page: _page, ...rest } = filters;
    void _page;
    const res = await authedFetch(`/v1/admin/leads/export.csv${query(rest)}`);
    return res.blob();
  },
};
