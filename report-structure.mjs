// Show the derived structural values for a theme, so a report can quote numbers
// instead of adjectives.
//
// Usage: node report-structure.mjs [themeId ...]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const client = path.join(here, "client.js");

/* The bundle is built for a browser realm: `window.__ModuleLoader__` is the
 * registration queue, and `globalThis` is where it publishes. Bind both to this
 * realm so the same source runs unmodified. */
globalThis.__ModuleLoader__ = { load: (payload) => (globalThis.__payload = payload) };
globalThis.React = { createElement: () => ({}), useState: (v) => [v, () => {}], useEffect: () => {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = { body: { hasAttribute: () => false }, createElement: () => ({ remove() {} }), head: { append() {} } };
globalThis.window = globalThis;
new Function("window", "globalThis", "require", readFileSync(client, "utf8"))(
	globalThis,
	globalThis,
	(name) => (name === "react" ? globalThis.React : undefined)
);

/* `load()` only queues the factory; the module body runs at materialization. */
globalThis.__payload.factory((name) => (name === "react" ? globalThis.React : undefined));

const marker = globalThis.__DSH_THEME_PACK__;
if (marker === undefined) {
	console.error("the bundle did not publish __DSH_THEME_PACK__");
	process.exit(2);
}
const wanted = process.argv.slice(2);
const ids = wanted.length > 0 ? wanted : marker.themeIds.filter((id) => id !== "stock").slice(0, 4);

const surfaces = [
	"--dsw-specific-sidebar-nav-item-active",
	"--dsw-specific-sidebar-nav-item-hover",
	"--dsw-specific-sidebar-nav-item-active-accent",
	"--dsw-static-neutral-bluish-750",
	"--dsw-static-neutral-bluish-850",
	"--dsw-static-neutral-bluish-100",
	"--dsw-menu-surface-fill",
	"--dsw-hovercard-bg"
];

for (const id of ids) {
	const atoms = marker.atoms(id);
	if (atoms?.dark === undefined) {
		console.log(`${id}: no atoms`);
		continue;
	}
	console.log(`\n${id}`);
	for (const scheme of ["light", "dark"]) {
		const tokens = marker.structure(atoms[scheme]);
		console.log(`  ${scheme.padEnd(5)} canvas ${atoms[scheme].canvas}  ink ${atoms[scheme].ink}`);
		for (const name of surfaces) console.log(`        ${name.replace("--dsw-", "").padEnd(48)} ${tokens[name]}`);
	}
}
