import { fireEvent, HASSDomEvent } from '../../ha/common/dom/fire_event';

export interface ActionEventDetail {
  action: 'hold' | 'tap' | 'double_tap';
}

export type ActionDomEvent = HASSDomEvent<ActionEventDetail>;

export interface ActionHandleOpts {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  hasClick?: boolean;
  disabled?: boolean;
}
declare global {
  interface HASSDomEvents {
    action: ActionEventDetail;
  }
}

export function addActionHandler(element: HTMLElement, options?: ActionHandleOpts) {
  const handler = new ActionHandler(element, options, sendActionEvent);

  element.addEventListener('pointerdown', handler.handleStart!.bind(handler));
  element.addEventListener('pointerup', handler.handleEnd!.bind(handler));

  element.addEventListener('contextmenu', (e) => e.preventDefault());
}

function sendActionEvent(element: HTMLElement, _options: ActionHandleOpts, action: 'hold' | 'tap' | 'double_tap') {
  setTimeout(() => {
    fireEvent(element, 'action', { action }, { bubbles: true, composed: true });
  }, 1);
}

class ActionHandler {
  private element: HTMLElement;
  private options: ActionHandleOpts;
  private lastTap: number;
  private sendActionEvent: (
    element: HTMLElement,
    options: ActionHandleOpts,
    action: 'hold' | 'tap' | 'double_tap'
  ) => void;
  private startTime: null | number;
  private tapTimeout: null | number;
  private startX: number | null = null;
  private startY: number | null = null;

  constructor(
    element: HTMLElement,
    options: ActionHandleOpts = {},
    sendActionEvent: (element: HTMLElement, options: ActionHandleOpts, action: 'hold' | 'tap' | 'double_tap') => void
  ) {
    this.element = element;
    this.options = options;
    this.sendActionEvent = sendActionEvent;
    this.tapTimeout = null;
    this.lastTap = 0;
    this.startTime = null;
  }
  handleEnd(e: PointerEvent) {
    if (this.startTime === null) return;

    const currentTime = Date.now();
    const holdDuration = currentTime - this.startTime;
    this.startTime = null;

    const deltaX = Math.abs((e.clientX || 0) - (this.startX || 0));
    const deltaY = Math.abs((e.clientY || 0) - (this.startY || 0));
    const moveThreshold = 20;

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      console.log('Swipe detected, ignoring actions');
      return;
    }

    const doubleTapDelay = 250;
    const doubleTapDuration = currentTime - this.lastTap;

    clearTimeout(this.tapTimeout!); // Cancel any pending tap
    let tapAllowed = true;

    // === HOLD ===
    if (holdDuration > 300) {
      tapAllowed = false;
      if (this.options.hasHold) {
        console.log('Hold detected');
        this.sendActionEvent(this.element, this.options, 'hold');
      } else {
        console.log('Hold ignored (no action)');
      }
      return;
    }

    // === DOUBLE TAP ===
    if (doubleTapDuration < doubleTapDelay) {
      tapAllowed = false;
      if (this.options.hasDoubleClick) {
        console.log('Double tap detected');
        this.sendActionEvent(this.element, this.options, 'double_tap');
      } else {
        console.log('Double tap ignored (no action)');
      }
      this.lastTap = 0; // reset to avoid triple detection
      return;
    }

    // === TAP (deferred) ===
    if (this.options.hasClick) {
      this.tapTimeout = window.setTimeout(() => {
        if (tapAllowed) {
          console.log('Single tap detected');
          this.sendActionEvent(this.element, this.options, 'tap');
        }
      }, doubleTapDelay);
    }
    this.lastTap = currentTime;
  }
  handleStart(e: PointerEvent) {
    e.preventDefault();
    this.startTime = Date.now();
    this.startX = e.clientX;
    this.startY = e.clientY;
    clearTimeout(this.tapTimeout as number);
  }
}
