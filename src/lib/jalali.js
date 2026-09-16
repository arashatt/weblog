// jalali.js — Jalali (Solar Hijri) ↔ Gregorian, no dependency.
//
// The standard Borkowski/Khayyam arithmetic used by every Persian calendar
// library. Exact for Jalali years 1178–2455 (≈1799–3076 CE), which covers
// anything a weblog will ever date.

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456];

const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - ~~(a / b) * b;

// → { leap: 0..4 (0 = leap year), gy, march: the Gregorian day in March that
//     is 1 Farvardin of this Jalali year }
function jalCal(jy) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm, jump;

  if (jy < jp || jy >= BREAKS[bl - 1]) throw new RangeError(`jalali year out of range: ${jy}`);

  for (let i = 1; i < bl; i++) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

/** Gregorian Y/M/D → { jy, jm, jd } */
export const toJalali = (gy, gm, gd) => d2j(g2d(gy, gm, gd));
/** Jalali Y/M/D → { gy, gm, gd } */
export const toGregorian = (jy, jm, jd) => d2g(j2d(jy, jm, jd));
/** true when the Jalali year has 366 days */
export const isLeapJalali = (jy) => jalCal(jy).leap === 0;

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const fa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/**
 * '2026-01-20' → { iso, jy, jm, jd, fa: '۳۰ دی ۱۴۰۴', faShort: '۱۴۰۴/۱۰/۳۰' }
 * Computed once at build time and baked into the JSON the client reads, so
 * nothing in the render path ever touches a clock.
 */
export function describeDate(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const [gy, gm, gd] = [+m[1], +m[2], +m[3]];
  const { jy, jm, jd } = toJalali(gy, gm, gd);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    iso: `${m[1]}-${pad(gm)}-${pad(gd)}`,
    gy, gm, gd, jy, jm, jd,
    fa: `${fa(jd)} ${JALALI_MONTHS[jm - 1]} ${fa(jy)}`,
    faShort: `${fa(jy)}/${fa(pad(jm))}/${fa(pad(jd))}`,
    year: jy,
  };
}
