import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = resolve(projectRoot, 'dist');
const serverBuildDirectory = resolve(projectRoot, '.seo-build');
const template = await readFile(resolve(distDirectory, 'index.html'), 'utf8');
const serverModule = await import(pathToFileURL(resolve(serverBuildDirectory, 'server.js')).href);
const routes = ['/', '/about', '/careers', '/faq', '/guide', '/press-kit', '/terms', '/privacy'];

await writeFile(resolve(distDirectory, 'spa.html'), template, 'utf8');

for (const route of routes) {
  const outputPath = route === '/'
    ? resolve(distDirectory, 'index.html')
    : resolve(distDirectory, route.slice(1), 'index.html');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serverModule.prerenderMarketingDocument(route, template), 'utf8');
}
