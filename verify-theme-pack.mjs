// Static smoke test for the theme pack's client bundle.
//
// It executes the real bundle inside a minimal module-loader / DOM / React
// harness and asserts that:
//   * the bundle registers exactly one picker row and nothing in the sidebar foot;
//   * every token a skin overrides is declared by the shipped design system;
//   * every skin maps each token to a light/dark pair, and no two skins collide;
//   * the readability pairs clear their WCAG contrast floors;
//   * `stock` stacks no layer, and picking it removes the layer again.
//
// usage: node verify-theme-pack.mjs [path-to-client.js]
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

const ROOT = packageRoot();
const CLIENT = process.argv[2] ?? path.join(ROOT, 'client.js');
const DESIGN = path.join(ROOT, 'docs', 'design-platform.css');

/* ------------------------------------------------------------------ harness */

class FakeClassList {
  constructor() {
    this.names = new Set();
  }
  add(...values) {
    for (const value of values) this.names.add(value);
  }
  remove(...values) {
    for (const value of values) this.names.delete(value);
  }
  contains(value) {
    return this.names.has(value);
  }
}

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this.textContent = '';
    this.parent = null;
    this.style = {
      setProperty() {},
      removeProperty() {},
      getPropertyValue: () => ''
    };
  }
  append(...nodes) {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
    }
  }
  remove() {
    if (this.parent === null) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return name in this.attributes ? this.attributes[name] : null;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  hasAttribute(name) {
    return name in this.attributes;
  }
}

const allNodes = () => [];
const head = new FakeElement('head');
const body = new FakeElement('body');
head.children = [];
body.children = [];

const documentRef = {
  head,
  body,
  createElement: (tag) => new FakeElement(tag),
  getElementById(id) {
    for (const node of [...head.children, ...body.children]) {
      if (node.attributes.id === id) return node;
    }
    return null;
  }
};
void allNodes;

const storage = new Map();
const windowRef = {
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  }
};

globalThis.window = windowRef;
globalThis.document = documentRef;

/* ------------------------------------------------------------ fake services */

const overrides = new Map();

const service = {
  theme: {
    register() {
      throw new Error('the pack must use overrideTokens, not register()');
    },
    overrideTokens(source, tokens) {
      overrides.set(source, tokens);
      return () => {
        if (overrides.get(source) === tokens) {
          overrides.delete(source);
        }
      };
    }
  },
  slots: {
    entries: [],
    inject(name, callback) {
      service.slots.entries.push({ name, dispose: callback() });
    },
    register(options, component) {
      service.slots.entries.push({ name: options.name, options, component });
      return () => {};
    }
  },
  locale: {
    registered: {},
    register(ns, dictionaries) {
      service.locale.registered[ns] = dictionaries;
      return () => {};
    },
    bind(ns) {
      return (key, params) => {
        const table = service.locale.registered[ns] ?? {};
        const template = table.en?.[key] ?? key;
        return params === undefined
          ? template
          : template.replace(/\{(\w+)\}/g, (_, name) => (name in params ? String(params[name]) : `{${name}}`));
      };
    }
  }
};

const ctx = {
  /** Events the pack subscribes to; the key is captured so the harness can fire them. */
  listeners: {},
  on(name, listener) {
    (ctx.listeners[name] ??= []).push(listener);
    return () => {};
  },
  effect(callback) {
    const dispose = callback();
    return typeof dispose === 'function' ? dispose : () => {};
  },
  ...service
};

/* --------------------------------------------------------------- React stub */

let hooks = { state: [], effects: [], dirty: false };

globalThis.React = {
  createElement(type, elementProps, ...children) {
    if (typeof type === 'function') return type({ ...(elementProps ?? {}), children });
    return { type, props: elementProps ?? {}, children };
  },
  useState(initial) {
    const cell = { value: typeof initial === 'function' ? initial() : initial };
    hooks.state.push(cell);
    return [
      cell.value,
      (next) => {
        const value = typeof next === 'function' ? next(cell.value) : next;
        if (value !== cell.value) {
          cell.value = value;
          hooks.dirty = true;
        }
      }
    ];
  },
  useEffect(effect) {
    hooks.effects.push(effect);
  }
};

