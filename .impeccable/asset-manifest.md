# Depot Time Recorder — Asset Manifest

## Decision

The approved composition needs **two raster assets total** for material fidelity:

1. dark depot-green dyed duck-cloth weave;
2. warm calico / unbleached cotton-canvas weave.

Everything else visible in the composition must remain semantic HTML, CSS, Canvas, or inline SVG. In particular, never flatten copy, timer values, record data, icons, navigation, buttons, fields, charts, focus states, stitching, eyelets, or panel geometry into images.

These textures are decorative enhancement layers. Every surface must retain its solid color underneath so the interface remains readable if images are delayed, disabled, or fail to load.

## Build-critical raster assets

| Asset | Purpose | Output spec | Crop / processing | Transparency | Suggested application |
|---|---|---|---|---|---|
| `src/assets/depot-duck-cloth-texture.jpg` | Material layer for depot-green summary, timer, action, and navigation surfaces | 512 × 512 px; JPEG; 112 KB; sRGB; quality 76 | Full-frame reduction from generated 1254 × 1254 source; no crop; no UI elements | None | Repeat at roughly 256–384 CSS px per tile on a pseudo-element over `#0E3A2E`; keep opacity restrained (about 0.45–0.7) and preserve a solid-color fallback |
| `src/assets/depot-calico-cloth-texture.jpg` | Material layer for page canvas, header, record rows, fields, and light panels | 512 × 512 px; JPEG; 79 KB; sRGB; quality 76 | Full-frame reduction from generated 1254 × 1254 source; no crop; no UI elements | None | Repeat at roughly 256–384 CSS px per tile on a pseudo-element over `#F2EFE6`; keep opacity restrained (about 0.5–0.75) so data contrast stays stable |

### Raster usage constraints

- Apply the image to a non-interactive pseudo-element or background layer; it must not receive pointer events or appear in the accessibility tree.
- Keep all text and icon contrast valid against the **solid backing token**, not against fortunate light/dark spots in the bitmap.
- Prefer one texture layer per material region. Do not stack blur, filter, noise, and multiple image overlays; mobile scroll performance is a product constraint.
- The two files are designed as repeating textures, but use them at low enough opacity that a repeated macro-pattern cannot become a visible grid. Verify at 320, 390, 430, 768, and desktop widths.
- Reuse the calico weave beneath chrome-yellow fills through CSS color/blend treatment if subtle printed grain is desired. Do not add a third yellow bitmap.
- Do not use these assets for state, hierarchy, hit-area boundaries, or saved/running status. Those must remain legible when the textures are absent.

## Exact generation prompts

### `depot-duck-cloth-texture.jpg`

```text
Use case: photorealistic-natural
Asset type: seamless square UI background texture tile
Primary request: Create a perfectly seamless, edge-to-edge tile of tightly woven dark depot-green dyed duck cloth, matching the rugged canvas material visible in the supplied approved mobile time recorder comp and depot quality board.
Input images: Image 1 is the approved mobile composition; Image 2 is the material quality board. Use them only as material and color references.
Style/medium: macro material photography, restrained tactile realism, production-ready web texture
Composition/framing: orthographic flat-on view, uniform weave density across the full square, all four edges tile seamlessly
Lighting/mood: neutral diffuse illumination with no vignette, no hotspot, no directional shadow, no wrinkles
Color palette: deep depot green around #0E3A2E with subtle thread-level variation
Materials/textures: heavy cotton duck cloth, visible diagonal interlaced fibers, fine natural grain, low contrast
Constraints: texture only; no UI, no typography, no symbols, no stitched seams, no borders, no eyelets, no metal, no objects, no transparency, no watermark; seamless repetition must not reveal a grid
```

References supplied to generation:

- `.impeccable/mocks/depot-control-first.png` — approved mobile composition and material scale reference.
- `.impeccable/mocks/decision/depot-quality-board.webp` — approved palette and duck-cloth material reference.

### `depot-calico-cloth-texture.jpg`

```text
Use case: photorealistic-natural
Asset type: seamless square UI background texture tile
Primary request: Create a perfectly seamless, edge-to-edge tile of warm natural calico-white cotton canvas, matching the woven cream material visible in the supplied approved mobile time recorder comp and depot quality board.
Input images: Image 1 is the approved mobile composition; Image 2 is the material quality board. Use them only as material and color references.
Style/medium: macro material photography, restrained tactile realism, production-ready web texture
Composition/framing: orthographic flat-on view, uniform weave density across the full square, all four edges tile seamlessly
Lighting/mood: neutral diffuse illumination with no vignette, no hotspot, no directional shadow, no wrinkles
Color palette: warm calico off-white around #F2EFE6 with subtle beige thread-level variation
Materials/textures: medium-weight unbleached cotton canvas, fine plain weave, occasional natural fiber flecks, low contrast
Constraints: texture only; no UI, no typography, no symbols, no stitched seams, no borders, no eyelets, no metal, no objects, no transparency, no watermark; seamless repetition must not reveal a grid
```

