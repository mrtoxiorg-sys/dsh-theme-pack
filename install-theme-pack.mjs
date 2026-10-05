// Installs the theme pack into the DSH Desktop profile.
//
//   node install-theme-pack.mjs              # install / repair
//   node install-theme-pack.mjs --uninstall  # remove
//   node install-theme-pack.mjs --check      # report state, change nothing
//
// Run it with the bundled Node:
//   C:\Users\Toxi\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe
//
// It mirrors the package into <profile>/node_modules/@local, registers it as a
// profile bundle, and verifies the client bundle parses. Nothing is bundled or
// transpiled: client.js is plain JavaScript that the loader evaluates as-is.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/**
 * The package lives in `./dsh-theme-pack` when this script sits beside the
 * source tree, and *is* this directory when it is run from the package itself
 * (the GitHub-clone layout). Support both.
 */
const SOURCE = fs.existsSync(path.join(here, 'dsh-theme-pack', 'client.js'))
  ? path.join(here, 'dsh-theme-pack')
  : here;
const VERIFY = path.join(SOURCE, 'verify-theme-pack.mjs');

const PROFILE = process.env.DSH_PROFILE_DIR ?? 'C:\\Users\\Toxi\\.dsh\\profiles\\desktop';
const PKG = '@local/dsh-theme-pack';
const TARGET = path.join(PROFILE, 'node_modules', '@local', 'dsh-theme-pack');
const MANIFEST = path.join(PROFILE, 'package.json');
const BACKUP = path.join(PROFILE, 'package.json.dsh-theme-pack.orig');

const uninstall = process.argv.includes('--uninstall');
const checkOnly = process.argv.includes('--check');

/* ------------------------------------------------------------ verify first */

if (!uninstall && !checkOnly) {
  const check = spawnSync(process.execPath, [VERIFY, path.join(SOURCE, 'client.js')], { stdio: 'inherit' });
  if (check.status !== 0) {
    console.error('verification failed; nothing was installed.');
    process.exit(1);
  }
}

/* -------------------------------------------------------------- read state */

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
manifest.dsh ??= {};
manifest.dsh.profile ??= {};
manifest.dependencies ??= {};
const bundles = Array.isArray(manifest.dsh.profile.bundles) ? manifest.dsh.profile.bundles : [];

const installedVersion = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(TARGET, 'package.json'), 'utf8')).version;
  } catch {
    return undefined;
  }
})();
const sourceVersion = JSON.parse(fs.readFileSync(path.join(SOURCE, 'package.json'), 'utf8')).version;

if (checkOnly) {
  console.log('profile        : ' + PROFILE);
  console.log('source version : ' + sourceVersion);
  console.log('installed      : ' + (installedVersion ?? '(absent)'));
  console.log('registered     : ' + (bundles.includes(PKG) ? 'yes' : 'no'));
  console.log('dependency     : ' + (manifest.dependencies[PKG] ?? '(absent)'));
  console.log('up to date     : ' + String(installedVersion === sourceVersion));
  process.exit(installedVersion === sourceVersion && bundles.includes(PKG) ? 0 : 1);
}

/* -------------------------------------------------------------- mirror pkg */

if (!uninstall && !fs.existsSync(BACKUP)) fs.copyFileSync(MANIFEST, BACKUP);

if (uninstall) {
  manifest.dsh.profile.bundles = bundles.filter((name) => name !== PKG);
  delete manifest.dependencies[PKG];
  fs.rmSync(TARGET, { recursive: true, force: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`uninstalled ${PKG} from ${PROFILE}`);
  process.exit(0);
}

fs.rmSync(TARGET, { recursive: true, force: true });
fs.mkdirSync(TARGET, { recursive: true });
for (const entry of fs.readdirSync(SOURCE)) {
  fs.cpSync(path.join(SOURCE, entry), path.join(TARGET, entry), { recursive: true });
}

manifest.dependencies[PKG] = 'file:' + SOURCE.split(path.sep).join('/');
if (!bundles.includes(PKG)) bundles.push(PKG);
manifest.dsh.profile.bundles = bundles;
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

/* ------------------------------------------------------------------ report */

console.log('');
console.log('installed:');
console.log('  version : ' + sourceVersion + (installedVersion === sourceVersion ? '' : ` (was ${installedVersion ?? 'absent'})`));
console.log('  package : ' + TARGET);
console.log('  manifest: ' + MANIFEST + '  (backup: ' + path.basename(BACKUP) + ')');
console.log('  bundles : ' + bundles.join(', '));
console.log('');
console.log('Restart DSH Desktop ONLY if this is the first install into the profile:');
console.log('the bundle list is read at Host startup. After that, client-plug-in HMR');
console.log('picks up a reinstall of this package live, with no restart and no reload.');
console.log('');
console.log('Where the picker is:');
console.log('  Settings -> General -> "Theme": one swatch per skin, "Stock" resets.');
console.log('  No sidebar button: this build hides the sidebar foot while wide.');
console.log('');
console.log('If the app ever refuses to boot again, the diagnostics are one line away:');
console.log('  window.__DSH_THEME_PACK__   ->  { version, themeIds, problems: [] }');
console.log('');
console.log('Published copy: https://github.com/mrtoxiorg-sys/dsh-theme-pack');
