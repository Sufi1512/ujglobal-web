import { Gauge, Smartphone } from "lucide-react";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";

/*
 * The hero's picture of what we build: a fast website with an app on a phone in front of it, drawn in
 * the theme colours (so it matches light and dark). Decorative; the headline carries the meaning.
 */
function PhoneMock() {
  return (
    <div className="w-[170px] rounded-[1.8rem] border-[5px] border-foreground bg-surface p-3 shadow-[0_30px_60px_-25px_rgba(16,32,28,0.55)]">
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-foreground/80" />
      <p className="text-[9px] text-muted">Good morning</p>
      <p className="font-display text-xs font-bold">Your bookings</p>
      <div className="mt-2.5 rounded-xl bg-brand p-2.5 text-on-brand">
        <p className="text-[9px] opacity-90">Next appointment</p>
        <p className="font-display text-sm font-bold leading-tight">Thu, 10:30</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-on-brand/25">
          <div className="h-1.5 w-2/3 rounded-full bg-on-brand" />
        </div>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {["Confirmed", "Reminder sent", "Invoice paid"].map((t, i) => (
          <div key={t} className="flex items-center gap-2 rounded-lg border border-line p-1.5">
            <span className={`h-5 w-5 rounded-md ${i === 0 ? "bg-signal" : "bg-mist"}`} />
            <span className="text-[9px] font-medium">{t}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-around border-t border-line pt-2">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 w-4 rounded-full ${i === 0 ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[540px] select-none pb-12">
      <ServiceVisual kind="web" />
      <div className="animate-float absolute -bottom-2 -left-2 hidden sm:block lg:-left-10">
        <PhoneMock />
      </div>

      <div className="animate-float-slow absolute -top-6 right-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-signal text-on-signal">
          <Gauge className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] text-muted">Built for speed</p>
          <p className="font-display text-sm font-bold">Core Web Vitals</p>
        </div>
      </div>
      <div className="animate-float absolute -bottom-10 right-4 hidden items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg sm:flex lg:-right-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-on-brand">
          <Smartphone className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] text-muted">Web, iOS and Android</p>
          <p className="font-display text-sm font-bold">One team, end to end</p>
        </div>
      </div>
    </div>
  );
}
