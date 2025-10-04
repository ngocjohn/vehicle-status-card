import memoizeOne from 'memoize-one';

import { version, repository } from '../../package.json';
import { compareVersionNumbers } from './compare-version';
// import { _getHass } from './loader_extra_map';

const CARD_API_URL = `https://api.github.com/repos/${repository.repo}/releases/latest`;

async function getLatestCardVersion(): Promise<string | null> {
  try {
    const res = await fetch(CARD_API_URL);
    if (!res.ok) throw new Error('Failed to fetch latest release');
    const data = await res.json();
    return data.tag_name || null;
  } catch (error) {
    console.error('Failed to fetch latest card version:', error);
    return null;
  }
}

const memoizedGetLatestCardVersion = memoizeOne(getLatestCardVersion);

declare global {
  interface Window {
    __vscLoadPromise?: Promise<void>;
  }
}

export const checkCardLatest = async (): Promise<void> => {
  console.debug(`VSC: Checking Card Latest Version...`);
  if (window.__vscLoadPromise) return window.__vscLoadPromise;
  window.__vscLoadPromise = (async () => {
    const latestVersion = await memoizedGetLatestCardVersion();
    if (!latestVersion) {
      console.warn('VSC: Unable to fetch latest version. Skipping loading.');
      return;
    }
    if (compareVersionNumbers(latestVersion.slice(1), version) > 0) {
      console.info(
        `VSC: A new version is available: ${latestVersion}. You are using version ${version}. Please consider updating.`
      );
    } else {
      console.info(`VSC: You are using the latest version: ${version}.`);
    }
  })();
  return window.__vscLoadPromise;
};
