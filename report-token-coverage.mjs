// Coverage report: which alias tokens does the shell declare, and which of them
// does the theme pack actually override?
//
//   node report-token-coverage.mjs
//
// Anything declared but not overridden keeps the stock palette and shows up as a
// stray colour under a skin — that is the bug this report exists to catch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.join(here, 'client.js');
const DESIGN = path.join(here, 'docs', 'design-platform.css');
const SHELL = path.join(here, 'docs', 'shell.css');

const source = fs.readFileSync(CLIENT, 'utf8');

/* ------------------------------------------------------- boot the client half */

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

const overrides = new Map();
const rows = [];
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
    register: () => () => {},
    bind: () => (key) => key
  }
};
globalThis.__payload.factory((name) => (name === 'react' ? React : undefined)).apply(ctx);

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (node === null || typeof node !== 'object') return;
  visit(node);
  walk(node.children ?? node.props?.children, visit);
}
const row = rows.find((entry) => entry.options.id === 'theme-pack');
const face = row.options.inject();
const chipsOf = () => {
  const found = [];
  walk(React.createElement(row.component, { ...face, t: ctx.locale.bind('theme-pack') }), (node) => {
    if (node.props?.['data-dsh-theme-pack-chip'] !== undefined) found.push(node);
  });
  return found;
};
chipsOf().find((chip) => chip.props['data-dsh-theme-pack-chip'] === 'nord').props.onClick();
const overridden = new Set(Object.keys(overrides.get('@local/dsh-theme-pack') ?? {}));

/* ----------------------------------------------------------- declared tokens */

/** `--dsw-alias-*` names the shell declares somewhere, split by surface. */
function declaredIn(text) {
  const names = new Set([...text.matchAll(/--dsw-alias-[a-z0-9-]+/g)].map((match) => match[0]));
  return names;
}

const design = declaredIn(fs.readFileSync(DESIGN, 'utf8'));
const shell = fs.existsSync(SHELL) ? declaredIn(fs.readFileSync(SHELL, 'utf8')) : new Set();

const missingDesign = [...design].filter((name) => !overridden.has(name)).sort();
const missingShell = [...shell].filter((name) => !overridden.has(name) && !design.has(name)).sort();

console.log(`declared in design-platform.css : ${design.size}`);
console.log(`declared in shell.css           : ${shell.size}`);
console.log(`overridden by the theme pack    : ${overridden.size}`);
console.log('');
console.log(`NOT overridden, declared in the design system (${missingDesign.length}):`);
for (const name of missingDesign) console.log('  ' + name);
console.log('');
console.log(`NOT overridden, only used by the shell bundle (${missingShell.length}):`);
for (const name of missingShell) console.log('  ' + name);
