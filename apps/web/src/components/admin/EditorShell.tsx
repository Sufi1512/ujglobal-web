"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublishStatus } from "@/lib/admin/api";
import { Checkbox, Section, TextField } from "./fields";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ujglobal.tech";

export type SaveState = { saving: boolean; error: string | null; savedAt: Date | null };

/** Page frame for the services and case studies editors: header, save bar, publish panel and delete. */
export function EditorShell({
  backHref,
  backLabel,
  heading,
  isNew,
  dirty,
  state,
  status,
  savedStatus,
  onStatusChange,
  onSave,
  onDelete,
  publicPath,
  children,
  sidebar,
}: {
  backHref: string;
  backLabel: string;
  heading: string;
  isNew: boolean;
  dirty: boolean;
  state: SaveState;
  status: PublishStatus;
  savedStatus: PublishStatus | null;
  onStatusChange: (status: PublishStatus) => void;
  onSave: () => void;
  onDelete?: () => Promise<void>;
  publicPath: string | null;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      noValidate
    >
      <Link href={backHref} className="text-sm text-muted hover:text-foreground">
        ← {backLabel}
      </Link>

      {/* Sticky save bar so Save is always in reach on long forms. */}
      <div className="sticky top-0 z-10 -mx-4 mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-display text-2xl font-semibold">{heading}</h1>
          {savedStatus && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                savedStatus === "published" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-foreground/10 text-muted"
              }`}
            >
              {savedStatus === "published" ? "Live" : "Draft"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span role="status" className="text-muted empty:hidden">
            {state.saving ? "Saving…" : dirty ? "Unsaved changes" : state.savedAt ? `Saved ${state.savedAt.toLocaleTimeString()}` : ""}
          </span>
          {publicPath && savedStatus === "published" && (
            <a href={publicPath} target="_blank" rel="noopener" className="rounded-full border border-line px-4 py-2 hover:border-brand">
              View on site ↗
            </a>
          )}
          <button
            type="submit"
            disabled={state.saving || (!dirty && !isNew)}
            className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isNew ? (status === "published" ? "Create and publish" : "Create draft") : status !== savedStatus ? (status === "published" ? "Save and publish" : "Save as draft") : "Save"}
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">{children}</div>
        <aside className="space-y-6">
          <Section title="Visibility">
            <fieldset className="space-y-2 text-sm">
              <legend className="sr-only">Visibility</legend>
              {(
                [
                  ["draft", "Draft", "Hidden from the website"],
                  ["published", "Published", "Live on the website"],
                ] as const
              ).map(([value, label, hint]) => (
                <label key={value} className="flex items-start gap-3">
                  <input type="radio" name="status" value={value} checked={status === value} onChange={() => onStatusChange(value)} className="mt-1 accent-[var(--brand)]" />
                  <span>
                    <span className="font-medium">{label}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </Section>
          {sidebar}
          {onDelete && (
            <Section title="Delete">
              {savedStatus === "published" ? (
                <p className="text-sm text-muted">Set this to Draft and save before deleting it.</p>
              ) : confirming ? (
                <div className="space-y-3 text-sm">
                  <p>This can&apos;t be undone. Delete it?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await onDelete();
                        } finally {
                          setDeleting(false);
                          setConfirming(false);
                        }
                      }}
                      className="rounded-full bg-red-600 px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="rounded-full border border-line px-4 py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="text-sm text-red-600 underline">
                  Delete this draft
                </button>
              )}
            </Section>
          )}
        </aside>
      </div>
    </form>
  );
}

/** Meta title, description and noindex, with a preview of how the page may look in Google. */
export function SeoSection({
  path,
  fallbackTitle,
  fallbackDescription,
  metaTitle,
  metaDescription,
  noindex,
  onChange,
  errors,
}: {
  path: string;
  fallbackTitle: string;
  fallbackDescription: string;
  metaTitle: string;
  metaDescription: string;
  noindex: boolean;
  onChange: (changes: { meta_title?: string; meta_description?: string; noindex?: boolean }) => void;
  errors: Record<string, string>;
}) {
  const title = `${metaTitle || fallbackTitle || "Untitled"} | UJ Global`;
  const description = metaDescription || fallbackDescription;
  return (
    <Section title="Search engines" description="Leave blank to use the title and summary.">
      <div className="rounded-lg bg-foreground/[0.03] p-4" aria-label="Search result preview">
        <p className="truncate text-xs text-muted">{`${SITE_URL.replace(/^https?:\/\//, "")}${path}`}</p>
        <p className="truncate text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{title}</p>
        <p className="line-clamp-2 text-sm text-muted">{description || "Add a summary so search engines have something to show."}</p>
      </div>
      <TextField label="Meta title" value={metaTitle} onChange={(v) => onChange({ meta_title: v })} maxLength={70} placeholder={fallbackTitle} error={errors.meta_title} />
      <TextField
        label="Meta description"
        value={metaDescription}
        onChange={(v) => onChange({ meta_description: v })}
        maxLength={170}
        multiline={3}
        placeholder={fallbackDescription}
        error={errors.meta_description}
      />
      <Checkbox label="Hide from search engines" hint="Adds noindex and leaves the page out of the sitemap." checked={noindex} onChange={(v) => onChange({ noindex: v })} />
    </Section>
  );
}
