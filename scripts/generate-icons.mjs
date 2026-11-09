import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const png = await readFile(new URL('../assets/brand/ezpdf-icon.png', import.meta.url));
// Package the approved raster artwork without redrawing or changing its design.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><image width="1024" height="1024" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
const output = new URL('../build/', import.meta.url);
await mkdir(output, { recursive: true });
const sizes = [16, 24, 32, 48, 64, 128, 256];
const frames = sizes.map((size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng(),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + i * 16;
  header[entry] = header[entry + 1] = sizes[i] === 256 ? 0 : sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frames[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frames[i].length;
}
await writeFile(new URL('icon.ico', output), Buffer.concat([header, ...frames]));
await writeFile(
  new URL('icon.png', output),
  new Resvg(svg, { fitTo: { mode: 'width', value: 512 } }).render().asPng(),
);
console.log('Generated ezPDF PNG and multi-resolution Windows ICO.');
