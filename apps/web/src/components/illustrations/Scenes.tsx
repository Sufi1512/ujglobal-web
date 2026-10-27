import { ArrowUpRight, Clock, Video } from "lucide-react";
import { BrandMark } from "@/components/Logo";
import { serviceLook } from "@/lib/catalog";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { LiveTime } from "./LiveTime";

/*
 * Larger illustrated scenes, drawn as SVG with the theme colour tokens so they follow light and dark mode,
 * stay sharp at any size and weigh a few kilobytes. All are decorative (hidden from screen readers); the text
 * beside each one carries the meaning.
 */

const SKIN = ["#d9a27a", "#8d5a3b", "#f0c9a5"];
const HAIR = "#2b1d14";

/* ---------- Globe: a remote team across time zones ---------- */

const PINS = [
  { x: 128, y: 142 }, // New York
  { x: 222, y: 124 }, // London
  { x: 262, y: 170 }, // Riyadh
  { x: 304, y: 206 }, // Singapore
  { x: 322, y: 272 }, // Sydney
];

function arc(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - Math.max(28, Math.abs(b.x - a.x) * 0.45);
  return `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`;
}

const ZONES = [
  { city: "New York", tz: "America/New_York", pos: "left-0 top-[24%]" },
  { city: "London", tz: "Europe/London", pos: "left-[34%] top-[2%]" },
  { city: "Riyadh", tz: "Asia/Riyadh", pos: "right-0 top-[30%]" },
  { city: "Singapore", tz: "Asia/Singapore", pos: "right-[6%] bottom-[16%]" },
];

export function GlobeScene({ className = "" }: { className?: string }) {
  const R = 160;
  return (
    <div className={`relative mx-auto w-full max-w-[560px] ${className}`} aria-hidden>
      <svg viewBox="0 0 400 400" className="h-auto w-full">
        <defs>
          <clipPath id="glb-clip">
            <circle cx="200" cy="200" r={R} />
          </clipPath>
          <pattern id="glb-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="1.7" fill="var(--link)" opacity="0.55" />
          </pattern>
          <radialGradient id="glb-shade" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="var(--surface)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r={R + 26} fill="var(--brand)" opacity="0.06" />
        <circle cx="200" cy="200" r={R} fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
        <g clipPath="url(#glb-clip)" fill="none" stroke="var(--line)" strokeWidth="1.5">
          {[0, 1, 2, 3].map((k) => (
            <ellipse key={k} cx="200" cy="200" rx={R} ry={R} className="svg-meridian" style={{ animationDelay: `${-k * 5}s` }} />
          ))}
          {[-115, -60, 0, 60, 115].map((d) => {
            const w = Math.sqrt(R * R - d * d);
            return <ellipse key={d} cx="200" cy={200 + d} rx={w} ry={w * 0.1} />;
          })}
        </g>
        <g clipPath="url(#glb-clip)" fill="url(#glb-dots)">
          <path d="M70 118q42-44 96-22q22 30-10 56q-30 10-26 46q-10 42-46 30q-36-20-30-62z" />
          <path d="M160 246q28-12 38 20q6 42-22 74q-22-10-26-48z" />
          <path d="M206 104q42-26 90-10q48 16 64 48q-10 32-48 26q-22-6-32 16q-22 10-38-10q-26-22-36-70z" />
          <path d="M214 178q34-12 50 16q12 44-16 82q-28-6-34-44z" />
          <path d="M300 252q26-8 42 8q0 22-26 24q-22-6-16-32z" />
        </g>
        <circle cx="200" cy="200" r={R} fill="url(#glb-shade)" />
        <g fill="none" stroke="var(--signal)" strokeWidth="2.5" strokeLinecap="round">
          {PINS.slice(0, -1).map((p, i) => (
            <path key={i} d={arc(p, PINS[i + 1])} className="draw-line" style={{ animationDelay: `${0.3 + i * 0.35}s` }} />
          ))}
        </g>
        {PINS.slice(0, -1).map((p, i) => (
          <circle
            key={i}
            r="4.5"
            fill="var(--signal)"
            stroke="var(--surface)"
            strokeWidth="1.5"
            className="svg-travel"
            style={{ offsetPath: `path("${arc(p, PINS[i + 1])}")`, offsetRotate: "0deg", animationDelay: `${1.8 + i * 0.8}s` }}
          />
        ))}
        {PINS.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6" fill="var(--brand)" className="svg-ping" style={{ animationDelay: `${i * 0.5}s` }} />
            <circle cx={p.x} cy={p.y} r="11" fill="var(--brand)" opacity="0.16" />
            <circle cx={p.x} cy={p.y} r="5.5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2.5" />
          </g>
        ))}
      </svg>
      {ZONES.map((z, i) => (
        <div
          key={z.city}
          className={`animate-float absolute flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lg ${z.pos}`}
          style={{ animationDelay: `${i * 0.7}s` }}
        >
          <Clock className="h-3.5 w-3.5 text-link" />
          <span className="text-[11px] leading-tight">
            <span className="block text-muted">{z.city}</span>
            <LiveTime timeZone={z.tz} className="block font-display text-sm font-bold" />
          </span>
        </div>
      ))}
      <div className="absolute bottom-[2%] left-[4%] flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-on-brand shadow-lg">
        <Video className="h-3.5 w-3.5" /> Calls in your working hours
      </div>
    </div>
  );
}

