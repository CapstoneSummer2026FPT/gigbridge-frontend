import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

// Provide robust browser DOM globals for SSR prerendering environment
if (typeof globalThis.window === 'undefined') {
  const dom = new JSDOM('<!doctype html><html lang="vi"><head></head><body><div id="root"></div></body></html>', {
    url: 'https://gigbridge.id.vn/',
  });

  const noop = () => {};

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.customElements = dom.window.customElements;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.requestAnimationFrame = cb => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = id => clearTimeout(id);

  // MatchMedia
  globalThis.window.matchMedia = globalThis.window.matchMedia || function (query) {
    return {
      matches: false,
      media: String(query),
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    };
  };
  globalThis.matchMedia = globalThis.window.matchMedia;

  // Scroll
  globalThis.window.scrollTo = noop;
  globalThis.window.scroll = noop;
  globalThis.window.scrollBy = noop;
  globalThis.scrollTo = noop;
  globalThis.scroll = noop;
  globalThis.scrollBy = noop;

  // Observers
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.window.IntersectionObserver = globalThis.IntersectionObserver;

  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.window.ResizeObserver = globalThis.ResizeObserver;

  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      writable: true,
      configurable: true,
    });
  } catch {}
}

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