/**
 * Render one slot component with real hook state and run its effects.
 * The entry's `inject` face is evaluated first, exactly as the renderer's
 * props pipeline does, and the caller's props win.
 *
 * Effects that call `setState` trigger another render pass, like React: without
 * that second pass a component that syncs its store inside `useEffect` (which is
 * exactly how the row subscribes to the controller) would appear one render
 * behind and look broken.
 *
 * @returns the produced element tree, ready for prop-driven interaction.
 */
function render(component, props, options = {}) {
  for (let pass = 0; pass < 5; pass += 1) {
    hooks = { state: [], effects: [], dirty: false };
    const injected = typeof options.inject === 'function' ? options.inject() : {};
    const tree = globalThis.React.createElement(component, { ...injected, ...props });
    for (const effect of hooks.effects) effect();
    if (!hooks.dirty) return tree;
  }
  throw new Error('render did not settle after 5 passes');
}

/* ------------------------------------------------------------- load bundle */

const failures = [];
const check = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

const source = fs.readFileSync(CLIENT, 'utf8');

/**
 * Evaluate the bundle exactly as the module loader does. `provideRequire`
 * toggles whether the factory receives a working `require("react")`, so both
 * React-resolution paths — the loader builtin and the global fallback — are
 * exercised. A bare free `React` must never work here: reproducing the real
 * client's `ReferenceError: React is not defined` is the whole point.
 */
function loadBundle({ provideRequire }) {
  let payload = null;
  windowRef.__ModuleLoader__ = {
    load(value) {
      payload = value;
    }
  };
  const requireStub = (name) => {
    if (name === 'react') return globalThis.React;
    throw new Error(`unexpected require(${JSON.stringify(name)})`);
  };
  new Function(
    'window',
    'globalThis',
    'require',
    source
  )(windowRef, globalThis, provideRequire ? requireStub : undefined);
  return payload;
}

const loaderPayload = loadBundle({ provideRequire: true });

check(loaderPayload !== null, 'bundle did not call window.__ModuleLoader__.load');
check(loaderPayload?.id === '@local/dsh-theme-pack', `unexpected package id: ${loaderPayload?.id}`);

/** Every registration the plugin's apply() makes must land in the fake services. */
function loadAndApply({ provideRequire }) {
  for (const entry of service.slots.entries) entry.dispose?.();
  service.slots.entries.length = 0;
  overrides.clear();
  for (const key of Object.keys(service.locale.registered)) delete service.locale.registered[key];

  const payload = loadBundle({ provideRequire });
  const plugin = payload.factory(provideRequire ? (name) => globalThis.React : undefined);
  check(Array.isArray(plugin.inject), 'plugin must declare an inject list');
  for (const name of ['theme', 'slots']) {
    check(plugin.inject.includes(name), `plugin must inject "${name}"`);
  }
  /**
   * `locale` must NOT be a hard dependency: the row falls back to its own copy,
   * and a hard inject is one more way for the whole web boot to fail on a
   * service that is only a nicety.
   */
  check(!plugin.inject.includes('locale'), 'the locale service must stay optional');
  plugin.apply(ctx);
  return plugin;
}

/** A row component must render without touching a bare `React`. */
function rendersWithoutBareReact(label, component, injected) {
  try {
    render(component, { ...injected, t: service.locale.bind('theme-pack') }, {});
    return null;
  } catch (error) {
    return `${label} crashed on render: ${error.message}`;
  }
}

const plugin = loadAndApply({ provideRequire: true });
check('theme-pack' in service.locale.registered, 'no theme-pack dictionaries registered');

const row = service.slots.entries.find(
  (entry) => entry.name === 'settings.general.item' && entry.options?.id === 'theme-pack'
);
check(row !== undefined, 'nothing registered into settings.general.item');
check(typeof row?.component === 'function', 'settings.general.item registration carries no component');

/**
 * The picker is the only surface. It must NOT squat the sidebar foot: that
 * button used to sit right above the account row.
 */
check(
  !service.slots.entries.some((entry) => entry.name === 'sidebar.footer.action'),
  'the sidebar-foot cycler must not be registered any more'
);

