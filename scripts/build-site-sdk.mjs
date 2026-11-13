import { build } from 'esbuild';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgRoot = join(root, 'packages/site-sdk');
const pkg = JSON.parse(await readFile(join(pkgRoot, 'package.json'), 'utf8'));
const temporary = await mkdtemp(join(tmpdir(), 'idy-sdk-build-'));
const output = join(temporary, 'dist');
const published = join(root, 'docs/sdk', pkg.version);
const check = process.argv.includes('--check');

async function files(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(join(directory, entry.name), path));
    else result.push(path);
  }
  return result.sort();
}

try {
  await mkdir(output, { recursive: true });
  const shared = { absWorkingDir: root, bundle: true, target: ['es2020'], legalComments: 'eof', logLevel: 'warning' };
  await Promise.all([
    build({ ...shared, entryPoints: [join(pkgRoot, 'src/index.js')], outfile: join(output, 'idy-site.js'), format: 'esm' }),
    build({ ...shared, entryPoints: [join(pkgRoot, 'src/browser.js')], outfile: join(output, 'idy-site.min.js'), format: 'iife', globalName: 'IdySiteSDK', minify: true }),
    build({ ...shared, entryPoints: [join(pkgRoot, 'src/style.css')], outfile: join(output, 'idy-site.css'), loader: { '.woff2': 'file' }, assetNames: 'assets/[name]' }),
  ]);
  await cp(join(pkgRoot, 'src/index.d.ts'), join(output, 'index.d.ts'));
  await mkdir(join(output, 'assets'), { recursive: true });
  await cp(join(root, 'docs/fonts/Archivo-OFL.txt'), join(output, 'assets/Archivo-OFL.txt'));
  await cp(join(root, 'docs/shared/Phosphor-MIT.txt'), join(output, 'assets/Phosphor-MIT.txt'));
  await writeFile(join(output, 'version.json'), JSON.stringify({ name: pkg.name, version: pkg.version }, null, 2) + '\n');
  if (check) {
    const expected = await files(output);
    const actual = await files(published).catch(() => []);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('SDK file list is stale. Run npm run build.');
    for (const path of expected) {
      if (!(await readFile(join(output, path))).equals(await readFile(join(published, path)))) {
        throw new Error(`SDK artifact is stale: ${path}. Run npm run build.`);
      }
    }
    console.log(`Verified committed SDK ${pkg.version}.`);
  } else {
    // Replace only this version's generated trees, never historical versions.
    for (const destination of [join(pkgRoot, 'dist'), published]) {
      await rm(destination, { recursive: true, force: true });
      await cp(output, destination, { recursive: true });
    }
    console.log(`Built ${pkg.name}@${pkg.version}: npm dist and docs/sdk/${pkg.version}/`);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
