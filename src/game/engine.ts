import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildCar, getCarSpec, CAR_SPECS, type CarSpec, type CarModel } from "./cars";
import { buildTrack, getTrackSpec, type TrackData } from "./tracks";

/* ============================================================
   Racing game engine — arcade physics + AI + camera + audio
   ============================================================ */

export interface Standing {
  name: string;
  tag: string;
  isPlayer: boolean;
}

export interface HudState {
  speed: number;
  gear: number;
  rpm: number;
  lap: number;
  totalLaps: number;
  position: number;
  total: number;
  lapTime: number;
  bestLap: number | null;
  lastLap: number | null;
  countdown: number | null;
  finished: boolean;
  wrongWay: boolean;
  standings: Standing[];
}

export interface RaceResult {
  position: number;
  total: number;
  best: number | null;
  totalLaps: number;
}

export type Difficulty = "easy" | "normal" | "hard";

export interface GameOptions {
  carId: string;
  trackId: string;
  laps: number;
  difficulty: Difficulty;
  sound: boolean;
  onHud: (h: HudState) => void;
  onFinish: (r: RaceResult) => void;
}

interface Racer {
  spec: CarSpec;
  model: CarModel;
  isPlayer: boolean;
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  velDir: THREE.Vector3;
  steerVis: number;
  sIdx: number;
  s: number;
  lateral: number;
  lap: number;
  totalProg: number;
  lapStart: number;
  bestLap: number | null;
  lastLap: number | null;
  finished: boolean;
  finishTime: number | null;
  aiSkill: number;
  aiLane: number;
  aiLanePhase: number;
  slip: number;
  offTrack: boolean;
  wrongTimer: number;
  stuckTimer: number;
  reverseTimer: number;
}

const GEARS = [0, 55, 95, 140, 190, 250, 345];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function normAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/* ---------------- audio ---------------- */

class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  engGain: GainNode | null = null;
  engOsc1: OscillatorNode | null = null;
  engOsc2: OscillatorNode | null = null;
  engFilter: BiquadFilterNode | null = null;
  skidGain: GainNode | null = null;
  muted = false;

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);

      this.engFilter = this.ctx.createBiquadFilter();
      this.engFilter.type = "lowpass";
      this.engFilter.frequency.value = 800;
      this.engGain = this.ctx.createGain();
      this.engGain.gain.value = 0.0;
      this.engOsc1 = this.ctx.createOscillator();
      this.engOsc1.type = "sawtooth";
      this.engOsc1.frequency.value = 70;
      this.engOsc2 = this.ctx.createOscillator();
      this.engOsc2.type = "square";
      this.engOsc2.frequency.value = 35;
      this.engOsc1.connect(this.engFilter);
      this.engOsc2.connect(this.engFilter);
      this.engFilter.connect(this.engGain);
      this.engGain.connect(this.master);
      this.engOsc1.start();
      this.engOsc2.start();

      const len = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 850;
      bp.Q.value = 1.4;
      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.value = 0;
      noise.connect(bp);
      bp.connect(this.skidGain);
      this.skidGain.connect(this.master);
      noise.start();
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.value = m ? 0 : 0.8;
  }

  engine(rpm: number, load: number, active: boolean) {
    if (!this.ctx || !this.engOsc1 || !this.engOsc2 || !this.engGain || !this.engFilter) return;
    const t = this.ctx.currentTime;
    const f = 62 + rpm * 175;
    this.engOsc1.frequency.setTargetAtTime(f, t, 0.03);
    this.engOsc2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    this.engFilter.frequency.setTargetAtTime(500 + rpm * 2400, t, 0.05);
    this.engGain.gain.setTargetAtTime(active ? 0.045 + load * 0.075 + rpm * 0.03 : 0.0, t, 0.08);
  }

  skid(v: number) {
    if (!this.skidGain || !this.ctx) return;
    this.skidGain.gain.setTargetAtTime(clamp(v, 0, 1) * 0.16, this.ctx.currentTime, 0.06);
  }

  beep(freq: number, dur = 0.14, vol = 0.35) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.02);
  }

  thump() {
    if (!this.ctx || !this.master) return;
    const len = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
  }

  dispose() {
    try {
      this.engOsc1?.stop();
      this.engOsc2?.stop();
      void this.ctx?.close();
    } catch {
      /* noop */
    }
    this.ctx = null;
  }
}

