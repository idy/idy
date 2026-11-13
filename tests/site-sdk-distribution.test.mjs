import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(join(root, 'packages/site-sdk/package.json'), 'utf8'));
const distribution = join(root, 'docs/sdk', pkg.version);

test('SDK output is identical when invoked from the npm workspace prepack directory', () => {
  execFileSync(process.execPath, [join(root, 'scripts/build-site-sdk.mjs'), '--check'], {
    cwd: join(root, 'packages/site-sdk'), stdio: 'pipe',
  });
});

test('published ESM entry can be imported without a DOM and provides the typed API', async () => {
  const api = await import(`../docs/sdk/${pkg.version}/idy-site.js`);
  for (const name of ['initSite', 'enhance', 'createHeader', 'createFooter', 'setTheme', 'setLanguage', 'loadRelease', 'asset']) {
    assert.equal(typeof api[name], 'function', name);
  }
  assert.throws(() => api.initSite(), /browser document/);
});

test('CSS distribution includes every referenced font and its license', async () => {
  const css = await readFile(join(distribution, 'idy-site.css'), 'utf8');
  const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match => match[1]);
  assert.ok(urls.length === 2);
  for (const url of urls) {
    assert.ok(url.startsWith('./assets/'));
    assert.ok((await stat(resolve(distribution, url))).size > 0);
  }
  for (const license of ['Archivo-OFL.txt', 'Phosphor-MIT.txt']) {
    assert.ok((await stat(join(distribution, 'assets', license))).size > 0);
  }
});

test('package entrypoints and CDN defaults match self-contained distribution files', async () => {
  const targets = [pkg.main, pkg.module, pkg.types, pkg.unpkg, pkg.jsdelivr, pkg.exports['./style.css'], pkg.exports['./browser']];
  for (const target of targets) {
    assert.ok(target.startsWith('./dist/'));
    assert.ok((await stat(join(distribution, target.slice('./dist/'.length)))).size > 0);
  }
  const version = JSON.parse(await readFile(join(distribution, 'version.json'), 'utf8'));
  assert.deepEqual(version, { name: pkg.name, version: pkg.version });
});

test('all site pages resolve local scripts and styles, including nested 404 assets', async () => {
  for (const file of ['index.html', '404.html', 'sdk/index.html']) {
    const page = new JSDOM(await readFile(join(root, 'docs', file), 'utf8'), { url: `https://idy.dev/${file}` });
    const document = page.window.document;
    for (const node of document.querySelectorAll('script[src], link[rel="stylesheet"]')) {
      const url = new URL(node.src || node.href);
      assert.equal(url.origin, 'https://idy.dev');
      assert.ok((await stat(join(root, 'docs', decodeURIComponent(url.pathname)))).size > 0, `${file}: ${url.pathname}`);
    }
    assert.equal(document.querySelectorAll(`script[src$="${pkg.version}/idy-site.min.js"]`).length, 1);
    page.window.close();
  }
});

test('directory stays usable without JavaScript and retains real release destinations', async () => {
  const page = new JSDOM(await readFile(join(root, 'docs/index.html'), 'utf8'));
  const document = page.window.document;
  assert.equal(document.querySelectorAll('tr.project').length, 13);
  assert.equal(document.querySelectorAll('.project[data-repository]').length, 13);
  for (const project of document.querySelectorAll('.project[data-repository]')) {
    assert.equal(project.querySelector('[data-release-link]').getAttribute('href'), `https://github.com/${project.dataset.repository}/releases`);
  }
  const iconSources = JSON.parse(await readFile(join(root, 'docs/project-icons/sources.json'), 'utf8'));
  assert.equal(document.querySelectorAll('.project-icon').length, iconSources.assets.length);
  for (const source of iconSources.assets) {
    const icon = document.querySelector(`[data-repository="${source.repository}"] h2 a img`);
    assert.equal(icon.getAttribute('src'), `project-icons/${source.file}`);
    assert.equal(icon.alt, '');
    assert.equal(icon.width, 28);
    assert.equal(icon.height, 28);
    assert.ok((await stat(join(root, 'docs', icon.getAttribute('src')))).size > 0);
    assert.ok((await stat(join(root, 'docs/project-icons', source.license.localFile))).size > 0);
  }
  for (const source of iconSources.withoutConfirmedIcon) {
    assert.equal(document.querySelector(`[data-repository="${source.repository}"] img`), null);
  }
  const yesman = document.querySelector('[data-repository="idy/yesman"]');
  assert.equal(yesman.querySelector('h2').textContent.trim(), 'yesman');
  assert.match(yesman.querySelector('.project-description').textContent, /early-prototype Go\/MyGo/);
  assert.ok(yesman.querySelector('a[href="https://github.com/idy/yesman/releases/latest"]'));
  assert.equal(document.querySelectorAll('[data-idy-copy][hidden]').length, 4);
  assert.equal(document.querySelectorAll('.homebrew-command').length, 4);
  assert.ok(document.querySelector('nav a[href="https://github.com/idy"]'));
  page.window.close();
});
