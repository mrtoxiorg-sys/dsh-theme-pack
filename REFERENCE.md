# Theme pack — reference notes

## Where the palettes anchor

`client.js` overrides the shell's alias tokens through
`ctx.theme.overrideTokens("@local/dsh-theme-pack", tokens)`. The base values
live in the shipped design system, in `design-platform.css` next to this file
(copied verbatim from `@deepseek-ai/dsh-client-ui-theme`, `design-platform.css`
module inside its client bundle):

* `body` — the light palette
* `body[data-ds-dark-theme]` — the dark palette

`design-platform.css` is also the source of truth the verification script uses
to prove that every token a theme overrides actually exists. If a future DSH
release renames or drops a token, `node verify-theme-pack.mjs` fails loudly
instead of silently ignoring the override.

## The 104 tokens a skin overrides

The first release overrode the 32 obvious ones and that was the bug users saw: an
otherwise repainted UI with purple composer rows, menus and diff views, because
everything else still resolved to the shipped palette. A partial skin is worse
than no skin.

| Purpose | Tokens |
| --- | --- |
| Canvas, surfaces, composer | `--dsw-alias-bg-base`, `--dsw-alias-bg-layer-1..4`, `--dsw-alias-bg-overlay`, `--dsw-alias-bg-module-platform`, `--dsw-specific-sidebar-fill`, `--dsw-alias-bg-multi-select`, `--dsw-alias-bg-skeleton`, `--dsw-alias-bg-mask-1..3`, `--dsw-alias-bg-mask-drop`, `--dsw-alias-bg-mask-photo`, `--dsw-alias-bg-document-preview`, `--dsw-alias-bg-document-selection` |
| Text ladder | `--dsw-alias-label-primary`, `-secondary`, `-tertiary`, `-caption`, `-dimmed`, `-error`, `-primary-foreground`, `-primary-bluish`, `-primary-dimmed`, `-primary-inverted`, `--dsw-alias-label-deep-diving`, `-shimmer`, `--dsw-alias-label-document-preview`, `--dsw-alias-label-shimmer` |
| Accent and actions | `--dsw-alias-brand-primary`, `-primary-invert`, `-primary-new-colorprimary-new-color`, `--dsw-alias-brand-text`, `--dsw-alias-link`, `--dsw-alias-button-primary-fill`, `-hover`, `-dimmed`, `--dsw-alias-button-elevated-fill`, `-floating-fill`, `-floating-hover`, `-contrast-fill`, `-tool-bar-fill`, `-tool-bar-fill-invisible`, `-tool-bar-hover`, `-ghost-active-fill`, `-ghost-active-border`, `-ghost-active-hover`, `-info-fill`, `-info-hover` |
| Borders | `--dsw-alias-border-l1..l4`, `--dsw-alias-border-l2-darkmode-thin`, `--dsw-alias-border-inverted`, `-inverted2` |
| States | `--dsw-alias-state-business-primary`, `-tertiary`, `-error-primary`, `-secondary`, `-warn-primary`, `-label`, `-secondary`, `-tertiary`, `-success-primary`, `-secondary`, `-tertiary`, `-idle-primary` |
| Interaction | `--dsw-alias-interactive-bg-hover`, `-active`, `-hover-accent`, `-hover-danger`, `-hover-solid`, `--dsw-alias-turn-trigger-bg`, `-hover` |
| Code, diffs, markdown | `--dsw-alias-markdown-code-block`, `-banner`, `--dsw-alias-markdown-inline-code`, `-tag`, `-placeholder`, `-citation`, `-code-segment-selected`, `-code-segment-unselected`, `--dsw-alias-code-diff-added`, `-deleted`, `--dsw-alias-file-diff-added-bg`, `-gutter`, `-marker`, `--dsw-alias-file-diff-deleted-bg`, `-gutter`, `-marker` |
| Chrome | `--dsw-alias-scrollbar-bg-l1`, `-l2`, `-hover-l1`, `-hover-l2`, `--dsw-alias-toast-bg`, `-label`, `--dsw-alias-tooltip-bg`, `-key-bg`, `--dsw-alias-menu-icon`, `-group-header-fill`, `--dsw-alias-switch-thumb` |

Both palettes get a value for every token, so a skin survives a light/dark flip.

**Two of these are not declared anywhere in the shipped stylesheets.**
`--dsw-alias-bg-layer-4` (the composer and footer row) and
`--dsw-alias-label-error` are only *read* by the shell bundle, so they resolve to
nothing today and the plug-in is what finally defines them. Keep them.

**Coverage is checkable, so keep it checked.** `node report-token-coverage.mjs`
prints every alias token the shipped stylesheets mention that the pack does not
override. Run it after a DSH update; an empty list is the target. The verification
script fails outright when a skin writes a token the design system does not know,
and reads `docs/shell.css` when present to catch shell-only names.

## Why override layers instead of registering themes

`ctx.theme.register({ id, colorScheme, tokens })` adds a theme id to the
registry, but the built-in Appearance picker in Settings writes only
`light` / `dark` / `system` to the durable `ui-theme` settings namespace, and
the docs are explicit that third-party ids "do not cross the built-in settings
schema". An override layer is the supported extension point: it stacks on top
of whichever built-in preference is active, composes with other layers in
registration order, and disappears cleanly when the plugin unloads.

