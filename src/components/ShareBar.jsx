import { useEffect, useState } from 'react';
import { T } from '../lib/strings.js';

export default function ShareBar({ post, site }) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const url = window.location.href;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — the address bar still has it */ }
  };

  return (
    <div className="share-bar">
      {canShare && (
        <button className="pill" onClick={() => navigator.share({ title: post.title, text: post.summary, url })}>
          {T.share}
        </button>
      )}
      <button className={`pill${copied ? ' on' : ''}`} onClick={copy}>
        {copied ? T.copied : T.copyLink}
      </button>
      <a className="pill" href={`${site.url}/feed.xml`} rel="alternate">{T.feed}</a>
    </div>
  );
}
