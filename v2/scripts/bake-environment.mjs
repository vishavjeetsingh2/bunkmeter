// Run with the local Astro dev server on port 4326. Development only; never run on a visitor's device.
import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4326/');
  const bytes = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { RoomEnvironment } = await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
    const renderer = new THREE.WebGLRenderer();
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, .04, .1, 100, { size: 16 });
    if (target.width !== 336 || target.height !== 64) throw Error('Update the lighting loader dimensions before changing the bake.');
    const pixels = new Uint16Array(target.width * target.height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels);
    const result = Array.from(new Uint8Array(pixels.buffer));
    target.dispose(); room.dispose(); generator.dispose(); renderer.dispose();
    return result;
  });
  await writeFile(new URL('../src/features/instrument/environment.bin.gz', import.meta.url), gzipSync(Buffer.from(bytes), { level: 9 }));
} finally { await browser.close(); }
