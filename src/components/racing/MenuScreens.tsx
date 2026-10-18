"use client";

import { useMemo, useState } from "react";
import CarPreview from "./CarPreview";
import { CAR_SPECS } from "@/game/cars";
import { TRACK_SPECS, type TrackSpec } from "@/game/tracks";
import { fa, fmtTime } from "./Hud";
import type { Difficulty } from "@/game/engine";

/* catmull-rom closed path for track preview cards */
function trackPath(pts: [number, number][]): string {
  const P = pts.map(([x, z]) => ({ x, y: z }));
  const n = P.length;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let t = 0; t < 10; t++) {
      const u = t / 10, u2 = u * u, u3 = u2 * u;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  const xs = out.map((p) => p.x), ys = out.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);
  const ox = (span - (maxX - minX)) / 2, oy = (span - (maxY - minY)) / 2;
  const norm = out.map((p) => [((p.x - minX + ox) / span) * 84 + 8, ((p.y - minY + oy) / span) * 84 + 8] as const);
  return "M" + norm.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-white/60">{label}</span>
        <span className="font-mono font-bold text-white/90">{fa(Math.round(value))}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

/* ---------------- main menu ---------------- */

export function Menu({
  carId, trackId, laps, difficulty, sound,
  onCar, onTrack, onLaps, onDifficulty, onSound, onStart, onFullscreen, bestLap,
}: {
  carId: string;
  trackId: string;
  laps: number;
  difficulty: Difficulty;
  sound: boolean;
  onCar: () => void;
  onTrack: () => void;
  onLaps: (n: number) => void;
  onDifficulty: (d: Difficulty) => void;
  onSound: (b: boolean) => void;
  onStart: () => void;
  onFullscreen: () => void;
  bestLap: number | null;
}) {
  const car = CAR_SPECS.find((c) => c.id === carId)!;
  const track = TRACK_SPECS.find((t) => t.id === trackId)!;
  return (
    <div className="relative flex h-full flex-col overflow-y-auto touch-pan-y bg-[radial-gradient(ellipse_at_top,#141433_0%,#05050c_60%)] px-4 py-5">
      <button
        onClick={onFullscreen}
        aria-label="تمام صفحه"
        className="absolute left-3 top-3 z-10 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-white/70 active:scale-95"
      >
        ⛶
      </button>

      <div className="mt-3 text-center">
        <h1 className="neon-title text-4xl font-black tracking-tight sm:text-5xl">توربو نئون</h1>
        <p className="mt-1 text-xs font-bold tracking-[0.35em] text-cyan-300/70">N E O N &nbsp; T U R B O &nbsp; G P</p>
      </div>

      {/* selections */}
      <div className="mx-auto mt-5 grid w-full max-w-md grid-cols-2 gap-3">
        <button onClick={onCar} className="group rounded-2xl border border-white/10 bg-white/5 p-3 text-right backdrop-blur-sm transition-colors active:border-cyan-300/50 sm:hover:border-cyan-300/50">
          <div className="text-[10px] text-white/50">ماشین تو</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-5 w-5 rounded-md border border-white/20" style={{ background: `#${car.color.toString(16).padStart(6, "0")}` }} />
            <span className="text-lg font-black text-white">{car.name}</span>
          </div>
          <div className="mt-1.5 text-[11px] text-cyan-300/80">تغییر ماشین ←</div>
        </button>
        <button onClick={onTrack} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-right backdrop-blur-sm transition-colors active:border-cyan-300/50 sm:hover:border-cyan-300/50">
          <div className="text-[10px] text-white/50">پیست</div>
          <div className="mt-1 truncate text-lg font-black text-white">{track.name}</div>
          <div className="mt-1.5 text-[11px] text-cyan-300/80">{track.theme === "neon" ? "🌙 شب" : "☀️ روز"} • بهترین: {fmtTime(bestLap)} ←</div>
        </button>
      </div>

      {/* settings */}
      <div className="mx-auto mt-3 w-full max-w-md space-y-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">تعداد دور</span>
          <div className="flex gap-1.5" dir="ltr">
            {[2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => onLaps(n)}
                className={`h-8 w-9 rounded-lg font-mono text-sm font-bold transition-colors ${laps === n ? "bg-cyan-400/90 text-black" : "bg-white/10 text-white/70"}`}
              >
                {fa(n)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">درجه سختی</span>
          <div className="flex gap-1.5">
            {([["easy", "آسان"], ["normal", "معمولی"], ["hard", "سخت"]] as [Difficulty, string][]).map(([d, lbl]) => (
              <button
                key={d}
                onClick={() => onDifficulty(d)}
                className={`h-8 rounded-lg px-3 text-xs font-bold transition-colors ${difficulty === d ? "bg-amber-400/90 text-black" : "bg-white/10 text-white/70"}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">صدای موتور</span>
          <button
            onClick={() => onSound(!sound)}
            className={`h-8 rounded-lg px-4 text-xs font-bold transition-colors ${sound ? "bg-lime-400/90 text-black" : "bg-white/10 text-white/50"}`}
          >
            {sound ? "🔊 روشن" : "🔇 خاموش"}
          </button>
        </div>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md pb-4">
        <button
          onClick={onStart}
          className="w-full rounded-2xl bg-gradient-to-l from-lime-400 via-cyan-400 to-fuchsia-500 py-4 text-xl font-black text-black shadow-[0_0_35px_rgba(34,230,230,0.35)] transition-transform active:scale-[0.98]"
        >
          🏁 شروع مسابقه
        </button>
        <p className="mt-3 text-center text-[11px] leading-5 text-white/40">
          ۱۰ ماشین اسپرت — ۲ پیست حرفه‌ای — با کیبورد (جهت‌ها) یا دکمه‌های لمسی بازی کن
          <br />
          برای بهترین تجربه، گوشی را افقی بگیرید
        </p>
      </div>
    </div>
  );
}

/* ---------------- garage ---------------- */

export function Garage({
  carId,
  onSelect,
  onBack,
}: {
  carId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const [idx, setIdx] = useState(Math.max(0, CAR_SPECS.findIndex((c) => c.id === carId)));
  const car = CAR_SPECS[idx];
  return (
    <div className="flex h-full flex-col bg-[radial-gradient(ellipse_at_bottom,#12122a_0%,#05050c_65%)]">
      <div className="flex items-center justify-between px-4 pt-3">
        <button onClick={onBack} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-bold text-white/80 active:scale-95">
          → برگشت
        </button>
        <h2 className="text-lg font-black text-white">گاراژ — {fa(CAR_SPECS.length)} ماشین اسپرت</h2>
        <span className="w-[70px]" />
      </div>

      <div className="relative mx-auto mt-1 h-[38vh] w-full max-w-xl sm:h-[42vh]">
        <CarPreview spec={car} />
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-0.5 font-mono text-[10px] tracking-widest text-cyan-300/80" dir="ltr">
          {car.tag}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setIdx((idx - 1 + CAR_SPECS.length) % CAR_SPECS.length)}
            className="h-11 w-11 shrink-0 rounded-full border border-white/20 bg-white/10 text-xl font-black text-white active:scale-95"
            aria-label="قبلی"
          >
            ›
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-2xl font-black text-white">{car.name}</div>
            <div className="mt-0.5 truncate text-[11px] text-white/55">{car.desc}</div>
          </div>
          <button
            onClick={() => setIdx((idx + 1) % CAR_SPECS.length)}
            className="h-11 w-11 shrink-0 rounded-full border border-white/20 bg-white/10 text-xl font-black text-white active:scale-95"
            aria-label="بعدی"
          >
            ‹
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatBar label="سرعت نهایی" value={car.topSpeed} max={350} color="linear-gradient(90deg,#22e6e6,#ffd166)" />
          <StatBar label="شتاب" value={car.accel * 10} max={100} color="linear-gradient(90deg,#ffd166,#ff3c6e)" />
          <StatBar label="فرمان‌پذیری" value={car.handling * 10} max={100} color="linear-gradient(90deg,#7dff9b,#22e6e6)" />
        </div>

        <div className="mt-3 flex justify-center gap-1.5">
          {CAR_SPECS.map((c, i) => (
            <button
              key={c.id}
              aria-label={c.name}
              onClick={() => setIdx(i)}
              className={`h-2.5 rounded-full transition-all ${i === idx ? "w-6 bg-cyan-300" : "w-2.5 bg-white/25"}`}
            />
          ))}
        </div>

        <button
          onClick={() => onSelect(car.id)}
          className="mt-auto w-full rounded-2xl bg-gradient-to-l from-cyan-400 to-fuchsia-500 py-3.5 text-lg font-black text-black shadow-[0_0_25px_rgba(34,230,230,0.3)] active:scale-[0.98]"
        >
          {carId === car.id ? "✓ همین ماشین انتخاب شده" : "انتخاب این ماشین"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- track select ---------------- */

export function TrackSelect({
  trackId,
  bestLaps,
  onSelect,
  onBack,
}: {
  trackId: string;
  bestLaps: Record<string, number | null>;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const paths = useMemo(() => Object.fromEntries(TRACK_SPECS.map((t) => [t.id, trackPath(t.pts)])), []);
  return (
    <div className="flex h-full flex-col overflow-y-auto touch-pan-y bg-[radial-gradient(ellipse_at_top,#0f1f26_0%,#05050c_60%)]">
      <div className="flex items-center justify-between px-4 pt-3">
        <button onClick={onBack} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-bold text-white/80 active:scale-95">
          → برگشت
        </button>
        <h2 className="text-lg font-black text-white">انتخاب پیست</h2>
        <span className="w-[70px]" />
      </div>
      <div className="mx-auto grid w-full max-w-md gap-4 p-4">
        {TRACK_SPECS.map((t: TrackSpec) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`rounded-2xl border p-4 text-right transition-all active:scale-[0.99] ${
              trackId === t.id ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,230,230,0.2)]" : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0">
                <path
                  d={paths[t.id]}
                  fill="none"
                  stroke={t.theme === "neon" ? "rgba(34,230,230,0.9)" : "rgba(255,209,102,0.9)"}
                  strokeWidth="6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 5px ${t.theme === "neon" ? "#22e6e6" : "#ffd166"})` }}
                />
              </svg>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white">{t.name}</span>
                  {trackId === t.id && <span className="rounded bg-cyan-400/90 px-1.5 py-0.5 text-[10px] font-black text-black">فعال</span>}
                </div>
                <p className="mt-1 text-[11px] leading-5 text-white/55">{t.desc}</p>
                <div className="mt-2 flex gap-2 text-[11px] text-white/70">
                  <span className="rounded-md bg-white/10 px-2 py-0.5">{t.theme === "neon" ? "🌙 شب" : "☀️ روز"}</span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5">عرض {fa(t.width)} متر</span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5">رکورد: {fmtTime(bestLaps[t.id] ?? null)}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
