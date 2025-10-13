import Debug from 'debug/src/browser.js';

const CARD_DEBUG = 'card';
const EDITOR_DEBUG = 'editor';
const UTIL_DEBUG = 'util';

export const debug = Debug(CARD_DEBUG);
export const editorDebug = Debug(EDITOR_DEBUG);
export const utilDebug = Debug(UTIL_DEBUG);
