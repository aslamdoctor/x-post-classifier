import fs from "fs";
import path from "path";
import zlib from "zlib";

function createBadgePng(size) {
  function chunk(type, data) {
    const typeBuf = Buffer.from(type, "ascii");
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([typeBuf, data]);
    const crc = zlib.crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([lenBuf, typeAndData, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(size * (1 + size * 4));
  let offset = 0;
  const radius = size * 0.25;

  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // Filter: None
    for (let x = 0; x < size; x++) {
      const dx = Math.max(0, Math.max(radius - x, x - (size - 1 - radius)));
      const dy = Math.max(0, Math.max(radius - y, y - (size - 1 - radius)));
      const dist = Math.hypot(dx, dy);

      let alpha = 0;
      if (dist <= radius) {
        alpha = 255;
      } else if (dist <= radius + 1) {
        alpha = Math.round(255 * (1 - (dist - radius)));
      }

      // X dark background (#0f1419) with subtle blue accent tag pill in center
      const inCenterTag =
        x >= size * 0.25 &&
        x <= size * 0.75 &&
        y >= size * 0.38 &&
        y <= size * 0.62;

      let r = 15;
      let g = 20;
      let b = 25;

      if (inCenterTag) {
        r = 29;
        g = 155;
        b = 240; // #1d9bf0 Twitter/X blue
      }

      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = alpha;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const iconsDir = path.resolve(import.meta.dir, "../icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of [16, 48, 128]) {
  const buf = createBadgePng(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
}

console.log("Generated 16x16, 48x48, and 128x128 icons in icons/");
