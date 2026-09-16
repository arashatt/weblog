// format.js — reading time, excerpts and the small Persian text helpers the
// post list needs. Everything here runs at BUILD time and is baked into JSON;
// the render path never recomputes it.

import { normalize, faDigits } from './bookml.js';

// Persian prose reads slower than English; 190 wpm is a fair average for a
// literary register, and code/math blocks are counted at a flat rate instead.
const WPM = 190;

export function readingTime(plain, { codeLines = 0 } = {}) {
  const words = plain.split(/\s+/).map(normalize).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WPM + codeLines / 28));
  return { words, minutes, fa: `${faDigits(minutes)} دقیقه` };
}

/** First paragraph, trimmed to a sentence boundary under `max` characters. */
export function makeExcerpt(plain, max = 220) {
  const first = plain.split('\n').find((l) => l.trim().length > 40) || plain.split('\n')[0] || '';
  const t = first.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('؟ '), cut.lastIndexOf('! '), cut.lastIndexOf('، '));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut).trim() + '…';
}

// Persian letters that do NOT join to the following letter. A drop cap is only
// safe on these — on a joining letter it visually severs the word, which is the
// first thing a Persian reader notices.
const NON_JOINING = new Set([...'اآأإدذرزژوءۀة']);
export const dropCapSafe = (s) => {
  const ch = (s || '').trim()[0];
  return !!ch && NON_JOINING.has(ch);
};

/** A stable 0..n-1 bucket from a string — used for per-post hatch angles. */
export function hashPick(str, n) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % n;
}

/** Latin slug from a Persian title, for readable URLs. */
const TRANSLIT = {
  'ا':'a','آ':'a','أ':'a','إ':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch',
  'ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s',
  'ض':'z','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','ك':'k','گ':'g',
  'ل':'l','م':'m','ن':'n','و':'v','ه':'h','ی':'y','ي':'y','ئ':'y','ء':'','ة':'h',
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
};
export function slugify(title) {
  const s = [...String(title).trim().toLowerCase()]
    .map((c) => (TRANSLIT[c] !== undefined ? TRANSLIT[c] : c))
    .join('')
    .replace(/[‌ً-ٟ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'post';
}
