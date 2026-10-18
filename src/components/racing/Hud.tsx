"use client";

import { useEffect, useState } from "react";
import type { HudState, RaceResult } from "@/game/engine";
import { getCarSpec } from "@/game/cars";

export const fa = (v: number | string): string =>
  String(v).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export function fmtTime(t: number | null | undefined): string {
  if (t === null || t === undefined || !isFinite(t)) return "—";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 100);
  return fa(`${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`);
}

/* ---------------- speedometer ---------------- */

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const A0 = 130;
const SWEEP = 280;
const MAX_KMH = 360;

export function Speedo({ speed, gear, rpm }: { speed: number; gear: number; rpm: number }) {
  const frac = Math.min(speed / MAX_KMH, 1);
  const angle = A0 + frac * SWEEP;
  const [nx, ny] = polar(70, 70, 44, angle);
  const ticks = Array.from({ length: 10 }, (_, i) => {
    const a = A0 + (i / 9) * SWEEP;
    const [x0, y0] = polar(70, 70, 54, a);
    const [x1, y1] = polar(70, 70, 60, a);
    return { x0, y0, x1, y1, major: i % 3 === 0 };
  });
  return (
    <div className="relative" dir="ltr">
      <svg viewBox="0 0 140 140" className="h-28 w-28 drop-shadow-[0_0_10px_rgba(34,230,230,0.25)] sm:h-32 sm:w-32">
        <circle cx="70" cy="70" r="66" fill="rgba(5,5,14,0.72)" stroke="rgba(34,230,230,0.25)" strokeWidth="1.5" />
        <path d={arcPath(70, 70, 50, A0, A0 + SWEEP)} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" strokeLinecap="round" />
        <path
          d={arcPath(70, 70, 50, A0, A0 + SWEEP)}
          fill="none"
          stroke="url(#spd)"
          strokeWidth="7"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${frac * 100} 100`}
        />
        <path
          d={arcPath(70, 70, 58, A0 + 0.72 * SWEEP, A0 + SWEEP)}
          fill="none"
          stroke="rgba(255,60,60,0.5)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d={arcPath(70, 70, 62, A0, A0 + SWEEP)}
          fill="none"
          stroke="rgba(34,230,230,0.9)"
          strokeWidth="2.5"
          pathLength={100}
          strokeDasharray={`${rpm * 100} 100`}
          opacity={0.85}
        />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x0} y1={t.y0} x2={t.x1} y2={t.y1} stroke={t.major ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)"} strokeWidth={t.major ? 2 : 1.2} />
        ))}
        <line x1="70" y1="70" x2={nx} y2={ny} stroke="#ff3c6e" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="70" cy="70" r="5" fill="#0d0d16" stroke="#ff3c6e" strokeWidth="1.6" />
        <defs>
          <linearGradient id="spd" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22e6e6" />
            <stop offset="70%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#ff3c6e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <div className="font-mono text-2xl font-black leading-none text-white [text-shadow:0_0_12px_rgba(34,230,230,0.8)] sm:text-3xl">
          {fa(Math.round(speed))}
        </div>
        <div className="mt-0.5 text-[9px] font-bold tracking-widest text-cyan-300/80">KM/H</div>
        <div className="mt-1 rounded bg-white/10 px-2 py-0.5 font-mono text-sm font-black text-amber-300">
          {gear === -1 ? "R" : gear === 0 ? "N" : fa(gear)}
        </div>
      </div>
    </div>
  );
}

/* ---------------- touch button ---------------- */

export function TouchButton({
  name,
  engine,
  children,
  className = "",
}: {
  name: "left" | "right" | "gas" | "brake";
  engine: { setTouch: (n: "left" | "right" | "gas" | "brake", d: boolean) => void } | null;
  children: React.ReactNode;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  return (
    <button
      aria-label={name}
      className={`pointer-events-auto flex select-none items-center justify-center rounded-full border backdrop-blur-sm transition-transform duration-75 ${className} ${
        active ? "scale-95 border-cyan-300/80 bg-cyan-400/30 shadow-[0_0_18px_rgba(34,230,230,0.45)]" : "border-white/25 bg-white/10"
      }`}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
        setActive(true);
        engine?.setTouch(name, true);
      }}
      onPointerUp={() => {
        setActive(false);
        engine?.setTouch(name, false);
      }}
      onPointerCancel={() => {
        setActive(false);
        engine?.setTouch(name, false);
      }}
      onLostPointerCapture={() => {
        setActive(false);
        engine?.setTouch(name, false);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/* ---------------- HUD overlay ---------------- */

export function HudOverlay({
  hud,
  minimapRef,
  onPause,
  carId,
}: {
  hud: HudState;
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  onPause: () => void;
  carId: string;
}) {
  const colorHex = "#" + getCarSpec(carId).color.toString(16).padStart(6, "0");
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* top-right chips */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
        <div className="flex gap-1.5">
          <div className="rounded-lg border border-white/15 bg-black/55 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[10px] text-white/60">دور </span>
            <span className="font-mono text-base font-black text-amber-300">{fa(hud.lap)}</span>
            <span className="text-[10px] text-white/60"> / {fa(hud.totalLaps)}</span>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/55 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[10px] text-white/60">مقام </span>
            <span className="font-mono text-base font-black text-cyan-300">{fa(hud.position)}</span>
            <span className="text-[10px] text-white/60"> / {fa(hud.total)}</span>
          </div>
        </div>
        <div className="rounded-lg border border-white/15 bg-black/55 px-2.5 py-1 text-left backdrop-blur-sm" dir="ltr">
          <span className="font-mono text-sm font-bold text-white">{fmtTime(hud.lapTime)}</span>
          {hud.bestLap !== null && <span className="mr-2 font-mono text-[10px] text-purple-300">بهترین {fmtTime(hud.bestLap)}</span>}
        </div>
      </div>

      {/* minimap */}
      <div className="absolute left-2 top-2 rounded-xl border border-white/15 bg-black/45 p-1 backdrop-blur-sm">
        <canvas id="minimap-canvas" ref={minimapRef} width={104} height={104} className="h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]" />
      </div>

      {/* pause */}
      <button
        onClick={onPause}
        aria-label="توقف"
        className="pointer-events-auto absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-white/20 bg-black/55 px-3 py-1.5 text-white/90 backdrop-blur-sm active:scale-95"
      >
        <span className="text-sm">⏸</span>
      </button>

      {/* countdown */}
      {hud.countdown !== null && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          {hud.countdown > 0 ? (
            <div key={hud.countdown} className="animate-countpop font-mono text-8xl font-black text-cyan-300 [text-shadow:0_0_30px_rgba(34,230,230,0.9),0_0_80px_rgba(34,230,230,0.5)]">
              {fa(hud.countdown)}
            </div>
          ) : (
            <div className="animate-countpop font-mono text-7xl font-black text-lime-300 [text-shadow:0_0_30px_rgba(163,230,53,0.9),0_0_90px_rgba(163,230,53,0.5)]">
              برو!
            </div>
          )}
        </div>
      )}

      {/* wrong way */}
      {hud.wrongWay && hud.countdown === null && (
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 animate-pulse rounded-xl border border-red-400/60 bg-red-950/80 px-5 py-2 text-lg font-black text-red-300 backdrop-blur-sm">
          ⚠ جهت اشتباه! برگرد
        </div>
      )}

      {/* speedometer */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <Speedo speed={hud.speed} gear={hud.gear} rpm={hud.rpm} />
      </div>

      {/* position strip */}
      <div className="absolute bottom-2 right-2 hidden flex-col items-end gap-1 sm:flex">
        {hud.standings.slice(0, 3).map((s, i) => (
          <div
            key={s.tag}
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold backdrop-blur-sm ${
              s.isPlayer ? "border " : "bg-black/50 text-white/70"
            }`}
            style={s.isPlayer ? { borderColor: colorHex, background: `${colorHex}33`, color: "#fff" } : undefined}
          >
            <span className="ml-1 font-mono text-white/50">{fa(i + 1)}.</span>
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- controls ---------------- */

export function RaceControls({
  engine,
}: {
  engine: { setTouch: (n: "left" | "right" | "gas" | "brake", d: boolean) => void } | null;
}) {
  return (
    <>
      <div dir="ltr" className="absolute bottom-3 left-3 z-20 flex items-end gap-3">
        <TouchButton name="left" engine={engine} className="h-[74px] w-[74px] text-3xl font-black text-white sm:h-20 sm:w-20">
          ◀
        </TouchButton>
        <TouchButton name="right" engine={engine} className="h-[74px] w-[74px] text-3xl font-black text-white sm:h-20 sm:w-20">
          ▶
        </TouchButton>
      </div>
      <div dir="ltr" className="absolute bottom-3 right-3 z-20 flex items-end gap-3">
        <TouchButton name="brake" engine={engine} className="h-16 w-16 text-2xl text-red-200 sm:h-[70px] sm:w-[70px]">
          🛑
        </TouchButton>
        <TouchButton name="gas" engine={engine} className="h-[92px] w-[92px] text-3xl text-lime-200 sm:h-24 sm:w-24">
          ⏫
        </TouchButton>
      </div>
    </>
  );
}

/* ---------------- overlays ---------------- */

const posWord = (p: number): string =>
  p === 1 ? "قهرمان شدی! 🏆" : p === 2 ? "نایب‌قهرمان! 🥈" : p === 3 ? "سوم شدی! 🥉" : `مقام ${fa(p)} — دفعه بعد بهتر! 🏁`;

export function ResultsOverlay({
  result,
  isRecord,
  onRestart,
  onGarage,
  onMenu,
}: {
  result: RaceResult;
  isRecord: boolean;
  onRestart: () => void;
  onGarage: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-[min(92vw,420px)] rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-[#0c0c1a]/95 to-[#12122a]/95 p-5 text-center shadow-[0_0_60px_rgba(34,230,230,0.15)]">
        <div className="text-5xl">{result.position === 1 ? "🏆" : result.position <= 3 ? "🎉" : "🏁"}</div>
        <h2 className="mt-2 text-2xl font-black text-white">{posWord(result.position)}</h2>
        <p className="mt-1 text-sm text-white/60">
          مسابقه {fa(result.totalLaps)} دوره — از بین {fa(result.total)} ماشین
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] text-white/50">زمان کل</div>
            <div className="mt-1 font-mono text-lg font-bold text-amber-300" dir="ltr">{fmtTime(result.total)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] text-white/50">بهترین دور</div>
            <div className="mt-1 font-mono text-lg font-bold text-purple-300" dir="ltr">{fmtTime(result.best)}</div>
          </div>
        </div>
        {isRecord && (
          <div className="mt-3 animate-pulse rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-sm font-bold text-amber-300">
            ⭐ رکورد جدید این پیست!
          </div>
        )}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button onClick={onRestart} className="rounded-xl bg-lime-500/90 px-3 py-2.5 text-sm font-black text-black active:scale-95">
            دوباره
          </button>
          <button onClick={onGarage} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-bold text-white active:scale-95">
            گاراژ
          </button>
          <button onClick={onMenu} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-bold text-white active:scale-95">
            منو
          </button>
        </div>
      </div>
    </div>
  );
}

export function PauseOverlay({
  onResume,
  onRestart,
  onMenu,
  muted,
  onToggleMute,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResume();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onResume]);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-md">
      <div className="w-[min(88vw,340px)] rounded-2xl border border-white/15 bg-[#0c0c1a]/95 p-5 text-center">
        <h2 className="text-2xl font-black text-white">توقف بازی</h2>
        <div className="mt-4 grid gap-2">
          <button onClick={onResume} className="rounded-xl bg-cyan-400/90 px-4 py-2.5 font-black text-black active:scale-95">
            ادامه بده
          </button>
          <button onClick={onRestart} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-bold text-white active:scale-95">
            شروع دوباره
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onToggleMute} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-bold text-white active:scale-95">
              {muted ? "🔇 صدا خاموش" : "🔊 صدا روشن"}
            </button>
            <button onClick={onMenu} className="rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 font-bold text-red-200 active:scale-95">
              خروج به منو
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
