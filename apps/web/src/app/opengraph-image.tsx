import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/*
 * The site-wide share image (Open Graph and Twitter), generated at build time in the Forest brand.
 * Pages without their own image use this one.
 */

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontFile = (pkg: string, file: string) => readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

export default async function OpengraphImage() {
  const [display, body] = await Promise.all([
    fontFile("space-grotesk", "space-grotesk-latin-700-normal.woff"),
    fontFile("inter", "inter-latin-600-normal.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#10201C",
          color: "#FFFFFF",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#0F6B54" />
            <path d="M8.5 8v9a5 5 0 0 0 10 0V8" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M23.5 8v12.5a4.5 4.5 0 0 1-4.5 4.5" fill="none" stroke="#E8A33D" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
          <div style={{ fontFamily: "Space Grotesk", fontSize: 44, letterSpacing: -1 }}>{site.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#E8A33D",
              color: "#10201C",
              fontSize: 26,
              padding: "8px 20px",
              borderRadius: 999,
            }}
          >
            Web · Mobile apps · AI · SEO
          </div>
          <div style={{ fontFamily: "Space Grotesk", fontSize: 72, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>
            {site.tagline}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#A3B0A9" }}>
          <span>{site.url.replace(/^https?:\/\//, "")}</span>
          <span>Get a quote within one business day</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: display, weight: 700, style: "normal" },
        { name: "Inter", data: body, weight: 600, style: "normal" },
      ],
    },
  );
}
