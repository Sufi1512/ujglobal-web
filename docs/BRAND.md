# UJ Global brand: Forest

Chosen 23 Oct 2026 (option B of three: Midnight + Lime, Forest + Cream, Charcoal + Ember), replacing the first "Signal" palette, whose electric blue felt generic. Warm and confident: a cream page, deep pine text, forest green for actions and an amber accent for highlights. It reads as a calm, senior studio rather than another blue tech site.

The code is the source of truth: colours live in `apps/web/src/app/globals.css`, the mark in `apps/web/src/components/Logo.tsx`.

## Logo

The mark is a **U whose right side runs into the hook of a J as one connected line**: we wire systems together. White U, amber J, on a rounded tile.

| Use | Tile | Where |
| --- | --- | --- |
| On light backgrounds | Pine `#10201C` | Site header and footer in light mode, favicon, app icons |
| On dark backgrounds | Forest `#0F6B54` | Dark mode, share image |

- Lockup: mark plus "UJ Global" in Space Grotesk 600, gap ≈ 1/3 of the mark's size.
- Clear space: at least half the mark's width on every side.
- Minimum size: 16 px (favicon). Below 40 px the strokes are drawn thicker so the J's hook stays visible.
- Don't: recolour the U or J, outline the mark, put it on a busy photo without a solid tile, stretch it, or set the wordmark in another font.

Files: `apps/web/src/app/icon.svg` (browsers), `favicon.ico` (16/32/48 px), `apple-icon.png` (180 px), and `opengraph-image.tsx` / `twitter-image.tsx` (1200×630 share image, generated at build).

## Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `foreground` (Pine) | `#10201C` | `#EEF0E9` | Body text and headings |
| `muted` (Sage) | `#55645F` | `#A3B0A9` | Secondary text |
| `background` (Cream) | `#F6F3EC` | `#0D1613` | Page |
| `surface` | `#FFFFFF` | `#131F1B` | Cards, panels, form fields |
| `mist` | `#EFEADF` | `#111C18` | Alternate sections |
| `line` | `#E4DED1` | `#24332D` | Borders, dividers |
| `brand` (Forest) | `#0F6B54` | `#3CB58F` | **Fills**: buttons, CTA panels, always with `on-brand` text |
| `on-brand` | `#FFFFFF` | `#0D1613` | Text on Forest |
| `link` | `#0F6B54` | `#6FD0AF` | **Text** in green: links, metrics, step numbers, focus rings |
| `signal` (Amber) | `#E8A33D` | `#F0B357` | **Fills only**: pills, highlights, "Contacted" status, the J |
| `on-signal` | `#10201C` | `#10201C` | Text on Amber |

The site opens in **light**; visitors can switch to dark with the sun/moon button in the header, and the choice is remembered on their device (it doesn't follow the device's own setting).

Every text pairing passes WCAG AA (4.5:1) in both themes (lowest: muted on mist, 5.2:1). Two rules keep it that way:

1. **Green text uses `link`, never `brand`, and button text uses `on-brand`, never white.** Dark mode uses a lighter green fill with dark text.
2. **Amber is never used for text.** Always put Pine text on it.

## Typography

| Role | Font | Weights |
| --- | --- | --- |
| Headings, wordmark, big numbers | Space Grotesk | 600, 700 |
| Body and interface | Inter | 400, 500, 600 |

Headings use tight tracking (`tracking-tight`). Body copy at 16–18 px, line height ~1.6. Both fonts are self-hosted by Next.js at build; the share image uses the `@fontsource` copies.

## Shape and voice

- Rounded corners: pills for badges, 12 px for buttons, 16 px for cards, 24 px for large panels.
- White cards on the cream page, with a thin border; soft shadows only on floating elements.
- A faint grid and soft green/amber glow behind the hero only; no gradients on text or buttons.
- Copy: plain and specific. Say what we build and what it changes; no prices anywhere (every page ends with "Get a quote").
- Demo projects are always labelled "Demo project" (an outlined Pine badge).
