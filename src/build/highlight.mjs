// highlight.mjs — Shiki at BUILD time only.
//
// Nothing here reaches the browser: the client receives finished HTML with
// three CSS variables per span, and src/styles/code.css picks the one that
// matches the active theme. That is what keeps the runtime dependency-free.

import { readFileSync } from 'node:fs';
import { createHighlighter } from 'shiki';
import { DAY, SEPIA, NIGHT } from './themes.mjs';

const isabelle = JSON.parse(
  readFileSync(new URL('./grammars/isabelle.tmLanguage.json', import.meta.url), 'utf8'),
);

// Loaded eagerly so an unknown language fails the build rather than silently
// shipping unhighlighted code.
const LANGS = [
  'python', 'rust', 'c', 'cpp', 'java', 'javascript', 'typescript', 'jsx', 'tsx',
  'bash', 'shell', 'json', 'yaml', 'toml', 'sql', 'html', 'css', 'diff', 'make',
  'haskell', 'ocaml', 'lean', 'coq', 'scheme', 'lisp', 'prolog', 'latex', 'tex',
  'go', 'ruby', 'perl', 'r', 'julia', 'nix', 'dockerfile', 'ini', 'xml', 'markdown',
];

const ALIASES = {
  thy: 'isabelle', isar: 'isabelle', isabellehol: 'isabelle', 'isabelle/hol': 'isabelle',
  py: 'python', js: 'javascript', ts: 'typescript', sh: 'bash', yml: 'yaml',
  'c++': 'cpp', text: 'plaintext', txt: 'plaintext', plain: 'plaintext', '': 'plaintext',
};

let hlPromise = null;
function highlighter() {
  if (!hlPromise) {
    hlPromise = createHighlighter({
      themes: [DAY, SEPIA, NIGHT],
      langs: [...LANGS, isabelle],
    });
  }
  return hlPromise;
}

export function resolveLang(lang) {
  const l = String(lang || '').trim().toLowerCase();
  return ALIASES[l] ?? l;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * → HTML for one code block. Spans carry --s-day / --s-sepia / --s-night;
 * code.css resolves which one is visible.
 */
export async function highlight(code, lang) {
  const hl = await highlighter();
  const resolved = resolveLang(lang);
  const known = resolved === 'plaintext' || hl.getLoadedLanguages().includes(resolved);
  if (!known) {
    // Unknown language is a content bug, not a build-breaker: render it plain
    // and let scripts/lint-content.mjs be the one that complains.
    process.emitWarning(`unknown code language "${lang}" — rendered unhighlighted`);
    return `<pre class="shiki plain"><code>${esc(code)}</code></pre>`;
  }
  return hl.codeToHtml(code, {
    lang: known ? resolved : 'plaintext',
    themes: { day: 'neveshtar-day', sepia: 'neveshtar-sepia', night: 'neveshtar-night' },
    defaultColor: false,
    cssVariablePrefix: '--s-',
  });
}

export async function disposeHighlighter() {
  if (hlPromise) { (await hlPromise).dispose(); hlPromise = null; }
}
