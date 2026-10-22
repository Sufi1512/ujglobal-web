"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor, useAdminSession } from "@/components/admin/AdminSession";

/** Sends each person to the first admin section their role can use. */
export default function AdminHome() {
  const { user } = useAdminSession();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(homeFor(user.role));
  }, [user, router]);
  return null;
}