References supplied to generation:

- `.impeccable/mocks/depot-control-first.png` — approved mobile composition and material scale reference.
- `.impeccable/mocks/decision/depot-quality-board.webp` — approved palette and calico-weave material reference.

## Code-native ingredient manifest

| Visible ingredient | Required implementation | Why it must not be rasterized |
|---|---|---|
| Product copy, dates, totals, category/task names, durations, timer digits, saved/running states | Semantic text in headings, paragraphs, labels, status regions, and tabular/list structures; timer digits may use tabular numerals | Content changes continuously, must scale, localize, remain selectable, and be announced correctly |
| Primary action cards and buttons | Native `<button>` elements with CSS fill, border, cut-corner shape, pressed/focus/disabled states | Preserves keyboard access, touch behavior, hit targets, and state feedback |
| Form controls and manual-entry fields | Native labeled controls with CSS styling | Inputs require focus, validation, iOS-safe font sizing, and assistive-technology support |
| Bottom navigation | Semantic `<nav>` with links/buttons, active-state text, and `aria-current` | Navigation labels and active state are functional information |
| Record rows and timer strip | Semantic lists/articles/status regions with CSS layout | Values and actions must remain data-driven and responsive |
| Mortarboard, lotus, runner, book, pencil, play/pause, calendar, clipboard, chart, and settings glyphs | Consistent inline SVG icon components with `currentColor`; decorative duplicates use `aria-hidden="true"` | SVG stays sharp, recolors with state, and avoids multiple raster-density variants |
| Metal eyelets / grommets | Decorative CSS pseudo-element or reusable inline SVG symbol using concentric radial gradients, highlights, and shadows | A small procedural treatment scales cleanly and needs no network/decode cost; keep it out of the accessibility tree |
| Gold stitch lines | CSS dashed borders or repeating-linear-gradient pseudo-elements; SVG only where a complex corner path is unavoidable | Stitching follows responsive panel geometry and should not force fixed bitmap dimensions |
| Cut corners, inset seams, panel borders, depth, and edge shadows | CSS `clip-path`, borders, pseudo-elements, and restrained box/text shadows | Geometry must respond to content and viewport size |
| Chrome-yellow printed surfaces | Solid CSS token near `#FFD200`, optionally modulated by the calico texture at low opacity/blend | No unique subject matter exists; a separate raster would duplicate the same weave information |
| Typography | Real text using a locally available or properly licensed font stack; tabular numerals for elapsed time; condensed display face only where the approved hierarchy calls for it | Raster type is inaccessible and breaks dynamic content. Do not generate font glyph atlases or wordmarks |
| Charts and statistics | Existing chart rendering via SVG/Canvas with tokenized colors and semantic summaries | Data is dynamic and must remain interpretable rather than decorative |
| Focus rings, hover/pressed state, loading state, saved state, and running timer state | CSS and accessible DOM state | Interaction feedback cannot depend on bitmap availability |

## Explicitly rejected asset candidates

- Full-screen or component screenshots from the approved comp.
- Rasterized Chinese labels, timer digits, dates, or category names.
- Per-category PNG icon set.
- Separate grommet/eyelet bitmaps.
- Separate stitch, seam, shadow, corner, paper-edge, or yellow-grain bitmaps.
- Decorative stock photography, hero imagery, logos, badges, testimonials, or promotional marks; none are supported by `PRODUCT.md`.
- Animated GIF/video texture. Motion and decode cost are unjustified for this short-session mobile utility.

## Implementation acceptance checks

- With both image requests blocked, all flows, labels, state changes, hit targets, hierarchy, and contrast remain usable.
- No texture causes text contrast below WCAG AA or makes a disabled/running/saved state ambiguous.
- No texture layer captures pointer input or is announced by assistive technology.
- No element with user data is represented only in pixels.
- Texture repetition has no visible seams or grid at supported breakpoints and at 1×/2× device pixel ratios.
- The two JPEGs are the only new raster dependencies needed to reproduce the approved material language.
