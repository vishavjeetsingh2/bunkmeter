import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { dialAngle, spring, tones, type InstrumentState } from './motion';

export interface InstrumentScene {
  ready: Promise<void>;
  update(state: InstrumentState): void;
  dispose(): void;
}

/** One isolated, demand-rendered enhancement. No attendance or input logic lives here. */
export function createInstrument(host: HTMLElement, initial: InstrumentState, unavailable: () => void): InstrumentScene {
  performance.mark('instrument-init');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 2.2, -2.2, .1, 30);
  camera.position.set(0, 0, 9);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04, .1, 100, { size: 64 });
  scene.environment = environment.texture;
  scene.environmentIntensity = .6;
  room.dispose(); pmrem.dispose();
  performance.measure('instrument-environment', 'instrument-init');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x687278, .85));
  const key = new THREE.DirectionalLight(0xfff7e8, 1.6);
  key.position.set(-3, 5, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
  key.shadow.normalBias = .025;
  key.shadow.radius = 4;
  key.shadow.blurSamples = 8;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9ecf1, .8);
  fill.position.set(4, 0, 3); scene.add(fill);
  const instrument = new THREE.Group(); scene.add(instrument);
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const material = (options: THREE.MeshStandardMaterialParameters) => {
    const result = new THREE.MeshStandardMaterial(options); materials.push(result); return result;
  };
  const metal = material({ color: '#354449', metalness: .82, roughness: .3 });
  const rim = material({ color: '#b6bcb5', metalness: .86, roughness: .26 });
  const dark = material({ color: '#172e33', metalness: .45, roughness: .6 });
  const accent = material({ color: '#d89e46', metalness: .65, roughness: .3 });
  const trackMaterial = material({ color: '#c4c9bd', roughness: .75 });
  const arcMaterial = material({ color: tones[initial.tone], roughness: .35, metalness: .24 });
  function mesh(geometry: THREE.BufferGeometry, surface: THREE.Material, z: number, parent: THREE.Object3D = instrument) {
    geometries.push(geometry);
    const item = new THREE.Mesh(geometry, surface);
    item.position.z = z; item.castShadow = true; parent.add(item); return item;
  }
  function disc(radius: number, depth: number, z: number, surface: THREE.Material) {
    const geometry = new THREE.CylinderGeometry(radius, radius, depth, 96);
    geometry.rotateX(Math.PI / 2); return mesh(geometry, surface, z);
  }
  disc(1.79, .34, -.14, metal);
  disc(1.72, .04, -.33, dark);
  mesh(new THREE.TorusGeometry(1.76, .035, 12, 128), rim, .04);
  mesh(new THREE.RingGeometry(1.57, 1.75, 128), metal, .065);
  mesh(new THREE.TorusGeometry(1.59, .028, 12, 128), dark, .075);
  mesh(new THREE.TorusGeometry(1.56, .012, 8, 128), rim, .08);
  // Repeated sidewall milling is one draw call, not a hundred independent meshes.
  const grooveGeometry = new THREE.BoxGeometry(.014, .025, .21);
  geometries.push(grooveGeometry);
  const grooves = new THREE.InstancedMesh(grooveGeometry, dark, 100);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 100; i++) {
    const angle = i / 100 * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 1.792, Math.sin(angle) * 1.792, -.15);
    dummy.rotation.z = angle; dummy.updateMatrix(); grooves.setMatrixAt(i, dummy.matrix);
  }
  instrument.add(grooves);
  const face = document.createElement('canvas'); face.width = face.height = 1024;
  const context = face.getContext('2d');
  if (!context) { renderer.dispose(); canvas.remove(); throw new Error('Face texture unavailable'); }
  const texture = new THREE.CanvasTexture(face); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const faceMaterial = material({ map: texture, roughness: .9, metalness: 0 });
  mesh(new THREE.CircleGeometry(1.55, 128), faceMaterial, .045).castShadow = false;
  function paint(state: InstrumentState) {
    if (!context) return;
    context.fillStyle = '#d5decf'; context.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i <= 100; i++) {
      const a = dialAngle(i / 100);
      const major = i % 5 === 0;
      context.strokeStyle = major ? '#263d34' : '#63715f';
      context.lineWidth = major ? 4 : 2.5;
      context.beginPath();
      context.moveTo(512 + Math.cos(a) * 485, 512 - Math.sin(a) * 485);
      context.lineTo(512 + Math.cos(a) * (major ? 462 : 473), 512 - Math.sin(a) * (major ? 462 : 473));
      context.stroke();
    }
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = '600 32px "Segoe UI", sans-serif'; context.fillStyle = '#203b31';
    for (const i of [0, 25, 50, 75, 100]) {
      const a = dialAngle(i / 100);
      context.fillText(String(i), 512 + Math.cos(a) * 327, 512 - Math.sin(a) * 327);
    }
    context.font = '600 30px "Segoe UI", sans-serif';
    context.fillText(state.preview ? 'NEXT CLASS PREVIEW' : 'ATTENDANCE', 512, 435);
    context.fillStyle = '#08282e'; context.font = '600 140px "Segoe UI", sans-serif';
    context.fillText(state.value === null ? '—' : `${state.value}%`, 512, 535);
    context.font = '600 30px "Segoe UI", sans-serif'; context.fillStyle = '#263f33';
    context.fillText(state.target === null ? 'Set your target' : `TARGET  ${state.target}%`, 512, 645);
    context.fillStyle = '#173a40'; context.font = '700 32px "Segoe UI", sans-serif';
    context.fillText('B U N K M E T E R', 512, 835);
    context.fillStyle = '#a27031'; context.fillRect(485, 780, 54, 5);
    texture.needsUpdate = true;
  }
  paint(initial);
  const sweep = Math.PI * 1.5;
  const track = mesh(new THREE.TorusGeometry(1.26, .053, 12, 256, sweep), trackMaterial, .05);
  track.scale.y = -1; track.rotation.z = Math.PI * 1.25;
  const arcGeometry = new THREE.TorusGeometry(1.26, .058, 12, 256, sweep);
  const originalIndices = arcGeometry.getIndex()!;
  const orderedIndices: number[] = [];
  for (let segment = 0; segment < 256; segment++) {
    for (let side = 0; side < 12; side++) {
      for (let vertex = 0; vertex < 6; vertex++) orderedIndices.push(originalIndices.getX((side * 256 + segment) * 6 + vertex));
    }
  }
  arcGeometry.setIndex(orderedIndices);
  const arc = mesh(arcGeometry, arcMaterial, .068); arc.scale.y = -1; arc.rotation.z = Math.PI * 1.25;
  const tip = mesh(new THREE.SphereGeometry(.058, 12, 8), arcMaterial, .068);
  const marker = new THREE.Group(); instrument.add(marker);
  const markerBar = mesh(new THREE.BoxGeometry(.23, .045, .06), accent, .12, marker);
  markerBar.position.x = 1.4;
  const markerStud = mesh(new THREE.CylinderGeometry(.047, .047, .065, 16).rotateX(Math.PI / 2), accent, .115, marker);
  markerStud.position.x = 1.53;
  // Ground receives a real directional shadow; a dark inner lip supplies recess depth.
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: .18 }); materials.push(shadowMaterial);
  const ground = mesh(new THREE.PlaneGeometry(20, 20), shadowMaterial, -.75, scene);
  ground.castShadow = false; ground.receiveShadow = true;

  let state = initial, frame = 0, disposed = false, visible = true, prepared = false, lastTime = 0;
  let pointerX = 0, pointerY = 0, slowFrames = 0, qualityReduced = false;
  const attendance = spring(initial.ratio), target = spring((initial.target ?? 75) / 100);
  const tiltX = spring(.2), tiltY = spring(-.22);
  const color = new THREE.Color(tones[initial.tone]);
  let renders = 0;
  function draw(time: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) { lastTime = 0; return; }
    const elapsed = lastTime ? (time - lastTime) / 1000 : 1 / 60;
    lastTime = time;
    const ratio = Math.max(0, Math.min(1, attendance.step(state.ratio, elapsed)));
    arcGeometry.setDrawRange(0, Math.floor(ratio * 256) * 12 * 6);
    arc.visible = tip.visible = state.value !== null && ratio > 0;
    tip.position.set(Math.cos(dialAngle(ratio)) * 1.26, Math.sin(dialAngle(ratio)) * 1.26, .068);
    marker.rotation.z = dialAngle(target.step((state.target ?? 75) / 100, elapsed));
    marker.visible = state.target !== null;
    instrument.rotation.set(tiltX.step(.2 + pointerY * .12, elapsed), tiltY.step(-.22 + pointerX * .16, elapsed), -.045);
    arcMaterial.color.lerp(color, 1 - Math.exp(-12 * Math.min(elapsed, 1 / 30)));
    if (renders === 0) performance.mark('instrument-first-render');
    renderer.render(scene, camera);
    if (renders === 0) performance.measure('instrument-first-frame', 'instrument-first-render');
    // Useful for deterministic lifecycle tests; no analytics or persistent telemetry.
    host.dataset['frames'] = String(++renders);
    const settled = attendance.settled(state.ratio) && target.settled((state.target ?? 75) / 100)
      && tiltX.settled(.2 + pointerY * .12) && tiltY.settled(-.22 + pointerX * .16)
      && Math.abs(arcMaterial.color.r - color.r) + Math.abs(arcMaterial.color.g - color.g) + Math.abs(arcMaterial.color.b - color.b) < .001;
    host.dataset['settled'] = String(settled);
    if (elapsed > .05 && elapsed < .25) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames >= 8 && !qualityReduced) {
      qualityReduced = true; slowFrames = 0; renderer.setPixelRatio(1);
    } else if (slowFrames >= 12 && qualityReduced) { unavailable(); return; }
    if (!settled) frame = requestAnimationFrame(draw); else lastTime = 0;
  }
  function wake() { if (prepared && !frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(draw); }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const halfHeight = 2.03, aspect = width / height;
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix(); wake();
  }
  function move(event: PointerEvent) {
    if (event.pointerType !== 'mouse' && event.buttons === 0) return;
    const rect = host.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)); wake();
  }
  function resetPointer() { pointerX = pointerY = 0; wake(); }
  function visibility() { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; } else wake(); }
  function lost(event: Event) { event.preventDefault(); unavailable(); }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; } else wake();
  }); intersection.observe(host);
  host.addEventListener('pointermove', move); host.addEventListener('pointerdown', move);
  host.addEventListener('pointerleave', resetPointer); host.addEventListener('pointerup', resetPointer); host.addEventListener('pointercancel', resetPointer);
  canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);
  resize();
  return {
    // Parallel shader compilation keeps the printed fallback visible while the GPU prepares.
    ready: renderer.compileAsync(scene, camera).then(() => { if (!disposed) { prepared = true; wake(); } }),
    update(next) { state = next; color.set(tones[next.tone]); paint(next); wake(); },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersection.disconnect();
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', move);
      host.removeEventListener('pointerleave', resetPointer); host.removeEventListener('pointerup', resetPointer); host.removeEventListener('pointercancel', resetPointer);
      document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('webglcontextlost', lost);
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
      grooves.dispose(); texture.dispose(); environment.dispose(); key.shadow.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
