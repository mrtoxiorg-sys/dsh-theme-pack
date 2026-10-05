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

/** The package root: this script's own directory, or the workspace sub-folder. */
function packageRoot() {
  for (const candidate of [here, path.join(here, 'dsh-theme-pack')]) {
    if (fs.existsSync(path.join(candidate, 'client.js'))) return candidate;
  }
  throw new Error(`client.js not found next to ${here} or in ${here}/dsh-theme-pack`);
}

const CLIENT = path.join(packageRoot(), 'client.js');
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

/* -------------------------------------------------------------- stock values */

/**
 * The shipped values of every alias token, read out of the extracted design
 * system (and the shell bundle, which declares a few tokens of its own) so the
 * figures can show what a skin replaces.
 */
function stockValues() {
  const files = ['design-platform.css', 'shell.css']
    .map((name) => path.join(packageRoot(), 'docs', name))
    .filter((file) => fs.existsSync(file));
  if (files.length === 0) return { light: {}, dark: {} };

  const rules = [];
  for (const file of files) {
    const css = fs.readFileSync(file, 'utf8');
    let index = 0;
    while (index < css.length) {
      const open = css.indexOf('{', index);
      if (open < 0) break;
      const selector = css.slice(index, open).trim();
      let depth = 1;
      let cursor = open + 1;
      while (cursor < css.length && depth > 0) {
        if (css[cursor] === '{') depth += 1;
        else if (css[cursor] === '}') depth -= 1;
        cursor += 1;
      }
      rules.push({ selector, body: css.slice(open + 1, cursor - 1) });
      index = cursor;
    }
  }

  const collect = (predicate) => {
    const table = {};
    for (const { selector, body } of rules) {
      if (!predicate(selector)) continue;
      for (const match of body.matchAll(/(--dsw-[a-z0-9-]+)\s*:\s*([^;]+)/g)) table[match[1]] = match[2].trim();
    }
    return table;
  };

  const light = collect((selector) => selector === 'body' || selector === ':root');
  const dark = collect((selector) => selector.startsWith('body[data-ds-dark-theme]'));

  /**
   * Expand `var(--x)` chains so the figures show colours, not references.
   * Unresolvable references stay as-is; the figure falls back to a neutral cell.
   */
  const resolve = (table) => {
    const out = { ...table };
    for (const name of Object.keys(out)) {
      for (let hop = 0; hop < 4; hop += 1) {
        const ref = /^var\((--dsw-[a-z0-9-]+)\)$/.exec(out[name]);
        if (ref === null) break;
        const next = table[ref[1]];
        if (next === undefined || next === out[name]) break;
        out[name] = next;
      }
    }
    return out;
  };

  return { light: resolve(light), dark: resolve(dark) };
}

/* ------------------------------------------------------------------- dump */

const themes = [];
for (const chip of chipsOf(renderRow())) {
  const id = chip.props['data-dsh-theme-pack-chip'];
  chip.props.onClick();
  const layer = overrides.get('@local/dsh-theme-pack');
  const light = {};
  const dark = {};
  const all = { light: {}, dark: {} };
  for (const [name, pair] of Object.entries(layer ?? {})) {
    all.light[name] = pair.light;
    all.dark[name] = pair.dark;
    if (pair.light.startsWith('#')) light[name] = pair.light;
    if (pair.dark.startsWith('#')) dark[name] = pair.dark;
  }
  themes.push({
    id,
    label: {
      en: dictionaries['theme-pack']?.en?.[`theme.${id}`] ?? id,
      ru: dictionaries['theme-pack']?.ru?.[`theme.${id}`] ?? id
    },
    /* `light`/`dark` keep flat colors only (the preview figure uses them);
       `all` carries every token, transparency included, and is the full record. */
    light,
    dark,
    all,
    tokenCount: Object.keys(all.light).length
  });
}

process.stdout.write(
  JSON.stringify(
    {
      generatedFrom: path.relative(here, CLIENT).replace(/\\/g, '/'),
      stock: stockValues(),
      themes
    },
    null,
    1
  ) + '\n'
);