/* ---------------- smoke ---------------- */

class Smoke {
  pool: THREE.Sprite[] = [];
  life: number[] = [];
  vel: THREE.Vector3[] = [];
  idx = 0;

  constructor(scene: THREE.Scene, color: number) {
    const tex = (() => {
      const el = document.createElement("canvas");
      el.width = el.height = 64;
      const c = el.getContext("2d")!;
      const g = c.createRadialGradient(32, 32, 4, 32, 32, 30);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(el);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    for (let i = 0; i < 80; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.visible = false;
      scene.add(s);
      this.pool.push(s);
      this.life.push(0);
      this.vel.push(new THREE.Vector3());
    }
  }

  spawn(p: THREE.Vector3, v: THREE.Vector3) {
    const i = this.idx;
    this.idx = (this.idx + 1) % this.pool.length;
    const s = this.pool[i];
    s.position.copy(p);
    s.visible = true;
    s.scale.setScalar(0.7);
    (s.material as THREE.SpriteMaterial).opacity = 0.55;
    this.vel[i].copy(v);
    this.life[i] = 0.95;
  }

  update(dt: number) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const s = this.pool[i];
      if (this.life[i] <= 0) {
        s.visible = false;
        continue;
      }
      s.position.addScaledVector(this.vel[i], dt);
      this.vel[i].multiplyScalar(1 - 1.6 * dt);
      this.vel[i].y += 1.4 * dt;
      const k = 1 - this.life[i] / 0.95;
      s.scale.setScalar(0.7 + k * 2.6);
      (s.material as THREE.SpriteMaterial).opacity = 0.5 * (1 - k);
    }
  }
}

/* ---------------- engine ---------------- */

