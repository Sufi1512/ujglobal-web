import { Check, Search, Sparkles } from "lucide-react";
import type { VisualKind } from "@/lib/catalog";

/*
 * Illustrations drawn in HTML and CSS rather than photos: they use the theme tokens, so they match the
 * brand in light and dark, stay sharp at any size and weigh almost nothing. They are decorative, so
 * they're hidden from screen readers; the text next to them carries the meaning.
 */

function Frame({ children, label, className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_60px_-30px_rgba(16,32,28,0.35)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        {label && (
          <span className="ml-3 flex-1 truncate rounded-md bg-mist px-3 py-1 text-[11px] text-muted">{label}</span>
        )}
      </div>
      {children}
    </div>
  );
}

const Bar = ({ w, className = "" }: { w: string; className?: string }) => (
  <div className={`h-2 rounded-full bg-foreground/10 ${className}`} style={{ width: w }} />
);

function Ring({ value, label }: { value: number; label: string }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 36 36" className="h-12 w-12">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle
          transform="rotate(-90 18 18)"
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
        />
        <text x="18" y="21.5" textAnchor="middle" className="fill-foreground font-display text-[10px] font-bold">
          {value}
        </text>
      </svg>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}

function WebVisual() {
  return (
    <Frame label="yourbrand.com">
      <div className="grid gap-4 p-5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded-full bg-foreground/80" />
          <div className="flex gap-2">
            <Bar w="28px" />
            <Bar w="28px" />
            <div className="h-5 w-14 rounded-md bg-brand" />
          </div>
        </div>
        <div className="grid grid-cols-5 items-center gap-4 rounded-xl bg-mist p-4">
          <div className="col-span-3 space-y-2">
            <div className="h-3.5 w-11/12 rounded-full bg-foreground/80" />
            <div className="h-3.5 w-8/12 rounded-full bg-foreground/80" />
            <Bar w="90%" className="mt-3" />
            <Bar w="70%" />
            <div className="mt-3 h-5 w-20 rounded-md bg-brand" />
          </div>
          <div className="col-span-2 aspect-square rounded-xl bg-[linear-gradient(135deg,var(--brand),color-mix(in_srgb,var(--signal)_80%,var(--brand)))] opacity-90" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-3">
              <div className="h-5 w-5 rounded-md bg-signal" />
              <Bar w="80%" />
              <Bar w="60%" />
            </div>
          ))}
        </div>
        <div className="flex justify-around rounded-xl border border-line py-3">
          <Ring value={98} label="Performance" />
          <Ring value={100} label="Accessibility" />
          <Ring value={100} label="SEO" />
        </div>
      </div>
    </Frame>
  );
}

function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-[190px] rounded-[2rem] border-[6px] border-foreground bg-surface p-3 shadow-[0_30px_60px_-25px_rgba(16,32,28,0.5)] ${className}`}>
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-foreground/80" />
      {children}
    </div>
  );
}

function MobileVisual() {
  return (
    <div className="relative flex h-[380px] items-center justify-center">
      <Phone className="absolute -translate-x-24 translate-y-6 -rotate-6 opacity-70">
        <div className="space-y-2">
          <div className="h-24 rounded-xl bg-mist" />
          <Bar w="70%" />
          <Bar w="50%" />
          <div className="h-16 rounded-xl bg-mist" />
          <Bar w="60%" />
        </div>
      </Phone>
      <Phone className="relative z-10 translate-x-10 animate-float">
        <p className="text-[10px] text-muted">Good morning</p>
        <p className="font-display text-sm font-bold">Your week</p>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand p-3 text-on-brand">
          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="66 88" />
          </svg>
          <div>
            <p className="font-display text-base font-bold leading-none">75%</p>
            <p className="text-[10px] opacity-80">of goal</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {["Order shipped", "New message", "Booking confirmed"].map((t, i) => (
            <div key={t} className="flex items-center gap-2 rounded-lg border border-line p-2">
              <span className={`h-6 w-6 rounded-md ${i === 0 ? "bg-signal" : "bg-mist"}`} />
              <span className="text-[10px] font-medium">{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-around border-t border-line pt-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 w-5 rounded-full ${i === 0 ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
      </Phone>
    </div>
  );
}

function AiVisual() {
  return (
    <Frame label="Support assistant">
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {["Help centre", "Orders", "Returns policy"].map((s) => (
            <span key={s} className="rounded-full border border-line bg-mist px-3 py-1 text-muted">
              {s}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 font-medium text-on-brand animate-pulse-ring">
            <Sparkles className="h-3 w-3" aria-hidden /> AI
          </span>
        </div>
        <div className="space-y-3 text-[13px] leading-snug">
          <p className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-on-brand">Can I return shoes I wore once?</p>
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-mist px-4 py-2.5">
            Yes, within 30 days if they&apos;re clean and in the original box. I can start the return for order #1042 now.
            <p className="mt-2 text-[10px] text-muted">Source: Returns policy, section 2</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-link px-3 py-1 text-[11px] font-medium text-link">Start return</span>
            <span className="rounded-full border border-line px-3 py-1 text-[11px] text-muted">Talk to a person</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function AgentsVisual() {
  const steps = [
    { t: "New invoice email", s: "Trigger" },
    { t: "Read PDF and extract fields", s: "Agent" },
    { t: "Match purchase order", s: "Agent" },
    { t: "Approve over $5,000", s: "Person" },
    { t: "Post to accounting", s: "Done" },
  ];
  return (
    <Frame label="Invoice workflow">
      <ol className="relative space-y-3 p-5">
        <span className="absolute bottom-9 left-[38px] top-9 w-px bg-line" aria-hidden />
        {steps.map((step, i) => (
          <li key={step.t} className="animate-pop relative flex items-center gap-3" style={{ animationDelay: `${i * 160}ms` }}>
            <span
              className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                step.s === "Person" ? "bg-signal text-on-signal" : "bg-brand text-on-brand"
              }`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="flex flex-1 items-center justify-between rounded-xl border border-line px-3 py-2.5">
              <span className="text-[13px] font-medium">{step.t}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted">{step.s}</span>
            </div>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

