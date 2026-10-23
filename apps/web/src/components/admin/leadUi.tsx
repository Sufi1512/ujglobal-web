import type { LeadSource, LeadStatus } from "@/lib/admin/api";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  contact: "Contact form",
  wizard: "Project brief",
  chat: "AI chat",
  booking: "Call booking",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-brand/10 text-link",
  contacted: "bg-signal text-on-signal",
  qualified: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  proposal: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  won: "bg-brand text-on-brand",
  lost: "bg-foreground/10 text-muted",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatDate(value: string): string {
  return dateFormat.format(new Date(value));
}
