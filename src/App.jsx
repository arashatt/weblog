import { useEffect, useState } from 'react';
import { useRoute, routeKey } from './lib/router.jsx';
import { buildData, needsDoc, docUrl } from './lib/resolve.js';
import { headFor } from './lib/seo.js';
import { DEFAULTS, getSettings, setSettings as persist, applySettings } from './lib/store.js';

import Ornaments from './components/Ornaments.jsx';
import Masthead from './components/Masthead.jsx';
import Menu from './components/Menu.jsx';
import Footer from './components/Footer.jsx';
import UpdateBar from './components/UpdateBar.jsx';

import Index from './pages/Index.jsx';
import Post from './pages/Post.jsx';
import {
  Tags, Tag, SeriesIndex, Series, Archive, Glossary, SearchPage, StandalonePage, NotFound,
} from './pages/Listing.jsx';

const docCache = new Map();

function Page({ route, index, data, settings }) {
  if (!data) return <NotFound />;
  const site = index.site;
  switch (route.name) {
    case 'index': return <Index site={site} data={data} />;
    case 'post': return <Post site={site} data={data} settings={settings} />;
    case 'page': return <StandalonePage data={data} />;
    case 'tags': return <Tags data={data} />;
    case 'tag': return <Tag data={data} />;
    case 'seriesIndex': return <SeriesIndex data={data} />;
    case 'series': return <Series data={data} />;
    case 'archive': return <Archive data={data} />;
    case 'glossary': return <Glossary data={data} />;
    case 'search': return <SearchPage data={data} />;
    default: return <NotFound />;
  }
}

export default function App({ index, route: initialRoute, data: initialData }) {
  const route = useRoute(initialRoute);
  // route and data move together, in one state object. Holding them apart lets
  // a render land where the route is already the new post but the data is still
  // the old page's — which crashes the moment a page reads its own shape.
  const [view, setView] = useState({ route: initialRoute, data: initialData });
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  // DEFAULTS on the server AND on the first client render, so hydration matches;
  // the reader's real settings arrive in the effect below, as an update.
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => { setSettings(getSettings()); }, []);
  useEffect(() => { if (typeof document !== 'undefined') applySettings(settings); }, [settings]);

  const update = (patch) => setSettings((prev) => persist({ ...prev, ...patch }));

  // Resolve the route's data. The first route is already resolved — it came
  // inlined with the prerendered HTML — so this only runs on navigation.
  useEffect(() => {
    if (routeKey(route) === routeKey(view.route)) return undefined;
    setMenu(false);

    let live = true;
    const land = (data) => { if (live) { setView({ route, data }); setLoading(false); } };

    if (needsDoc(route)) {
      const url = docUrl(route);
      const cached = docCache.get(url);
      if (cached) { land(buildData(route, index, cached)); return undefined; }
      setLoading(true);
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((doc) => {
          if (doc) docCache.set(url, doc);
          land(buildData(route, index, doc));
        })
        .catch(() => land(null));
    } else {
      land(buildData(route, index));
    }
    return () => { live = false; };
  }, [route, view.route, index]);

  // Keep the document title and description in step on soft navigation, so a
  // shared link and a browsed-to page never disagree.
  useEffect(() => {
    const head = headFor(view.route, view.data || {}, index);
    document.title = head.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = head.description;
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.href = head.url;
  }, [view, index]);

  return (
    <>
      <Ornaments />
      <Masthead
        site={index.site}
        onMenu={() => { setSearchFocus(false); setMenu(true); }}
        onSearch={() => { setSearchFocus(true); setMenu(true); }}
      />
      <Menu
        open={menu}
        onClose={() => setMenu(false)}
        site={index.site}
        index={index}
        settings={settings}
        onSettings={update}
        searchFocus={searchFocus}
      />
      <main>
        {loading
          ? <div className="notice">…</div>
          : <Page route={view.route} index={index} data={view.data} settings={settings} />}
        <Footer site={index.site} />
      </main>
      <UpdateBar />
    </>
  );
}
