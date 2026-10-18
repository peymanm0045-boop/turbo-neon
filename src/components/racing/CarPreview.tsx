"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildCar, type CarSpec } from "@/game/cars";

export default function CarPreview({ spec }: { spec: CarSpec }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const specRef = useRef(spec);
  useEffect(() => {
    specRef.current = spec;
  }, [spec]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 60);
    camera.position.set(6.2, 2.4, 6.6);
    camera.lookAt(0, 0.55, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0x8899bb, 0x0a0a12, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x66e0ff, 1.4);
    rim.position.set(-6, 3, -5);
    scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xff4ea6, 0.9);
    rim2.position.set(4, 2, -6);
    scene.add(rim2);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(6.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x0c0c14, metalness: 0.75, roughness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(5.7, 6.0, 64),
      new THREE.MeshBasicMaterial({ color: 0x22e6e6, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    scene.add(ring);

    let carGroup: THREE.Group | null = null;
    let spinWheels: THREE.Group[] = [];
    const build = (sp: CarSpec) => {
      if (carGroup) scene.remove(carGroup);
      const m = buildCar(sp, { nightLights: true, player: true });
      carGroup = m.group;
      spinWheels = m.spinWheels;
      scene.add(carGroup);
    };
    build(specRef.current);

    let raf = 0;
    let t = 0;
    let lastSpec = specRef.current.id;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      if (specRef.current.id !== lastSpec) {
        lastSpec = specRef.current.id;
        build(specRef.current);
      }
      if (carGroup) carGroup.rotation.y = t * 0.55;
      for (const w of spinWheels) w.rotation.x -= dt * 1.2;
      camera.position.y = 2.35 + Math.sin(t * 0.4) * 0.18;
      camera.lookAt(0, 0.55, 0);
      const parent = canvas.parentElement;
      if (parent) {
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose?.();
          const m = o.material as THREE.Material | THREE.Material[];
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose?.();
        }
      });
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-label="پیش‌نمایش سه‌بعدی ماشین" />;
}
