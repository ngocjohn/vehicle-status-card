import { hasAction } from 'custom-card-helpers';

import { ButtonActionConfig } from '../types';
type ActionType = 'double_tap' | 'hold' | 'tap';

export function addActions(element: HTMLElement, config: ButtonActionConfig) {
  const handler = new ActionHandler(element, config, sendActionEvent);

  element.addEventListener('pointerdown', handler.handleStart.bind(handler));
  element.addEventListener('pointerup', handler.handleEnd.bind(handler));

  element.addEventListener('contextmenu', (e) => e.preventDefault());
  // element.style.cursor = 'pointer';
  element.setAttribute('has-action', '');
}

function sendActionEvent(element: HTMLElement, config: ButtonActionConfig, action: ActionType) {
  setTimeout(() => {
    const event = new CustomEvent('hass-action', { bubbles: true, composed: true, detail: { action, config } });
    element.dispatchEvent(event);
  }, 1);
}

class ActionHandler {
  private config: ButtonActionConfig;
  private element: HTMLElement;
  private lastTap: number;
  private sendActionEvent: (element: HTMLElement, config: ButtonActionConfig, action: ActionType) => void;
  private startTime: null | number;
  private tapTimeout: null | number;
  private isSwiping: boolean;
  private startX: number | null = null;
  private startY: number | null = null;

  constructor(
    element: HTMLElement,
    config: ButtonActionConfig,
    sendActionEvent: (element: HTMLElement, config: ButtonActionConfig, action: ActionType) => void
  ) {
    this.element = element;
    this.config = config;
    this.sendActionEvent = sendActionEvent;
    this.tapTimeout = null;
    this.lastTap = 0;
    this.startTime = null;
    this.isSwiping = false;
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
      this.isSwiping = true;
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
      if (hasAction(this.config.hold_action)) {
        console.log('Hold detected');
        this.sendActionEvent(this.element, this.config, 'hold');
      } else {
        console.log('Hold ignored (no action)');
      }
      return;
    }

    // === DOUBLE TAP ===
    if (doubleTapDuration < doubleTapDelay) {
      tapAllowed = false;
      if (hasAction(this.config.double_tap_action)) {
        console.log('Double tap detected');
        this.sendActionEvent(this.element, this.config, 'double_tap');
      } else {
        console.log('Double tap ignored (no action)');
      }
      this.lastTap = 0; // reset to avoid triple detection
      return;
    }

    // === TAP (deferred) ===
    if (hasAction(this.config.tap_action)) {
      this.tapTimeout = window.setTimeout(() => {
        if (tapAllowed) {
          console.log('Single tap detected');
          this.sendActionEvent(this.element, this.config, 'tap');
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
    this.isSwiping = false;
    clearTimeout(this.tapTimeout as number);
  }
}
