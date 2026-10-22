import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-32 text-center">
      <h1 className="font-display text-4xl font-semibold">Page not found</h1>
      <p className="mt-4 text-muted">The page you are looking for does not exist or has moved.</p>
      <Link href="/services" className="mt-8 inline-block rounded-full bg-brand px-6 py-3 font-medium text-white">
        See our services
      </Link>
    </section>
  );
}
