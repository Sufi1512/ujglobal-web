"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SOURCE_LABELS, STATUS_LABELS, StatusBadge, formatDate } from "@/components/admin/leadUi";
import {
  type Assignee,
  LEAD_STATUSES,
  type LeadFilters,
  type LeadPage,
  type LeadSource,
  type LeadStatus,
  adminApi,
} from "@/lib/admin/api";

const FILTER_KEYS = ["status", "source", "assignee", "q", "date_from", "date_to", "page"] as const;

function readFilters(params: URLSearchParams): LeadFilters {
  const filters: LeadFilters = {};
  const status = params.get("status");
  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) filters.status = status as LeadStatus;
  const source = params.get("source");
  if (source && source in SOURCE_LABELS) filters.source = source as LeadSource;
  for (const key of ["assignee", "q", "date_from", "date_to"] as const) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  const page = Number(params.get("page"));
  if (Number.isInteger(page) && page > 1) filters.page = page;
  return filters;
}

function Inbox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(params.toString())), [params]);

  const [data, setData] = useState<LeadPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    adminApi.assignees().then(setAssignees, () => setAssignees([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    adminApi.leads(filters).then(
      (page) => !cancelled && setData(page),
      (err: Error) => !cancelled && setError(err.message),
    );
    return () => {
      cancelled = true;
    };
  }, [filters]);

  function update(changes: Partial<Record<(typeof FILTER_KEYS)[number], string | undefined>>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any filter change starts again from the first page.
    if (!("page" in changes)) next.delete("page");
    const text = next.toString();
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await adminApi.exportCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ujglobal-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const assigneeName = (id: string | null) => (id ? (assignees.find((a) => a.id === id)?.name ?? "Someone") : "—");
  const allCount = data ? Object.values(data.status_counts).reduce((sum, n) => sum + n, 0) : null;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const page = filters.page ?? 1;
  const control = "rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-link";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Leads</h1>
          <p className="mt-1 text-sm text-muted">Every enquiry from the site, newest first.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting || data?.total === 0}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-link disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <nav aria-label="Lead status" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {[undefined, ...LEAD_STATUSES].map((status) => {
          const active = filters.status === status;
          const count = status ? data?.status_counts[status] : allCount;
          return (
            <button
              key={status ?? "all"}
              type="button"
              onClick={() => update({ status })}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
                active ? "border-link font-medium" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {status ? STATUS_LABELS[status] : "All"}
              {count !== undefined && count !== null && (
                <>
                  {" "}
                  <span className="ml-1 text-xs text-muted">{count}</span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: String(new FormData(event.currentTarget).get("q") ?? "").trim() || undefined });
        }}
      >
        <label className="text-xs text-muted">
          Search
          <input
            key={filters.q ?? ""}
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Name, email, company, message"
            className={`${control} mt-1 block w-64 text-foreground`}
          />
        </label>
        <label className="text-xs text-muted">
          Source
          <select
            value={filters.source ?? ""}
            onChange={(e) => update({ source: e.target.value || undefined })}
            className={`${control} mt-1 block text-foreground`}
          >
            <option value="">Any source</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Assigned to
          <select
            value={filters.assignee ?? ""}
            onChange={(e) => update({ assignee: e.target.value || undefined })}
            className={`${control} mt-1 block text-foreground`}
          >
            <option value="">Anyone</option>
            <option value="me">Me</option>
            <option value="none">Unassigned</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          From
          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => update({ date_from: e.target.value || undefined })}
            className={`${control} mt-1 block text-foreground`}
          />
        </label>
        <label className="text-xs text-muted">
          To
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => update({ date_to: e.target.value || undefined })}
            className={`${control} mt-1 block text-foreground`}
          />
        </label>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Search
        </button>
        {FILTER_KEYS.some((key) => key !== "status" && key !== "page" && params.get(key)) && (
          <button
            type="button"
            onClick={() => update({ q: undefined, source: undefined, assignee: undefined, date_from: undefined, date_to: undefined })}
            className="px-2 py-2 text-sm text-muted underline hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </form>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm md:min-w-[720px]">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Company</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Assigned</th>
              <th className="px-4 py-3 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((lead) => (
              <tr key={lead.id} className="border-b border-line last:border-0 hover:bg-foreground/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:text-link">
                    {lead.name}
                  </Link>
                  <div className="text-xs text-muted">{lead.email}</div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">{lead.company ?? "—"}</td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">{SOURCE_LABELS[lead.source]}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">{assigneeName(lead.assignee_id)}</td>
                <td className="px-4 py-3 text-muted md:whitespace-nowrap">{formatDate(lead.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && !error && (
          <p className="px-4 py-10 text-center text-sm text-muted" role="status">
            Loading leads…
          </p>
        )}
        {data?.items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted">No leads match these filters.</p>
        )}
      </div>

      {data && pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {pages} · {data.total} leads
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => update({ page: page > 2 ? String(page - 1) : undefined })}
              className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => update({ page: String(page + 1) })}
              className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}