/* ---------- Team: planning together at a board ---------- */

function Head({ cx, cy, skin, hair = "short" }: { cx: number; cy: number; skin: string; hair?: "short" | "long" | "bun" }) {
  return (
    <g>
      {hair === "long" && <path d={`M${cx - 17} ${cy + 22}V${cy - 2}a17 17 0 0 1 34 0V${cy + 22}z`} fill={HAIR} />}
      <circle cx={cx} cy={cy} r="15" fill={skin} />
      <path d={`M${cx - 15.5} ${cy - 1}a15.5 15.5 0 0 1 31 0q-8-8-17-6q-9 1-14 6z`} fill={HAIR} />
      {hair === "bun" && <circle cx={cx + 4} cy={cy - 18} r="6.5" fill={HAIR} />}
    </g>
  );
}

function Note({ x, y, fill, lines = "var(--foreground)", rot = 0 }: { x: number; y: number; fill: string; lines?: string; rot?: number }) {
  return (
    <g transform={`rotate(${rot} ${x + 40} ${y + 17})`}>
      <rect x={x} y={y} width="80" height="34" rx="6" fill={fill} />
      <rect x={x + 9} y={y + 10} width="46" height="4" rx="2" fill={lines} opacity="0.4" />
      <rect x={x + 9} y={y + 19} width="30" height="4" rx="2" fill={lines} opacity="0.4" />
    </g>
  );
}