/* The real client crashed here: prove the row resolves React itself. */
if (row?.component !== undefined) {
  const rowError = rendersWithoutBareReact('ThemeRow', row.component, {
    controller: { get: () => 'stock', isDark: () => false, set() {}, subscribe: () => () => {} }
  });
  if (rowError !== null) check(false, rowError);
}
void plugin;

/**
 * Boot safety: a client entry that throws during activation takes the whole web
 * boot down with it ("N entries did not activate"), which is exactly how this
 * pack once locked the user out of the application. Whatever the surrounding
 * services do — refusing the layer, throwing on registration, or being absent —
 * apply() must return normally and leave a diagnostic behind.
 */
{
  /* A clean preference keeps this pass on the "stock" path, where no layer is
   * installed: the point is the *services* misbehaving, not the skin. */
  storage.clear();

  const hostile = {
    listeners: {},
    on(name, listener) {
      (hostile.listeners[name] ??= []).push(listener);
    },
    effect(callback) {
      return callback();
    },
    theme: {
      overrideTokens() {
        throw new TypeError('theme override "--dsw-alias-bg-base" is not a pair of strings');
      }
    },
    slots: {
      inject() {
        throw new Error('slot "settings.general.item" has no declaration');
      },
      register() {
        throw new Error('unreachable');
      }
    },
    locale: {
      register() {
        throw new Error('locale namespace "theme-pack" already has locale "en"');
      },
      bind() {
        return (key) => key;
      }
    }
  };

  /**
   * One hostile boot. The bundle re-evaluates `__DSH_THEME_PACK__` on every load,
   * so the fresh object is re-read *after* loading and before applying.
   */
  const hostileBoot = (label) => {
    const payload = loadBundle({ provideRequire: true });
    const diagnostics = globalThis.__DSH_THEME_PACK__;
    const hostilePlugin = payload.factory((name) => globalThis.React);
    let crashed = null;
    try {
      hostilePlugin.apply(hostile);
    } catch (error) {
      crashed = error;
    }
    check(crashed === null, `${label}: apply() threw on hostile services: ${crashed?.message}`);
    return diagnostics;
  };

  const stockDiagnostics = hostileBoot('stock');
  for (const needle of ['dictionaries', 'Settings row']) {
    check(
      stockDiagnostics.problems.some((problem) => problem.includes(needle)),
      `stock pass: the diagnostics must name the "${needle}" step, saw: ${stockDiagnostics.problems.join(' | ') || '(none)'}`
    );
  }

  /* The theme service itself must be exercised too: pick a skin, then let the
   * service refuse the layer. */
  storage.set('dsh-theme-pack:active', 'nord');
  const skinDiagnostics = hostileBoot('skinned');
  check(
    skinDiagnostics.problems.some((problem) => problem.includes('overrideTokens')),
    `skinned pass: the diagnostics must name the overrideTokens step, saw: ${skinDiagnostics.problems.join(' | ') || '(none)'}`
  );
  storage.clear();

  check(
    typeof globalThis.__DSH_THEME_PACK__?.version === 'string',
    'the console must be able to read the running version'
  );
  check(
    Array.isArray(globalThis.__DSH_THEME_PACK__?.themeIds) && globalThis.__DSH_THEME_PACK__.themeIds.length > 1,
    'the console must be able to read the theme ids'
  );
}

/* A version marker makes a stale page obvious: `__DSH_THEME_PACK__.version`. */
const packageVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
check(
  globalThis.__DSH_THEME_PACK__?.version === packageVersion,
  `the runtime marker reports ${globalThis.__DSH_THEME_PACK__?.version}, package.json says ${packageVersion}`
);

/* --------------------------------------------------- React resolution paths */

/* The global fallback must work when the loader passes no `require`. */
const fallbackPlugin = loadAndApply({ provideRequire: false });
check(typeof fallbackPlugin.apply === 'function', 'the global-React path did not load the plugin');

