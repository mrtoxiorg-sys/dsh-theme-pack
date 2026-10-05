// Dumps every palette the theme pack can produce, straight out of the engine.
//
//   node export-theme-palettes.mjs > theme-pack-palettes.json
//
// The image generator consumes this file instead of re-implementing the color
// math, so the picture can never drift from what the plugin actually applies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.join(here, 'dsh-theme-pack', 'client.js');
const source = fs.readFileSync(CLIENT, 'utf8');

/* ------------------------------------------------------------- environment */

const storage = new Map();
const React = {
  createElement: (type, props, ...children) =>
    typeof type === 'function' ? type({ ...(props ?? {}), children }) : { type, props: props ?? {}, children },
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {}
};
globalThis.React = React;
globalThis.window = {
  __ModuleLoader__: { load: (payload) => (globalThis.__payload = payload) },
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value))
  }
};
globalThis.document = {
  body: { hasAttribute: () => false },
  createElement: () => ({ remove() {} }),
  head: { append() {} }
};

new Function('window', 'globalThis', 'require', source)(
  globalThis.window,
  globalThis,
  (name) => (name === 'react' ? React : undefined)
);

/* ---------------------------------------------------------------- services */

const overrides = new Map();
const rows = [];
const dictionaries = {};
const ctx = {
  effect: (callback) => {
    const dispose = callback();
    return typeof dispose === 'function' ? dispose : () => {};
  },
  on: () => () => {},
  theme: {
    overrideTokens(source_, tokens) {
      overrides.set(source_, tokens);
      return () => overrides.delete(source_);
    }
  },
  slots: {
    inject: (name, callback) => callback(),
    register: (options, component) => {
      rows.push({ options, component });
      return () => {};
    }
  },
  locale: {
    register: (ns, tables) => {
      dictionaries[ns] = tables;
      return () => {};
    },
    bind: (ns) => (key) => dictionaries[ns]?.en?.[key] ?? key
  }
};

globalThis.__payload
  .factory((name) => (name === 'react' ? React : undefined))
  .apply(ctx);

/* ------------------------------------------------------------------ walker */

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (node === null || typeof node !== 'object') return;
  visit(node);
  walk(node.children ?? node.props?.children, visit);
}

const row = rows.find((entry) => entry.options.id === 'theme-pack');
if (row === undefined) throw new Error('the settings row is not registered');

const face = row.options.inject();
const renderRow = () => React.createElement(row.component, { ...face, t: ctx.locale.bind('theme-pack') });

const chipsOf = (tree) => {
  const found = [];
  walk(tree, (node) => {
    if (node.props?.['data-dsh-theme-pack-chip'] !== undefined) found.push(node);
  });
  return found;
};

/* ------------------------------------------------------------------- dump */

const themes = [];
for (const chip of chipsOf(renderRow())) {
  const id = chip.props['data-dsh-theme-pack-chip'];
  chip.props.onClick();
  const layer = overrides.get('@local/dsh-theme-pack');
  const light = {};
  const dark = {};
  for (const [name, pair] of Object.entries(layer ?? {})) {
    if (pair.light.startsWith('#')) light[name] = pair.light;
    if (pair.dark.startsWith('#')) dark[name] = pair.dark;
  }
  themes.push({
    id,
    label: {
      en: dictionaries['theme-pack']?.en?.[`theme.${id}`] ?? id,
      ru: dictionaries['theme-pack']?.ru?.[`theme.${id}`] ?? id
    },
    light,
    dark
  });
}

process.stdout.write(
  JSON.stringify(
    {
      generatedFrom: path.relative(here, CLIENT).replace(/\\/g, '/'),
      themes
    },
    null,
    1
  ) + '\n'
);
