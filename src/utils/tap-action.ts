import { ButtonActionConfig } from '../types';
type ActionType = 'tap' | 'double_tap' | 'hold';

export function addActions(element: HTMLElement, config: ButtonActionConfig) {
  const handler = new ActionHandler(element, config, sendActionEvent);

  element.addEventListener('pointerdown', handler.handleStart.bind(handler));
  element.addEventListener('pointerup', handler.handleEnd.bind(handler));
  element.addEventListener('contextmenu', (e) => e.preventDefault());
  element.style.cursor = 'pointer';
}

export function sendActionEvent(element: HTMLElement, config: ButtonActionConfig, action: ActionType) {
  const tapAction = config?.tap_action || { action: 'more-info' };
  const doubleTapAction = config?.double_tap_action || { action: 'toggle' };
  const holdAction = config?.hold_action || { action: 'toggle' };
  const entity = config?.entity || '';

  callAction(
    element,
    { entity: entity, tap_action: tapAction, double_tap_action: doubleTapAction, hold_action: holdAction },
    action
  );
}

export function callAction(element: HTMLElement, config: ButtonActionConfig, action: ActionType) {
  setTimeout(() => {
    const event = new CustomEvent('hass-action', { bubbles: true, composed: true, detail: { config, action } });
    element.dispatchEvent(event);
  }, 1);
}

class ActionHandler {
  private element: HTMLElement;
  private config: ButtonActionConfig;
  private sendActionEvent: (element: HTMLElement, config: ButtonActionConfig, action: ActionType) => void;
  private tapTimeout: number | null;
  private lastTap: number;
  private startTime: number | null;
  private defaultEntity: string | null;

  constructor(
    element: HTMLElement,
    config: ButtonActionConfig,
    sendActionEvent: (element: HTMLElement, config: ButtonActionConfig, action: ActionType) => void
  ) {
    this.element = element;
    this.config = config;
    this.sendActionEvent = sendActionEvent;
    this.defaultEntity = this._extractEntityFromAction(config);
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
  handleStart(e: PointerEvent) {
    e.stopPropagation();
    e.stopImmediatePropagation();

    this.startTime = Date.now();
    clearTimeout(this.tapTimeout as number);
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
}
