import {readFile, writeFile, mkdir, rm, copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {publicAssets} from '../src/public-assets.js';
import {validateServerURL} from '../src/platform.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
const devHTTP = process.env.CYPER_DEV_HTTP === '1';
const defaultURL = validateServerURL(process.env.CYPER_SERVER_URL || '', devHTTP);
await rm(dist, {recursive: true, force: true});
await mkdir(dist, {recursive: true});
for (const asset of publicAssets) {
  if (asset === '/sw.js' || asset === '/src/app.js') continue;
  const target = path.join(dist, asset);
  await mkdir(path.dirname(target), {recursive: true});
  await copyFile(path.join(root, asset), target);
}
await build({entryPoints: [path.join(root, 'src/native-entry.js')], outfile: path.join(dist, 'src/app.js'),
  bundle: true, format: 'esm', target: ['chrome109', 'safari15.4'], minify: true,
  define: {__CYPER_SERVER_URL__: JSON.stringify(defaultURL), __CYPER_DEV_HTTP__: String(devHTTP)}});
const html = (await readFile(path.join(dist, 'index.html'), 'utf8')).replace(/\s*<link rel="manifest"[^>]*>/, '');
await writeFile(path.join(dist, 'index.html'), html);
console.log(`Mobile UI built. Default server: ${defaultURL || 'not configured (guest mode)'}; local HTTP: ${devHTTP ? 'development only' : 'disabled'}.`);
