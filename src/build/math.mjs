// math.mjs — KaTeX at BUILD time, emitting MathML.
//
// MathML output means the browser ships zero KaTeX JS, zero KaTeX CSS and zero
// KaTeX web fonts — the formula is just markup the browser lays out itself.
// Set MATH_OUTPUT=html to fall back to KaTeX's HTML renderer (which then needs
// katex.min.css and its fonts vendored) if a formula lays out badly.

import katex from 'katex';

const OUTPUT = process.env.MATH_OUTPUT === 'html' ? 'html' : 'mathml';

export const mathOutput = OUTPUT;

export function renderMath(tex, { display = false } = {}) {
  try {
    const html = katex.renderToString(tex, {
      displayMode: display,
      output: OUTPUT,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    });
    // Formulae are LTR islands inside an RTL page; without explicit isolation
    // the surrounding Persian reorders them. Same trick as the .lr class.
    return `<span class="math${display ? ' math--display' : ''}" dir="ltr">${html}</span>`;
  } catch (err) {
    process.emitWarning(`KaTeX failed on "${tex.slice(0, 40)}": ${err.message}`);
    const esc = tex.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<code class="math math--error lr" dir="ltr">${esc}</code>`;
  }
}
