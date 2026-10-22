# UJ Global brand: Signal

Chosen 23 Oct 2026 from three directions (Signal, Meridian, Prism). Crisp and technical: deep ink, an electric blue for actions and a signal green for proof points. It reads as credible for all four service lines without boxing us into "AI only".

The code is the source of truth: colours live in `apps/web/src/app/globals.css`, the mark in `apps/web/src/components/Logo.tsx`.

## Logo

The mark is a **U whose right side runs into the hook of a J as one connected line**: we wire systems together. White U, Signal-green J, on a rounded tile.

| Use | Tile | Where |
| --- | --- | --- |
| On light backgrounds | Ink `#0B1530` | Site header and footer in light mode, favicon, app icons |
| On dark backgrounds | Electric `#2A4BF0` | Dark mode, share image |

- Lockup: mark plus "UJ Global" in Space Grotesk 600, gap ≈ 1/3 of the mark's size.
- Clear space: at least half the mark's width on every side.
- Minimum size: 16 px (favicon). Below 40 px the strokes are drawn thicker so the J's hook stays visible.
- Don't: recolour the U or J, outline the mark, put it on a busy photo without a solid tile, stretch it, or set the wordmark in another font.

Files: `apps/web/src/app/icon.svg` (browsers), `favicon.ico` (16/32/48 px), `apple-icon.png` (180 px), and `opengraph-image.tsx` / `twitter-image.tsx` (1200×630 share image, generated at build).

## Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `foreground` (Ink) | `#0B1530` | `#EEF1F8` | Body text and headings |
| `muted` (Slate) | `#4A5672` | `#A3AEC6` | Secondary text |
| `background` | `#FFFFFF` | `#0A1128` | Page |
| `mist` | `#F3F5FA` | `#111A36` | Alternate sections (hero) |
| `line` | `#E3E7F0` | `#222D4D` | Borders, dividers |
| `brand` (Electric) | `#2A4BF0` | `#2A4BF0` | **Fills** with white text: buttons, CTA panels |
| `link` | `#2A4BF0` | `#8EA0FF` | **Text** in blue: links, metrics, step numbers, focus rings |
| `signal` | `#19D38A` | `#19D38A` | **Fills only**: pills, highlights, "Contacted" status |
| `on-signal` | `#0B1530` | `#0B1530` | Text on Signal |

Every text pairing passes WCAG AA (4.5:1) in both themes; an automated axe-core scan of the public and admin pages in light and dark is clean. Two rules keep it that way:

1. **Blue text uses `link`, never `brand`.** One blue can't be both a white-text button fill and readable text on the dark background.
2. **Signal green is never used for text.** It's 3.1:1 on white; always put Ink text on it.

## Typography

| Role | Font | Weights |
| --- | --- | --- |
| Headings, wordmark, big numbers | Space Grotesk | 600, 700 |
| Body and interface | Inter | 400, 500, 600 |

Headings use tight tracking (`tracking-tight`). Body copy at 16–18 px, line height ~1.6. Both fonts are self-hosted by Next.js at build; the share image uses the `@fontsource` copies.

## Shape and voice

- Rounded corners: pills for buttons and badges, 16 px for cards, 24 px for large panels.
- Borders over shadows; the Mist background separates sections.
- No gradient washes, no stock "AI glow".
- Copy: plain and specific. Say what we build and what it changes; no prices anywhere (every page ends with "Get a quote").
- Demo projects are always labelled "Demo project" (an outlined Ink badge).
