import { ButtonActionConfig } from '../types';
type ActionType = 'double_tap' | 'hold' | 'tap';

export function addActions(element: HTMLElement, config: ButtonActionConfig) {
  const handler = new ActionHandler(element, config, sendActionEvent);

  element.addEventListener('pointerdown', handler.handleStart.bind(handler));
  element.addEventListener('pointerup', handler.handleEnd.bind(handler));

  element.addEventListener('contextmenu', (e) => e.preventDefault());
  element.style.cursor = 'pointer';
}

function sendActionEvent(element: HTMLElement, config: ButtonActionConfig, action: ActionType) {
  const tapAction = config?.tap_action || { action: 'more-info' };
  const doubleTapAction = config?.double_tap_action || { action: 'none' };
  const holdAction = config?.hold_action || { action: 'none' };
  const entity = config?.entity || null;
  if (entity === null) return;
  callAction(
    element,
    { double_tap_action: doubleTapAction, entity: entity, hold_action: holdAction, tap_action: tapAction },
    action
  );
}

function callAction(element: HTMLElement, config: ButtonActionConfig, action: ActionType) {
  setTimeout(() => {
    const event = new CustomEvent('hass-action', { bubbles: true, composed: true, detail: { action, config } });
    element.dispatchEvent(event);
  }, 1);
}

class ActionHandler {
  private config: ButtonActionConfig;
  private defaultEntity: null | string;
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
    this.defaultEntity = config.entity || this._extractEntityFromAction(config);
    this.tapTimeout = null;
    this.lastTap = 0;
    this.startTime = null;
    this.isSwiping = false;
  }

  // Utility method to extract entity from the button actions
  _extractEntityFromAction(config) {
    if (config?.button_action?.tap_action?.target?.entity_id) {
      return config.button_action.tap_action.target.entity_id;
    }
    if (config?.button_action?.hold_action?.target?.entity_id) {
      return config.button_action.hold_action.target.entity_id;
    }
    if (config?.button_action?.double_tap_action?.target?.entity_id) {
      return config.button_action.double_tap_action.target.entity_id;
    }
    return null;
  }

  handleEnd(e: PointerEvent) {
    if (this.startTime === null) return;

    const currentTime = Date.now();
    const holdDuration = currentTime - this.startTime;

    const deltaX = Math.abs((e.clientX || 0) - (this.startX || 0));
    const deltaY = Math.abs((e.clientY || 0) - (this.startY || 0));
    const moveThreshold = 20; // pixels

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      this.isSwiping = true;
      this.startTime = null;
      console.log('Swipe detected, ignoring tap/hold/double_tap');
      return; // Ignore swipe as a valid tap/hold/double_tap
    }

    const doubleTapDuration = currentTime - this.lastTap;
    this.lastTap = currentTime;
    this.startTime = null;

    if (holdDuration > 500) {
      console.log('Hold detected');
      this.sendActionEvent(this.element, this.config, 'hold');
    } else if (doubleTapDuration < 300) {
      console.log('Double tap detected');
      this.sendActionEvent(this.element, this.config, 'double_tap');
    } else {
      this.tapTimeout = window.setTimeout(() => {
        console.log('Single tap detected');
        this.sendActionEvent(this.element, this.config, 'tap');
      }, 300);
    }
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
