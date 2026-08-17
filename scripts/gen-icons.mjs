// Generates the PWA icons (teal square + white "F") as real PNGs using only
// Node built-ins. Run: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolor + alpha
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * stride + 1);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const TEAL = [0x23, 0xe1, 0xcb, 255];
const WHITE = [255, 255, 255, 255];

// 10x12 "F" bitmap
const F = [
  "1111111111",
  "1111111111",
  "1100000000",
  "1100000000",
  "1100000000",
  "1111111100",
  "1111111100",
  "1100000000",
  "1100000000",
  "1100000000",
  "1100000000",
  "1100000000",
];

function drawIcon(size, glyphScale) {
  const rgba = new Uint8Array(size * size * 4);
  const cell = Math.max(1, Math.floor((size * glyphScale) / F[0].length));
  const gw = F[0].length * cell;
  const gh = F.length * cell;
  const ox = Math.floor((size - gw) / 2);
  const oy = Math.floor((size - gh) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      rgba[i] = TEAL[0];
      rgba[i + 1] = TEAL[1];
      rgba[i + 2] = TEAL[2];
      rgba[i + 3] = TEAL[3];
    }
  }
  for (let gy = 0; gy < F.length; gy++) {
    for (let gx = 0; gx < F[0].length; gx++) {
      if (F[gy][gx] !== "1") continue;
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const px = ox + gx * cell + x;
          const py = oy + gy * cell + y;
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          const i = (py * size + px) * 4;
          rgba[i] = WHITE[0];
          rgba[i + 1] = WHITE[1];
          rgba[i + 2] = WHITE[2];
          rgba[i + 3] = WHITE[3];
        }
      }
    }
  }
  return encodePNG(size, rgba);
}

const targets = [
  { name: "icon-192.png", size: 192, scale: 0.7 },
  { name: "icon-512.png", size: 512, scale: 0.7 },
  { name: "icon-maskable-512.png", size: 512, scale: 0.52 },
];

for (const t of targets) {
  writeFileSync(join(outDir, t.name), drawIcon(t.size, t.scale));
  console.log("wrote", join(outDir, t.name));
}
// apple-touch-icon goes in public/ root and must be 180x180, opaque.
writeFileSync(join(root, "public", "apple-touch-icon.png"), drawIcon(180, 0.7));
console.log("wrote", join(root, "public", "apple-touch-icon.png"));