export function TeamScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" className={`h-auto w-full ${className}`} aria-hidden>
      <ellipse cx="250" cy="346" rx="220" ry="10" fill="var(--foreground)" opacity="0.06" />
      {/* Board */}
      <rect x="70" y="20" width="370" height="176" rx="16" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
      {[90, 205, 320].map((x, i) => (
        <g key={x}>
          <rect x={x} y="38" width="44" height="6" rx="3" fill="var(--foreground)" opacity="0.7" />
          <rect x={x + 50} y="38" width="14" height="6" rx="3" fill={["var(--signal)", "var(--line)", "var(--brand)"][i]} />
        </g>
      ))}
      <Note x={90} y={58} fill="var(--signal)" lines="var(--on-signal)" rot={-2} />
      <Note x={90} y={102} fill="var(--signal)" lines="var(--on-signal)" rot={1.5} />
      <g className="svg-note-move">
        <Note x={90} y={146} fill="var(--mist)" rot={-1} />
      </g>
      <Note x={205} y={58} fill="var(--mist)" rot={1} />
      <Note x={205} y={102} fill="color-mix(in srgb, var(--brand) 18%, var(--surface))" rot={-1.5} />
      <Note x={320} y={58} fill="var(--brand)" lines="var(--on-brand)" rot={-1} />
      <Note x={320} y={102} fill="var(--brand)" lines="var(--on-brand)" rot={2} />
      <circle cx="392" cy="75" r="7" fill="var(--on-brand)" />
      <path d="M388.5 75l2.5 2.5 4.5-5" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
      <path d="M172 78q16 0 30 0" stroke="var(--muted)" strokeWidth="2" strokeDasharray="3 4" fill="none" />
      <path d="M287 122q18-30 30-44" stroke="var(--muted)" strokeWidth="2" strokeDasharray="3 4" fill="none" />

      {/* Standing person pointing at the board */}
      <rect x="44" y="290" width="11" height="52" rx="5" fill="var(--foreground)" opacity="0.85" />
      <rect x="62" y="290" width="11" height="52" rx="5" fill="var(--foreground)" opacity="0.85" />
      <path d="M38 298l4-96q2-22 18-22h0q16 0 18 22l4 96z" fill="var(--brand)" />
      <g className="svg-point" style={{ transformOrigin: "72px 198px" }}>
        <path d="M72 198l34-46" stroke="var(--brand)" strokeWidth="12" strokeLinecap="round" />
        <circle cx="108" cy="148" r="6.5" fill={SKIN[0]} />
      </g>
      <Head cx={59} cy={160} skin={SKIN[0]} hair="bun" />

      {/* Table, laptop, mug and plant */}
      <rect x="146" y="282" width="12" height="62" rx="4" fill="var(--line)" />
      <rect x="430" y="282" width="12" height="62" rx="4" fill="var(--line)" />

      {/* Seated person, left */}
      <g className="svg-nod">
        <Head cx={226} cy={214} skin={SKIN[1]} />
      </g>
      <path d="M196 284l3-36q2-14 18-16h18q16 2 18 16l3 36z" fill="var(--signal)" />
      {/* Seated person, right */}
      <g className="svg-nod" style={{ animationDelay: "-1.8s" }}>
        <Head cx={388} cy={214} skin={SKIN[2]} hair="long" />
      </g>
      <path d="M358 284l3-36q2-14 18-16h18q16 2 18 16l3 36z" fill="var(--foreground)" opacity="0.88" />

      <path d="M282 236h70l-6 40h-58z" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
      <circle cx="317" cy="256" r="4" fill="var(--signal)" className="svg-glow" />
      <rect x="132" y="272" width="324" height="14" rx="7" fill="var(--line)" />
      <rect x="272" y="268" width="90" height="6" rx="3" fill="var(--muted)" opacity="0.6" />
      <rect x="180" y="254" width="15" height="18" rx="4" fill="var(--brand)" />
      <path d="M195 258q7 0 7 5t-7 5" fill="none" stroke="var(--brand)" strokeWidth="2.5" />
      <rect x="150" y="252" width="20" height="20" rx="4" fill="var(--mist)" stroke="var(--line)" strokeWidth="1.5" />
      <g className="svg-sway">
        <ellipse cx="154" cy="240" rx="6" ry="13" fill="var(--link)" transform="rotate(-20 154 240)" />
        <ellipse cx="166" cy="238" rx="6" ry="14" fill="var(--link)" opacity="0.75" transform="rotate(18 166 238)" />
      </g>

      {/* Speech bubble */}
      <rect x="408" y="148" width="62" height="32" rx="12" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
      <path d="M418 179l-6 12 16-11" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" />
      {[426, 439, 452].map((x, i) => (
        <circle key={x} cx={x} cy="164" r="3.5" fill="var(--muted)" className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </svg>
  );
}

/* ---------- Growth: a results dashboard ---------- */

export function GrowthScene({ className = "" }: { className?: string }) {
  const pts = [
    [40, 196],
    [92, 184],
    [144, 190],
    [196, 160],
    [248, 150],
    [300, 118],
    [352, 104],
    [404, 70],
  ];
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join("");
  return (
    <div className={`relative ${className}`} aria-hidden>
      <svg viewBox="0 0 440 300" className="h-auto w-full">
        <rect x="1" y="1" width="438" height="298" rx="18" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
        <rect x="24" y="24" width="96" height="9" rx="4.5" fill="var(--foreground)" opacity="0.75" />
        <rect x="24" y="40" width="60" height="6" rx="3" fill="var(--muted)" opacity="0.5" />
        {["Week", "Month", "Year"].map((t, i) => (
          <rect key={t} x={300 + i * 40} y="24" width="34" height="18" rx="9" fill={i === 1 ? "var(--brand)" : "var(--mist)"} />
        ))}
        {[80, 125, 170, 215].map((y) => (
          <line key={y} x1="40" x2="404" y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 5" />
        ))}
        <path d={`${line}L404 215L40 215z`} fill="var(--brand)" opacity="0.14" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="draw-line" style={{ strokeDasharray: 600, strokeDashoffset: 600 }} />
        <g className="svg-sweep">
          <line x1="40" x2="40" y1="70" y2="215" stroke="var(--brand)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
          <rect x="16" y="56" width="48" height="16" rx="8" fill="var(--foreground)" />
          <rect x="26" y="62" width="28" height="4" rx="2" fill="var(--background)" />
        </g>
        <circle cx="404" cy="70" r="7" fill="var(--signal)" className="svg-ping" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 6 : 3.5} fill={i === pts.length - 1 ? "var(--signal)" : "var(--surface)"} stroke="var(--brand)" strokeWidth="2.5" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={24 + i * 102} y="236" width="92" height="44" rx="10" fill="var(--mist)" />
            <rect x={34 + i * 102} y="246" width="40" height="5" rx="2.5" fill="var(--muted)" opacity="0.5" />
            <rect x={34 + i * 102} y="258" width={[52, 38, 46, 30][i]} height="10" rx="5" fill="var(--foreground)" opacity="0.7" />
          </g>
        ))}
      </svg>
      <div className="animate-float absolute bottom-[30%] right-[8%] flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-signal text-on-signal">
          <ArrowUpRight className="h-4 w-4" />
        </span>
        <span className="text-[11px] leading-tight">
          <span className="block text-muted">Enquiries</span>
          <span className="font-display text-sm font-bold">Trending up</span>
        </span>
      </div>
    </div>
  );
}

