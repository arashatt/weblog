import { A, href } from '../lib/router.jsx';
import { T } from '../lib/strings.js';

export default function Masthead({ site, onMenu, onSearch }) {
  return (
    <header className="masthead" aria-label="سرصفحه">
      <span className="mh-start">
        <button className="icon-btn" onClick={onMenu} aria-label={T.siteNav}
                data-tip="فهرستِ نوشته‌ها، برچسب‌ها و تنظیمات">
          <span className="burger" aria-hidden="true"><i /><i /><i /></span>
        </button>
      </span>
      <A className="mh-title" href={href.index()}>{site.title}</A>
      <span className="mh-end">
        <button className="icon-btn" onClick={onSearch} aria-label={T.search} data-tip="جست‌وجو در همهٔ نوشته‌ها">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.6" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20 L16 16" strokeLinecap="round" />
          </svg>
        </button>
      </span>
    </header>
  );
}
