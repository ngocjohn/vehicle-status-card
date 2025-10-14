import Debug from 'debug/src/browser.js';

type LOG = 'card' | 'editor' | 'util';

export default function createDebug(namespace: LOG, suffix?: string) {
  return Debug(namespace + (suffix ? `:${suffix}` : ''));
}
