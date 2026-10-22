"use client";

import { useEffect, useState } from "react";
import { ContentList } from "@/components/admin/ContentList";
import { type ServiceListItem, adminApi } from "@/lib/admin/api";

export default function ServicesAdminPage() {
  const [rows, setRows] = useState<ServiceListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminApi.services().then(setRows, (err: Error) => setError(err.message));
  }, []);
  return (
    <ContentList
      heading="Services"
      description="The service pages on the website, in the order they appear."
      newHref="/admin/services/new"
      newLabel="New service"
      editBase="/admin/services"
      publicBase="/services"
      rows={rows}
      error={error}
      emptyText="No services yet."
    />
  );
}
