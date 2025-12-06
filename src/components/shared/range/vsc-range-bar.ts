import { css, CSSResultGroup, html, LitElement, nothing, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('vsc-range-bar')
export class VscRangeBar extends LitElement {
  @property({ type: Boolean, reflect: true }) public itemInside = false;
  @property({ attribute: false }) public _targetChargeState?: number;
  protected render(): TemplateResult {
    const dataTarget = this._targetChargeState !== undefined ? `Target: ${this._targetChargeState}%` : null;
    return html`
      <div class="fuel-container">
        ${dataTarget ? html`<div class="charge-target tooltip" data-title=${dataTarget}></div>` : nothing}
        <div class="fuel-wrapper">
          <slot name="energy-level"></slot>
          <slot name="range-level"></slot>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        width: 100%;
      }
      :host([itemsinside]) .fuel-container {
        height: 100%;
        min-height: var(--vsc-bar-min-height) !important;
      }

      .fuel-container {
        position: relative;
        width: 100%;
        height: var(--vsc-bar-height, 4px);
        border-radius: var(--vsc-bar-radius, 5px);
        background-color: var(--vsc-bar-background, var(--secondary-background-color));
        overflow: hidden;
        margin: 0;
        display: flex;
        align-items: center;
      }
      .fuel-container::before {
        content: '';
        position: absolute;
        width: calc(var(--vsc-bar-level));
        background: -moz-linear-gradient(90deg, var(--vsc-range-gradient-color));
        background: -webkit-linear-gradient(90deg, var(--vsc-range-gradient-color));
        background: linear-gradient(90deg, var(--vsc-range-gradient-color));
        border-radius: var(--vsc-bar-radius);
        max-width: 100% !important;
        transition: width 0.4s ease-in-out;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 0;
      }

      .fuel-wrapper {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        height: 100%;
        width: 100%;
        z-index: 1;
        /* gap: var(--vic-gutter-gap); */
      }
      .fuel-wrapper ::slotted(*) {
        z-index: 2;
        display: flex;
        align-items: center;
        box-sizing: border-box;
      }

      .fuel-wrapper ::slotted([slot='energy-level']) {
        flex: 0 1 var(--vsc-bar-level);
        padding-inline: var(--vic-card-padding);
      }

      .fuel-wrapper ::slotted([slot='range-level']) {
        flex: auto;
        justify-content: flex-end;
        padding-inline-end: var(--vic-card-padding);
      }

      .charge-target {
        position: absolute;
        width: 4px;
        height: calc(100% - 4px);
        background-color: var(--vsc-bar-target-color);
        border-radius: 4px;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        transform: translateY(-50%);
        z-index: 3;
        inset: 50% calc(100% - var(--vsc-bar-charge-target)) auto auto;
        border: none;
        box-sizing: border-box;
      }
      .charge-target.tooltip::after {
        content: attr(data-title);
        position: absolute;
        top: 50%;
        transform: translate(-108%, -55%);
        background-color: var(--primary-text-color, #000000);
        color: var(--card-background-color, #ffffff);
        padding: 0 12px;
        border-radius: 8px;
        white-space: nowrap;
        box-sizing: content-box;
        opacity: 0;
      }

      .charge-target:hover::after {
        animation: slideIn 0.3s ease-in-out forwards;
      }

      @keyframes slideIn {
        from {
          max-width: 0;
          opacity: 0;
        }
        to {
          max-width: 1000px;
          opacity: 1;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-range-bar': VscRangeBar;
  }
}
