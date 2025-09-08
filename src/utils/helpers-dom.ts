import { Unpromise } from '@watchable/unpromise';

const TIMEOUT_ERROR = 'SELECTTREE-TIMEOUT';

export async function await_element(el: any, hard = false) {
  if (el.localName?.includes('-')) await customElements.whenDefined(el.localName);
  if (el.updateComplete) await el.updateComplete;
  if (hard) {
    if (el.pageRendered) await el.pageRendered;
    if (el._panelState) {
      let rounds = 0;
      while (el._panelState !== 'loaded' && rounds++ < 5) await new Promise((r) => setTimeout(r, 100));
    }
  }
}

async function _selectTree(root: any, path: any, all = false) {
  let el = [root];
  if (typeof path === 'string') {
    path = path.split(/(\$| )/);
  }
  while (path[path.length - 1] === '') path.pop();
  for (const [, p] of path.entries()) {
    const e = el[0];
    if (!e) return null;

    if (!p.trim().length) continue;

    await_element(e);
    el = p === '$' ? [e.shadowRoot] : e.querySelectorAll(p);
  }
  return all ? el : el[0];
}

export async function selectTree(root: any, path: any, all = false, timeout = 10000) {
  return Unpromise.race([
    _selectTree(root, path, all),
    new Promise((_, reject) => setTimeout(() => reject(new Error(TIMEOUT_ERROR)), timeout)),
  ]).catch((err) => {
    if (!err.message || err.message !== TIMEOUT_ERROR) throw err;
    return null;
  });
}

export const stopPropagation = (ev) => ev.stopPropagation();
export const preventDefault = (ev) => ev.preventDefault();
export const stopAndPrevent = (ev) => {
  ev.stopPropagation();
  ev.preventDefault();
};
