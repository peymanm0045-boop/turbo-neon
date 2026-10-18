---
Task ID: 1
Agent: main (Z.ai)
Task: ساخت بازی مسابقه‌ای اندرویدی (وب-محور) با ۱۰ ماشین اسپرت و ۲ پیست

Work Log:
- Initialized fullstack env (init-fullstack.sh) and installed three@0.186
- Built src/game/cars.ts: 10 procedural sports cars (loft-based superellipse bodies, unique spoilers/stripes/colors/specs)
- Built src/game/tracks.ts: Neon City night circuit (buildings+billboards+streetlights+stars) and Azadi International day F1 circuit (grandstands, curbs, floodlights, tire stacks, trees)
- Built src/game/engine.ts: arcade physics with drift/grip, 9 AI drivers (skill levels + rubberbanding), lap/position logic, car-car & wall collisions, chase camera with FOV speed effect, smoke particles, WebAudio engine/skid/beeps, minimap, adaptive DPR
- Built UI: RacingGame.tsx (menu/garage/tracks/race state machine), Hud.tsx (speedometer gauge, touch controls, pause/results overlays), MenuScreens.tsx (Persian RTL menus, track SVG previews), CarPreview.tsx (rotating 3D showroom)
- PWA: manifest.json + icons, fullscreen + orientation lock button
- Fixed via browser self-verification: rotate-hint CSS conflict (JS matchMedia), buildRibbon/wallRibbon out-of-bounds index crash, minimap lazy canvas lookup, touch-action scrolling on menus, duplicate portrait blocks, React refs-in-render lint errors
- Verified end-to-end with agent-browser: menu, garage 3D preview + carousel, both maps racing, countdown+GO, acceleration to 106 km/h via keyboard and 83 km/h via touch, pause menu, minimap, standings

Stage Summary:
- Deliverable: playable 3D racing game at / (Next.js + Three.js), Persian RTL UI, installable as PWA on Android
- 10 unique sports cars, 2 tracks (Neon City night + International day circuit), 9 AI opponents
- Lint clean (1 harmless font warning), dev server healthy, no runtime errors
