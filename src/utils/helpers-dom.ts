import { Unpromise } from '@watchable/unpromise';

import { ELEMENT } from '../editor/editor-const';
import { fireEvent, HomeAssistant } from '../ha';
import { HaPictureUpload } from '../ha/dialogs/elements';

const TIMEOUT_ERROR = 'SELECTTREE-TIMEOUT';

declare global {
  interface HASSDomEvents {
    'hass-enable-shortcuts': HomeAssistant['enableShortcuts'];
  }
}

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

/**
 * Find the closest matching element in a chain of nested, slotted custom elements.
 *
 * @param selector selector used to find the element; values are case-sensitive.
 * @param base element to start searching from; specify `this` to start searching from the current element.
 * @returns a matching element if found; otherwise, null.
 *
 * examples:
 * - find element by it's `id=` value:
 *   const container = this.closestElement('#spcPlayer', this);
 * - find element by it's html tag name (e.g. `<spc-player>`):
 *   const container = this.closestElement('spc-player', this);
 */
export function closestElement(selector: string, base: Element) {
  function __closestFrom(el: Element | Window | Document | null): Element | null {
    if (!el || el === document || el === window) return null;
    if ((el as Slottable).assignedSlot) el = (el as Slottable).assignedSlot;

    const found = (el as Element).closest(selector);
    return found ? found : __closestFrom(((el as Element).getRootNode() as ShadowRoot).host);
  }
  return __closestFrom(base);
}

export function isCardInEditPreview(cardElement: Element) {
  // get parent element data.
  if (cardElement) {
    // check for "<hui-card>" tag reference;
    const cardHuiObj = closestElement('hui-card', cardElement) as Element;
    if (cardHuiObj) {
      // console.log(
      //   'isCardInEditPreview - closestElement found "<hui-card>" tag; checking for ".element-preview" class parent'
      // );

      // check for "element-preview" class reference;
      // if found, then the card is being edited.
      const cardPreviewObj = closestElement('.element-preview', cardHuiObj) as Element;
      if (cardPreviewObj) {
        // console.log('isCardInEditPreview - closestElement found ".element-preview" class; card is in edit mode');
        return true;
      } else {
        // console.log(
        //   'isCardInEditPreview - closestElement did NOT find ".element-preview" class; card is NOT in edit mode'
        // );
        return false;
      }
    } else {
      return false;
    }
  } else {
    // console.log('isCardInEditPreview - cardElement object not supplied; card is NOT in edit mode');
    return false;
  }
}

export const getHaPictureUpload = async (): Promise<HaPictureUpload> => {
  console.debug('getHaPictureUpload called');
  try {
    if (customElements.get(ELEMENT.HA_PICTURE_UPLOAD)) {
      const haPictureUpload = document.createElement(ELEMENT.HA_PICTURE_UPLOAD) as HaPictureUpload;
      return haPictureUpload;
    }
    // @ts-ignore
    const haPictureUpload = document.createElement(ELEMENT.HA_PICTURE_UPLOAD) as HaPictureUpload;
    await customElements.whenDefined(ELEMENT.HA_PICTURE_UPLOAD).then(() => {
      try {
        customElements.upgrade(haPictureUpload);
        // eslint-disable-next-line unused-imports/no-unused-vars
      } catch (err) {
        // do nothing
      }
    });
    console.debug('getHaPictureUpload:', haPictureUpload);
    return haPictureUpload;
  } catch (error) {
    console.error('Error creating HaPictureUpload element:', error);
    throw error;
  }
};

const simulateKeyPressE = () => {
  const event = new KeyboardEvent('keydown', {
    key: 'e',
    code: 'KeyE',
    keyCode: 69,
    charCode: 69,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
};

export async function toggleQuickBar(): Promise<void> {
  if (customElements.get('ha-quick-bar')) {
    // Component already loaded, skip loading
    return;
  }

  console.debug('Loading ha-quick-bar component...');
  const hassBaseEl = document.querySelector('home-assistant') as any;
  const hass = hassBaseEl!.hass as HomeAssistant;

  // check if shortcuts is enabled, if not, enable it then change it back later
  let shouldChangeBack = false;
  if (!hass.enableShortcuts) {
    shouldChangeBack = true;
    fireEvent(hassBaseEl, 'hass-enable-shortcuts', true);
  }

  // wait a bit to ensure the event is processed
  await new Promise((r) => setTimeout(r, 100));

  simulateKeyPressE();

  const quick = await new Promise<any | null>((resolve) => {
    const check = () => {
      const quick = hassBaseEl.renderRoot?.querySelector('ha-quick-bar');
      if (quick) {
        resolve(quick as any);
        observer.disconnect();
        clearTimeout(timer);
      }
    };

    const observer = new MutationObserver(check);
    observer.observe(hassBaseEl.renderRoot, { childList: true });

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 2000);

    check();
  });

  if (quick) {
    quick.closeDialog();
  } else {
    console.warn('ha-quick-bar component failed to load');
  }
  // change back the shortcut enable state
  if (shouldChangeBack) {
    fireEvent(hassBaseEl, 'hass-enable-shortcuts', false);
  }
}
