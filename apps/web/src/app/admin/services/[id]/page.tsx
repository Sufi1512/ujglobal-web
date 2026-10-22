"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceEditor } from "@/components/admin/ServiceEditor";
import { type Service, adminApi } from "@/lib/admin/api";

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminApi.service(id).then(setService, (err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div>
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link href="/admin/services" className="mt-4 inline-block text-sm text-link underline">Back to services</Link>
      </div>
    );
  }
  if (!service) return <p className="text-sm text-muted" role="status">Loading…</p>;
  return <ServiceEditor key={service.id} initial={service} />;
}
