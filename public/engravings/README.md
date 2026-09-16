# ornament drop-in slots

Everything the engraving layer draws lives in `src/components/Ornaments.jsx` as
inline SVG, in `currentColor`, so it recolours with روز/کاهی/شب and costs no
request. Nothing here is required.

Drop a file in with one of these names and the build prefers it over the drawn
version:

| file | replaces | suggested size |
|---|---|---|
| `crest.svg` | `#orn-crest` — the masthead/footer crest | 120 × 56, `currentColor` strokes |
| `corner.svg` | `#orn-corner` — card corner flourish | 64 × 64, `currentColor` |
| `rule.svg` | `#orn-rule` — the printer's rule in dividers | 320 × 8, `currentColor` |
| `paper-grain.png` | the `feTurbulence` paper texture | 180 × 180, seamless, greyscale |

Two rules if you replace them:

1. **Use `currentColor`, not a fixed hex.** A hard-coded `#111` vanishes in شب.
2. **Keep SVGs stroke-based and unfilled** where the original is, or the night
   theme inverts into a solid block.

Post artwork is different — that goes in `public/media/` and is referenced from
a post's `cover:` field. Cards apply the mezzotint hatch to whatever they get,
so an ordinary photograph works; the engraved look is done in CSS.
