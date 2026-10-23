"use client";

import { Gauge, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

/*
 * The hero's moving product preview: a support assistant answering a customer, message by message,
 * in a loop. It's decorative (aria-hidden); people who prefer reduced motion see the finished chat.
 */

const SCRIPT: { from: "user" | "bot"; text: string }[] = [
  { from: "user", text: "Where is my order #1042?" },
  { from: "bot", text: "It shipped this morning and arrives Thursday. Here's your tracking link." },
  { from: "user", text: "Can I change the delivery address?" },
  { from: "bot", text: "Done, it's now going to your office address. Anything else I can help with?" },
];

export function HeroShowcase() {
  const [shown, setShown] = useState(SCRIPT.length);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));

    async function play() {
      while (!cancelled) {
        setShown(0);
        await wait(700);
        for (let i = 0; i < SCRIPT.length && !cancelled; i++) {
          if (SCRIPT[i].from === "bot") {
            setTyping(true);
            await wait(1300);
            setTyping(false);
          } else {
            await wait(600);
          }
          setShown(i + 1);
          await wait(900);
        }
        await wait(4000);
      }
    }
    play();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[520px] select-none">
      <div className="rounded-3xl border border-line bg-surface p-4 shadow-[0_40px_80px_-40px_rgba(16,32,28,0.45)] sm:p-5">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-on-brand">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Store assistant</p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Online · answers from your help centre
            </p>
          </div>
        </div>
        <div className="flex min-h-[260px] flex-col justify-end gap-3 pt-4 text-sm leading-snug">
          {SCRIPT.slice(0, shown).map((m, i) =>
            m.from === "user" ? (
              <p key={i} className="animate-pop ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-on-brand">
                {m.text}
              </p>
            ) : (
              <p key={i} className="animate-pop max-w-[85%] rounded-2xl rounded-bl-sm bg-mist px-4 py-2.5">
                {m.text}
              </p>
            ),
          )}
          {typing && (
            <span className="animate-pop flex w-16 items-center justify-center gap-1 rounded-2xl rounded-bl-sm bg-mist px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm text-muted">
          Ask anything about your order…
        </div>
      </div>

      <div className="animate-float absolute -top-7 right-4 hidden items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-signal text-on-signal">
          <Gauge className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] text-muted">Built for speed</p>
          <p className="font-display text-sm font-bold">Core Web Vitals</p>
        </div>
      </div>
      <div className="animate-float-slow absolute -bottom-6 -right-2 hidden items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg sm:-right-8 sm:flex">
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
