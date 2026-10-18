import * as THREE from "three";

/* ============================================================
   Two racing maps:
   1) Neon City Night  — urban night circuit, neon & skyscrapers
   2) Azadi International — modern F1-style grand prix circuit
   ============================================================ */

export type Theme = "neon" | "day";

export interface TrackSpec {
  id: string;
  name: string;
  desc: string;
  theme: Theme;
  width: number;
  laps: number;
  pts: [number, number][];
}

export interface TrackSample {
  pos: THREE.Vector3;
  tan: THREE.Vector3;
  right: THREE.Vector3;
  s: number;
  curv: number;
}

export interface TrackData {
  spec: TrackSpec;
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  length: number;
  halfWidth: number;
  wallLimit: number;
  minimap: { x: number; y: number }[];
  update: (t: number) => void;
}

export const TRACK_SPECS: TrackSpec[] = [
  {
    id: "neon",
    name: "شب نئون — خیابان‌های شهر",
    desc: "پیست شهری در دل شب؛ آسمان‌خراش‌های نئونی، نورهای بی‌نهایت و هوای دود آلود. برای درایو شبانه‌ی خفن.",
    theme: "neon",
    width: 14,
    laps: 3,
    pts: [
      [-280, -120], [-120, -165], [60, -170], [200, -140], [255, -50],
      [200, 30], [110, 10], [55, 60], [100, 130], [30, 185],
      [-110, 175], [-215, 110], [-245, 10], [-180, -40], [-230, -80],
    ],
  },
  {
    id: "international",
    name: "پیست بین‌المللی آزادی",
    desc: "گرند‌پرکس مدرن با استاندارد F1؛ سکوهای بزرگ، چراغ‌های فلادی، کرب‌های قرمز-سفید و استرت بلند.",
    theme: "day",
    width: 15,
    laps: 3,
    pts: [
      [-300, 140], [-100, 165], [100, 160], [240, 120],
      [300, 20], [260, -60], [170, -90],
      [80, -60], [-10, -95], [-100, -60],
      [-190, -100], [-260, -160],
      [-300, -90],
      [-250, -20], [-160, -30],
      [-240, 40],
      [-310, 80],
    ],
  },
];

export function getTrackSpec(id: string): TrackSpec {
  return TRACK_SPECS.find((t) => t.id === id) ?? TRACK_SPECS[0];
}

/* ---------------- canvas texture helpers ---------------- */

function cnv(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  const ctx = el.getContext("2d")!;
  draw(ctx);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function asphaltTexture(): THREE.CanvasTexture {
  return cnv(256, 256, (c) => {
    c.fillStyle = "#26262b";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const g = 30 + Math.random() * 26;
      c.fillStyle = `rgb(${g},${g},${g + 4})`;
      c.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    c.strokeStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.moveTo(Math.random() * 256, Math.random() * 256);
      c.lineTo(Math.random() * 256, Math.random() * 256);
      c.stroke();
    }
  });
}

function gridGroundTexture(): THREE.CanvasTexture {
  return cnv(256, 256, (c) => {
    c.fillStyle = "#05050d";
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = "rgba(40,220,255,0.16)";
    c.lineWidth = 2;
    c.strokeRect(0, 0, 256, 256);
    c.strokeStyle = "rgba(255,46,166,0.07)";
    c.beginPath();
    c.moveTo(128, 0); c.lineTo(128, 256);
    c.moveTo(0, 128); c.lineTo(256, 128);
    c.stroke();
  });
}

function windowsTexture(base: string): THREE.CanvasTexture {
  return cnv(128, 256, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 128, 256);
    const cols = ["#22e6e6", "#ff2ea6", "#ffd166", "#cfe8ff", "#7dff9b"];
    for (let y = 6; y < 250; y += 12) {
      for (let x = 6; x < 122; x += 10) {
        if (Math.random() < 0.42) {
          c.fillStyle = cols[(Math.random() * cols.length) | 0];
          c.globalAlpha = 0.35 + Math.random() * 0.65;
          c.fillRect(x, y, 6, 7);
        }
      }
    }
    c.globalAlpha = 1;
  });
}

