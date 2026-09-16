// imagesize.mjs — intrinsic dimensions from a file header, no dependency.
// Figures get width/height attributes so images reserve their space and the
// page never reflows around them (CLS stays at zero).
import { openSync, readSync, closeSync, statSync } from 'node:fs';

function head(file, n = 4096) {
  const size = Math.min(n, statSync(file).size);
  const buf = Buffer.alloc(size);
  const fd = openSync(file, 'r');
  try { readSync(fd, buf, 0, size, 0); } finally { closeSync(fd); }
  return buf;
}

export function imageSize(file) {
  let b;
  try { b = head(file); } catch { return null; }

  // PNG
  if (b.length > 24 && b.toString('latin1', 1, 4) === 'PNG') {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  // GIF
  if (b.toString('latin1', 0, 3) === 'GIF') {
    return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  }
  // WebP (VP8 / VP8L / VP8X)
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const fmt = b.toString('latin1', 12, 16);
    if (fmt === 'VP8X') return { width: (b.readUIntLE(24, 3) & 0xffffff) + 1, height: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (fmt === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (fmt === 'VP8L') {
      const n = b.readUInt32LE(21);
      return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1 };
    }
  }
  // JPEG — walk the segment chain to the first SOF marker
  if (b[0] === 0xff && b[1] === 0xd8) {
    let big;
    try { big = head(file, Math.min(statSync(file).size, 1 << 20)); } catch { return null; }
    let i = 2;
    while (i < big.length - 9) {
      if (big[i] !== 0xff) { i++; continue; }
      const marker = big[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: big.readUInt16BE(i + 5), width: big.readUInt16BE(i + 7) };
      }
      i += 2 + big.readUInt16BE(i + 2);
    }
  }
  // SVG — viewBox or width/height attributes
  const text = b.toString('utf8');
  if (/<svg[\s>]/i.test(text)) {
    const vb = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[,\s]+[-\d.]+[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (vb) return { width: Math.round(+vb[1]), height: Math.round(+vb[2]) };
    const w = text.match(/\bwidth\s*=\s*["']([\d.]+)/i);
    const h = text.match(/\bheight\s*=\s*["']([\d.]+)/i);
    if (w && h) return { width: Math.round(+w[1]), height: Math.round(+h[1]) };
  }
  return null;
}
