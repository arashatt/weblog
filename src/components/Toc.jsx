import { T } from '../lib/strings.js';

export default function Toc({ headings }) {
  if (!headings || headings.length < 3) return null;
  return (
    <details className="toc" open>
      <summary>{T.tocTitle}</summary>
      <ol>
        {headings.map((h) => (
          <li key={h.bi} className={`lvl-${h.level}`}>
            <a href={`#b-${h.bi}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </details>
  );
}
