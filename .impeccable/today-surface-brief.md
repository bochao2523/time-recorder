## Scope and mode

- Primary surface: mobile-first daily entry at `src/pages/TodayPage.tsx`.
- Mode: Operate.

## Audience, job, and task

- Familiar users recording time in short mobile sessions.
- Manual entry and live timing are equal primary actions and must appear together in the first viewport.
- The user should see today’s total, start either workflow, understand save/timer state, and reach existing task rows within seconds.

## Chosen direction

- Visual world: depot destination blind, translated into a modern mobile product rather than a vehicle theme.
- Approved composition: control-first, `.impeccable/mocks/depot-control-first.png`.
- Quality references: `.impeccable/mocks/decision/depot-quality-board.webp` and `.impeccable/mocks/decision/depot-quality-hero.webp`.
- Memorable moment: the stable chrome-yellow timer digits sitting inside a fixed bottle-green cloth course directly beneath two equal primary controls.

## Constraints

- No page-load choreography, rolling blind animation, overshoot, pulse, shimmer, blur, or transform-based button feedback.
- Save, timer, and navigation regions reserve their dimensions before state changes.
- Minimum visible touch target is 44px; mobile inputs remain at 16px or larger.
- Existing localStorage records and timer behavior remain unchanged.

## Component grammar

- Corners: 10px for controls, 14px for major courses and panels.
- Lines: one dark structural border; restrained gold or green inset seam; dashed line only when it represents stitching.
- Elevation: soft green-black offset shadow on major cloth panels; light courses use a shallower neutral shadow.
- Type: system Chinese UI sans for content; locally bundled Barlow Condensed for measurements, numerals, and small depot labels.
- Material: two repeating raster layers only—dark duck cloth and warm calico—over solid accessible color fallbacks.

## Visible ingredient inventory

| Ingredient | Medium | Commitment |
|---|---|---|
| Bottle-green and calico material | Generated JPEG texture layers | Repeated at 320px, low enough contrast to keep all text AA-readable |
| Header, total course, actions, timer course, task courses, navigation | Semantic HTML/CSS | Responsive, fixed state slots, no rasterized controls or labels |
| Eyelets and seams | CSS geometry | Decorative only, pointer-events disabled or hidden from accessibility |
| Icons | Inline SVG | Consistent 2px stroke and currentColor |
| Timer and totals | Semantic text | Tabular numerals and fixed measurement slots |
| Charts | Existing Canvas/SVG rendering | Tokenized depot palette; never flattened into imagery |

## Unresolved decisions

- Account login and cross-device sync remain outside this redesign.