/* ---------- Orbit: every service around one team ---------- */

export function ServiceOrbit({ slugs, className = "" }: { slugs: string[]; className?: string }) {
  const items = slugs.slice(0, 8);
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[520px] ${className}`} aria-hidden>
      <div className="animate-orbit absolute inset-[6%] rounded-full border border-dashed border-line" />
      <div className="absolute inset-[26%] rounded-full border border-line bg-surface/60" />
      <div className="glow-brand absolute inset-[20%] opacity-70" />
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center">
        <span className="animate-pulse-ring rounded-3xl bg-surface p-3 shadow-xl ring-1 ring-line">
          <BrandMark size={64} />
        </span>
        <span className="font-display text-sm font-bold">One team</span>
      </div>
      <div className="animate-orbit absolute inset-0">
      {items.map((slug, i) => {
        const { icon: Icon, short } = serviceLook(slug);
        const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
        const left = 50 + 44 * Math.cos(a);
        const top = 50 + 44 * Math.sin(a);
        return (
          <div
            key={slug}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div className="animate-orbit-reverse flex flex-col items-center gap-1.5">
            <span
              className={`animate-float grid h-14 w-14 place-items-center rounded-2xl shadow-lg ring-1 ring-line ${i % 3 === 0 ? "bg-brand text-on-brand" : i % 3 === 1 ? "bg-surface text-link" : "bg-signal text-on-signal"}`}
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              <Icon className="h-6 w-6" />
            </span>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold shadow-sm ring-1 ring-line">{short}</span>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ---------- Collage: several projects at once ---------- */

export function WorkCollage({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[600px] pb-10 ${className}`} aria-hidden>
      <div className="w-[78%] -rotate-3">
        <div className="animate-float-slow">
          <ServiceVisual kind="seo" />
        </div>
      </div>
      <div className="relative -mt-[38%] ml-auto w-[78%] rotate-2">
        <div className="animate-float">
          <ServiceVisual kind="ai" />
        </div>
      </div>
      <div className="animate-float absolute bottom-0 left-[6%] flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
        <span className="rounded-full border border-foreground/60 px-2 py-0.5 text-[10px] font-semibold">Demo project</span>
        <span className="text-xs font-medium">Clearly labelled</span>
      </div>
    </div>
  );
}
