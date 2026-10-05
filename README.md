# DSH theme pack

A color theme pack for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
web GUI: **19 skins**, each carrying a light *and* a dark palette, picked from
**Settings → General → Theme**.

<!--
The `v=` suffix is deliberate: GitHub serves README images through its `camo`
proxy, which keeps a copy per URL, so a re-rendered figure at the same path can
keep showing the previous version for a long time (a hard reload and a private
window do not help — the stale copy is not in the reader's browser). Bump the
value whenever make-theme-preview.py rewrites the figure.
-->
![Palette preview](docs/preview.png?v=2)

## Themes

| Theme | Light | Dark |
| --- | --- | --- |
| **Cyber neon** | cool graphite with a cyan accent | near-black blue with neon cyan |
| **Midnight blue** | pale blue paper | deep navy with a bright blue accent |
| **Nord** | Snow Storm neutrals with Frost blue | Polar Night with Frost cyan |
| **Dracula** | soft lilac paper | the classic violet/pink Dracula |
| **Catppuccin** | Latte | Mocha |
| **Tokyo night** | cool light blue | Tokyo Night with a neon blue accent |
| **Gruvbox** | warm cream and orange | deep brown with the signature orange |
| **Solarized** | Solarized Light | Solarized Dark |
| **Monokai** | warm off-white with magenta | Monokai Classic |
| **One dark** | Atom One Light | Atom One Dark |
| **Rosé Pine** | Rosé Pine Dawn | Rosé Pine |
| **Cobalt** | pale indigo | deep indigo with electric violet |
| **Deep ocean** | pale aqua | abyssal teal with mint |
| **Forest** | pale sage | deep forest green |
| **Paper** | warm white, low chroma | warm charcoal, low chroma |
| **Synthwave** | lilac paper | purple with pink and cyan |
| **Coffee** | warm cream and brown | dark roast with caramel |
| **Lavender** | pale violet | deep violet |
| **High contrast** | pure black on white | pure white on black |

Every skin recolors the whole shell — canvas, raised surfaces, sidebar, borders,
text ladder, brand and buttons, semantic states, code blocks, scrollbars and
toasts. Each one is a **pair** of palettes, so switching
`Light / Dark / System` in Settings keeps the skin rather than breaking it.

## Install

Requires DeepSeek Harness Desktop (or `dsh web`) with a managed profile.

### The short way

```bash
git clone git@github.com:mrtoxiorg-sys/dsh-theme-pack.git
cd dsh-theme-pack
DSH_PROFILE_DIR="$HOME/.dsh/profiles/desktop" \
  node install-theme-pack.mjs
```

`install-theme-pack.mjs` verifies the bundle first, mirrors the package into
`<profile>/node_modules/@local`, and registers it in the profile's
`dsh.profile.bundles`. It is idempotent and takes `--uninstall` and `--check`:

```
$ node install-theme-pack.mjs --check
profile        : /home/you/.dsh/profiles/desktop
source version : 1.2.1
installed      : 1.2.1
registered     : yes
up to date     : true
```

Restart DSH Desktop once so the new bundle is read. After that, edits to the
package are picked up live by the client-plugin HMR channel — no restart.

### By hand

```bash
git clone git@github.com:mrtoxiorg-sys/dsh-theme-pack.git
npm install --prefix "$DSH_PROFILE_DIR" file:"$PWD/dsh-theme-pack"
```

Then add the package to your profile's bundle list — in
`$DSH_PROFILE_DIR/package.json`:

```json
{
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@local/dsh-theme-pack"]
    }
  }
}
```

The same thing as a one-liner, keeping the entry list intact:

```bash
node -e '
const fs = require("node:fs"), path = require("node:path");
const dir = process.env.DSH_PROFILE_DIR;
const file = path.join(dir, "package.json");
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
const bundles = (manifest.dsh ??= {}).profile ??= {};
bundles.bundles ??= ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"];
(manifest.dependencies ??= {})["@local/dsh-theme-pack"] = "file:" + process.cwd();
if (!bundles.bundles.includes("@local/dsh-theme-pack")) bundles.bundles.push("@local/dsh-theme-pack");
fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
'
```

Restart DSH Desktop once so the new bundle is read. After that, edits to the
package are picked up live by the client-plugin HMR channel — no restart.

### Uninstall

```bash
DSH_PROFILE_DIR="$HOME/.dsh/profiles/desktop" \
  node install-theme-pack.mjs --uninstall
```

Or by hand: remove `@local/dsh-theme-pack` from `bundles` and from
`dependencies`, then delete `node_modules/@local/dsh-theme-pack` in the profile.

### If the application refuses to start

A client plugin that throws while activating fails the *whole* web boot, and the
desktop shell offers **Disable third-party plugins, back up profile patch, and
restart**. That recovery:

1. renames your `cordis.patch.yml` to `cordis.patch.yml.bak-<ms>` (your settings
   are in that backup, not in the live file);
2. rewrites `dsh.profile.bundles` down to the shipped bundles — so this pack
   stays installed on disk but stops being loaded, and no theme row appears.

Re-run `node install-theme-pack.mjs` to put the bundle back, then restart. You do
not need to reinstall anything by hand.

Since 1.2.1 this pack cannot cause that: every activation step is guarded, and a
failure lands in the console instead of the boot. Check what happened with:

```js
window.__DSH_THEME_PACK__   // { version, themeIds, problems: [] }
```

An empty `problems` means activation was clean. A non-empty one names the step
that degraded — usually alongside `dsh-theme-pack: …` in the console.

## Use

**Settings → General → Theme** shows one swatch per skin. Clicking one applies it
immediately everywhere and remembers the choice in `localStorage`
(`dsh-theme-pack:active`). Pick **Stock** to remove the layer and get the shipped
palette back.

There is no button in the sidebar on purpose: this build hides the sidebar's foot
area (`display: none` while the sidebar is wide), so a plug-in there would be
invisible. See [REFERENCE.md](REFERENCE.md) for that and the other integration
gotchas.

## How it works

The built-in Appearance picker only knows `light` / `dark` / `system`, and a
third-party `ctx.theme.register()` id never reaches the durable settings schema.
So instead of registering competing theme ids, the pack stacks **alias-token
override layers** on top of the active palette with
`ctx.theme.overrideTokens("@local/dsh-theme-pack", tokens)`.

Each skin declares ~18 color *atoms* per scheme (canvas, surfaces, text ladder,
brand, border, states…) and a small engine derives **every colour token the shell
consumes** from them — 153 of them today, across three token families, not just
the obvious two dozen:

![Every shell colour a skin carries](token-coverage.png?v=2)

* borders and interactive fills are composed over the canvas, so they stay flat
  colors that match any surface;
* the text ladder and brand colors are taken as authored, so contrast is checked
  rather than approximated;
* the ramp the shell uses for structural neutrals (`--dsw-static-*`) and the
  component overrides built on it (`--dsw-specific-*`) are derived from the same
  atoms, so a skin has no stock grey left anywhere.

Coverage is the whole point, and it has to be measured across **all** the
families. The shipped shell paints with `--dsw-alias-*` (the semantic ladder),
`--dsw-static-*` (a fixed ramp) and `--dsw-specific-*` (component overrides
pointing at that ramp); a skin that overrides only the popular alias names leaves
the composer, a menu, the sidebar, a diff view — or the selected category in
Settings — in their stock colours, and the result is a half-repainted UI. Three
names the shell reads (`--dsw-alias-bg-layer-4` for the composer and footer row,
`--dsw-alias-label-error`, and a scheme-less `--dsw-menu-surface-fill`) are not
declared anywhere scheme-aware, so the pack defines them.

Every generated palette is measured against WCAG contrast floors by the checker —
380 foreground/background pairs across the 19 skins — plus a per-skin audit of the
switch, whose knob has to read on both its off track and the brand fill. The
current tightest pair has a 4.03:1 ratio against a 4:1 requirement.

## Verify

```bash
node verify-theme-pack.mjs
node report-token-coverage.mjs
```

The checker runs the real `client.js` inside a minimal module-loader / DOM / React
harness and asserts that:

* the bundle registers exactly one picker row in `settings.general.item` and
  **nothing** in the sidebar footer;
* every skin stacks exactly one override layer, `Stock` stacks none, and picking
  `Stock` removes the layer;
* a theme service that re-enters (`overrideTokens` publishes the very event the
  pack listens to) neither overflows the stack nor re-stacks the layer;
* `apply()` survives a restricted Client context, missing services and a missing
  `React`, because a throw during activation fails the whole web boot;
* all 153 overridden tokens exist in the shipped design system
  ([`design-platform.css`](design-platform.css) and
  [`docs/shell.css`](docs/shell.css), extracted from
  `@deepseek-ai/dsh-client-ui-theme` and the web shell) — a stylsheet that grows a
  token the pack misses fails the run;
* every token maps to a distinct light and dark value, and no two skins render
  the same palette;
* every pair that decides readability clears its contrast floor;
* both React resolution paths work — the loader builtin and the global fallback
  (a bare `React` must fail loudly, which is the bug this test exists for).

Useful when changing palettes:

```bash
DSH_THEME_MIN_CONTRAST=4 node verify-theme-pack.mjs   # loosen the floor
node report-token-coverage.mjs                        # what is still uncovered?
node report-token-values.mjs                          # stock values of the gaps
node report-structure.mjs                             # derived static/specific values
node report-switch.mjs                                # switch contrast per skin
node export-theme-palettes.mjs > theme-pack-palettes.json
python make-theme-preview.py                          # rewrites docs/preview.png
```

`report-token-coverage.mjs` is the one to run after a DSH update: it prints every
colour token the shipped stylesheets mention that the pack does not override, and
exits non-zero while any remain. The target is an empty list.

## Add or change a theme

1. Open [`client.js`](client.js) and find `THEMES`.
2. Copy a `theme(...)` call, change the `id`, the glyph and the two atom tables.
3. Add both names to `DICTIONARIES` (`theme.<id>` for `en` and `ru`).
4. Run the checker — it catches unknown tokens, missing palettes, duplicated
   schemes and contrast regressions.

`Stock` deliberately carries no atoms: its whole job is to remove the layer. A
new atom usually means one new line in `palette()`, not a new token table.

## Files

| Path | Purpose |
| --- | --- |
| `client.js` | Browser half: the palette engine, the theme catalogue, the picker row |
| `index.js` | Host half: empty, the loader row only needs to exist |
| `cordis.patch.yml` | The bundle patch that inserts the loader row |
| [`docs/design-platform.css`](docs/design-platform.css) | The shipped alias-token tables the checker validates against |
| `docs/shell.css` | The shipped shell bundle, for the shell-only token names |
| `docs/preview.png` | Palette preview (English names lead; Russian is the second line) |
| `token-coverage.png` | Which shell element each skin carries |
| `verify-theme-pack.mjs` | The checker |
| `report-token-coverage.mjs` | Prints colour tokens the pack does not override, and fails while any remain |
| `report-structure.mjs` | Prints the derived `--dsw-static-*` / `--dsw-specific-*` values |
| `report-switch.mjs` | Prints the switch's contrast per theme and scheme |
| `export-theme-palettes.mjs` | Dumps every palette straight out of the engine |
| `make-theme-preview.py` | Renders `docs/preview.png` from that dump |
| `make-token-diagram.py` | Renders `token-coverage.png` from that dump |
| `REFERENCE.md` | Token map and integration gotchas |

## License

MIT — see [LICENSE](LICENSE).

---

# На русском

**19 тем** для веб-интерфейса DeepSeek Harness, каждая с парой палитр
(светлая и тёмная). Переключаются в **Настройки → Общие → «Темы»**; выбор
запоминается в `localStorage`. «Сток» возвращает штатную палитру.

Установка — см. раздел Install выше (нужен управляемый профиль DSH). После
первого добавления в `bundles` нужен один перезапуск DSH, дальше правки
подхватывает HMR клиентских плагинов.

Проверка палитр: `node verify-theme-pack.mjs` — гоняет настоящий `client.js`
в минимальном окружении и проверяет регистрацию, **153 токена** против штатной
дизайн-системы, различимость схем и контраст по WCAG, а также аудит тумблера
(кружок должен читаться и на выключенной дорожке, и на фирменной заливке).

Почему именно 153: оболочка рисует не только `--dsw-alias-*`, но и
`--dsw-static-*` (фиксированная шкала) с `--dsw-specific-*` (компонентные
переопределения на её основе). Если переопределить только «популярные» alias-имена,
композер, меню, боковая панель — или выбранная категория в настройках — останутся
в штатных цветах: получится полуперекрашенный интерфейс. Три имени
(`--dsw-alias-bg-layer-4` для композера и подвала, `--dsw-alias-label-error` и
`--dsw-menu-surface-fill` без варианта для тёмной схемы) в штатных стилях
объявлены неполно — их задаёт пак.

`node report-token-coverage.mjs` печатает, какие объявленные токены пак ещё не
переопределяет, и падает, пока такие есть. Пустой список — норма.
