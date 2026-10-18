import * as THREE from "three";

/* ============================================================
   10 unique sports cars — procedural low-poly-but-sleek models
   ============================================================ */

export type SpoilerType = "wing" | "bigwing" | "ducktail" | "lip" | "none";

export interface BodyShape {
  length: number;
  width: number; // half width
  low: number; // bottom y
  tailTop: number;
  midTop: number;
  noseTop: number;
  noseWidth: number;
  tailWidth: number;
  roundN: number; // superellipse exponent (2 = round, 5 = boxy)
  cabinStart: number; // z start (negative = rear-ward)
  cabinEnd: number;
  cabinHeight: number;
  wheelR: number;
  wheelW: number;
  wheelZFront: number;
  wheelZRear: number;
  spoiler: SpoilerType;
  splitter: boolean;
  stripe: boolean;
  scoop: boolean;
}

export interface CarSpec {
  id: string;
  name: string;
  tag: string; // short latin badge
  color: number;
  accent: number;
  rim: number;
  topSpeed: number; // km/h
  accel: number; // 0..10
  handling: number; // 0..10
  desc: string;
  shape: BodyShape;
}

const S = (o: Partial<BodyShape>): BodyShape => ({
  length: 4.5,
  width: 0.98,
  low: 0.14,
  tailTop: 0.62,
  midTop: 0.66,
  noseTop: 0.42,
  noseWidth: 0.62,
  tailWidth: 0.86,
  roundN: 3.2,
  cabinStart: -1.1,
  cabinEnd: 0.75,
  cabinHeight: 0.34,
  wheelR: 0.34,
  wheelW: 0.26,
  wheelZFront: 1.42,
  wheelZRear: -1.45,
  spoiler: "wing",
  splitter: true,
  stripe: false,
  scoop: false,
  ...o,
});

export const CAR_SPECS: CarSpec[] = [
  {
    id: "azar", name: "آذرخش RS", tag: "AZR-RS",
    color: 0xd81a1a, accent: 0xf5f5f5, rim: 0x222226,
    topSpeed: 324, accel: 9.4, handling: 8.6,
    desc: "جانور قرمز پیست؛ شتاب وحشتناک و صدای موتور آتشین",
    shape: S({ roundN: 3.0, spoiler: "wing", tailTop: 0.64, midTop: 0.68 }),
  },
  {
    id: "shahin", name: "شاهین SV", tag: "SHN-SV",
    color: 0xf2b705, accent: 0x141414, rim: 0x1a1a1e,
    topSpeed: 332, accel: 9.0, handling: 9.0,
    desc: "گوه‌ی زرد؛ زوایای تند، چسبیده به آسفالت",
    shape: S({ roundN: 4.6, length: 4.6, width: 1.02, noseTop: 0.34, cabinStart: -0.9, cabinEnd: 0.5, spoiler: "bigwing", cabinHeight: 0.3 }),
  },
  {
    id: "sayeh", name: "سایه GT", tag: "SYH-GT",
    color: 0x14161c, accent: 0x9aa4b0, rim: 0x30343c,
    topSpeed: 318, accel: 8.8, handling: 9.2,
    desc: "شبح سیاه شب؛ فرمان‌پذیری سایه‌مانند",
    shape: S({ roundN: 3.4, spoiler: "ducktail", midTop: 0.64 }),
  },
  {
    id: "saege", name: "صاعقه P1", tag: "SQE-P1",
    color: 0xff6a00, accent: 0x1a1a1a, rim: 0x2c2c30,
    topSpeed: 336, accel: 9.6, handling: 8.4,
    desc: "دم‌بلند نارنجی؛ ساخته‌شده برای سرعت نهایی",
    shape: S({ length: 4.72, width: 0.96, cabinStart: -0.7, cabinEnd: 0.85, cabinHeight: 0.3, spoiler: "wing", midTop: 0.62 }),
  },
  {
    id: "yakh", name: "یخ S", tag: "YKH-S",
    color: 0xcfd6de, accent: 0xd81a1a, rim: 0xd8d8dc,
    topSpeed: 306, accel: 8.2, handling: 9.8,
    desc: "دقیق‌ترین ماشین گاراژ؛ فرمان‌پذیری افسانه‌ای",
    shape: S({ length: 4.3, roundN: 2.5, width: 0.9, midTop: 0.7, noseTop: 0.48, cabinStart: -0.7, cabinEnd: 0.45, spoiler: "lip", wheelR: 0.33, stripe: true }),
  },
  {
    id: "toofan", name: "توفان ۱۶", tag: "TFN-16",
    color: 0x1141d8, accent: 0x0a0f1e, rim: 0x30343a,
    topSpeed: 344, accel: 9.9, handling: 8.0,
    desc: "سریع‌ترین گاراژ؛ عریض، سنگین و بی‌رحم",
    shape: S({ length: 4.62, width: 1.08, roundN: 3.6, tailTop: 0.7, midTop: 0.72, tailWidth: 0.98, spoiler: "ducktail", cabinStart: -1.2, cabinEnd: 0.6 }),
  },
  {
    id: "afi", name: "افعی DB", tag: "AFI-DB",
    color: 0x0f7a3d, accent: 0xc8f542, rim: 0x26262a,
    topSpeed: 326, accel: 8.9, handling: 8.2,
    desc: "گرن‌توریسمو سبز؛ کاپوت بلند، شیک و خطرناک",
    shape: S({ length: 4.8, width: 1.0, cabinStart: -0.55, cabinEnd: 0.7, cabinHeight: 0.32, spoiler: "lip", midTop: 0.64 }),
  },
  {
    id: "barq", name: "برق R", tag: "BRQ-R",
    color: 0x5a6068, accent: 0xd81a1a, rim: 0x1c1c20,
    topSpeed: 320, accel: 9.3, handling: 8.8,
    desc: "غول خاکستری با بال عظیم؛ پادشاه پیچ‌ها",
    shape: S({ roundN: 3.8, tailTop: 0.72, midTop: 0.7, spoiler: "bigwing", stripe: true, scoop: true }),
  },
  {
    id: "mahtab", name: "مه‌تاب MC", tag: "MHB-MC",
    color: 0xece7dc, accent: 0xc9a227, rim: 0xc9a227,
    topSpeed: 312, accel: 8.4, handling: 8.4,
    desc: "کوپه‌ی مرواریدی؛ لوکس، آرام و مرگبار",
    shape: S({ length: 4.78, width: 1.0, roundN: 2.9, cabinStart: -1.0, cabinEnd: 0.9, cabinHeight: 0.32, spoiler: "none", midTop: 0.68 }),
  },
  {
    id: "shahab", name: "شهاب X", tag: "SHB-X",
    color: 0x7a1fd0, accent: 0x22e6e6, rim: 0x141418,
    topSpeed: 330, accel: 9.2, handling: 9.0,
    desc: "کانسپت آینده؛ نورهای نئونی و فرم شهابی",
    shape: S({ length: 4.56, roundN: 3.0, tailTop: 0.74, midTop: 0.68, noseTop: 0.36, spoiler: "wing", stripe: true }),
  },
];