export class RacingGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private track: TrackData;
  private racers: Racer[] = [];
  private player!: Racer;
  private smoke: Smoke;
  private audio = new GameAudio();
  private opts: GameOptions;
  private canvas: HTMLCanvasElement;
  private minimapCanvas: HTMLCanvasElement | null;
  private minimapPath: Path2D | null = null;
  private raf = 0;
  private running = false;
  private paused = false;
  private state: "countdown" | "racing" | "finished" = "countdown";
  private countdownT = 3.8;
  private raceTime = 0;
  private hudFrame = 0;
  private steer = 0;
  private throttle = 0;
  private brake = 0;
  private keys = new Set<string>();
  private touch = { left: false, right: false, gas: false, brake: false };
  private headLights: THREE.SpotLight[] = [];
  private camShake = 0;
  private fpsAvg = 16;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  private resizeObs: ResizeObserver | null = null;
  private tmpV = new THREE.Vector3();
  private smokeAcc = 0;

  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement | null, opts: GameOptions) {
    this.canvas = canvas;
    this.minimapCanvas = minimapCanvas;
    this.opts = opts;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.3, 2200);

    const spec = getTrackSpec(opts.trackId);
    this.track = buildTrack(this.scene, spec);

    // environment reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    this.scene.environmentIntensity = spec.theme === "neon" ? 0.22 : 0.65;
    pmrem.dispose();

    this.smoke = new Smoke(this.scene, spec.theme === "neon" ? 0x99aacc : 0xd8cfc0);

    this.buildGrid();
    this.setupInput();
    this.resize();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    if (this.minimapCanvas) this.buildMinimapPath();

    if (spec.theme === "neon") {
      const mk = (x: number) => {
        const sl = new THREE.SpotLight(0xcfe8ff, 140, 95, 0.55, 0.55, 1.6);
        sl.position.set(x, 0.7, 2.1);
        const tgt = new THREE.Object3D();
        tgt.position.set(x, 0.1, 30);
        this.player.model.group.add(sl, tgt);
        sl.target = tgt;
        return sl;
      };
      this.headLights.push(mk(-0.6), mk(0.6));
    }
  }

  /* ---------- setup ---------- */

  private buildGrid() {
    const spec = getTrackSpec(this.opts.trackId);
    const laps = this.opts.laps;
    const N = this.track.samples.length;
    const playerSpec = getCarSpec(this.opts.carId);
    const others = CAR_SPECS.filter((c) => c.id !== playerSpec.id).sort(() => Math.random() - 0.5).slice(0, 9);

    const order: CarSpec[] = [...others];
    order.splice(6, 0, playerSpec); // player starts P7 of 10

    const skillBase: Record<Difficulty, number> = { easy: 0.86, normal: 0.93, hard: 0.985 };
    const isNeon = spec.theme === "neon";

    order.forEach((cs, i) => {
      const row = Math.floor(i / 2);
      const lat = (i % 2 === 0 ? -1 : 1) * 2.9;
      const sIdx = (N - 14 - row * 9 + N) % N;
      const smp = this.track.samples[sIdx];
      const model = buildCar(cs, { nightLights: isNeon, player: cs.id === playerSpec.id });
      const heading = Math.atan2(smp.tan.x, smp.tan.z);
      model.group.position.set(
        smp.pos.x + smp.right.x * lat,
        0,
        smp.pos.z + smp.right.z * lat
      );
      model.group.rotation.y = heading;
      this.scene.add(model.group);

      const diff = i === 6 ? 1 : clamp(skillBase[this.opts.difficulty] + (Math.random() - 0.5) * 0.07, 0.8, 1.04);
      const r: Racer = {
        spec: cs,
        model,
        isPlayer: cs.id === playerSpec.id,
        pos: model.group.position.clone(),
        heading,
        speed: 0,
        velDir: new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)),
        steerVis: 0,
        sIdx,
        s: sIdx * (this.track.length / N),
        lateral: lat,
        lap: 0,
        totalProg: 0,
        lapStart: 0,
        bestLap: null,
        lastLap: null,
        finished: false,
        finishTime: null,
        aiSkill: diff,
        aiLane: (Math.random() * 2 - 1) * 2.4,
        aiLanePhase: Math.random() * Math.PI * 2,
        slip: 0,
        offTrack: false,
        wrongTimer: 0,
        stuckTimer: 0,
        reverseTimer: 0,
      };
      if (r.isPlayer) this.player = r;
      this.racers.push(r);
    });

    this.updateStandings();
  }

  private setupInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  setTouch(name: "left" | "right" | "gas" | "brake", down: boolean) {
    this.touch[name] = down;
  }

  setMuted(m: boolean) {
    this.audio.setMuted(m);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    if (this.opts.sound) this.audio.resume();
    this.clock.start();
    this.loop();
  }

  pause() {
    this.paused = true;
    this.audio.engine(0, 0, false);
    this.audio.skid(0);
    this.audio.ctx?.suspend();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.clock.getDelta();
    this.audio.ctx?.resume();
  }

  restart() {
    const N = this.track.samples.length;
    this.racers.forEach((r, i) => {
      const row = Math.floor(i / 2);
      const lat = (i % 2 === 0 ? -1 : 1) * 2.9;
      const sIdx = (N - 14 - row * 9 + N) % N;
      const smp = this.track.samples[sIdx];
      r.pos.set(smp.pos.x + smp.right.x * lat, 0, smp.pos.z + smp.right.z * lat);
      r.heading = Math.atan2(smp.tan.x, smp.tan.z);
      r.velDir.set(Math.sin(r.heading), 0, Math.cos(r.heading));
      r.speed = 0;
      r.steerVis = 0;
      r.sIdx = sIdx;
      r.s = sIdx * (this.track.length / N);
      r.lateral = lat;
      r.lap = 0;
      r.totalProg = 0;
      r.lapStart = 0;
      r.bestLap = null;
      r.lastLap = null;
      r.finished = false;
      r.finishTime = null;
      r.slip = 0;
      r.offTrack = false;
      r.wrongTimer = 0;
      r.stuckTimer = 0;
      r.reverseTimer = 0;
      r.model.group.position.copy(r.pos);
      r.model.group.rotation.y = r.heading;
    });
    this.state = "countdown";
    this.countdownT = 3.8;
    this.raceTime = 0;
    this.steer = this.throttle = this.brake = 0;
    this.updateStandings();
    this.audio.ctx?.resume();
  }

  /* ---------- main loop ---------- */

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused) return;
    const dt = Math.min(this.clock.getDelta(), 0.045);
    const t = this.clock.elapsedTime;

    // adaptive quality
    this.fpsAvg = this.fpsAvg * 0.96 + dt * 1000 * 0.04;
    if (this.fpsAvg > 30 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.fpsAvg = 20;
    }

    // countdown
    if (this.state === "countdown") {
      const prev = Math.ceil(this.countdownT - 0.8);
      this.countdownT -= dt;
      const now = Math.ceil(this.countdownT - 0.8);
      if (now !== prev && now >= 0) this.audio.beep(now === 0 ? 880 : 440, now === 0 ? 0.45 : 0.15);
      if (this.countdownT <= 0.8 - 0.001) {
        this.state = "racing";
        this.racers.forEach((r) => (r.lapStart = 0));
        this.raceTime = 0;
      }
    } else {
      this.raceTime += dt;
    }

    // player input
    let pSteer = 0, pGas = 0, pBrake = 0;
    if (this.state === "racing" && !this.player.finished) {
      const kLeft = this.keys.has("arrowleft") || this.keys.has("a");
      const kRight = this.keys.has("arrowright") || this.keys.has("d");
      const kGas = this.keys.has("arrowup") || this.keys.has("w");
      const kBrake = this.keys.has("arrowdown") || this.keys.has("s");
      pSteer = (this.touch.right || kRight ? 1 : 0) - (this.touch.left || kLeft ? 1 : 0);
      pGas = this.touch.gas || kGas ? 1 : 0;
      pBrake = this.touch.brake || kBrake ? 1 : 0;
    } else if (this.player.finished) {
      pBrake = 0.4;
    }
    this.steer += (pSteer - this.steer) * Math.min(1, 9 * dt);
    this.throttle += (pGas - this.throttle) * Math.min(1, 6 * dt);
    this.brake += (pBrake - this.brake) * Math.min(1, 8 * dt);

    // update racers
    for (const r of this.racers) {
      if (r.isPlayer) {
        this.stepCar(r, dt, { throttle: this.throttle, brake: this.brake, steer: this.steer });
      } else {
        const inp = this.aiDriver(r, dt);
        this.stepCar(r, dt, inp);
      }
      this.projectTrack(r);
      this.lapLogic(r);
    }

    this.collide();
    this.smoke.update(dt);
    this.playerSmoke(dt);
    this.track.update(t);

    // camera
    this.updateCamera(dt);

    // audio
    const kmh = Math.abs(this.player.speed) * 3.6;
    const gearInfo = this.gearOf(kmh);
    this.audio.engine(gearInfo.rpm, this.state === "countdown" ? this.throttle * 0.5 : this.throttle, this.opts.sound && !this.paused);
    this.audio.skid(this.player.slip > 0.16 || this.player.offTrack ? clamp((this.player.slip - 0.1) * 2.4, 0, 1) * clamp(kmh / 60, 0, 1) : 0);

    // sun follow
    const sun = (this.track.spec.theme === "day" ? (this.scene.userData as { sun?: THREE.DirectionalLight }).sun : undefined);
    if (sun) {
      sun.position.set(this.player.pos.x + 90, 170, this.player.pos.z + 45);
      sun.target.position.set(this.player.pos.x, 0, this.player.pos.z);
      sun.target.updateMatrixWorld();
    }

    // wheels visual
    for (const r of this.racers) {
      const spin = (r.speed / 0.34) * dt;
      for (const w of r.model.spinWheels) w.rotation.x -= spin;
      for (const p of r.model.steerPivots) p.rotation.y = r.steerVis * 0.6;
      r.model.bodyGroup.rotation.z = r.steerVis * clamp(r.speed / 30, 0, 1) * 0.05;
      r.model.bodyGroup.rotation.x = clamp(-r.slip * 0 + (r.isPlayer ? this.throttle * -0.012 + this.brake * 0.018 : 0), -0.03, 0.03);
    }

    this.renderer.render(this.scene, this.camera);
    this.drawMinimap();

    if (++this.hudFrame % 3 === 0) this.emitHud();
  };

  /* ---------- physics ---------- */

  private stepCar(r: Racer, dt: number, input: { throttle: number; brake: number; steer: number }) {
    const themeVmaxMul = r.isPlayer ? 1 : r.aiSkill;
    const vmax = (r.spec.topSpeed / 3.6) * (r.offTrack ? 0.48 : 1) * themeVmaxMul;
    const a0 = 10.5 + r.spec.accel * 0.62;

    const gridHold = this.state === "countdown" || (this.state === "finished" && r.isPlayer);
    if (gridHold) {
      // grid hold — rev only (player also brakes gently after finish)
      r.speed *= 1 - (this.state === "finished" ? 1.2 : 4) * dt;
      return;
    }

    let acc = 0;
    if (r.reverseTimer > 0) {
      r.reverseTimer -= dt;
      acc = -7;
      if (r.speed < -6) acc = 0;
    } else {
      if (input.throttle > 0 && r.speed < vmax) acc += a0 * input.throttle * (1.05 - r.speed / Math.max(vmax, 1));
      if (input.brake > 0) {
        if (r.speed > 0.5) acc -= 21 * input.brake;
        else acc -= 6.5 * input.brake; // reverse
        if (r.speed < -8) acc = Math.max(acc, 0);
      }
      if (input.throttle === 0 && input.brake === 0) acc -= Math.sign(r.speed) * Math.min(Math.abs(r.speed) / dt + 1, 2.6);
    }

    r.speed += acc * dt;
    if (r.offTrack) r.speed -= r.speed * 1.1 * dt;
    r.speed = clamp(r.speed, -9, vmax * 1.03);

    // steering
    const steerMax = 0.92 / (1 + Math.abs(r.speed) * 0.05);
    const target = input.steer * steerMax;
    r.steerVis += (target - r.steerVis) * Math.min(1, 11 * dt);
    const turn = r.steerVis * clamp(Math.abs(r.speed) / 7, 0, 1) * 1.62 * Math.sign(r.speed >= 0 ? 1 : -1) * dt;
    r.heading += turn;

    // grip / drift
    const dir = this.tmpV.set(Math.sin(r.heading), 0, Math.cos(r.heading));
    const grip = (r.offTrack ? 3.4 : 5.6 + r.spec.handling * 0.3) * dt;
    r.velDir.lerp(dir, Math.min(1, grip)).normalize();
    r.slip = Math.abs(normAngle(Math.atan2(r.velDir.x, r.velDir.z) - r.heading));
    r.speed -= r.speed * r.slip * 0.32 * dt;

    r.pos.addScaledVector(r.velDir, r.speed * dt);
    r.model.group.position.copy(r.pos);
    r.model.group.rotation.y = r.heading;
  }

  private projectTrack(r: Racer) {
    const N = this.track.samples.length;
    let best = r.sIdx;
    let bestD = Infinity;
    for (let k = -80; k <= 80; k++) {
      const i = (r.sIdx + k + N) % N;
      const p = this.track.samples[i].pos;
      const dx = p.x - r.pos.x;
      const dz = p.z - r.pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    r.sIdx = best;
    const smp = this.track.samples[best];
    const dx = r.pos.x - smp.pos.x;
    const dz = r.pos.z - smp.pos.z;
    r.lateral = dx * smp.right.x + dz * smp.right.z;
    const along = dx * smp.tan.x + dz * smp.tan.z;
    r.s = (smp.s + along + this.track.length) % this.track.length;

    // walls
    const lim = this.track.wallLimit - 0.9;
    if (Math.abs(r.lateral) > lim) {
      const sgn = Math.sign(r.lateral);
      r.pos.x = smp.pos.x + smp.right.x * lim * sgn;
      r.pos.z = smp.pos.z + smp.right.z * lim * sgn;
      r.lateral = lim * sgn;
      if (Math.abs(r.speed) > 6) {
        if (r.isPlayer) {
          this.camShake = Math.min(0.5, this.camShake + Math.abs(r.speed) * 0.004);
          this.audio.thump();
        }
        r.speed *= 0.94;
      }
      // nudge heading along wall
      const ta = Math.atan2(smp.tan.x, smp.tan.z);
      r.heading += normAngle(ta - r.heading) * 0.1;
      r.velDir.set(Math.sin(r.heading), 0, Math.cos(r.heading));
    }

    const wasOff = r.offTrack;
    r.offTrack = Math.abs(r.lateral) > this.track.halfWidth - 0.5;
    if (r.offTrack && !wasOff && r.isPlayer && Math.abs(r.speed) > 15) this.camShake = Math.min(0.35, this.camShake + 0.12);

    // wrong way
    const fwd = r.velDir.x * smp.tan.x + r.velDir.z * smp.tan.z;
    if (fwd < -2 && this.state === "racing") r.wrongTimer += 1 / 60;
    else r.wrongTimer = 0;
  }

  private lapLogic(r: Racer) {
    const L = this.track.length;
    const prevTotal = r.totalProg;
    r.totalProg = r.lap * L + r.s;
    const crossed = r.totalProg - prevTotal < -L * 0.5;
    if (crossed && r.speed > 3) {
      r.lap++;
      if (r.lap > 1) {
        const lt = this.raceTime - r.lapStart;
        r.lastLap = lt;
        if (r.bestLap === null || lt < r.bestLap) r.bestLap = lt;
      }
      r.lapStart = this.raceTime;
      if (r.lap > this.opts.laps && !r.finished) {
        r.finished = true;
        r.finishTime = this.raceTime;
        if (r.isPlayer) {
          this.state = "finished";
          this.finish();
        }
      }
    }
  }

  private collide() {
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i];
        const b = this.racers[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        const R = 2.35;
        if (d2 < R * R && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const overlap = (R - d) / 2;
          const nx = dx / d;
          const nz = dz / d;
          a.pos.x -= nx * overlap;
          a.pos.z -= nz * overlap;
          b.pos.x += nx * overlap;
          b.pos.z += nz * overlap;
          const rel = Math.abs(a.speed - b.speed);
          if (rel > 8 && (a.isPlayer || b.isPlayer)) {
            this.camShake = Math.min(0.4, this.camShake + rel * 0.01);
            this.audio.thump();
          }
          a.speed *= 0.99;
          b.speed *= 0.99;
        }
      }
    }
  }

  /* ---------- AI ---------- */

  private aiDriver(r: Racer, dt: number): { throttle: number; brake: number; steer: number } {
    const N = this.track.samples.length;
    const segLen = this.track.length / N;
    if (this.state !== "racing") return { throttle: 0, brake: 0, steer: 0 };

    if (r.finished) {
      // slow down after finish
      return { throttle: 0, brake: r.speed > 8 ? 0.6 : 0, steer: 0 };
    }

    // rubber band vs player
    const gap = this.player.totalProg - r.totalProg;
    let skill = r.aiSkill;
    if (gap > 140) skill = Math.min(1.06, skill * 1.06);
    else if (gap < -140) skill *= 0.94;

    const look = 11 + r.speed * 0.55;
    const idxA = (r.sIdx + Math.round(look / segLen)) % N;
    const smpA = this.track.samples[idxA];
    const lane = Math.sin(r.s * 0.006 + r.aiLanePhase) * r.aiLane;
    const tx = smpA.pos.x + smpA.right.x * lane;
    const tz = smpA.pos.z + smpA.right.z * lane;
    const desired = Math.atan2(tx - r.pos.x, tz - r.pos.z);
    const dAng = normAngle(desired - r.heading);
    let steer = clamp(dAng * 2.1, -1, 1);

    // corner speed preview
    let maxCurv = 0.0001;
    for (let m = 6; m < 85; m += 7) {
      maxCurv = Math.max(maxCurv, this.track.samples[(r.sIdx + m) % N].curv);
    }
    const vCorner = Math.sqrt((10.2 * skill) / maxCurv);
    const vmax = (r.spec.topSpeed / 3.6) * skill;
    const vTarget = Math.min(vmax, vCorner);

    let throttle = 0;
    let brake = 0;
    if (r.speed < vTarget - 1.5) throttle = 1;
    else if (r.speed > vTarget + 2.2) brake = clamp((r.speed - vTarget) * 0.14, 0.2, 1);

    // stuck / wall recovery
    if (Math.abs(r.speed) < 1.2) r.stuckTimer += dt;
    else r.stuckTimer = 0;
    if (r.stuckTimer > 1.6) {
      r.reverseTimer = 1.1;
      r.stuckTimer = 0;
      steer = -steer;
    }

    return { throttle, brake, steer };
  }

  /* ---------- camera / fx ---------- */

  private updateCamera(dt: number) {
    const r = this.player;
    const dir = this.tmpV.set(Math.sin(r.heading), 0, Math.cos(r.heading));
    const speedK = clamp(Math.abs(r.speed) / (r.spec.topSpeed / 3.6), 0, 1);
    const dist = 8.3 + speedK * 2.2;
    const height = 3.3 + speedK * 0.5;
    const desired = new THREE.Vector3(
      r.pos.x - dir.x * dist,
      height,
      r.pos.z - dir.z * dist
    );
    const k = 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(desired, k);

    this.camShake = Math.max(0, this.camShake - dt * 1.6);
    if ((r.offTrack && Math.abs(r.speed) > 12) || this.camShake > 0.01) {
      const sh = Math.max(this.camShake, 0.06);
      this.camera.position.x += (Math.random() - 0.5) * sh;
      this.camera.position.y += (Math.random() - 0.5) * sh * 0.6;
      this.camera.position.z += (Math.random() - 0.5) * sh;
    }

    const look = new THREE.Vector3(r.pos.x + dir.x * 7, 1.35, r.pos.z + dir.z * 7);
    this.camera.lookAt(look);
    const fov = 63 + speedK * 15;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  private playerSmoke(dt: number) {
    const r = this.player;
    const burnout = this.state === "racing" && r.speed < 9 && this.throttle > 0.8 && !r.offTrack;
    const drifting = r.slip > 0.22 && Math.abs(r.speed) > 8;
    const dusty = r.offTrack && Math.abs(r.speed) > 9;
    if (!burnout && !drifting && !dusty) return;
    this.smokeAcc += dt * (drifting ? 42 : 26);
    while (this.smokeAcc > 1) {
      this.smokeAcc -= 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      const sh = r.spec.shape;
      const bx = Math.sin(r.heading) * sh.wheelZRear + Math.cos(r.heading) * side * (sh.width + 0.1);
      const bz = Math.cos(r.heading) * sh.wheelZRear - Math.sin(r.heading) * side * (sh.width + 0.1);
      this.smoke.spawn(
        new THREE.Vector3(r.pos.x + bx, 0.25, r.pos.z + bz),
        new THREE.Vector3((Math.random() - 0.5) * 2, 0.6 + Math.random(), (Math.random() - 0.5) * 2)
      );
    }
  }

  /* ---------- HUD / minimap ---------- */

  private gearOf(kmh: number): { gear: number; rpm: number } {
    if (kmh < 1) return { gear: 0, rpm: 0.12 };
    for (let g = 1; g < GEARS.length; g++) {
      if (kmh < GEARS[g]) {
        return { gear: g, rpm: clamp(0.25 + ((kmh - GEARS[g - 1]) / (GEARS[g] - GEARS[g - 1])) * 0.75, 0, 1) };
      }
    }
    return { gear: 6, rpm: 0.95 };
  }

  private standingsCache: Standing[] = [];
  private updateStandings() {
    const sorted = [...this.racers].sort((a, b) => {
      const sa = a.finished ? 1e9 - (a.finishTime ?? 0) : a.totalProg;
      const sb = b.finished ? 1e9 - (b.finishTime ?? 0) : b.totalProg;
      return sb - sa;
    });
    this.standingsCache = sorted.map((r) => ({ name: r.spec.name, tag: r.spec.tag, isPlayer: r.isPlayer }));
  }

  private playerPosition(): number {
    let pos = 1;
    const pScore = this.player.finished ? 1e9 - (this.player.finishTime ?? 0) : this.player.totalProg;
    for (const r of this.racers) {
      if (r.isPlayer) continue;
      const s = r.finished ? 1e9 - (r.finishTime ?? 0) : r.totalProg;
      if (s > pScore) pos++;
    }
    return pos;
  }

  private emitHud() {
    const kmh = Math.abs(this.player.speed) * 3.6;
    const g = this.gearOf(kmh);
    this.updateStandings();
    this.opts.onHud({
      speed: kmh,
      gear: this.player.speed < -0.5 ? -1 : g.gear,
      rpm: this.state === "countdown" ? 0.3 + Math.abs(Math.sin(this.clock.elapsedTime * 9)) * this.throttle * 0.6 : g.rpm,
      lap: Math.min(Math.max(this.player.lap, 1), this.opts.laps),
      totalLaps: this.opts.laps,
      position: this.playerPosition(),
      total: this.racers.length,
      lapTime: this.state === "racing" || this.state === "finished" ? this.raceTime - this.player.lapStart : 0,
      bestLap: this.player.bestLap,
      lastLap: this.player.lastLap,
      countdown: this.state === "countdown" ? Math.max(1, Math.ceil(this.countdownT - 0.8)) : this.raceTime < 1.0 ? 0 : null,
      finished: this.player.finished,
      wrongWay: this.player.wrongTimer > 1.2,
      standings: this.standingsCache,
    });
  }

  private buildMinimapPath() {
    const mm = this.track.minimap;
    const p = new Path2D();
    mm.forEach((pt, i) => {
      const x = pt.x * 100;
      const y = pt.y * 100;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    });
    p.closePath();
    this.minimapPath = p;
  }

  private drawMinimap() {
    if (!this.minimapCanvas) {
      this.minimapCanvas = document.getElementById("minimap-canvas") as HTMLCanvasElement | null;
    }
    const c = this.minimapCanvas;
    if (!c) return;
    if (!this.minimapPath) this.buildMinimapPath();
    if (!this.minimapPath) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W * 0.06, H * 0.06);
    ctx.scale(W * 0.88 / 100, H * 0.88 / 100);
    ctx.strokeStyle = this.track.spec.theme === "neon" ? "rgba(120,230,255,0.35)" : "rgba(255,255,255,0.55)";
    ctx.lineWidth = 7;
    ctx.stroke(this.minimapPath);
    // start line dot
    const st = this.track.minimap[0];
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(st.x * 100, st.y * 100, 3.4, 0, Math.PI * 2);
    ctx.fill();
    for (const r of this.racers) {
      if (r.isPlayer) continue;
      const mp = this.track.minimap;
      const idx = Math.min(mp.length - 1, Math.floor((r.sIdx / this.track.samples.length) * mp.length));
      ctx.fillStyle = "rgba(230,230,230,0.75)";
      ctx.beginPath();
      ctx.arc(mp[idx].x * 100, mp[idx].y * 100, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const pmp = this.track.minimap;
    const pidx = Math.min(pmp.length - 1, Math.floor((this.player.sIdx / this.track.samples.length) * pmp.length));
    ctx.fillStyle = "#" + this.player.spec.color.toString(16).padStart(6, "0");
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(pmp[pidx].x * 100, pmp[pidx].y * 100, 4.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  /* ---------- finish / resize / dispose ---------- */

  private finish() {
    const position = this.playerPosition();
    this.opts.onFinish({
      position,
      total: this.racers.length,
      best: this.player.bestLap,
      totalLaps: this.opts.laps,
    });
    this.emitHud();
  }

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.resizeObs?.disconnect();
    this.audio.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
        o.geometry?.dispose?.();
        const m = o.material as THREE.Material | THREE.Material[];
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose?.();
      }
    });
    this.renderer.dispose();
  }
}
