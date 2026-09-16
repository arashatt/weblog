// themes.mjs — three Shiki themes in the site's own ink-on-paper register.
//
// A stock VS Code theme would drop a saturated IDE palette into a letterpress
// page. These stay low-chroma: weight and a few muted, historically inky hues
// (olive, sienna, slate, iron-gall violet) carry the distinctions instead.

const scopes = (fg, style) => (list) => ({
  scope: list,
  settings: style ? { foreground: fg, fontStyle: style } : { foreground: fg },
});

function theme(name, type, c) {
  return {
    name,
    type,
    colors: { 'editor.background': c.bg, 'editor.foreground': c.fg },
    settings: [
      { settings: { background: c.bg, foreground: c.fg } },
      scopes(c.comment, 'italic')(['comment', 'punctuation.definition.comment', 'string.comment']),
      scopes(c.keyword, 'bold')(['keyword', 'keyword.control', 'storage', 'storage.type',
        'storage.modifier', 'keyword.other.proof.isabelle', 'keyword.control.theory.isabelle']),
      scopes(c.string)(['string', 'string.quoted', 'constant.character', 'string.quoted.other.cartouche.isabelle']),
      scopes(c.number)(['constant.numeric', 'constant.language', 'constant.other',
        'support.constant', 'variable.language']),
      scopes(c.fn)(['entity.name.function', 'support.function', 'meta.function-call',
        'entity.name.tag', 'meta.antiquotation.isabelle']),
      scopes(c.type)(['entity.name.type', 'entity.name.class', 'support.type', 'support.class',
        'entity.other.inherited-class', 'entity.name.namespace']),
      scopes(c.op)(['keyword.operator', 'punctuation', 'meta.brace', 'punctuation.separator',
        'punctuation.terminator']),
      scopes(c.attr)(['variable.parameter', 'entity.other.attribute-name', 'meta.attribute']),
      scopes(c.fg)(['variable', 'variable.other', 'source', 'meta']),
    ],
  };
}

export const DAY = theme('neveshtar-day', 'light', {
  bg: '#ffffff', fg: '#1b1b1b', comment: '#8c8c8c', keyword: '#14213d',
  string: '#4a5d23', number: '#7a4a2a', fn: '#23395b', type: '#4a3b6b',
  op: '#5a5a5a', attr: '#6b4c2a',
});

export const SEPIA = theme('neveshtar-sepia', 'light', {
  bg: '#f5ede1', fg: '#2b2620', comment: '#8a7d6b', keyword: '#2b2f4a',
  string: '#4f5a2c', number: '#7d4a25', fn: '#31435f', type: '#523f63',
  op: '#6b6055', attr: '#6f5029',
});

export const NIGHT = theme('neveshtar-night', 'dark', {
  bg: '#121212', fg: '#e9e7e2', comment: '#7e7a72', keyword: '#a9bde0',
  string: '#b3c48a', number: '#d5a882', fn: '#9db4d6', type: '#bda9dd',
  op: '#9a9a9a', attr: '#d3b48b',
});
