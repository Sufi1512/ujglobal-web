"use client";

import { useEffect, useState } from "react";
import { ContentList } from "@/components/admin/ContentList";
import { type CaseStudyListItem, adminApi } from "@/lib/admin/api";

export default function CaseStudiesAdminPage() {
  const [rows, setRows] = useState<CaseStudyListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminApi.caseStudies().then(setRows, (err: Error) => setError(err.message));
  }, []);
  return (
    <ContentList
      heading="Case studies"
      description="Portfolio entries shown on /work, newest edits first."
      newHref="/admin/case-studies/new"
      newLabel="New case study"
      editBase="/admin/case-studies"
      publicBase="/work"
      rows={
        rows?.map((row) => ({
          ...row,
          tags: [...(row.is_demo ? ["Demo"] : ["Client"]), ...(row.is_featured ? ["Featured"] : [])],
        })) ?? null
      }
      error={error}
      emptyText="No case studies yet. Start with one of the demo projects."
    />
  );
}
