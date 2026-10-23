import type { Metadata, Viewport } from "next";
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

// Browser toolbar colour on phones, matching the page background in each theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1613" },
  ],
};

// The public site (app/(site)) and the admin panel (app/admin) each add their own chrome.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The inline script marks the page as JS-enabled before first paint, so scroll fades never hide
    // content from visitors (or crawlers) without JavaScript.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