function crowdTexture(): THREE.CanvasTexture {
  return cnv(256, 64, (c) => {
    c.fillStyle = "#1c1f26";
    c.fillRect(0, 0, 256, 64);
    const cols = ["#e8d0aa", "#c22f2f", "#2f5ac2", "#e8e8e8", "#f2b705", "#22b573", "#ff8c42", "#9b59b6"];
    for (let y = 4; y < 64; y += 8) {
      for (let x = 2; x < 254; x += 5) {
        c.fillStyle = cols[(Math.random() * cols.length) | 0];
        c.globalAlpha = 0.5 + Math.random() * 0.5;
        c.fillRect(x + Math.random() * 2, y, 3.4, 5.4);
      }
    }
    c.globalAlpha = 1;
  });
}

function checkerTexture(): THREE.CanvasTexture {
  return cnv(160, 40, (c) => {
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 2; j++) {
        c.fillStyle = (i + j) % 2 === 0 ? "#e8e8e8" : "#141414";
        c.fillRect(i * 20, j * 20, 20, 20);
      }
  });
}

function textBoardTexture(lines: string[], bg: string, fg: string): THREE.CanvasTexture {
  return cnv(512, 128, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 512, 128);
    c.strokeStyle = fg;
    c.lineWidth = 8;
    c.strokeRect(6, 6, 500, 116);
    c.fillStyle = fg;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "bold 64px Vazirmatn, Tahoma, sans-serif";
    c.fillText(lines[0], 256, lines.length > 1 ? 46 : 66);
    if (lines.length > 1) {
      c.font = "bold 40px Vazirmatn, Tahoma, sans-serif";
      c.fillText(lines[1], 256, 96);
    }
  });
}

function grassTexture(): THREE.CanvasTexture {
  return cnv(256, 256, (c) => {
    c.fillStyle = "#3f7d3a";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      const g = 95 + Math.random() * 45;
      c.fillStyle = `rgb(${g * 0.55},${g},${g * 0.5})`;
      c.fillRect(Math.random() * 256, Math.random() * 256, 2.5, 2.5);
    }
  });
}

/* ---------------- track construction ---------------- */

interface RibbonOpts {
  y?: number;
  offsetFrom?: number;
  offsetTo?: number;
  vScale?: number;
  material: THREE.Material;
  colorFn?: (i: number, total: number) => THREE.Color;
  range?: [number, number];
}

