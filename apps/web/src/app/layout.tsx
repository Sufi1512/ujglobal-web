import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Space_Grotesk } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Web, App, AI and SEO Consultancy`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: { type: "website", siteName: site.name, url: site.url },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

// Browser toolbar colour on phones: the light page background (the theme toggle updates it).
export const viewport: Viewport = {
  themeColor: "#f6f3ec",
};

/*
 * Runs before first paint: marks the page as JS-enabled (so scroll fades never hide content without
 * JavaScript) and applies the visitor's saved theme, light unless they chose dark, so the page never
 * flashes the wrong colours. components/ThemeToggle.tsx changes it afterwards.
 */
const BOOT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');var t='light';try{if(localStorage.getItem('theme')==='dark')t='dark'}catch(e){}d.dataset.theme=t;if(t==='dark'){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#0d1613')}})()`;

// The public site (app/(site)) and the admin panel (app/admin) each add their own chrome.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Set per request by middleware.ts; the Content Security Policy only lets scripts with it run.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // data-theme may be switched to "dark" by BOOT_SCRIPT before React loads, hence the suppression.
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Browsers hide nonce values from page scripts (a CSP protection), so React sees "" in the browser
            where the server sent the real value; that one difference is expected, not a bug. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