function SeoVisual() {
  const bars = [22, 28, 26, 35, 41, 48, 55, 63, 70, 82, 90, 100];
  return (
    <Frame label="Search">
      <div className="grid gap-4 p-5">
        <div className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[12px] text-muted">
          <Search className="h-3.5 w-3.5" aria-hidden /> best accounting software for clinics
        </div>
        <div className="rounded-xl border border-link/40 bg-brand/5 p-3">
          <p className="text-[10px] text-muted">yourbrand.com › clinics</p>
          <p className="text-[13px] font-semibold text-link">Accounting built for clinics | Your Brand</p>
          <Bar w="92%" className="mt-2" />
          <Bar w="70%" className="mt-1.5" />
        </div>
        <div className="space-y-1.5 opacity-60">
          <Bar w="50%" />
          <Bar w="80%" />
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-muted">Organic visits, 12 months</span>
            <span className="rounded-full bg-signal px-2 py-0.5 text-[10px] font-semibold text-on-signal">Growing</span>
          </div>
          <div className="mt-3 flex h-24 items-end gap-1.5">
            {bars.map((h, i) => (
              <span
                key={i}
                className="animate-rise flex-1 rounded-t bg-brand"
                style={{ height: `${h}%`, opacity: 0.35 + (i / bars.length) * 0.65, animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function DesignVisual() {
  return (
    <Frame label="Design system">
      <div className="relative grid grid-cols-5 gap-4 bg-[radial-gradient(var(--line)_1px,transparent_1px)] p-5 [background-size:14px_14px]">
        <div className="col-span-3 space-y-3 rounded-xl border border-line bg-surface p-4">
          <div className="h-3 w-24 rounded-full bg-foreground/80" />
          <Bar w="85%" />
          <Bar w="60%" />
          <div className="flex gap-2 pt-1">
            <span className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-medium text-on-brand">Primary</span>
            <span className="rounded-lg border border-line px-3 py-1.5 text-[11px]">Secondary</span>
          </div>
          <div className="rounded-lg border border-dashed border-link p-2 text-[10px] text-link">Card · 16 px radius</div>
        </div>
        <div className="col-span-2 space-y-3">
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[10px] text-muted">Colour</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {["bg-foreground", "bg-brand", "bg-signal", "bg-mist"].map((c) => (
                <span key={c} className={`aspect-square rounded-md border border-line ${c}`} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[10px] text-muted">Type</p>
            <p className="font-display text-2xl font-bold leading-none">Aa</p>
            <p className="text-[10px] text-muted">Space Grotesk</p>
          </div>
        </div>
        <div className="animate-float absolute bottom-8 right-10 flex items-center gap-1">
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-brand">
            <path d="M1 1l5.5 14 2-5.5L14 7.5z" />
          </svg>
          <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-medium text-on-brand">You</span>
        </div>
      </div>
    </Frame>
  );
}

function CloudVisual() {
  const uptime = Array.from({ length: 30 }, (_, i) => (i === 17 ? "bg-signal" : "bg-brand"));
  return (
    <Frame label="Pipeline · main">
      <div className="grid gap-4 p-5">
        <div className="grid grid-cols-4 gap-2">
          {["Build", "Test", "Scan", "Deploy"].map((s, i) => (
            <div key={s} className="animate-pop rounded-xl border border-line p-3 text-center" style={{ animationDelay: `${i * 200}ms` }}>
              <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-brand text-on-brand">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              <p className="mt-1.5 text-[11px] font-medium">{s}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-foreground p-4 font-mono text-[11px] leading-relaxed text-background">
          <p>
            <span className="opacity-60">$</span> deploy production
          </p>
          <p className="opacity-70">✓ images pulled · backup taken</p>
          <p className="opacity-70">✓ migrations applied</p>
          <p>✓ healthy in 14s, live</p>
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted">Uptime, 30 days</span>
            <span className="font-semibold">99.98%</span>
          </div>
          <div className="mt-2 flex gap-[3px]">
            {uptime.map((c, i) => (
              <span key={i} className={`h-6 flex-1 rounded-sm ${c}`} />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function GenericVisual() {
  return (
    <Frame>
      <div className="grid gap-3 p-6">
        <div className="h-4 w-40 rounded-full bg-foreground/80" />
        <Bar w="90%" />
        <Bar w="75%" />
        <div className="mt-2 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-mist" />
          ))}
        </div>
      </div>
    </Frame>
  );
}

const VISUALS: Record<VisualKind, () => React.ReactElement> = {
  web: WebVisual,
  mobile: MobileVisual,
  ai: AiVisual,
  agents: AgentsVisual,
  seo: SeoVisual,
  design: DesignVisual,
  cloud: CloudVisual,
  generic: GenericVisual,
};

export function ServiceVisual({ kind, className = "" }: { kind: VisualKind; className?: string }) {
  const Visual = VISUALS[kind];
  return (
    <div aria-hidden className={`select-none ${className}`}>
      <Visual />
    </div>
  );
}
