"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60) };
}

/** Live countdown to an ISO timestamp. Renders a stable placeholder until hydrated. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const p = now === null ? null : parts(target - now);
  const items: [string, number | undefined][] = [
    ["Days", p?.days],
    ["Hours", p?.hours],
    ["Minutes", p?.minutes],
  ];
  return (
    <div className={className} role="timer" aria-label="Time until the program starts">
      <dl className="flex gap-3">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-16 rounded-lg bg-white/10 px-3 py-2 text-center ring-1 ring-white/15">
            <dd className="font-heading text-3xl leading-none tabular-nums">{value ?? "–"}</dd>
            <dt className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/70">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
