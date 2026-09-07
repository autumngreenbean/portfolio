# Suika Zoo

A Suika-style ("watermelon game") merge game: drop animals into a jar, merge
matching pairs into the next size up, chase a high score before the pile
crosses the line. Built with three.js. Fully playable right now with
placeholder blob-animals — no external assets required.

## Run it

Because the game loads modules and (later) `.obj`/`.mtl` files via `fetch`,
open it through a local server rather than double-clicking `index.html`
(the `file://` origin blocks module imports and asset fetches in most
browsers):

```bash
cd suika-zoo
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works — `npx serve`, VS Code's Live Server, etc.

## Project structure

```
index.html          All DOM: header, canvas, side panel, dialogs
css/theme.css        Visual "header values" — every color/font/spacing
                      token as a CSS custom property, in three switchable
                      presets: zoo (default), night, contrast
css/styles.css        Component/layout CSS — reads theme.css variables only,
                      never a hard-coded color
js/config.js          Gameplay "header values" — tier sizes/scores, jar
                      dimensions, physics constants, camera, asset paths,
                      accessibility defaults. Exposed as window.CONFIG.
js/physics.js          Planar circle physics (gravity, walls, merges)
js/assetLoader.js      Builds placeholder animals, or loads real OBJ/MTL
js/accessibility.js    Live-region announcer, theme/scale switching, focus trap
js/game.js             three.js scene, input, game loop, wiring
assets/<name>/          Empty folders, one per animal, ready for your files
```

## Wiring in the real mySims animal models

1. Drop each animal's exported files into its folder, keeping the name
   consistent, e.g.:

   ```
   assets/dog/dog.obj
   assets/dog/dog.mtl
   assets/dog/dog_diffuse.png   (whatever the .mtl references)
   ```

   Do this for `dog`, `cat`, `bunny`, `penguin`, `deer`, `pig`, `hippo`,
   `panda` — those eight names are the source of truth in
   `CONFIG.TIERS` in `js/config.js`.

2. In `js/config.js`, set:

   ```js
   ASSETS: {
     usePlaceholders: false,
     ...
   }
   ```

3. Reload. Each model is auto-recentered on its own bounding-box center and
   uniformly rescaled so its bounding radius matches that tier's configured
   `radius` — so it doesn't matter what units or pivot the original export
   used, it'll drop into the jar at the right size. If a given animal's
   files are missing or fail to parse, that one tier quietly falls back to
   the placeholder blob (check the browser console for which) rather than
   breaking the whole game.

   If your `.mtl`/filenames don't follow the `<folder>/<folder>.obj`
   pattern, override `CONFIG.ASSETS.objFile` / `mtlFile` (they're just
   functions of the folder name) instead of renaming files.

## Customizing

- **Look and feel:** edit `css/theme.css`. Every color, font, radius, and
  motion timing the game uses is a variable there. Add a fourth
  `[data-theme="..."]` block, add it to the `<select id="themeSelect">` in
  `index.html`, done — no JS changes.
- **Gameplay feel:** edit `js/config.js` — jar size, gravity, bounciness,
  merge scores, spawn odds, drop cooldown, camera framing, danger-line grace
  period, everything is a named constant there.
- **Accessibility defaults:** also in `js/config.js` under `A11Y`, plus the
  in-game Settings dialog exposes theme, interface scale, and a keyboard-
  controls toggle to the player directly. `prefers-reduced-motion` is
  respected automatically regardless of theme.

## Controls

- **Mouse / touch:** move to aim, click or tap to drop.
- **Keyboard:** `←`/`→` to aim, `Space` or `Enter` to drop.