/* With neither source available the failure must be explicit, not a bare ReferenceError. */
const stashedReact = globalThis.React;
delete globalThis.React;
let missingReactError;
try {
  loadAndApply({ provideRequire: false });
} catch (error) {
  missingReactError = error;
}
globalThis.React = stashedReact;
check(
  missingReactError !== undefined && /React builtin is unavailable/.test(missingReactError.message),
  `a missing React builtin must fail loudly, got: ${missingReactError?.message ?? 'no error'}`
);

/* The plugin must still be registered and usable after the failure above. */
const finalPlugin = loadAndApply({ provideRequire: true });
check(finalPlugin !== undefined, 'the plugin could not be loaded again after a failed load');

/** Depth-first walk over the stub element tree (children live in props.children). */
function walk(node, visit) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  visit(node);
  walk(node.children ?? node.props?.children, visit);
}
/* -------------------------------------------------------------- theme audit */

/*
 * Known design-system names. Two sources, both optional, so the test runs from a
 * plain checkout as well as next to the extracted stylesheets:
 *   * docs/design-platform.css and docs/shell.css, when present, add every
 *     `--dsw-*` name the shipped shell mentions (the drift detector);
 *   * the pack's own source always lists every name it writes, which is enough
 *     to catch a typo in a token key.
 */
const SHELL_CSS = path.join(ROOT, 'docs', 'shell.css');
const stylesheets = [DESIGN, SHELL_CSS].filter((file) => fs.existsSync(file));
const declared = new Set(
  stylesheets.flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(/--dsw-[a-z0-9-]+/g)].map((m) => m[0]))
);
/* Every `--dsw-*` name the pack's own source mentions: its token map plus the
 * few keys the palette function writes literally. Enough to catch a typo in a
 * token key when the extracted stylesheets are not around. */
for (const match of source.matchAll(/--dsw-[a-z0-9-]+/g)) declared.add(match[0]);

const t = service.locale.bind('theme-pack');
const props = { ctx, t, wide: true };

/** Independent WCAG relative luminance — deliberately not the engine's own math. */
function luminance(text) {
  const hex = String(text).trim().replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex color: ${text}`);
  const linear = [0, 2, 4]
    .map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* Self-test the yardstick before trusting it on 18 themes. */
check(Math.abs(ratio('#ffffff', '#000000') - 21) < 0.01, 'the contrast yardstick is broken (white/black)');
check(Math.abs(ratio('#ffffff', '#ffffff') - 1) < 0.01, 'the contrast yardstick is broken (white/white)');

/** The pairs that decide whether a palette is actually readable. */
const CONTRAST_PAIRS = [
  ['labelPrimary', 'bgBase', 4.5],
  ['labelPrimary', 'bgL1', 4.5],
  ['labelPrimary', 'bgL2', 4.5],
  ['labelPrimary', 'bgL3', 4.5],
  ['labelPrimary', 'codeBlock', 4.5],
  ['labelPrimary', 'toastBg', 4.5],
  ['labelSecondary', 'bgBase', 3],
  ['labelTertiary', 'bgBase', 2],
  ['labelInverted', 'buttonPrimary', 4],
  ['labelInverted', 'brand', 3]
];

/** The contrast floor for a run; tests only ever loosen it. */
const CONTRAST_MIN = Number(process.env.DSH_THEME_MIN_CONTRAST ?? '4.5');

/* ------------------------------------------------ catalogue under test */

/** Ordered chip nodes of a rendered picker row. */
function chipsOf(tree) {
  const nodes = [];
  walk(tree, (node) => {
    if (node.props?.['data-dsh-theme-pack-chip'] !== undefined) nodes.push(node);
  });
  return nodes;
}
const chipId = (node) => node.props['data-dsh-theme-pack-chip'];

const rowProps = { ctx, t };
const pickerRender = () => render(row.component, rowProps, { inject: row.options.inject });

const catalogue = [];
const visited = [];
let picker = pickerRender();
for (let step = 0; step < 64; step += 1) {
  const chip = chipsOf(picker).find((node) => !visited.includes(chipId(node)));
  if (chip === undefined) break;
  const id = chipId(chip);
  visited.push(id);

  /* Click first: the layer under test is the one this pick produces. */
  chip.props.onClick();
  picker = pickerRender();

  if (id === 'stock') {
    check(
      overrides.size === 0,
      `"stock" must leave no override layer, found ${[...overrides.keys()].join(', ')}`
    );
    continue;
  }

  check(overrides.size === 1, `"${id}" must stack exactly one layer, found ${overrides.size}`);
  const layer = overrides.get('@local/dsh-theme-pack');
  check(layer !== undefined, `"${id}" produced no layer under the package id`);
  const names = Object.keys(layer ?? {});
  check(names.length >= 30, `"${id}" overrides only ${names.length} tokens`);

  let identical = 0;
  const schemes = { light: {}, dark: {} };
  for (const [name, pair] of Object.entries(layer ?? {})) {
    check(declared.has(name), `"${id}" overrides an undeclared token: ${name}`);
    check(
      pair !== null && typeof pair.light === 'string' && typeof pair.dark === 'string',
      `"${id}" token ${name} lacks a light/dark pair`
    );
    for (const scheme of ['light', 'dark']) {
      const value = pair?.[scheme];
      if (typeof value !== 'string') continue;
      const solid = value.startsWith('#');
      check(
        solid || /^rgba\(\d+, \d+, \d+, [\d.]+\)$/.test(value),
        `"${id}".${scheme} ${name} is not a flat color: ${value}`
      );
      if (solid) schemes[scheme][name] = value;
    }
    if (pair?.light === pair?.dark) identical += 1;
  }
  check(
    identical <= names.length * 0.1,
    `"${id}" repeats ${identical}/${names.length} token values across palettes`
  );
  catalogue.push({ id, schemes });
}

check(visited[0] === 'stock', `the catalogue must start on stock, got ${visited[0]}`);
check(visited.length >= 15, `only ${visited.length} themes in the catalogue`);

/**
 * A theme that renders an identical palette to another is a copy/paste slip, and a
 * theme whose two schemes are identical collapses the moment the user flips mode.
 */
const signatureOf = (scheme) =>
  Object.entries(scheme)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}:${value}`)
    .join('|');

