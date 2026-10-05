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

## The 32 tokens a skin overrides

| Purpose | Token |
| --- | --- |
| Canvas and surfaces | `--dsw-alias-bg-base`, `--dsw-alias-bg-layer-1`, `-2`, `-3`, `--dsw-alias-bg-overlay`, `--dsw-specific-sidebar-fill` |
| Text | `--dsw-alias-label-primary`, `--dsw-alias-label-secondary`, `--dsw-alias-label-tertiary`, `--dsw-alias-label-primary-foreground` |
| Accent | `--dsw-alias-brand-primary`, `--dsw-alias-brand-primary-invert`, `--dsw-alias-brand-primary-new-colorprimary-new-color`, `--dsw-alias-link`, `--dsw-alias-button-primary-fill`, `--dsw-alias-button-primary-hover` |
| Borders | `--dsw-alias-border-l1`, `--dsw-alias-border-l2` |
| States | `--dsw-alias-state-business-primary`, `--dsw-alias-state-error-primary`, `--dsw-alias-state-warn-primary`, `--dsw-alias-state-success-primary`, `--dsw-alias-state-idle-primary` |
| Interaction | `--dsw-alias-interactive-bg-hover`, `--dsw-alias-interactive-bg-active` |
| Code and chrome | `--dsw-alias-markdown-code-block`, `--dsw-alias-markdown-code-block-banner`, `--dsw-alias-markdown-inline-code`, `--dsw-alias-scrollbar-bg-l1`, `--dsw-alias-scrollbar-hover-l1`, `--dsw-alias-toast-bg`, `--dsw-alias-toast-label` |

Both palettes get a value for every token, so a skin survives a light/dark flip.

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
