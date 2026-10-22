"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseStudyEditor } from "@/components/admin/CaseStudyEditor";
import { type CaseStudy, adminApi } from "@/lib/admin/api";

export default function EditCaseStudyPage() {
  const { id } = useParams<{ id: string }>();
  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminApi.caseStudy(id).then(setStudy, (err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div>
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link href="/admin/case-studies" className="mt-4 inline-block text-sm text-link underline">Back to case studies</Link>
      </div>
    );
  }
  if (!study) return <p className="text-sm text-muted" role="status">Loading…</p>;
  return <CaseStudyEditor key={study.id} initial={study} />;
}
