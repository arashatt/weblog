// png.mjs — a minimal PNG writer, so the social card is a real raster file
// without adding an image dependency. Solid fills and rectangles only, which
// is all the engraved card needs: the site's own ornament is straight lines.
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** A tiny RGB canvas with the handful of primitives the card needs. */
export class Canvas {
  constructor(width, height, bg = [255, 255, 255]) {
    this.w = width;
    this.h = height;
    this.px = Buffer.alloc(width * height * 3);
    this.fill(0, 0, width, height, bg);
  }

  fill(x, y, w, h, [r, g, b]) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * this.w + x0) * 3;
      for (let xx = x0; xx < x1; xx++) { this.px[i++] = r; this.px[i++] = g; this.px[i++] = b; }
    }
  }

  /** hollow rectangle of the given stroke weight, drawn inward */
  rect(x, y, w, h, weight, color) {
    this.fill(x, y, w, weight, color);
    this.fill(x, y + h - weight, w, weight, color);
    this.fill(x, y, weight, h, color);
    this.fill(x + w - weight, y, weight, h, color);
  }

  /** the eight-point star from the ornament set, as a filled lozenge pair */
  star(cx, cy, r, color) {
    for (let dy = -r; dy <= r; dy++) {
      const armX = r - Math.abs(dy);
      this.fill(cx - armX * 0.34, cy + dy, armX * 0.68 + 1, 1, color);
    }
    for (let dx = -r; dx <= r; dx++) {
      const armY = r - Math.abs(dx);
      this.fill(cx + dx, cy - armY * 0.34, 1, armY * 0.68 + 1, color);
    }
  }

  /** diagonal hatch, the flat fallback of the mezzotint plate */
  hatch(x, y, w, h, step, color) {
    for (let d = -h; d < w; d += step) {
      for (let i = 0; i < h; i++) {
        this.fill(x + d + i, y + i, 1, 1, color);
      }
    }
  }

  toPNG() {
    const raw = Buffer.alloc(this.h * (this.w * 3 + 1));
    for (let y = 0; y < this.h; y++) {
      raw[y * (this.w * 3 + 1)] = 0;                       // filter: none
      this.px.copy(raw, y * (this.w * 3 + 1) + 1, y * this.w * 3, (y + 1) * this.w * 3);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8;    // bit depth
    ihdr[9] = 2;    // colour type: truecolour
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

/**
 * The default social card: aged paper, the double frame the site icon uses,
 * a hatched plate and the star. No text — a PNG writer with no font engine
 * cannot set Persian type, and a card with bad Persian is worse than none.
 */
export function ogCard() {
  const PAPER = [245, 237, 225];
  const INK = [43, 38, 32];
  const FAINT = [214, 201, 183];
  const c = new Canvas(1200, 630, PAPER);

  c.hatch(0, 0, 1200, 630, 9, [238, 228, 212]);
  c.fill(60, 50, 1080, 530, PAPER);
  c.rect(60, 50, 1080, 530, 6, INK);
  c.rect(82, 72, 1036, 486, 2, INK);

  c.fill(300, 300, 600, 2, INK);
  c.star(600, 301, 34, INK);
  c.fill(300, 218, 600, 1, FAINT);
  c.fill(300, 384, 600, 1, FAINT);

  for (const x of [96, 1088]) for (const y of [86, 528]) c.rect(x, y, 16, 16, 2, INK);
  return c.toPNG();
}
