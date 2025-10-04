import memoizeOne from 'memoize-one';

import { fetchResources, HomeAssistant, deleteResource } from '../ha';
import { loadModule } from './loader_resources';

const CARD_NAME = 'VSC';
const EXTRA_MAP_CARD_BASE = 'https://cdn.jsdelivr.net/npm/extra-map-card@';
const EXTRA_MAP_NAME = 'extra-map-card';
const EXTRA_MAP_BUNDLE_NAME = 'extra-map-card-bundle';
const EXTRA_MAP_BUNDLE_PATH = `/dist/${EXTRA_MAP_BUNDLE_NAME}.js`;

const EXTRA_VERSION_REG = /\bextra-map-card@([\d.]+).*\bextra-map-card-bundle.js$/;

export async function hass_base_el() {
  await Promise.race([customElements.whenDefined('home-assistant'), customElements.whenDefined('hc-main')]);

  const element = customElements.get('home-assistant') ? 'home-assistant' : 'hc-main';

  while (!document.querySelector(element)) await new Promise((r) => window.setTimeout(r, 100));
  return document.querySelector(element);
}

export async function _getHass() {
  const base: any = await hass_base_el();
  while (!base.hass) await new Promise((r) => window.setTimeout(r, 100));
  return base.hass;
}

async function getLatestNpmVersion(): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${EXTRA_MAP_NAME}`);
    if (!res.ok) throw new Error('Package not found');
    const data = await res.json();
    return data['dist-tags']?.latest || null;
  } catch (error) {
    console.error('Failed to fetch version:', error);
    return null;
  }
}

const memoizedGetLatestNpmVersion = memoizeOne(getLatestNpmVersion);

declare global {
  interface Window {
    __extraMapCardLoadPromise?: Promise<void>;
  }
}

export const loadAndCleanExtraMap = async (): Promise<void> => {
  console.debug(`${CARD_NAME}: Checking Extra Map Card...`);
  if (window.__extraMapCardLoadPromise) return window.__extraMapCardLoadPromise;

  window.__extraMapCardLoadPromise = (async () => {
    const latestVersion = await memoizedGetLatestNpmVersion();
    if (!latestVersion) {
      console.warn(`${CARD_NAME}: Unable to fetch latest version of ${EXTRA_MAP_NAME}. Skipping loading.`);
      return;
    }

    const latestUrl = `${EXTRA_MAP_CARD_BASE}${latestVersion}${EXTRA_MAP_BUNDLE_PATH}`;
    const loadedScripts = Array.from(document.scripts);

    const exactScript = loadedScripts.find((s) => s.src === latestUrl);
    const existingScript = loadedScripts.find((s) => EXTRA_VERSION_REG.test(s.src));

    if (!exactScript) {
      if (existingScript) {
        console.log(`${CARD_NAME}:🧹 Removing outdated script: ${existingScript.src}`);
        existingScript.remove();
      }
      console.log(`${CARD_NAME}: ℹ️ Loading Extra Map Card with version ${latestVersion}`);
      await loadModule(latestUrl);
      // console.log(`${CARD_NAME}: ✅ Extra Map Card loaded successfully`);
    } else {
      // If the exact script is already loaded, we can skip loading
    }

    // Remove outdated resources
    try {
      const _hass = (await _getHass()) as HomeAssistant;
      const currentResources = await fetchResources(_hass.connection);
      const emcResources = currentResources.filter((res) => res.url.includes(EXTRA_MAP_NAME)).map((res) => res.id);

      if (emcResources.length) {
        console.log(`${CARD_NAME}: 🧹 Removing Extra Map Card resources: ${emcResources.join(', ')}`);
        await Promise.all(emcResources.map((id) => deleteResource(_hass, id)));
        console.log(`${CARD_NAME}: ✅ Resources removed`);
      }
    } catch (err) {
      console.error(`${CARD_NAME}: ❌ Failed to remove Extra Map Card resources`, err);
    }
  })();

  return window.__extraMapCardLoadPromise;
};
