"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RacingGame, type Difficulty, type HudState, type RaceResult } from "@/game/engine";
import { HudOverlay, RaceControls, ResultsOverlay, PauseOverlay } from "./Hud";
import { Menu, Garage, TrackSelect } from "./MenuScreens";

type Screen = "menu" | "garage" | "tracks" | "race";

interface Settings {
  carId: string;
  trackId: string;
  laps: number;
  difficulty: Difficulty;
  sound: boolean;
}

const DEFAULTS: Settings = { carId: "azar", trackId: "neon", laps: 3, difficulty: "normal", sound: true };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("turbo-neon-settings");
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* noop */
  }
  return DEFAULTS;
}

function loadBestLaps(): Record<string, number | null> {
  try {
    const raw = localStorage.getItem("turbo-neon-best");
    if (raw) return JSON.parse(raw) as Record<string, number | null>;
  } catch {
    /* noop */
  }
  return {};
}

export default function RacingGameRoot() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [settings, setSettings] = useState<Settings>(() => (typeof window === "undefined" ? DEFAULTS : loadSettings()));
  const [hud, setHud] = useState<HudState | null>(null);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const h = () => setPortrait(mq.matches);
    h();
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  const [bestLaps, setBestLaps] = useState<Record<string, number | null>>(() => (typeof window === "undefined" ? {} : loadBestLaps()));

  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RacingGame | null>(null);
  const [engine, setEngine] = useState<RacingGame | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    try {
      localStorage.setItem("turbo-neon-settings", JSON.stringify(settings));
    } catch {
      /* noop */
    }
  }, [settings]);

  /* ---------- race lifecycle ---------- */

  useEffect(() => {
    if (screen !== "race") return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const s = settingsRef.current;
    const engine = new RacingGame(canvas, minimapRef.current, {
      carId: s.carId,
      trackId: s.trackId,
      laps: s.laps,
      difficulty: s.difficulty,
      sound: s.sound,
      onHud: setHud,
      onFinish: (r) => {
        setResult(r);
        setBestLaps((prev) => {
          const old = prev[s.trackId] ?? null;
          const rec = r.best !== null && (old === null || r.best < old);
          setIsRecord(rec);
          if (rec) {
            const next = { ...prev, [s.trackId]: r.best };
            try {
              localStorage.setItem("turbo-neon-best", JSON.stringify(next));
            } catch {
              /* noop */
            }
            return next;
          }
          return prev;
        });
      },
    });
    engineRef.current = engine;
    setEngine(engine);
    engine.start();
    return () => {
      engine.dispose();
      engineRef.current = null;
      setEngine(null);
      setHud(null);
      setPaused(false);
    };
  }, [screen]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  const togglePause = useCallback(() => {
    const e = engineRef.current;
    if (!e || result) return;
    if (paused) {
      e.resume();
      setPaused(false);
    } else {
      e.pause();
      setPaused(true);
    }
  }, [paused, result]);

  useEffect(() => {
    if (screen !== "race") return;
    const h = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") togglePause();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [screen, togglePause]);

  const restartRace = useCallback(() => {
    setResult(null);
    setIsRecord(false);
    setPaused(false);
    engineRef.current?.restart();
  }, []);

  const exitTo = useCallback((s: Screen) => {
    setResult(null);
    setIsRecord(false);
    setPaused(false);
    setScreen(s);
  }, []);

  const goFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        await screen.orientation.lock("landscape");
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* orientation lock unsupported — ignore */
    }
  };

  /* ---------- render ---------- */

  return (
    <div dir="rtl" className="fixed inset-0 select-none overflow-hidden bg-[#05050c] font-[Vazirmatn,Tahoma,sans-serif] text-white">
      {screen === "menu" && (
        <Menu
          carId={settings.carId}
          trackId={settings.trackId}
          laps={settings.laps}
          difficulty={settings.difficulty}
          sound={settings.sound}
          bestLap={bestLaps[settings.trackId] ?? null}
          onCar={() => setScreen("garage")}
          onTrack={() => setScreen("tracks")}
          onLaps={(n) => setSettings((s) => ({ ...s, laps: n }))}
          onDifficulty={(d) => setSettings((s) => ({ ...s, difficulty: d }))}
          onSound={(b) => {
            setSettings((s) => ({ ...s, sound: b }));
            setMuted(!b);
          }}
          onStart={() => setScreen("race")}
          onFullscreen={goFullscreen}
        />
      )}

      {screen === "garage" && (
        <Garage
          carId={settings.carId}
          onSelect={(id) => {
            setSettings((s) => ({ ...s, carId: id }));
            setScreen("menu");
          }}
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "tracks" && (
        <TrackSelect
          trackId={settings.trackId}
          bestLaps={bestLaps}
          onSelect={(id) => {
            setSettings((s) => ({ ...s, trackId: id }));
            setScreen("menu");
          }}
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "race" && (
        <div className="absolute inset-0 touch-none">
          <canvas ref={gameCanvasRef} className="absolute inset-0 block h-full w-full" />

          {/* loading placeholder until first hud frame */}
          {hud === null && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#05050c]">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                <p className="mt-3 text-sm font-bold text-white/60">در حال آماده‌سازی پیست…</p>
              </div>
            </div>
          )}

          {hud !== null && <HudOverlay hud={hud} minimapRef={minimapRef} onPause={togglePause} carId={settings.carId} />}
          {hud !== null && !paused && !result && <RaceControls engine={engine} />}

          {paused && !result && (
            <PauseOverlay
              onResume={togglePause}
              onRestart={restartRace}
              onMenu={() => exitTo("menu")}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          )}

          {result && (
            <ResultsOverlay
              result={result}
              isRecord={isRecord}
              onRestart={restartRace}
              onGarage={() => exitTo("garage")}
              onMenu={() => exitTo("menu")}
            />
          )}
        </div>
      )}

      {/* rotate-device overlay */}
      {portrait && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#05050c]/97 text-center">
          <div className="animate-bounce text-6xl">📱↻</div>
          <p className="text-lg font-black text-white">گوشی را افقی بگیرید</p>
          <p className="px-8 text-xs text-white/50">این بازی برای حالت افقی طراحی شده — برای تجربه‌ی بهتر گوشی را بچرخان</p>
        </div>
      )}
    </div>
  );
}
