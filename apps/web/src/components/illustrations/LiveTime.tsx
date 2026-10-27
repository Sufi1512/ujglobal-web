"use client";

import { useEffect, useState } from "react";

function timeIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

/**
 * The current time in a city (24-hour, e.g. 14:05), updated on the minute. The server renders the time
 * at request time; the browser then takes over, so the first paint already shows a real time.
 */
export function LiveTime({ timeZone, className = "" }: { timeZone: string; className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    let interval: ReturnType<typeof setInterval> | undefined;
    // Tick exactly on the next minute boundary, then every minute after that.
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <time dateTime={now.toISOString()} className={`tabular-nums ${className}`} suppressHydrationWarning>
      {timeIn(timeZone, now)}
    </time>
  );
}