export function getCarSpec(id: string): CarSpec {
  return CAR_SPECS.find((c) => c.id === id) ?? CAR_SPECS[0];
}

/* ---------------- geometry helpers ---------------- */

function loft(sections: { z: number; w: number; yb: number; yt: number; n: number }[], segs = 26): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const rings: number[][] = [];
  for (const s of sections) {
    const ring: number[] = [];
    const yc = (s.yb + s.yt) / 2;
    const h = (s.yt - s.yb) / 2;
    for (let i = 0; i < segs; i++) {
      const th = (i / segs) * Math.PI * 2;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const e = 2 / s.n;
      const x = s.w * Math.sign(c) * Math.pow(Math.abs(c), e);
      const y = yc + h * Math.sign(sn) * Math.pow(Math.abs(sn), e);
      ring.push(x, y, s.z);
    }
    rings.push(ring);
  }
  for (const r of rings) for (let i = 0; i < r.length; i += 3) pos.push(r[i], r[i + 1], r[i + 2]);
  const N = segs;
  for (let s = 0; s < sections.length - 1; s++) {
    for (let i = 0; i < N; i++) {
      const a = s * N + i;
      const b = s * N + ((i + 1) % N);
      const c = a + N;
      const d = b + N;
      idx.push(a, c, b, b, c, d);
    }
  }
  // end caps (fan)
  const last = (sections.length - 1) * N;
  const c0 = pos.length / 3;
  {
    const ring = rings[0];
    let sx = 0, sy = 0;
    for (let i = 0; i < ring.length; i += 3) { sx += ring[i]; sy += ring[i + 1]; }
    pos.push(sx / N, sy / N, sections[0].z);
  }
  const c1 = pos.length / 3;
  {
    const ring = rings[rings.length - 1];
    let sx = 0, sy = 0;
    for (let i = 0; i < ring.length; i += 3) { sx += ring[i]; sy += ring[i + 1]; }
    pos.push(sx / N, sy / N, sections[sections.length - 1].z);
  }
  for (let i = 0; i < N; i++) {
    idx.push(c0, (i + 1) % N, i);
    idx.push(c1, last + i, last + ((i + 1) % N));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function makeWheel(shape: BodyShape, rimMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(shape.wheelR, shape.wheelR, shape.wheelW, 22),
    new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.92 })
  );
  tire.geometry.rotateZ(Math.PI / 2);
  g.add(tire);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(shape.wheelR * 0.58, shape.wheelR * 0.58, shape.wheelW * 1.04, 18),
    rimMat
  );
  rim.geometry.rotateZ(Math.PI / 2);
  g.add(rim);
  for (let i = 0; i < 6; i++) {
    const sp = box(shape.wheelR * 1.05, shape.wheelR * 0.13, shape.wheelW * 1.12, rimMat);
    sp.rotation.x = (i / 6) * Math.PI;
    g.add(sp);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(shape.wheelR * 0.16, shape.wheelR * 0.16, shape.wheelW * 1.18, 10), rimMat);
  cap.geometry.rotateZ(Math.PI / 2);
  g.add(cap);
  return g;
}

