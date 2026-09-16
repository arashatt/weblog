import { A, href } from '../lib/router.jsx';
import { Crest } from './Ornaments.jsx';
import { T } from '../lib/strings.js';

export default function Footer({ site }) {
  return (
    <footer className="site-footer">
      <Crest size="sm" />
      <p>{site.title} ــ {site.author.name}</p>
      {site.author.affiliation && <p>{site.author.affiliation}</p>}
      <div className="footer-links">
        <A href={href.archive()}>{T.archive}</A>
        <A href={href.tags()}>{T.tags}</A>
        <a href="/feed.xml">{T.feed}</a>
        {site.social?.github && <a href={site.social.github} rel="me noopener">GitHub</a>}
      </div>
    </footer>
  );
}