for (const scheme of ['light', 'dark']) {
  const seen = new Map();
  for (const { id, schemes } of catalogue) {
    const key = signatureOf(schemes[scheme]);
    check(!seen.has(key), `"${id}" renders the same ${scheme} palette as "${seen.get(key)}"`);
    seen.set(key, id);
  }
}
for (const { id, schemes } of catalogue) {
  check(
    signatureOf(schemes.light) !== signatureOf(schemes.dark),
    `"${id}" renders the same palette in both schemes`
  );
}

/* Every theme name must have a dictionary entry, or the picker shows raw keys. */
for (const id of visited) {
  for (const locale of ['en', 'ru']) {
    const table = service.locale.registered['theme-pack']?.[locale] ?? {};
    check(typeof table[`theme.${id}`] === 'string', `no ${locale} name for theme "${id}"`);
  }
}

/* --------------------------------------------------------- contrast report */

/**
 * Short names -> real token names. An explicit table beats a camelCase transform:
 * `bgL1` would otherwise expand to `--dsw-alias-bg-l-1` instead of
 * `--dsw-alias-bg-layer-1`, and every pair would look "missing".
 */
const TOKEN_NAMES = {
  bgBase: '--dsw-alias-bg-base',
  bgL1: '--dsw-alias-bg-layer-1',
  bgL2: '--dsw-alias-bg-layer-2',
  bgL3: '--dsw-alias-bg-layer-3',
  labelPrimary: '--dsw-alias-label-primary',
  labelSecondary: '--dsw-alias-label-secondary',
  labelTertiary: '--dsw-alias-label-tertiary',
  labelInverted: '--dsw-alias-label-primary-foreground',
  brand: '--dsw-alias-brand-primary',
  buttonPrimary: '--dsw-alias-button-primary-fill',
  codeBlock: '--dsw-alias-markdown-code-block',
  toastBg: '--dsw-alias-toast-bg'
};
const TOKEN = (name) => TOKEN_NAMES[name] ?? name;