export interface CarModel {
  group: THREE.Group;
  spinWheels: THREE.Group[];
  steerPivots: THREE.Group[];
  bodyGroup: THREE.Group;
}

export function buildCar(spec: CarSpec, opts?: { nightLights?: boolean; player?: boolean }): CarModel {
  const sh = spec.shape;
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const paint = new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.65, roughness: 0.28, envMapIntensity: 1.15 });
  const accentMat = new THREE.MeshStandardMaterial({ color: spec.accent, metalness: 0.5, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b0e14, metalness: 0.9, roughness: 0.08, envMapIntensity: 1.4 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x101013, metalness: 0.3, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 1.0, roughness: 0.18 });
  const rimMat = new THREE.MeshStandardMaterial({ color: spec.rim, metalness: 0.85, roughness: 0.3 });
  const lightF = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xcfe8ff, emissiveIntensity: opts?.nightLights ? 3.2 : 0.7 });
  const lightR = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 2.6 });

  const L = sh.length;
  const bodyTopAt = (z: number): number => {
    if (z < -L * 0.2) return sh.tailTop;
    if (z < L * 0.15) return sh.midTop;
    return sh.midTop + ((sh.noseTop - sh.midTop) * (z - L * 0.15)) / (L * 0.35);
  };

  /* ---- main body loft ---- */
  const hb = L / 2;
  const body = new THREE.Mesh(
    loft([
      { z: -hb, w: sh.tailWidth * 0.8, yb: sh.low + 0.05, yt: sh.tailTop * 0.92, n: sh.roundN },
      { z: -hb + 0.4, w: sh.tailWidth, yb: sh.low, yt: sh.tailTop, n: sh.roundN },
      { z: -L * 0.2, w: sh.width, yb: sh.low - 0.01, yt: sh.midTop, n: sh.roundN },
      { z: L * 0.12, w: sh.width, yb: sh.low - 0.01, yt: sh.midTop, n: sh.roundN },
      { z: L * 0.34, w: sh.width * 0.93, yb: sh.low + 0.02, yt: (sh.midTop + sh.noseTop) / 2 + 0.02, n: sh.roundN * 0.85 },
      { z: hb - 0.22, w: sh.noseWidth + 0.14, yb: sh.low + 0.05, yt: sh.noseTop + 0.03, n: 3.0 },
      { z: hb, w: sh.noseWidth * 0.78, yb: sh.low + 0.08, yt: sh.noseTop * 0.9, n: 2.4 },
    ]),
    paint
  );
  bodyGroup.add(body);

  /* ---- cabin (glass) loft ---- */
  const cabin = new THREE.Mesh(
    loft([
      { z: sh.cabinStart, w: sh.width * 0.7, yb: bodyTopAt(sh.cabinStart) - 0.06, yt: bodyTopAt(sh.cabinStart) + 0.05, n: 3 },
      { z: sh.cabinStart + (sh.cabinEnd - sh.cabinStart) * 0.32, w: sh.width * 0.74, yb: bodyTopAt(sh.cabinStart) - 0.1, yt: bodyTopAt(sh.cabinStart) + sh.cabinHeight, n: 3 },
      { z: sh.cabinEnd - (sh.cabinEnd - sh.cabinStart) * 0.18, w: sh.width * 0.68, yb: bodyTopAt(sh.cabinEnd) - 0.1, yt: bodyTopAt(sh.cabinEnd) + sh.cabinHeight * 0.92, n: 3 },
      { z: sh.cabinEnd, w: sh.width * 0.55, yb: bodyTopAt(sh.cabinEnd) - 0.06, yt: bodyTopAt(sh.cabinEnd) + 0.04, n: 3 },
    ]),
    glass
  );
  bodyGroup.add(cabin);

  if (sh.scoop) {
    bodyGroup.add(box(0.34, 0.09, 0.5, trim, 0, bodyTopAt(-0.2) + sh.cabinHeight * 0.4, -0.2));
  }

  /* ---- stripes ---- */
  if (sh.stripe) {
    const stY = bodyTopAt(L * 0.12) + 0.012;
    bodyGroup.add(box(0.16, 0.012, L * 0.42, accentMat, -0.13, stY, L * 0.05));
    bodyGroup.add(box(0.16, 0.012, L * 0.42, accentMat, 0.13, stY, L * 0.05));
  }

  /* ---- lights ---- */
  const hlY = sh.noseTop * 0.72;
  bodyGroup.add(box(0.3, 0.1, 0.08, lightF, -sh.noseWidth * 0.5, hlY, hb - 0.06));
  bodyGroup.add(box(0.3, 0.1, 0.08, lightF, sh.noseWidth * 0.5, hlY, hb - 0.06));
  bodyGroup.add(box(sh.tailWidth * 1.35, 0.08, 0.06, lightR, 0, sh.tailTop * 0.78, -hb + 0.02));

  /* ---- splitter, skirts, exhaust ---- */
  if (sh.splitter) bodyGroup.add(box(sh.width * 1.9, 0.06, 0.4, trim, 0, sh.low + 0.01, hb - 0.12));
  bodyGroup.add(box(0.07, 0.09, L * 0.42, trim, -(sh.width + 0.03), sh.low + 0.02, -L * 0.08));
  bodyGroup.add(box(0.07, 0.09, L * 0.42, trim, sh.width + 0.03, sh.low + 0.02, -L * 0.08));
  const ex1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.16, 10), chrome);
  ex1.geometry.rotateX(Math.PI / 2);
  ex1.position.set(-sh.tailWidth * 0.45, sh.low + 0.05, -hb - 0.02);
  const ex2 = ex1.clone();
  ex2.position.x = sh.tailWidth * 0.45;
  bodyGroup.add(ex1, ex2);

  /* ---- spoiler ---- */
  const sz = -hb + 0.18;
  if (sh.spoiler === "wing" || sh.spoiler === "bigwing") {
    const big = sh.spoiler === "bigwing";
    const h = big ? 0.3 : 0.18;
    bodyGroup.add(box(0.06, h, 0.14, trim, -(sh.width * 0.62), sh.tailTop + h / 2, sz));
    bodyGroup.add(box(0.06, h, 0.14, trim, sh.width * 0.62, sh.tailTop + h / 2, sz));
    const blade = box(sh.width * (big ? 1.95 : 1.7), 0.045, big ? 0.36 : 0.3, big ? accentMat : trim, 0, sh.tailTop + h + 0.02, sz - 0.04);
    blade.rotation.x = -0.14;
    bodyGroup.add(blade);
    if (big) {
      bodyGroup.add(box(0.03, 0.15, 0.3, trim, -sh.width * 0.97, sh.tailTop + h, sz - 0.04));
      bodyGroup.add(box(0.03, 0.15, 0.3, trim, sh.width * 0.97, sh.tailTop + h, sz - 0.04));
    }
  } else if (sh.spoiler === "ducktail") {
    const dt = box(sh.width * 1.6, 0.07, 0.3, paint, 0, sh.tailTop + 0.04, sz);
    dt.rotation.x = 0.42;
    bodyGroup.add(dt);
  } else if (sh.spoiler === "lip") {
    bodyGroup.add(box(sh.width * 1.45, 0.035, 0.16, trim, 0, sh.tailTop + 0.02, sz));
  }

  /* ---- wheels ---- */
  const spinWheels: THREE.Group[] = [];
  const steerPivots: THREE.Group[] = [];
  const mkWheel = (z: number, x: number, front: boolean) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, sh.wheelR, z);
    const spin = makeWheel(sh, rimMat);
    pivot.add(spin);
    group.add(pivot);
    spinWheels.push(spin);
    if (front) steerPivots.push(pivot);
  };
  mkWheel(sh.wheelZFront, -(sh.width + 0.02), true);
  mkWheel(sh.wheelZFront, sh.width + 0.02, true);
  mkWheel(sh.wheelZRear, -(sh.width + 0.02), false);
  mkWheel(sh.wheelZRear, sh.width + 0.02, false);

  /* ---- underglow for player at night ---- */
  if (opts?.nightLights && opts?.player) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(sh.width * 2.6, L * 0.9),
      new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    group.add(glow);
  }

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });

  return { group, spinWheels, steerPivots, bodyGroup };
}
