"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminSession } from "@/components/admin/AdminSession";
import { SOURCE_LABELS, STATUS_LABELS, StatusBadge, formatDate } from "@/components/admin/leadUi";
import { type Assignee, LEAD_STATUSES, type LeadDetail, type LeadStatus, adminApi } from "@/lib/admin/api";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children}</dd>
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { user } = useAdminSession();
  const router = useRouter();

  async function deleteLead() {
    setSaving(true);
    setError(null);
    try {
      await adminApi.deleteLead(id);
      router.replace("/admin/leads");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the lead");
      setSaving(false);
    }
  }

  useEffect(() => {
    adminApi.lead(id).then(setLead, (err: Error) => setError(err.message));
    adminApi.assignees().then(setAssignees, () => setAssignees([]));
  }, [id]);

  async function change(changes: { status?: LeadStatus; assignee_id?: string | null }) {
    setSaving(true);
    setError(null);
    try {
      setLead(await adminApi.updateLead(id, changes));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    const body = note.trim();
    if (!body || !lead) return;
    setSaving(true);
    setError(null);
    try {
      const created = await adminApi.addNote(id, body);
      setLead({ ...lead, notes: [created, ...lead.notes] });
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the note");
    } finally {
      setSaving(false);
    }
  }

  if (!lead) {
    return error ? (
      <div>
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
        <Link href="/admin/leads" className="mt-4 inline-block text-sm text-link underline">
          Back to leads
        </Link>
      </div>
    ) : (
      <p className="text-sm text-muted" role="status">
        Loading lead…
      </p>
    );
  }

  const utm = Object.entries(lead.utm ?? {});
  const control = "mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-link";

  return (
    <>
      <Link href="/admin/leads" className="text-sm text-muted hover:text-foreground">
        ← All leads
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold">{lead.name}</h1>
        <StatusBadge status={lead.status} />
      </div>
      <p className="mt-1 text-sm text-muted">
        {SOURCE_LABELS[lead.source]} · received {formatDate(lead.created_at)}
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section aria-labelledby="message-heading" className="rounded-xl border border-line bg-surface p-6">
            <h2 id="message-heading" className="font-medium">
              Message
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{lead.message}</p>
          </section>

          <section aria-labelledby="notes-heading" className="rounded-xl border border-line bg-surface p-6">
            <h2 id="notes-heading" className="font-medium">
              Notes
            </h2>
            <form onSubmit={addNote} className="mt-3">
              <label htmlFor="note" className="sr-only">
                Add a note
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={5000}
                rows={3}
                placeholder="Call summary, next step, anything the team should know"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-link"
              />
              <button
                type="submit"
                disabled={saving || !note.trim()}
                className="mt-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-on-brand hover:opacity-90 disabled:opacity-50"
              >
                Add note
              </button>
            </form>
            <ul className="mt-6 space-y-4">
              {lead.notes.map((n) => (
                <li key={n.id} className="border-l-2 border-line pl-4">
                  <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {n.author_name ?? "Former team member"} · {formatDate(n.created_at)}
                  </p>
                </li>
              ))}
              {lead.notes.length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-label="Pipeline" className="space-y-4 rounded-xl border border-line bg-surface p-6">
            <label className="block text-xs uppercase tracking-wide text-muted">
              Status
              <select
                value={lead.status}
                disabled={saving}
                onChange={(e) => change({ status: e.target.value as LeadStatus })}
                className={`${control} normal-case tracking-normal text-foreground`}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs uppercase tracking-wide text-muted">
              Assigned to
              <select
                value={lead.assignee_id ?? ""}
                disabled={saving}
                onChange={(e) => change({ assignee_id: e.target.value || null })}
                className={`${control} normal-case tracking-normal text-foreground`}
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <dl className="space-y-4 rounded-xl border border-line bg-surface p-6">
            <Field label="Email">
              <a href={`mailto:${lead.email}`} className="text-link underline">
                {lead.email}
              </a>
            </Field>
            {lead.phone && (
              <Field label="Phone">
                <a href={`tel:${lead.phone}`} className="text-link underline">
                  {lead.phone}
                </a>
              </Field>
            )}
            {lead.company && <Field label="Company">{lead.company}</Field>}
            {lead.services.length > 0 && <Field label="Services">{lead.services.join(", ")}</Field>}
            {lead.budget_range && <Field label="Budget">{lead.budget_range}</Field>}
            {lead.timeline && <Field label="Timeline">{lead.timeline}</Field>}
            {lead.landing_page && <Field label="Landing page">{lead.landing_page}</Field>}
            {lead.referrer && <Field label="Referrer">{lead.referrer}</Field>}
            {utm.length > 0 && <Field label="Campaign">{utm.map(([k, v]) => `${k}: ${v}`).join(" · ")}</Field>}
            <Field label="Consent">{lead.consent ? "Agreed to be contacted" : "Not given"}</Field>
          </dl>
          {user?.role === "owner" && (
            <section aria-labelledby="delete-heading" className="rounded-xl border border-line bg-surface p-6 text-sm">
              <h2 id="delete-heading" className="font-medium">
                Delete lead
              </h2>
              <p className="mt-1 text-muted">
                For deletion requests under the privacy policy. Removes the lead and its notes for good.
              </p>
              {confirmDelete ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={deleteLead}
                    className="rounded-full bg-red-600 px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Deleting…" : `Yes, delete ${lead.name}`}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full border border-line px-4 py-2">
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="mt-3 text-red-600 underline dark:text-red-400">
                  Delete this lead
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
