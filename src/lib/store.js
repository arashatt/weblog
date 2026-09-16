// store.js — reading position, bookmarks and reader settings in localStorage.
// Every access is guarded: Safari private mode and some WebViews throw.
//
// Nothing here may be read during render. The server has no localStorage, so a
// useState initialiser that called getSettings() would hydrate to a different
// tree than the prerendered HTML. Components read these inside useEffect.

const K_POS = 'weblog:pos';
const K_MARKS = 'weblog:marks';
const K_SET = 'weblog:settings';

export function getPos() {
  try { return JSON.parse(localStorage.getItem(K_POS)); } catch { return null; }
}
export function setPos(pos) {
  try { localStorage.setItem(K_POS, JSON.stringify(pos)); } catch { /* storage unavailable */ }
}

export function getMarks() {
  try { return JSON.parse(localStorage.getItem(K_MARKS)) || []; } catch { return []; }
}
export function saveMarks(marks) {
  try { localStorage.setItem(K_MARKS, JSON.stringify(marks)); } catch { /* storage unavailable */ }
}
export function addMark(mark) {
  const marks = getMarks();
  marks.unshift({ id: Date.now() + ':' + Math.random().toString(36).slice(2, 7), ...mark });
  saveMarks(marks.slice(0, 100));
  return getMarks();
}
export function removeMark(id) {
  saveMarks(getMarks().filter((m) => m.id !== id));
  return getMarks();
}

export const DEFAULTS = { fontScale: 1, theme: 'auto', font: 'amiri', engrave: 'on' };

export function getSettings() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(K_SET)) || {}) }; }
  catch { return { ...DEFAULTS }; }
}
export function setSettings(next) {
  try { localStorage.setItem(K_SET, JSON.stringify(next)); } catch { /* unavailable */ }
  return next;
}

/** 'auto' resolved against the OS preference — used by the pre-hydration script too. */
export function resolveTheme(theme) {
  if (theme !== 'auto') return theme;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
  } catch { return 'day'; }
}

export const THEME_COLORS = { day: '#ffffff', sepia: '#f5ede1', night: '#121212' };

/** Apply settings to <html>. Idempotent; also what the inline head script does. */
export function applySettings(s) {
  const el = document.documentElement;
  const theme = resolveTheme(s.theme);
  if (theme === 'day') delete el.dataset.theme; else el.dataset.theme = theme;
  if (s.font === 'amiri') delete el.dataset.font; else el.dataset.font = s.font;
  if (s.engrave === 'on') delete el.dataset.engrave; else el.dataset.engrave = 'off';
  el.style.setProperty('--fontscale', s.fontScale);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[theme] || THEME_COLORS.day;
}
