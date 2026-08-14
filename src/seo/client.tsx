import { hydrateRoot } from 'react-dom/client';
import { SeoPublicApp } from './SeoPublicApp';
import type { SeoRouteState } from './types';

const root = document.getElementById('seo-root');
const stateElement = document.getElementById('seo-state');

if (root && stateElement?.textContent) {
  const state = JSON.parse(stateElement.textContent) as SeoRouteState;
  hydrateRoot(root, <SeoPublicApp state={state} />);
}
