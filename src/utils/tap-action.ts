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
  const doubleTapAction = config?.double_tap_action || { action: 'toggle' };
  const holdAction = config?.hold_action || { action: 'toggle' };
  const entity = config?.entity || '';
  // console.log('sendActionEvent', tapAction, doubleTapAction, holdAction, entity, action);
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
    // console.log('callAction', event);
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

    // If no entity is found, return null
    return null;
  }
  handleEnd() {
    if (this.startTime === null) return;

    const currentTime = Date.now();
    const holdDuration = currentTime - this.startTime;
    const doubleTapDuration = currentTime - this.lastTap;

    this.lastTap = currentTime;
    this.startTime = null;

    if (holdDuration > 500) {
      // Set a threshold for long press (500ms example)
      this.sendActionEvent(this.element, this.config, 'hold');
    } else if (doubleTapDuration < 300) {
      // Set a threshold for double tap (300ms example)
      this.sendActionEvent(this.element, this.config, 'double_tap');
    } else {
      this.tapTimeout = window.setTimeout(() => {
        this.sendActionEvent(this.element, this.config, 'tap');
      }, 300); // Same threshold for single tap
    }
  }

  handleStart(e: PointerEvent) {
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Example: Only trigger vibration after user interaction
    if (navigator.vibrate && e.isTrusted) {
      navigator.vibrate(50); // Vibrate for 50ms
    }

    this.startTime = Date.now();
    clearTimeout(this.tapTimeout as number);
  }
}
