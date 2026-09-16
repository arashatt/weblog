// Frame.jsx — the double hairline frame plus its four corner flourishes.
//
// Two concentric rules come from one element's border + box-shadow (see .frame
// in engraving.css). The flourishes are four small <svg>s placed and mirrored
// by CSS, not by an SVG transform: SVG's transform attribute takes no
// percentages, so `translate(100% 0)` is a parse error, silently or loudly
// depending on the browser.

const CORNERS = ['tl', 'tr', 'bl', 'br'];

export default function Frame({
  as: Tag = 'div', strong = false, corners = true, className = '', children, ...rest
}) {
  return (
    <Tag className={`frame${strong ? ' frame--strong' : ''} ${className}`} {...rest}>
      {corners && CORNERS.map((c) => (
        <svg key={c} className={`frame-corner fc-${c}`} viewBox="0 0 64 64"
             aria-hidden="true" focusable="false">
          <use href="#orn-corner" />
        </svg>
      ))}
      {children}
    </Tag>
  );
}