function buildRibbon(samples: TrackSample[], from: number, to: number, opts: RibbonOpts): THREE.BufferGeometry {
  const y = opts.y ?? 0;
  const a0 = opts.offsetFrom ?? 0;
  const a1 = opts.offsetTo ?? 0;
  const pos: number[] = [];
  const uvs: number[] = [];
  const cols: number[] = [];
  const idx: number[] = [];
  const SN = samples.length;
  const n = to - from;
  if (n <= 0) return new THREE.BufferGeometry();
  for (let i = 0; i <= n; i++) {
    const smp = samples[(from + i) % SN];
    pos.push(
      smp.pos.x + smp.right.x * a0, y, smp.pos.z + smp.right.z * a0,
      smp.pos.x + smp.right.x * a1, y, smp.pos.z + smp.right.z * a1
    );
    const v = (smp.s / (opts.vScale ?? 8));
    uvs.push(0, v, 1, v);
    if (opts.colorFn) {
      const cc = opts.colorFn(i, n);
      cols.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = i * 2 + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  if (opts.colorFn) g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function wallRibbon(samples: TrackSample[], from: number, to: number, offset: number, h: number, mat: THREE.Material): THREE.Mesh {
  const pos: number[] = [];
  const idx: number[] = [];
  const SN = samples.length;
  const n = to - from;
  for (let i = 0; i <= n; i++) {
    const smp = samples[(from + i) % SN];
    const x = smp.pos.x + smp.right.x * offset;
    const z = smp.pos.z + smp.right.z * offset;
    pos.push(x, 0, z, x, h, z);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = i * 2 + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

export function buildTrack(scene: THREE.Scene, spec: TrackSpec): TrackData {
  const group = new THREE.Group();
  scene.add(group);

  const halfW = spec.width / 2;
  const pts = spec.pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal", 0.5);
  const N = 720;
  const raw = curve.getSpacedPoints(N);
  raw.pop(); // last == first for closed curve

  const samples: TrackSample[] = [];
  const segLen = curve.getLength() / N;
  for (let i = 0; i < N; i++) {
    const p = raw[i];
    const prev = raw[(i - 1 + N) % N];
    const next = raw[(i + 1) % N];
    const tan = next.clone().sub(prev).normalize();
    const right = new THREE.Vector3(tan.z, 0, -tan.x).normalize();
    samples.push({ pos: p.clone(), tan, right, s: i * segLen, curv: 0 });
  }
  const length = N * segLen;
  for (let i = 0; i < N; i++) {
    const t0 = samples[(i - 2 + N) % N].tan;
    const t1 = samples[(i + 2) % N].tan;
    const ang = Math.acos(THREE.MathUtils.clamp(t0.dot(t1), -1, 1));
    samples[i].curv = ang / (4 * segLen);
  }

  /* ---------- road ---------- */
  const asphalt = asphaltTexture();
  asphalt.repeat.set(2, 2);
  const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.94, metalness: 0.05 });
  const road = new THREE.Mesh(buildRibbon(samples, 0, N, { y: 0, offsetFrom: -halfW, offsetTo: halfW, vScale: 8, material: roadMat }), roadMat);
  road.receiveShadow = true;
  group.add(road);

  /* ---------- edge lines ---------- */
  const isNeon = spec.theme === "neon";
  const lineMat = isNeon
    ? new THREE.MeshBasicMaterial({ color: 0x2ee6e6 })
    : new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6 });
  const lineOffA = isNeon ? halfW - 0.55 : halfW - 0.45;
  group.add(new THREE.Mesh(buildRibbon(samples, 0, N, { y: 0.02, offsetFrom: -lineOffA, offsetTo: -lineOffA + 0.22, material: lineMat }), lineMat));
  group.add(new THREE.Mesh(buildRibbon(samples, 0, N, { y: 0.02, offsetFrom: lineOffA - 0.22, offsetTo: lineOffA, material: lineMat }), lineMat));

  /* ---------- curbs at corners ---------- */
  const curbZones: boolean[] = new Array(N).fill(false);
  for (let i = 0; i < N; i++) if (samples[i].curv > 0.011) curbZones[i] = true;
  // dilate zones
  const dil = curbZones.slice();
  for (let i = 0; i < N; i++) if (curbZones[i]) for (let d = -9; d <= 9; d++) dil[(i + d + N) % N] = true;
  const curbMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  const red = new THREE.Color(0xc62828);
  const white = new THREE.Color(0xeeeeee);
  const run = (arr: boolean[]) => {
    const zones: [number, number][] = [];
    let st = -1;
    for (let i = 0; i < N; i++) {
      if (arr[i] && st < 0) st = i;
      if (!arr[i] && st >= 0) { zones.push([st, i]); st = -1; }
    }
    if (st >= 0) zones.push([st, N - 1]);
    // merge wrap
    if (zones.length > 1 && zones[0][0] === 0 && zones[zones.length - 1][1] === N - 1) {
      const a = zones.pop()!;
      zones[0][0] = a[0] - N;
    }
    return zones;
  };
  const colorByS = (i: number) => {
    const smp = samples[(i + N) % N];
    return Math.floor(smp.s / 2.6) % 2 === 0 ? red : white;
  };
  for (const [a, b] of run(dil)) {
    if (b - a < 4) continue;
    for (const sgn of [-1, 1]) {
      const g = buildRibbon(samples, (a + N) % N, a < 0 ? b + N : b, {
        y: 0.035,
        offsetFrom: sgn * (halfW + 0.02),
        offsetTo: sgn * (halfW + 1.3),
        material: curbMat,
        colorFn: (_i) => colorByS(_i + (a < 0 ? a + N : a)),
      });
      const m = new THREE.Mesh(g, curbMat);
      m.receiveShadow = true;
      group.add(m);
    }
  }

  /* ---------- walls ---------- */
  const wallLimit = halfW + 2.4;
  const wallOff = halfW + 2.6;
  if (isNeon) {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0d0d16, metalness: 0.6, roughness: 0.5 });
    const glowTop = new THREE.MeshBasicMaterial({ color: 0xff2ea6 });
    const glowTop2 = new THREE.MeshBasicMaterial({ color: 0x22e6e6 });
    group.add(wallRibbon(samples, 0, N, -wallOff, 0.85, wallMat));
    group.add(wallRibbon(samples, 0, N, wallOff, 0.85, wallMat));
    group.add(new THREE.Mesh(buildRibbon(samples, 0, N, { y: 0.87, offsetFrom: -wallOff, offsetTo: -wallOff + 0.18, material: glowTop }), glowTop));
    group.add(new THREE.Mesh(buildRibbon(samples, 0, N, { y: 0.87, offsetFrom: wallOff - 0.18, offsetTo: wallOff, material: glowTop2 }), glowTop2));
  } else {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.4, roughness: 0.5 });
    const wallMat2 = new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 0.4, roughness: 0.5 });
    group.add(wallRibbon(samples, 0, N, -wallOff, 1.0, wallMat));
    group.add(wallRibbon(samples, 0, N, wallOff, 1.0, wallMat2));
    const redBand = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 });
    for (let i = 0; i < N; i += 14) {
      const smp = samples[i];
      for (const sgn of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 6), redBand);
        b.position.set(smp.pos.x + smp.right.x * sgn * wallOff, 0.85, smp.pos.z + smp.right.z * sgn * wallOff);
        b.lookAt(smp.pos.x, 0.85, smp.pos.z);
        group.add(b);
      }
    }
  }

  /* ---------- start / finish ---------- */
  const checker = checkerTexture();
  checker.repeat.set(4, 1);
  const s0 = samples[0];
  const line = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, 3), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.8 }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = -Math.atan2(s0.tan.x, s0.tan.z);
  line.position.set(s0.pos.x, 0.025, s0.pos.z);
  group.add(line);

  const gantryMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.7, roughness: 0.4 });
  for (const sgn of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 0.7), gantryMat);
    p.position.set(s0.pos.x + s0.right.x * sgn * (halfW + 1.6), 4, s0.pos.z + s0.right.z * sgn * (halfW + 1.6));
    p.castShadow = true;
    group.add(p);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 6, 1.6, 1.0), gantryMat);
  beam.position.set(s0.pos.x, 7.6, s0.pos.z);
  beam.lookAt(s0.pos.clone().add(s0.tan));
  group.add(beam);
  const bannerTex = isNeon
    ? textBoardTexture(["⚡ NEON CITY GP ⚡", "شب نئون"], "#0a0a14", "#22e6e6")
    : textBoardTexture(["★ AZADI INTERNATIONAL CIRCUIT", "پیست بین‌المللی آزادی"], "#111318", "#ffd166");
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(spec.width + 4, 1.5), new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide }));
  banner.position.set(s0.pos.x, 7.6, s0.pos.z);
  banner.lookAt(s0.pos.clone().add(s0.tan));
  group.add(banner);

  /* ---------- environment & lighting ---------- */
  const updateFns: ((t: number) => void)[] = [];
  if (isNeon) buildNeonCity(scene, group, samples, halfW, updateFns);
  else buildDayCircuit(scene, group, samples, halfW);

  /* ---------- minimap path ---------- */
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const s of samples) {
    minX = Math.min(minX, s.pos.x); maxX = Math.max(maxX, s.pos.x);
    minZ = Math.min(minZ, s.pos.z); maxZ = Math.max(maxZ, s.pos.z);
  }
  const span = Math.max(maxX - minX, maxZ - minZ) * 1.12;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const minimap = samples.filter((_, i) => i % 5 === 0).map((s) => ({
    x: (s.pos.x - cx) / span + 0.5,
    y: (s.pos.z - cz) / span + 0.5,
  }));

  return {
    spec, curve, samples, length, halfWidth: halfW, wallLimit, minimap,
    update: (t: number) => updateFns.forEach((f) => f(t)),
  };
}

