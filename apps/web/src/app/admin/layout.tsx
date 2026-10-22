import type { Metadata } from "next";
import { AdminSession } from "@/components/admin/AdminSession";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | UJ Global admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminSession>{children}</AdminSession>;
}
