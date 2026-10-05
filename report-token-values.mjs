// Prints the stock value of every alias token the pack does not override, plus
// how many times the shipped shell bundle consumes each one.
//
//   node report-token-values.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DESIGN = path.join(here, 'docs', 'design-platform.css');
const SHELL = path.join(here, 'docs', 'shell.css');

const design = fs.readFileSync(DESIGN, 'utf8');
const shell = fs.existsSync(SHELL) ? fs.readFileSync(SHELL, 'utf8') : '';

/* Read the pack's own override list out of client.js. */
const client = fs.readFileSync(path.join(here, 'client.js'), 'utf8');
const tokenBlock = client.slice(client.search(/const T = \{\s+bgBase:/), client.indexOf('};', client.search(/const T = \{\s+bgBase:/)));
const overridden = new Set([...tokenBlock.matchAll(/"(--dsw-[a-z0-9-]+)"/g)].map((match) => match[1]));
/* The palette function writes a few keys literally; they count as overridden too. */
for (const match of client.matchAll(/\[?"(--dsw-[a-z0-9-]+)"\]?\s*:/g)) overridden.add(match[1]);

/**
 * Split a stylesheet into `selector -> declarations` pairs, tracking brace depth
 * so nested at-rules don't swallow the rules inside them.
 */
function rules(css) {
  const found = [];
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
    const body = css.slice(open + 1, cursor - 1);
    found.push({ selector, body });
    index = cursor;
  }
  return found;
}

/** name -> value, for the rules whose selector matches. */
function tableFor(cssRules, predicate) {
  const table = {};
  for (const { selector, body } of cssRules) {
    if (!predicate(selector)) continue;
    for (const match of body.matchAll(/(--dsw-[a-z0-9-]+)\s*:\s*([^;]+)/g)) table[match[1]] = match[2].trim();
  }
  return table;
}

const parsed = rules(design);
const light = tableFor(parsed, (selector) => selector === 'body' || selector === ':root');
const dark = tableFor(parsed, (selector) => selector.startsWith('body[data-ds-dark-theme]'));

const declared = new Set([...design.matchAll(/--dsw-alias-[a-z0-9-]+/g)].map((match) => match[0]));
const missing = [...declared].filter((name) => !overridden.has(name)).sort();

console.log(`${declared.size} declared, ${overridden.size} overridden, ${missing.length} uncovered\n`);
console.log('token'.padEnd(46) + '| light'.padEnd(34) + '| dark');
console.log('-'.repeat(46) + '+' + '-'.repeat(34) + '+' + '-'.repeat(30));
for (const name of missing) {
  const uses = (shell.match(new RegExp(`var\\(${name}\\)`, 'g')) ?? []).length;
  const flag = uses > 0 ? ` x${uses}` : '';
  console.log(
    name.padEnd(46) + '| ' + (light[name] ?? '—').slice(0, 32).padEnd(33) + '| ' + (dark[name] ?? '—').slice(0, 28) + flag
  );
}
