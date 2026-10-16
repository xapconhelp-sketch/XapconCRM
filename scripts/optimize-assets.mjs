import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { mkdir, stat } from 'node:fs/promises';

const output = new URL('../src/assets/optimized/', import.meta.url);
await mkdir(output, { recursive: true });
for (const [source, target, width, options] of [
  ['LogoXapcon.png', 'logo-xapcon.webp', 900, { lossless: true, effort: 6 }],
  ['Winddamage.jpg', 'wind-damage.webp', 1600, { quality: 82, effort: 6 }],
]) {
  const original = new URL(`../${source}`, import.meta.url);
  const destination = new URL(target, output);
  const before = await sharp(fileURLToPath(original)).metadata();
  const info = await sharp(fileURLToPath(original)).resize({ width, withoutEnlargement: true }).webp(options).toFile(fileURLToPath(destination));
  if (Math.abs(info.width / info.height - before.width / before.height) > 0.001) throw new Error('La proporción cambió inesperadamente.');
  const originalBytes = (await stat(original)).size;
  console.log(JSON.stringify({ source, originalBytes, optimizedBytes: info.size, width: info.width, height: info.height }));
}
