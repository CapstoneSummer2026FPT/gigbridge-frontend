import type { IncomingMessage, ServerResponse } from 'node:http';

interface SeoServerModule {
  readonly renderSitemapXml: () => Promise<{
    readonly status: number;
    readonly xml: string;
  }>;
}

const SEO_SERVER_MODULE_PATH = '../.seo-build/server.js';

const loadSeoServer = async (): Promise<SeoServerModule> =>
  import(SEO_SERVER_MODULE_PATH) as Promise<SeoServerModule>;

export default async function handler(_request: IncomingMessage, response: ServerResponse): Promise<void> {
  const { renderSitemapXml } = await loadSeoServer();
  const result = await renderSitemapXml();
  response.statusCode = result.status;
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  response.end(result.xml);
}
