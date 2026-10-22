import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tell UJ Global about your project and get a quote within one business day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl font-semibold">Get a quote</h1>
        <p className="mt-4 text-muted">
          Every project is priced to its scope, so tell us what you have in mind. We reply within one business day.
        </p>
        <p className="mt-6 text-sm">
          Prefer email?{" "}
          <a href={`mailto:${site.email}`} className="text-link underline">
            {site.email}
          </a>
        </p>
      </div>
      <ContactForm />
    </section>
  );
}
