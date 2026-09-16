#!/usr/bin/env node
// new-post.mjs — scaffold a post.  npm run new-post -- "عنوان نوشته"
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from '../src/lib/format.js';
import { describeDate } from '../src/lib/jalali.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const title = args.filter((a) => !a.startsWith('--')).join(' ').trim();
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

if (!title) {
  console.error('usage: npm run new-post -- "عنوان نوشته" [--slug my-slug] [--date 2026-01-20]');
  process.exit(1);
}

const date = flag('date') || new Date().toISOString().slice(0, 10);
const slug = flag('slug') || slugify(title);
const file = path.join(ROOT, 'content/posts', `${date}-${slug}.md`);

if (existsSync(file)) { console.error(`already exists: ${path.relative(ROOT, file)}`); process.exit(1); }

const j = describeDate(date);
writeFileSync(file, `---
title: ${title}
date: ${date}
tags: []
summary:
draft: true
---
@ سرسخن، اگر خواستی

بند نخست.

## عنوان بخش

بند دوم.
`);

const media = path.join(ROOT, 'public/media', slug);
mkdirSync(media, { recursive: true });
writeFileSync(path.join(media, '.gitkeep'), '');

console.log(`
  ${path.relative(ROOT, file)}
  ${j.fa}

  media:   public/media/${slug}/
  preview: http://localhost:5173/draft/${slug}/   (npm run dev)

  It is draft: true — remove that line, or set it to false, to publish.
`);
