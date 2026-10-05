// Print the switch appearance (and the old values) per theme and scheme, so a
// report can quote numbers instead of adjectives.
//
// Usage: node report-switch.mjs [themeId ...]
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const client = path.join(here, "client.js");

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
globalThis.__payload.factory((name) => (name === "react" ? globalThis.React : undefined));

const marker = globalThis.__DSH_THEME_PACK__;
const wanted = process.argv.slice(2);
const ids = wanted.length > 0 ? wanted : ["contrast", "nord", "gruvbox", "lavender", "paper"];

const parse = (hex) => {
	const t = hex.replace("#", "");
	return [0, 2, 4].map((i) => Number.parseInt(t.slice(i, i + 2), 16));
};
const lum = (hex) => {
	const [r, g, b] = parse(hex)
		.map((v) => v / 255)
		.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
	const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};
const over = (rgba, base) => {
	const m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(rgba);
	if (m === null) return rgba;
	const a = Number(m[4]);
	const under = parse(base);
	const out = [1, 2, 3].map((i) => Number(m[i]) * a + under[i - 1] * (1 - a));
	return "#" + out.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
};

for (const id of ids) {
	const atoms = marker.atoms(id);
	if (atoms?.dark === undefined) continue;
	/* The switch tokens are assembled by tokensOf: palette() plus structure(). */
	const pairs = marker.tokensOf(atoms);
	console.log(`\n${id}`);
	for (const scheme of ["light", "dark"]) {
		const a = atoms[scheme];
		const t = Object.fromEntries(Object.entries(pairs).map(([name, pair]) => [name, pair[scheme]]));
		const canvas = t["--dsw-alias-bg-base"];
		const off = over(t["--dsh-theme-pack-switch-off"], canvas);
		const thumb = t["--dsw-alias-switch-thumb"];
		const brand = t["--dsw-alias-brand-primary"];
		console.log(`  ${scheme.padEnd(5)} canvas ${canvas}  brand ${brand}`);
		console.log(`        off track ${off}   thumb ${thumb}`);
		console.log(
			`        thumb/off ${ratio(thumb, off).toFixed(2)}:1   thumb/on ${ratio(thumb, brand).toFixed(2)}:1   track/canvas ${ratio(off, canvas).toFixed(2)}:1`
		);
	}
}
