// Ornaments.jsx — one hidden SVG sprite, rendered once at the app root.
//
// Every ornament is drawn here in `currentColor`, so it costs no request and
// recolours with the theme like any other token. Each has a matching optional
// file slot in public/engravings/ that overrides it when present — see that
// folder's README.

export default function Ornaments() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }} aria-hidden="true" focusable="false">
      {/* quarter acanthus scroll — used four times, rotated, on framed cards */}
      <symbol id="orn-corner" viewBox="0 0 64 64">
        <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <path d="M2 2 h20 M2 2 v20" />
          <path d="M6 6 h11 M6 6 v11" strokeWidth=".6" />
          <path d="M22 4 c10 0 14 5 14 11 c0 5 -4 8 -8 8 c-3 0 -5 -2 -5 -5 c0 -2.6 2 -4.4 4.3 -4.4" />
          <path d="M4 22 c0 10 5 14 11 14 c5 0 8 -4 8 -8 c0 -3 -2 -5 -5 -5 c-2.6 0 -4.4 2 -4.4 4.3" />
        </g>
        <circle cx="27.3" cy="27.3" r="1.7" fill="currentColor" />
      </symbol>

      {/* plain mitred bracket — the cheap corner, for repeated cards */}
      <symbol id="orn-bracket" viewBox="0 0 40 40">
        <g fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M1 1 h16 M1 1 v16" />
          <path d="M5 5 h9 M5 5 v9" strokeWidth=".6" />
        </g>
      </symbol>

      {/* the ٭ as an eight-point star inside a hairline lozenge */}
      <symbol id="orn-star" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M12 1.6 L22.4 12 L12 22.4 L1.6 12 Z" strokeWidth=".7" />
        </g>
        <path
          fill="currentColor"
          d="M12 5.2 L13.3 10.7 L18.8 12 L13.3 13.3 L12 18.8 L10.7 13.3 L5.2 12 L10.7 10.7 Z"
        />
      </symbol>

      {/* printer's rule: hairline, centre lozenge, tapered terminals */}
      <symbol id="orn-rule" viewBox="0 0 320 8" preserveAspectRatio="none">
        <g fill="currentColor">
          <path d="M0 4 L18 2.6 L18 5.4 Z" />
          <path d="M320 4 L302 2.6 L302 5.4 Z" />
          <rect x="18" y="3.6" width="134" height=".9" />
          <rect x="168" y="3.6" width="134" height=".9" />
          <path d="M160 1.4 L165.4 4 L160 6.6 L154.6 4 Z" />
        </g>
      </symbol>

      {/* eagle over a star arc — the masthead crest */}
      <symbol id="orn-crest" viewBox="0 0 120 56">
        <g fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round">
          <path d="M60 12 c-4 -5 -11 -8 -19 -8 c8 2 13 6 15 11" />
          <path d="M60 12 c4 -5 11 -8 19 -8 c-8 2 -13 6 -15 11" />
          <path d="M54 16 c-9 -1 -20 2 -28 9 c10 -4 19 -4 25 -1" />
          <path d="M66 16 c9 -1 20 2 28 9 c-10 -4 -19 -4 -25 -1" />
          <path d="M60 13 v11" />
          <path d="M56 24 h8 l-4 7 z" strokeWidth=".9" />
        </g>
        <g fill="currentColor">
          {[24, 34, 44, 54, 64, 74, 84, 94].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${40 + Math.abs(i - 3.5) * 1.5} l1.5 3 l3.2 .3 l-2.4 2.1 l.7 3.2 l-3 -1.7 l-3 1.7 l.7 -3.2 l-2.4 -2.1 l3.2 -.3 z`}
              transform="scale(.82) translate(13 4)"
            />
          ))}
        </g>
      </symbol>

      {/* vertical lozenge chain — the archive spine */}
      <symbol id="orn-spine" viewBox="0 0 8 48" preserveAspectRatio="none">
        <g fill="currentColor">
          <rect x="3.6" y="0" width=".8" height="16" />
          <path d="M4 18 L6.2 24 L4 30 L1.8 24 Z" />
          <rect x="3.6" y="32" width=".8" height="16" />
        </g>
      </symbol>
    </svg>
  );
}

/** rule–star–rule, the engraved form of the book's `.ornament` */
export function Ornament({ className = '', crest = false }) {
  return (
    <div className={`ornament ornament--engraved ${className}`} role="presentation" aria-hidden="true">
      <svg className="orn-svg" viewBox="0 0 320 8" preserveAspectRatio="none"><use href="#orn-rule" /></svg>
      <svg className="orn-svg orn-star" viewBox="0 0 24 24"><use href={crest ? '#orn-crest' : '#orn-star'} /></svg>
      <svg className="orn-svg" viewBox="0 0 320 8" preserveAspectRatio="none">
        <use href="#orn-rule" transform="translate(320 0) scale(-1 1)" />
      </svg>
    </div>
  );
}

export function Crest({ size = 'lg' }) {
  return (
    <svg className={`crest crest--${size}`} viewBox="0 0 120 56" aria-hidden="true" focusable="false">
      <use href="#orn-crest" />
    </svg>
  );
}
