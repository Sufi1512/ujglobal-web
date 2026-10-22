"use client";

import Link from "next/link";
import { formatDate } from "./leadUi";

export type ContentRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled";
  updated_at: string;
  tags?: string[];
};

/** Table of services or case studies with status, labels and a link to edit each one. */
export function ContentList({
  heading,
  description,
  newHref,
  newLabel,
  editBase,
  publicBase,
  rows,
  error,
  emptyText,
}: {
  heading: string;
  description: string;
  newHref: string;
  newLabel: string;
  editBase: string;
  publicBase: string;
  rows: ContentRow[] | null;
  error: string | null;
  emptyText: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{heading}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <Link href={newHref} className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90">
          + {newLabel}
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Last edited</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0 hover:bg-foreground/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`${editBase}/${row.id}`} className="font-medium hover:text-link">
                    {row.title}
                  </Link>
                  <div className="text-xs text-muted">
                    {publicBase}/{row.slug}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === "published"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-foreground/10 text-muted"
                      }`}
                    >
                      {row.status === "published" ? "Live" : "Draft"}
                    </span>
                    {row.tags?.map((tag) => (
                      <span key={tag} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-muted md:table-cell">{formatDate(row.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows && !error && (
          <p className="px-4 py-10 text-center text-sm text-muted" role="status">
            Loading…
          </p>
        )}
        {rows?.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">{emptyText}</p>}
      </div>
    </>
  );
}
