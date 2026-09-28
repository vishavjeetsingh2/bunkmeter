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
  scene.environmentIntensity = .55;
  room.dispose(); pmrem.dispose();
  performance.measure('instrument-environment', 'instrument-init');
  scene.add(new THREE.HemisphereLight(0xe4f5f0, 0x183a40, .7));
  const key = new THREE.DirectionalLight(0xfff5dd, 2.1);
  key.position.set(-4, 6, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
  key.shadow.normalBias = .025;
  key.shadow.radius = 4;
  key.shadow.blurSamples = 8;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9e6f1, 1.3);
  fill.position.set(4, -1, 2); scene.add(fill);
  const instrument = new THREE.Group(); scene.add(instrument);
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const material = (options: THREE.MeshStandardMaterialParameters) => {
    const result = new THREE.MeshStandardMaterial(options); materials.push(result); return result;
  };
  const metal = material({ color: '#3b565b', metalness: .92, roughness: .28 });
  const rim = material({ color: '#c2ceca', metalness: .96, roughness: .23 });
  const dark = material({ color: '#10292d', metalness: .5, roughness: .5 });
  const accent = material({ color: '#dba853', metalness: .78, roughness: .27 });
  const ceramic = material({ color: '#dce5d3', roughness: .58, metalness: .06 });
  const trackMaterial = material({ color: '#8e9f95', roughness: .6, metalness: .25 });
  const arcMaterial = material({ color: tones[initial.tone], roughness: .3, metalness: .2 });
  function mesh(geometry: THREE.BufferGeometry, surface: THREE.Material, z: number, parent: THREE.Object3D = instrument) {
    geometries.push(geometry);
    const item = new THREE.Mesh(geometry, surface);
    item.position.z = z; item.castShadow = true; parent.add(item); return item;
  }
  function disc(radius: number, depth: number, z: number, surface: THREE.Material, parent: THREE.Object3D = instrument) {
    const geometry = new THREE.CylinderGeometry(radius, radius, depth, 96);
    geometry.rotateX(Math.PI / 2); return mesh(geometry, surface, z, parent);
  }
  // A turned housing with a real bevel and a recessed face, rather than a flat cylinder.
  const profile = [[0, -.65], [1.51, -.65], [1.65, -.59], [1.77, -.43], [1.8, -.3],
    [1.8, -.08], [1.77, .015], [1.73, .09], [1.6, .09], [1.56, .035], [0, .035]];
  mesh(new THREE.LatheGeometry(profile.map(([radius, z]) => new THREE.Vector2(radius!, z!)), 128).rotateX(Math.PI / 2), metal, 0);
  disc(1.58, .06, -.68, dark);
  mesh(new THREE.TorusGeometry(1.782, .019, 8, 128), rim, -.15);
  mesh(new THREE.TorusGeometry(1.773, .017, 8, 128), dark, -.37);
  mesh(new THREE.TorusGeometry(1.75, .038, 12, 128), rim, .075);
  mesh(new THREE.RingGeometry(1.59, 1.73, 128), metal, .101);
  mesh(new THREE.TorusGeometry(1.595, .03, 12, 128), dark, .105);
  mesh(new THREE.TorusGeometry(1.56, .014, 8, 128), rim, .105);
  // Repeated sidewall milling is one draw call, not a hundred independent meshes.
  const grooveGeometry = new THREE.BoxGeometry(.018, .024, .18);
  geometries.push(grooveGeometry);
  const grooves = new THREE.InstancedMesh(grooveGeometry, dark, 100);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 100; i++) {
    const angle = i / 100 * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 1.803, Math.sin(angle) * 1.803, -.25);
    dummy.rotation.z = angle; dummy.updateMatrix(); grooves.setMatrixAt(i, dummy.matrix);
  }
  instrument.add(grooves);
  // Four flush fasteners make the assembled layers legible without decorative clutter.
  const fastenerGeometry = new THREE.CylinderGeometry(.034, .034, .017, 12).rotateX(Math.PI / 2);
  const slotGeometry = new THREE.BoxGeometry(.041, .009, .004);
  geometries.push(fastenerGeometry, slotGeometry);
  const fasteners = new THREE.InstancedMesh(fastenerGeometry, rim, 4);
  const slots = new THREE.InstancedMesh(slotGeometry, dark, 4);
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2;
    dummy.position.set(Math.cos(angle) * 1.664, Math.sin(angle) * 1.664, .116);
    dummy.rotation.z = angle; dummy.updateMatrix(); fasteners.setMatrixAt(i, dummy.matrix);
    dummy.position.z = .127; dummy.updateMatrix(); slots.setMatrixAt(i, dummy.matrix);
  }
  instrument.add(fasteners, slots);
  const face = document.createElement('canvas'); face.width = face.height = 1024;
  const context = face.getContext('2d');
  if (!context) { renderer.dispose(); canvas.remove(); throw new Error('Face texture unavailable'); }
  const texture = new THREE.CanvasTexture(face); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const faceMaterial = material({ map: texture, roughness: .9, metalness: 0, envMapIntensity: .22 });
  const printedFace = mesh(new THREE.CircleGeometry(1.55, 128), faceMaterial, .095);
  printedFace.castShadow = false; printedFace.receiveShadow = true;
  function paintScale() {
    if (!context) return;
    context.fillStyle = '#c7d5c5'; context.fillRect(0, 0, 1024, 1024);
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
      context.fillText(String(i), 512 + Math.cos(a) * 331, 512 - Math.sin(a) * 331);
    }
    context.fillStyle = '#173a40'; context.font = '700 32px "Segoe UI", sans-serif';
    context.fillText('B U N K M E T E R', 512, 844);
    context.fillStyle = '#97682e'; context.fillRect(485, 792, 54, 5);
    texture.needsUpdate = true;
  }
  paintScale();
  // The raised central readout is its own small texture. Only its changing text is uploaded.
  const readout = new THREE.Group(); instrument.add(readout);
  disc(.896, .09, .17, dark, readout);
  disc(.869, .07, .22, ceramic, readout);
  mesh(new THREE.TorusGeometry(.87, .014, 8, 96), rim, .254, readout);
  const display = document.createElement('canvas'); display.width = display.height = 512;
  const displayContext = display.getContext('2d');
  const displayTexture = new THREE.CanvasTexture(display); displayTexture.colorSpace = THREE.SRGBColorSpace;
  displayTexture.anisotropy = texture.anisotropy;
  const displayMaterial = new THREE.MeshBasicMaterial({ map: displayTexture, toneMapped: false }); materials.push(displayMaterial);
  mesh(new THREE.CircleGeometry(.849, 96), displayMaterial, .257, readout).castShadow = false;
  let paintedReadout = '';
  function paintReadout(state: InstrumentState, ratio: number, complete: boolean) {
    if (!displayContext) return;
    const value = state.value === null ? '—' : `${complete ? state.value : Number((ratio * 100).toFixed(2))}%`;
    const targetText = state.target === null ? 'SET YOUR TARGET' : `TARGET  ${state.targetLabel ?? state.target}%`;
    const label = state.preview ? (state.previewCount ?? 1) === 1 ? 'NEXT CLASS PREVIEW' : `${state.previewCount} CLASS PREVIEW` : 'ATTENDANCE';
    const signature = `${value}|${targetText}|${label}`;
    if (signature === paintedReadout) return;
    paintedReadout = signature;
    const glaze = displayContext.createLinearGradient(0, 0, 512, 512);
    glaze.addColorStop(0, '#f4f3df'); glaze.addColorStop(.55, '#e3e9d8'); glaze.addColorStop(1, '#c9d8c8');
    displayContext.fillStyle = glaze; displayContext.fillRect(0, 0, 512, 512);
    displayContext.textAlign = 'center'; displayContext.textBaseline = 'middle';
    displayContext.fillStyle = '#405f58'; displayContext.font = '600 24px "Segoe UI", sans-serif';
    displayContext.fillText(label, 256, 154);
    displayContext.fillStyle = '#123b40'; displayContext.font = '600 98px "Segoe UI", sans-serif';
    displayContext.fillText(value, 256, 250, 440);
    displayContext.fillStyle = '#52675a'; displayContext.font = '600 27px "Segoe UI", sans-serif';
    displayContext.fillText(targetText, 256, 336);
    displayContext.fillStyle = '#a77836'; displayContext.fillRect(235, 386, 42, 3);
    displayTexture.needsUpdate = true;
  }
  paintReadout(initial, initial.ratio, true);
  const sweep = Math.PI * 1.5;
  const track = mesh(new THREE.TorusGeometry(1.26, .058, 12, 256, sweep), trackMaterial, .115);
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
  const arc = mesh(arcGeometry, arcMaterial, .133); arc.scale.y = -1; arc.rotation.z = Math.PI * 1.25;
  const tip = mesh(new THREE.SphereGeometry(.058, 12, 8), arcMaterial, .133);
  const marker = new THREE.Group(); instrument.add(marker);
  const markerBar = mesh(new THREE.BoxGeometry(.36, .052, .055), accent, .22, marker);
  markerBar.position.x = 1.421;
  const markerStud = mesh(new THREE.CylinderGeometry(.065, .065, .09, 24).rotateX(Math.PI / 2), accent, .2, marker);
  markerStud.position.x = 1.615;
  const markerPin = mesh(new THREE.CylinderGeometry(.022, .022, .015, 12).rotateX(Math.PI / 2), dark, .252, marker);
  markerPin.position.x = 1.615;
  const markerShoe = mesh(new THREE.BoxGeometry(.07, .14, .055), accent, .222, marker);
  markerShoe.position.x = 1.264;
  // Ground receives a real directional shadow; a dark inner lip supplies recess depth.
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: .34 }); materials.push(shadowMaterial);
  const ground = mesh(new THREE.PlaneGeometry(20, 20), shadowMaterial, -1.08, scene);
  ground.castShadow = false; ground.receiveShadow = true;

  let state = initial, frame = 0, disposed = false, visible = true, prepared = false, lastTime = 0;
  let pointerX = 0, pointerY = 0, slowFrames = 0, qualityReduced = false, response = 0;
  const attendance = spring(initial.ratio), target = spring((initial.target ?? 75) / 100);
  const tiltX = spring(.32), tiltY = spring(-.37), elevation = spring(0);
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
    tip.position.set(Math.cos(dialAngle(ratio)) * 1.26, Math.sin(dialAngle(ratio)) * 1.26, .133);
    marker.rotation.z = dialAngle(target.step((state.target ?? 75) / 100, elapsed));
    marker.visible = state.target !== null;
    instrument.rotation.set(tiltX.step(.32 + pointerY * .12, elapsed), tiltY.step(-.37 + pointerX * .16, elapsed), -.035);
    response *= Math.exp(-10 * Math.min(elapsed, 1 / 30));
    if (response < .0001) response = 0;
    const depth = elevation.step((state.preview ? .055 : 0) + response, elapsed);
    readout.position.z = depth;
    marker.position.z = depth * .5;
    paintReadout(state, ratio, attendance.settled(state.ratio));
    arcMaterial.color.lerp(color, 1 - Math.exp(-12 * Math.min(elapsed, 1 / 30)));
    if (renders === 0) performance.mark('instrument-first-render');
    renderer.render(scene, camera);
    if (renders === 0) performance.measure('instrument-first-frame', 'instrument-first-render');
    // Useful for deterministic lifecycle tests; no analytics or persistent telemetry.
    host.dataset['frames'] = String(++renders);
    const settled = attendance.settled(state.ratio) && target.settled((state.target ?? 75) / 100)
      && tiltX.settled(.32 + pointerY * .12) && tiltY.settled(-.37 + pointerX * .16)
      && response === 0 && elevation.settled(state.preview ? .055 : 0)
      && Math.abs(arcMaterial.color.r - color.r) + Math.abs(arcMaterial.color.g - color.g) + Math.abs(arcMaterial.color.b - color.b) < .001;
    host.dataset['settled'] = String(settled);
    if (elapsed > .05) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
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
    const aspect = width / height, halfHeight = Math.max(1.97, 1.99 / aspect);
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
    update(next) {
      if (next.ratio !== state.ratio || next.target !== state.target || next.preview !== state.preview) response = .12;
      state = next; color.set(tones[next.tone]); wake();
    },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersection.disconnect();
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', move);
      host.removeEventListener('pointerleave', resetPointer); host.removeEventListener('pointerup', resetPointer); host.removeEventListener('pointercancel', resetPointer);
      document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('webglcontextlost', lost);
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
      grooves.dispose(); fasteners.dispose(); slots.dispose(); texture.dispose(); displayTexture.dispose(); environment.dispose(); key.shadow.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
