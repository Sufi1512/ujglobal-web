import { type NextRequest, NextResponse } from "next/server";

/*
 * Content Security Policy for every page. Each response gets a fresh random nonce; only scripts carrying
 * it (Next.js adds it to its own) or loaded by them may run, so an injected <script> or inline handler is
 * blocked by the browser even if a bug ever lets one into the page. Read by app/layout.tsx via `x-nonce`.
 */

const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9005").origin;
const TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? "https://challenges.cloudflare.com" : "";

export function buildCsp(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}${TURNSTILE && ` ${TURNSTILE}`}`,
    // Inline style attributes are used for layout values; styles can't run code.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${API_ORIGIN}${TURNSTILE && ` ${TURNSTILE}`}`,
    `frame-src ${TURNSTILE || "'none'"}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV !== "production");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  // Next.js reads the nonce from this request header and puts it on the scripts it renders.
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API routes, static files, images or generated icons.
      source: "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|opengraph-image|twitter-image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
