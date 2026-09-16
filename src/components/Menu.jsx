// Menu.jsx — the drawer: search, navigation, tags, bookmarks, settings.
//
// Everything that reads localStorage is gated on a `mounted` flag, because the
// server has no storage: rendering bookmarks straight from getMarks() would
// hydrate to a different tree than the prerendered HTML.
import { useEffect, useState } from 'react';
import { A, href } from '../lib/router.jsx';
import { getMarks, removeMark, getPos } from '../lib/store.js';
import { T } from '../lib/strings.js';
import Search from './Search.jsx';
import InstallHint from './InstallHint.jsx';

const Seg = ({ label, value, options, onChange }) => (
  <div className="set-row">
    <span className="set-label">{label}</span>
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} className={`seg-b${value === o.value ? ' on' : ''}`}
                aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export default function Menu({ open, onClose, site, index, settings, onSettings, searchFocus }) {
  const [mounted, setMounted] = useState(false);
  const [marks, setMarks] = useState([]);
  const [pos, setPosState] = useState(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open || !mounted) return;
    setMarks(getMarks());
    setPosState(getPos());
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open, onClose]);

  const titles = Object.fromEntries(index.posts.map((p) => [p.slug, p.title]));
  const resume = pos && titles[pos.slug]
    ? { href: `${href.post(pos.slug)}#b-${pos.bi}`, title: titles[pos.slug], snippet: pos.snippet }
    : null;

  return (
    <div className={`menu-root${open ? ' open' : ''}`}>
      <div className="menu-scrim" onClick={onClose} />
      <nav className="menu-drawer" aria-label={T.siteNav} aria-hidden={!open}>
        <div className="menu-top">
          <span className="menu-title">{site.title}</span>
          <button className="menu-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <Search titles={titles} autoFocus={open && searchFocus} limit={12} onNavigate={onClose} />

        {resume && (
          <A className="menu-continue" href={resume.href} onClick={onClose}>
            <span className="mc-label">{T.continueReading}</span>
            <span className="mc-title">{resume.title}</span>
            {resume.snippet && <span className="mc-snippet">{resume.snippet}</span>}
          </A>
        )}

        <div className="menu-section">
          <div className="menu-h">{T.siteNav}</div>
          <A className="menu-link" href={href.index()} onClick={onClose}>{T.posts}
            <span className="count">{index.posts.length}</span></A>
          <A className="menu-link" href={href.tags()} onClick={onClose}>{T.tags}
            <span className="count">{index.tags.length}</span></A>
          {index.series.length > 0 && (
            <A className="menu-link" href={href.seriesIndex()} onClick={onClose}>{T.series}
              <span className="count">{index.series.length}</span></A>
          )}
          <A className="menu-link" href={href.archive()} onClick={onClose}>{T.archive}</A>
          {index.glossaryCount > 0 && (
            <A className="menu-link" href={href.glossary()} onClick={onClose}>{T.glossary}
              <span className="count">{index.glossaryCount}</span></A>
          )}
          {index.pages.map((p) => (
            <A key={p.slug} className="menu-link" href={href.page(p.slug)} onClick={onClose}>{p.title}</A>
          ))}
        </div>

        {index.tags.length > 0 && (
          <div className="menu-section">
            <div className="menu-h">{T.tags}</div>
            <div className="tag-cloud" style={{ justifyContent: 'flex-start', padding: 0 }}>
              {index.tags.slice(0, 12).map((t) => (
                <A key={t.slug} href={href.tag(t.slug)} onClick={onClose}>
                  {t.name}<span className="count">{t.posts.length}</span>
                </A>
              ))}
            </div>
          </div>
        )}

        {mounted && marks.length > 0 && (
          <div className="menu-section">
            <div className="menu-h">{T.bookmarks}</div>
            {marks.map((m) => (
              <div className="mark-row" key={m.id}>
                <A href={`${href.post(m.slug)}#b-${m.bi}`} onClick={onClose}>
                  <span className="mark-ch">{titles[m.slug] || m.slug}</span>
                  {m.snippet && <span className="mark-snippet">{m.snippet}</span>}
                </A>
                <button className="mark-del" aria-label={T.removeBookmark}
                        onClick={() => setMarks(removeMark(m.id))}>×</button>
              </div>
            ))}
          </div>
        )}

        {mounted && <InstallHint />}

        <div className="menu-settings">
          <div className="menu-h">{T.display}</div>
          <Seg label={T.textSize} value={settings.fontScale} onChange={(v) => onSettings({ fontScale: v })}
               options={[{ value: 0.9, label: 'ک' }, { value: 1, label: 'م' },
                         { value: 1.15, label: 'ب' }, { value: 1.3, label: 'خ' }]} />
          <Seg label={T.mood} value={settings.theme} onChange={(v) => onSettings({ theme: v })}
               options={[{ value: 'auto', label: T.themeAuto }, { value: 'day', label: T.themeDay },
                         { value: 'sepia', label: T.themeSepia }, { value: 'night', label: T.themeNight }]} />
          <Seg label={T.font} value={settings.font} onChange={(v) => onSettings({ font: v })}
               options={[{ value: 'amiri', label: T.fontAmiri }, { value: 'vazir', label: T.fontVazir }]} />
          <Seg label={T.ornament} value={settings.engrave} onChange={(v) => onSettings({ engrave: v })}
               options={[{ value: 'on', label: T.on }, { value: 'off', label: T.off }]} />
        </div>
      </nav>
    </div>
  );
}
