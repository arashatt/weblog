// router.jsx — the React surface over routes.js: a hook, a navigate(), and an
// <A> that turns same-origin clicks into pushState navigations.
import { useEffect, useState } from 'react';
import { match, trimPath } from './routes.js';

export { match, href, routeKey, outFile } from './routes.js';

const NAV = 'weblog:navigate';

export function navigate(to, { replace = false } = {}) {
  if (typeof window === 'undefined') return;
  if (replace) window.history.replaceState({}, '', to);
  else window.history.pushState({}, '', to);
  window.dispatchEvent(new Event(NAV));
}

export function useRoute(initial) {
  const [route, setRoute] = useState(initial);
  useEffect(() => {
    const read = () => setRoute(match(window.location.pathname));
    window.addEventListener('popstate', read);
    window.addEventListener(NAV, read);
    return () => {
      window.removeEventListener('popstate', read);
      window.removeEventListener(NAV, read);
    };
  }, []);
  return route;
}

/** An <a> that navigates in-page for same-origin, unmodified left clicks. */
export function A({ href: to, children, ...rest }) {
  const onClick = (e) => {
    if (rest.onClick) rest.onClick(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== '_self') return;
    if (!to || /^[a-z]+:/i.test(to) || to.startsWith('//') || to.startsWith('#')) return;
    e.preventDefault();
    if (trimPath(to) !== trimPath(window.location.pathname)) {
      navigate(to);
      window.scrollTo(0, 0);
    }
  };
  return <a href={to} {...rest} onClick={onClick}>{children}</a>;
}