/* ---------------- NEON CITY ---------------- */

function buildNeonCity(scene: THREE.Scene, group: THREE.Group, samples: TrackSample[], halfW: number, updateFns: ((t: number) => void)[]) {
  scene.background = new THREE.Color(0x04040c);
  scene.fog = new THREE.FogExp2(0x050510, 0.0038);

  const hemi = new THREE.HemisphereLight(0x2a2a55, 0x080810, 0.75);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8899ff, 0.5);
  moon.position.set(-200, 260, -150);
  scene.add(moon);
  for (const [col, x, z] of [[0x22e6e6, 60, -140], [0xff2ea6, -180, 120], [0xffd166, 200, 60], [0x22e6e6, -60, 160]] as [number, number, number][]) {
    const pl = new THREE.PointLight(col, 55, 130, 1.8);
    pl.position.set(x, 14, z);
    scene.add(pl);
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2600, 2600),
    new THREE.MeshStandardMaterial({ map: gridGroundTexture(), roughness: 0.85, metalness: 0.25 })
  );
  (ground.material as THREE.MeshStandardMaterial).map!.repeat.set(90, 90);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // stars
  const starPos: number[] = [];
  for (let i = 0; i < 800; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI * 0.42;
    const r = 1100;
    starPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) + 40, r * Math.sin(ph) * Math.sin(th));
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  group.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x99bbff, size: 2.4, sizeAttenuation: false, fog: false })));

  const moonSprite = new THREE.Mesh(
    new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false, transparent: true, opacity: 0.9 })
  );
  moonSprite.position.set(-420, 330, -700);
  moonSprite.lookAt(0, 0, 0);
  group.add(moonSprite);

  // buildings — keep clear of the track
  const distToTrack = (x: number, z: number): number => {
    let d = Infinity;
    for (let i = 0; i < samples.length; i += 6) {
      const dx = samples[i].pos.x - x, dz = samples[i].pos.z - z;
      d = Math.min(d, dx * dx + dz * dz);
    }
    return Math.sqrt(d);
  };
  const bldMats = [
    new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.7, metalness: 0.3, emissive: 0xffffff, emissiveMap: windowsTexture("#000000"), emissiveIntensity: 1.1 }),
    new THREE.MeshStandardMaterial({ color: 0x0d0d18, roughness: 0.7, metalness: 0.3, emissive: 0xffffff, emissiveMap: windowsTexture("#000005"), emissiveIntensity: 1.0 }),
    new THREE.MeshStandardMaterial({ color: 0x090912, roughness: 0.7, metalness: 0.3, emissive: 0xffffff, emissiveMap: windowsTexture("#010108"), emissiveIntensity: 0.95 }),
  ];
  const bldGeo = new THREE.BoxGeometry(1, 1, 1);
  const inst = bldMats.map((m) => {
    const im = new THREE.InstancedMesh(bldGeo, m, 60);
    im.count = 0;
    return im;
  });
  let placed = 0, attempts = 0;
  while (placed < 150 && attempts < 1200) {
    attempts++;
    const x = (Math.random() - 0.5) * 1500;
    const z = (Math.random() - 0.5) * 1500;
    const d = distToTrack(x, z);
    if (d < 34) continue;
    const w = 16 + Math.random() * 22;
    const dep = 16 + Math.random() * 22;
    const h = 22 + Math.pow(Math.random(), 1.6) * 120;
    const im = inst[placed % 3];
    const mtx = new THREE.Matrix4();
    mtx.compose(
      new THREE.Vector3(x, h / 2, z),
      new THREE.Quaternion(),
      new THREE.Vector3(w, h, dep)
    );
    im.setMatrixAt(im.count, mtx);
    im.count++;
    placed++;
  }
  inst.forEach((im) => group.add(im));

  // street lights along track
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x111118, metalness: 0.7, roughness: 0.4 });
  const headCols = [0x22e6e6, 0xffd166, 0xff2ea6];
  const poleCount = Math.floor(samples.length / 30);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6), poleMat, poleCount);
  const heads: THREE.InstancedMesh[] = headCols.map((c) => new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: c }),
    poleCount
  ));
  heads.forEach((h) => (h.count = 0));
  let pi = 0;
  for (let i = 0; i < samples.length; i += 30) {
    const smp = samples[i];
    const sgn = pi % 2 === 0 ? 1 : -1;
    const x = smp.pos.x + smp.right.x * sgn * (halfW + 4.2);
    const z = smp.pos.z + smp.right.z * sgn * (halfW + 4.2);
    const mtx = new THREE.Matrix4();
    mtx.compose(new THREE.Vector3(x, 2.6, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    poles.setMatrixAt(pi, mtx);
    const h = heads[pi % 3];
    const mtx2 = new THREE.Matrix4();
    mtx2.compose(new THREE.Vector3(x, 5.35, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    h.setMatrixAt(h.count, mtx2);
    h.count++;
    pi++;
  }
  poles.count = pi;
  group.add(poles, ...heads);

  // holo billboards
  const texts: [string[], string, string][] = [
    [["TURBO", "توربو نئون"], "#0a0a14", "#ff2ea6"],
    [["GLM RACING", " تیم مسابقه "], "#0a0a14", "#22e6e6"],
    [["DRIVE FAST", "رانندگی خفن"], "#100a14", "#ffd166"],
    [["NEON ⚡ GP", "جلال و سرعت"], "#0a0a14", "#7dff9b"],
  ];
  for (let k = 0; k < 8; k++) {
    const i = Math.floor((k / 8) * samples.length);
    const smp = samples[i];
    const sgn = k % 2 === 0 ? 1 : -1;
    const [txt, bg, fg] = texts[k % texts.length];
    const tex = textBoardTexture(txt, bg, fg);
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.2), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    const x = smp.pos.x + smp.right.x * sgn * (halfW + 12);
    const z = smp.pos.z + smp.right.z * sgn * (halfW + 12);
    bd.position.set(x, 6.5 + Math.random() * 4, z);
    bd.lookAt(smp.pos.x, bd.position.y, smp.pos.z);
    group.add(bd);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(14.8, 6, 0.3), new THREE.MeshStandardMaterial({ color: 0x0c0c14, metalness: 0.7, roughness: 0.4 }));
    frame.position.copy(bd.position);
    frame.quaternion.copy(bd.quaternion);
    frame.translateZ(-0.2);
    group.add(frame);
    updateFns.push((t) => {
      const m = bd.material as THREE.MeshBasicMaterial;
      m.opacity = 0.82 + Math.sin(t * 3 + k * 2.1) * 0.14;
      m.transparent = true;
    });
  }
}

/* ---------------- DAY CIRCUIT ---------------- */

function buildDayCircuit(scene: THREE.Scene, group: THREE.Group, samples: TrackSample[], halfW: number) {
  scene.background = new THREE.Color(0x8ec8ee);
  scene.fog = new THREE.Fog(0xa8cfe8, 350, 1500);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5a30, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.0);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 500;
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -130; sc.right = 130; sc.top = 130; sc.bottom = -130;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  scene.userData.sun = sun;

  const gt = grassTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2600, 2600),
    new THREE.MeshStandardMaterial({ map: gt, roughness: 1.0 })
  );
  (ground.material as THREE.MeshStandardMaterial).map!.repeat.set(60, 60);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.04;
  ground.receiveShadow = true;
  group.add(ground);

  const distToTrack = (x: number, z: number): number => {
    let d = Infinity;
    for (let i = 0; i < samples.length; i += 6) {
      const dx = samples[i].pos.x - x, dz = samples[i].pos.z - z;
      d = Math.min(d, dx * dx + dz * dz);
    }
    return Math.sqrt(d);
  };

  /* grandstands along start straight + corners */
  const crowd = crowdTexture();
  const standBody = new THREE.MeshStandardMaterial({ color: 0x39404d, metalness: 0.4, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 0.6, roughness: 0.35 });
  const standAt = (i: number, len: number, sgn: number) => {
    const smp = samples[i % samples.length];
    const g = new THREE.Group();
    for (let step = 0; step < 4; step++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(len, 2.2, 3), standBody);
      b.position.set(0, 1.1 + step * 2.0, -step * 2.6);
      b.castShadow = b.receiveShadow = true;
      g.add(b);
      const crowdPlane = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.0), new THREE.MeshBasicMaterial({ map: crowd }));
      crowdPlane.position.set(0, 1.3 + step * 2.0, -step * 2.6 + 1.55);
      crowdPlane.rotation.x = -0.5;
      g.add(crowdPlane);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(len + 2, 0.4, 14), roofMat);
    roof.position.set(0, 9.6, -3.6);
    roof.castShadow = true;
    g.add(roof);
    for (const px of [-len / 2 + 1, 0, len / 2 - 1]) {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 9.4, 8), standBody);
      pil.position.set(px, 4.8, -8.2);
      g.add(pil);
    }
    const x = smp.pos.x + smp.right.x * sgn * (halfW + 16);
    const z = smp.pos.z + smp.right.z * sgn * (halfW + 16);
    g.position.set(x, 0, z);
    g.lookAt(smp.pos.x, 0, smp.pos.z);
    group.add(g);
  };
  standAt(8, 70, 1);
  standAt(120, 46, -1);
  standAt(400, 46, 1);
  standAt(600, 46, -1);

  /* floodlight towers */
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.7, roughness: 0.4 });
  for (let k = 0; k < 6; k++) {
    const i = Math.floor((k / 6) * samples.length);
    const smp = samples[i];
    const sgn = k % 2 === 0 ? 1 : -1;
    const x = smp.pos.x + smp.right.x * sgn * (halfW + 26);
    const z = smp.pos.z + smp.right.z * sgn * (halfW + 26);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.0, 30, 8), poleMat);
    pole.position.set(x, 15, z);
    pole.castShadow = true;
    group.add(pole);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(7, 3.4, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfe8ff, emissiveIntensity: 0.7 })
    );
    head.position.set(x, 31, z);
    head.lookAt(smp.pos.x, 0, smp.pos.z);
    group.add(head);
  }

  /* sponsor boards on straights */
  const boards: [string[], string, string][] = [
    [["GLM GRAND PRIX", "جام سرعت"], "#0e2a1e", "#7dff9b"],
    [["TURBO CUP 2026", "جام توربو"], "#1a1206", "#ffd166"],
    [["Z.AI RACING", "هوش مصنوعی"], "#0a1420", "#22e6e6"],
    [["AZADI CIRCUIT", "پیست آزادی"], "#200a0a", "#ff8c42"],
  ];
  for (let k = 0; k < 10; k++) {
    const i = Math.floor((k / 10) * samples.length);
    const smp = samples[i];
    const sgn = k % 2 === 0 ? 1 : -1;
    const [txt, bg, fg] = boards[k % boards.length];
    const tex = textBoardTexture(txt, bg, fg);
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.8), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.6 }));
    const x = smp.pos.x + smp.right.x * sgn * (halfW + 5.5);
    const z = smp.pos.z + smp.right.z * sgn * (halfW + 5.5);
    bd.position.set(x, 1.2, z);
    bd.lookAt(smp.pos.x, 1.2, smp.pos.z);
    group.add(bd);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), poleMat);
    leg.position.set(x, 0.4, z);
    group.add(leg);
  }

  /* tire stacks at corner exits */
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95 });
  const tireGeo = new THREE.TorusGeometry(0.55, 0.28, 8, 14);
  tireGeo.rotateX(Math.PI / 2);
  let tireCount = 0;
  const tireInst = new THREE.InstancedMesh(tireGeo, tireMat, 260);
  for (let i = 0; i < samples.length; i += 8) {
    if (samples[i].curv < 0.012 || Math.random() < 0.55) continue;
    const smp = samples[i];
    const sgn = samples[(i + 4) % samples.length].right.dot(smp.tan) >= 0 ? 1 : -1;
    for (let layer = 0; layer < 3; layer++) {
      if (tireCount >= 260) break;
      const x = smp.pos.x + smp.right.x * sgn * (halfW + 4.6);
      const z = smp.pos.z + smp.right.z * sgn * (halfW + 4.6);
      const mtx = new THREE.Matrix4();
      mtx.compose(new THREE.Vector3(x, 0.28 + layer * 0.55, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      tireInst.setMatrixAt(tireCount++, mtx);
    }
  }
  tireInst.count = tireCount;
  tireInst.castShadow = true;
  group.add(tireInst);

  /* trees */
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.6, 6);
  const crownGeo = new THREE.ConeGeometry(2.2, 5.5, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.9 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2e6b34, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, 90);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, 90);
  let ti = 0, att = 0;
  while (ti < 90 && att < 800) {
    att++;
    const x = (Math.random() - 0.5) * 1400;
    const z = (Math.random() - 0.5) * 1400;
    if (distToTrack(x, z) < 26) continue;
    const s = 0.8 + Math.random() * 0.9;
    let mtx = new THREE.Matrix4();
    mtx.compose(new THREE.Vector3(x, 1.3 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    trunks.setMatrixAt(ti, mtx);
    mtx = new THREE.Matrix4();
    mtx.compose(new THREE.Vector3(x, (2.6 + 2.75) * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    crowns.setMatrixAt(ti, mtx);
    ti++;
  }
  trunks.count = crowns.count = ti;
  trunks.castShadow = crowns.castShadow = true;
  group.add(trunks, crowns);

  /* marshal posts */
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
  const roofOr = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.6 });
  for (let i = 0; i < samples.length; i += 120) {
    const smp = samples[i];
    const sgn = (i / 120) % 2 === 0 ? 1 : -1;
    const x = smp.pos.x + smp.right.x * sgn * (halfW + 7);
    const z = smp.pos.z + smp.right.z * sgn * (halfW + 7);
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), postMat);
    b.position.set(x, 1.1, z);
    b.castShadow = true;
    const r = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.0, 4), roofOr);
    r.position.set(x, 2.7, z);
    r.rotation.y = Math.PI / 4;
    group.add(b, r);
  }
}