const worst = [];
for (const { id, schemes } of catalogue) {
  for (const scheme of ['light', 'dark']) {
    const tokens = schemes[scheme];
    for (const [foreground, background, required] of CONTRAST_PAIRS) {
      const left = tokens[TOKEN(foreground)];
      const right = tokens[TOKEN(background)];
      if (left === undefined || right === undefined) {
        check(false, `"${id}".${scheme} palette is missing ${TOKEN(foreground)} or ${TOKEN(background)}`);
        continue;
      }
      let value;
      try {
        value = ratio(left, right);
      } catch (error) {
        check(false, `"${id}".${scheme} ${foreground}/${background}: ${error.message}`);
        continue;
      }
      worst.push({ id, scheme, pair: `${foreground}/${background}`, value, required });
      check(
        value >= Math.min(required, CONTRAST_MIN),
        `"${id}".${scheme} ${foreground} on ${background} is ${value.toFixed(2)}:1, needs ${required}:1`
      );
    }
  }
}
const tightest = [...worst].sort((a, b) => a.value - a.required - (b.value - b.required)).slice(0, 6);

/* ------------------------------------------------------------- picker row */

const rowTree = pickerRender();
check(rowTree?.type === 'div', 'the settings row does not render a container');
const chips = chipsOf(rowTree);
check(
  chips.length === visited.length,
  `the settings row renders ${chips.length} chips for ${visited.length} themes`
);
check(
  chips.map(chipId).join(',') === visited.join(','),
  `unexpected chip order: ${chips.map(chipId).join(',')}`
);
check(
  chips.filter((chip) => chip.props['aria-pressed'] === 'true').length === 1,
  'exactly one chip must be pressed'
);
for (const chip of chips) {
  check(chip.props.onClick !== undefined, 'every chip needs a click handler');
  check(
    typeof chip.props.title === 'string' && chip.props.title.length > 0,
    `chip "${chipId(chip)}" needs a tooltip`
  );
}

/* Picking a chip must stack that skin, mark it pressed and remember it. */
const target = visited[Math.min(3, visited.length - 1)];
const findChip = (tree, id) => chipsOf(tree).find((node) => chipId(node) === id);
findChip(pickerRender(), target).props.onClick();
const afterPick = pickerRender();
check(overrides.size === 1, `picking a chip stacked ${overrides.size} layers, expected 1`);
check(
  findChip(afterPick, target).props['aria-pressed'] === 'true',
  'the picked chip is not marked pressed after re-render'
);
check(
  storage.get('dsh-theme-pack:active') === target,
  `the picker did not persist the choice (storage: ${storage.get('dsh-theme-pack:active')})`
);
/* Going back to stock must remove the layer cleanly. */
findChip(pickerRender(), 'stock').props.onClick();
check(overrides.size === 0, 'picking "stock" left an override layer behind');
check(
  storage.get('dsh-theme-pack:active') === 'stock',
  `"stock" was not persisted (storage: ${storage.get('dsh-theme-pack:active')})`
);

/* ---------------------------------------------------------------- reporting */

if (failures.length > 0) {
  console.error(`theme pack verification FAILED (${failures.length}):`);
  for (const failure of failures) console.error('  - ' + failure);
  process.exit(1);
}

findChip(pickerRender(), target).props.onClick();
const layerSize = Object.keys(overrides.get('@local/dsh-theme-pack') ?? {}).length;

console.log('theme pack verification passed');
console.log(`  surfaces:  settings.general.item (the sidebar footer is deliberately unused)`);
console.log(`  themes:    ${visited.length} — ${visited.join(', ')}`);
console.log(`  tokens:    ${layerSize} alias tokens per skin, all checked against the design system`);
console.log(`  contrast:  ${worst.length} pairs measured, floor ${CONTRAST_MIN}:1`);
for (const entry of tightest) {
  console.log(
    `             ${entry.value.toFixed(2)}:1  ${entry.id}/${entry.scheme} ${entry.pair} (needs ${entry.required})`
  );
}
console.log(`  declared:  ${declared.size} --dsw-* names in the base design system`);
console.log('');
console.log('the stderr block above is deliberate: it is the boot-safety pass driving the');
console.log('plugin against services that throw, and the plugin reporting instead of dying.');