## Gotchas worth remembering

**`React` is a loader builtin, but it is not in your module's lexical scope.**
A `window.__ModuleLoader__.load({ factory() { ... } })` module that writes a bare
`React.createElement(...)` compiles fine and passes a naive harness, then throws
`ReferenceError: React is not defined` the moment the component actually renders —
and because it throws during render, the slot error boundary catches it and the
row silently never appears. Resolve it explicitly:

```js
factory(require) {
  const React =
    (typeof require === "function" ? require("react") : undefined) ??
    globalThis.React ??
    window.React;
  if (React === undefined) throw new Error("...: the React builtin is unavailable");
```

A harness that stubs `globalThis.React` hides this bug, because real modules can
reach the global while real slot components cannot rely on it. The verification
script now runs the bundle both with and without a working `require("react")` and
also pins the explicit failure when neither source exists.

**The sidebar's foot area is hidden while the sidebar is wide.** `sidebar` declares
`sidebar.footer.action` and `.footArea` sits inside its render tree, but this build
styles `.footArea { display: none }` and only reveals it in the 56px rail. A busy
occupant (`cordis-panel`, for instance) can therefore be registered and `active`
while being completely invisible. Prefer `settings.general.item` — the General
column renders every occupant through a plain `renderSlot`.

**An occupied slot entry is not proof of a rendered row.** `Slots.listSubTree`
reports occupants with an `active` flag; `active: false` right after an HMR swap
means the new revision registered but its fiber never came up, which in practice
means the module threw during load or render. Read the browser console for
`slot entry crashed in '<slot key>'` before trusting the tree.

## A client plugin can take the whole boot down

The web boot collects its client entries and then asserts that every one of them
activated:

```js
if (o.length > 0) throw new Error(`web boot: ${o.length} entries did not activate\n${o.join("\n")}`);
```

An entry whose `apply()` throws ends up in fiber state `FAILED`, the assertion
fires, and the desktop shell shows **"The application could not start or stopped
unexpectedly"** with `@local/dsh-theme-pack: failed` in the body. The only way
back in is *Disable third-party plugins, back up profile patch, and restart* —
which renames `cordis.patch.yml` to `cordis.patch.yml.bak-<ms>` and rewrites the
profile's `dsh.profile.bundles` to just the shipped bundles. After that recovery:

* the package is still on disk in `node_modules/@local`, but it is no longer a
  bundle, so nothing loads it;
* any private configuration that lived in the patch file is gone (only the
  backed-up copy has it);
* a plain reinstall is required — `node install-theme-pack.mjs` puts the bundle
  back into `dsh.profile.bundles`.

Because a throw is fatal for the whole application, **a theme pack must never
throw while activating**. Everything in `apply()` and in the controller is
wrapped:

```js
function guard(step, run) {
  try { return run(); } catch (error) { report(step, error); return undefined; }
}
```

`report()` pushes onto `globalThis.__DSH_THEME_PACK__.problems` and logs
`dsh-theme-pack: …` at error level. So the failure mode is a missing or degraded
picker plus one console line, not a dead application. The verification script has
a *hostile services* pass that drives the plugin with a `theme.overrideTokens`
that throws, a `slots.inject` that throws and a `locale.register` that throws,
and asserts that `apply()` returns normally and names each step in the
diagnostics.

Two consequences for the design:

* **`inject` is empty.** A hard `inject: ["theme", "slots"]` is a *waiting* state:
  cordis does not activate the entry until every listed service exists, and the
  boot asserts activation. A pack that needs nothing cannot hang in `pending`,
  so every service is looked up through `resolve(ctx, name)` at the moment it is
  used, and a missing one only degrades the picker. The locale service is soft
  for the same reason — the row carries its own English/Russian copy.
* **Diagnostics are readable from the console.** After a boot, run
  `window.__DSH_THEME_PACK__` — it reports `version`, `themeIds` and `problems`.
  An empty `problems` array plus a missing picker means the slot registration
  never happened, not that the plugin died.

### The context a client half actually gets

Not necessarily the full cordis context. The documented surface of the restricted
one is

```
ctx.get(name): unknown | undefined
ctx.on(name, listener): () => void
ctx.provide(name, value): () => void
ctx.effect(callback, label?): () => void
```

Reading `ctx.slots` on that object throws, and a throw during activation fails
the whole web boot. `resolve(ctx, name)` therefore tries `ctx.get(name)` first
and only then the property, which works under both faces:

```js
function resolve(ctx, name) {
  let service;
  try { service = typeof ctx?.get === "function" ? ctx.get(name) : undefined; } catch { service = undefined; }
  if (service === undefined) { try { service = ctx?.[name]; } catch { service = undefined; } }
  return service;
}
```

Note that `dsh.client.inject` in `package.json` is a *different* thing: it names
client modules that must arrive before this bundle in the boot graph. A name with
no row in that graph is skipped rather than fatal, but a stale name is still a
dependency on nothing — this package briefly listed
`@deepseek-ai/dsh-client-ui-sidebar`, which this build does not ship (it ships
`-sidebar-browser`). The pack imports no client module of its own, so it declares
none.
