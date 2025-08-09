import type { AttributePart, DirectiveParameters } from 'lit/directive.js';

import { noChange } from 'lit';
import { directive, Directive } from 'lit/directive.js';

import { deepEqual } from '../../../../utils/deep-equal';
import { fireEvent, HASSDomEvent } from '../../../common/dom/fire_event';

const isTouch =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  // @ts-ignore
  navigator.msMaxTouchPoints > 0;

export interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
}

export interface ActionHandlerDetail {
  action: 'hold' | 'tap' | 'double_tap';
}

interface ActionHandler extends HTMLElement {
  holdTime: number;
  bind(element: Element, options?: ActionHandlerOptions): void;
}

interface ActionHandlerElement extends HTMLElement {
  actionHandler?: {
    options: ActionHandlerOptions;
    start?: (ev: Event) => void;
    end?: (ev: Event) => void;
    handleKeyDown?: (ev: KeyboardEvent) => void;
  };
}

export type ActionHandlerEvent = HASSDomEvent<ActionHandlerDetail>;

declare global {
  interface HTMLElementTagNameMap {
    'action-handler': ActionHandler;
  }

  interface HASSDomEvents {
    action: ActionHandlerDetail;
  }
}

class ActionHandler extends HTMLElement implements ActionHandler {
  public holdTime = 500;

  protected timer?: number;

  protected held = false;

  private cancelled = false;

  private dblClickTimeout?: number;

  public connectedCallback() {
    Object.assign(this.style, {
      position: 'fixed',
      width: isTouch ? '100px' : '50px',
      height: isTouch ? '100px' : '50px',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: '999',
    });

    ['touchcancel', 'mouseout', 'mouseup', 'touchmove', 'mousewheel', 'wheel', 'scroll'].forEach((ev) => {
      document.addEventListener(
        ev,
        () => {
          this.cancelled = true;
          if (this.timer) {
            this._stopAnimation();
            clearTimeout(this.timer);
            this.timer = undefined;
          }
        },
        { passive: true }
      );
    });
  }

  public bind(element: ActionHandlerElement, options: ActionHandlerOptions = {}) {
    if (element.actionHandler && deepEqual(options, element.actionHandler.options)) {
      return;
    }

    if (element.actionHandler) {
      element.removeEventListener('touchstart', element.actionHandler.start!);
      element.removeEventListener('touchend', element.actionHandler.end!);
      element.removeEventListener('touchcancel', element.actionHandler.end!);

      element.removeEventListener('mousedown', element.actionHandler.start!);
      element.removeEventListener('click', element.actionHandler.end!);

      element.removeEventListener('keydown', element.actionHandler.handleKeyDown!);
    } else {
      element.addEventListener('contextmenu', (ev: Event) => {
        const e = ev || window.event;
        if (e.preventDefault) {
          e.preventDefault();
        }
        if (e.stopPropagation) {
          e.stopPropagation();
        }
        e.cancelBubble = true;
        e.returnValue = false;
        return false;
      });
    }

    element.actionHandler = { options };

    if (options.disabled) {
      return;
    }

    element.actionHandler.start = (ev: Event) => {
      this.cancelled = false;
      let x;
      let y;
      if ((ev as TouchEvent).touches) {
        x = (ev as TouchEvent).touches[0].clientX;
        y = (ev as TouchEvent).touches[0].clientY;
      } else {
        x = (ev as MouseEvent).clientX;
        y = (ev as MouseEvent).clientY;
      }

      if (options.hasHold) {
        this.held = false;
        this.timer = window.setTimeout(() => {
          this._startAnimation(x, y);
          this.held = true;
        }, this.holdTime);
      }
    };

    element.actionHandler.end = (ev: Event) => {
      // Don't respond when moved or scrolled while touch
      if (ev.type === 'touchcancel' || (ev.type === 'touchend' && this.cancelled)) {
        return;
      }
      const target = ev.target as HTMLElement;
      // Prevent mouse event if touch event
      if (ev.cancelable) {
        ev.preventDefault();
      }
      if (options.hasHold) {
        clearTimeout(this.timer);
        this._stopAnimation();
        this.timer = undefined;
      }
      if (options.hasHold && this.held) {
        fireEvent(target, 'action', { action: 'hold' });
      } else if (options.hasDoubleClick) {
        if ((ev.type === 'click' && (ev as MouseEvent).detail < 2) || !this.dblClickTimeout) {
          this.dblClickTimeout = window.setTimeout(() => {
            this.dblClickTimeout = undefined;
            fireEvent(target, 'action', { action: 'tap' });
          }, 250);
        } else {
          clearTimeout(this.dblClickTimeout);
          this.dblClickTimeout = undefined;
          fireEvent(target, 'action', { action: 'double_tap' });
        }
      } else {
        fireEvent(target, 'action', { action: 'tap' });
      }
    };

    element.actionHandler.handleKeyDown = (ev: KeyboardEvent) => {
      if (!['Enter', ' '].includes(ev.key)) {
        return;
      }
      (ev.currentTarget as ActionHandlerElement).actionHandler!.end!(ev);
    };

    element.addEventListener('touchstart', element.actionHandler.start, {
      passive: true,
    });
    element.addEventListener('touchend', element.actionHandler.end);
    element.addEventListener('touchcancel', element.actionHandler.end);

    element.addEventListener('mousedown', element.actionHandler.start, {
      passive: true,
    });
    element.addEventListener('click', element.actionHandler.end);

    element.addEventListener('keydown', element.actionHandler.handleKeyDown);
  }

  private _startAnimation(x: number, y: number) {
    Object.assign(this.style, {
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%) scale(1)',
    });
  }

  private _stopAnimation() {
    Object.assign(this.style, {
      left: null,
      top: null,
      transform: 'translate(-50%, -50%) scale(0)',
    });
  }
}

customElements.define('action-handler-vehicle-status-card', ActionHandler);

const getActionHandler = (): ActionHandler => {
  const body = document.body;
  if (body.querySelector('action-handler-vehicle-status-card')) {
    return body.querySelector('action-handler-vehicle-status-card') as ActionHandler;
  }

  const actionhandler = document.createElement('action-handler-vehicle-status-card');
  body.appendChild(actionhandler);

  return actionhandler as ActionHandler;
};

export const actionHandlerBind = (element: ActionHandlerElement, options?: ActionHandlerOptions) => {
  const actionhandler: ActionHandler = getActionHandler();
  if (!actionhandler) {
    return;
  }
  actionhandler.bind(element, options);
};

export const actionHandler = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      actionHandlerBind(part.element as ActionHandlerElement, options);
      return noChange;
    }

    // eslint-disable-next-line
    render(_options?: ActionHandlerOptions) {}
  }
);
