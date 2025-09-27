import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import type { ButtonShowConfig } from '../../../types/config/card/button-card';

@customElement('vsc-btn-card')
export class VscBtnCard extends LitElement {
  @property({ attribute: false }) public btnShowConfig?: ButtonShowConfig;

  protected render(): TemplateResult {
    return html`
      <div
        class=${classMap({
          container: true,
          vertical: this.btnShowConfig?.layout === 'vertical',
          horizontal: this.btnShowConfig?.layout !== 'vertical',
          'no-info': this.btnShowConfig?.show_primary === false && this.btnShowConfig?.show_secondary === false,
          'no-content':
            this.btnShowConfig?.show_icon === false &&
            this.btnShowConfig?.show_primary === false &&
            this.btnShowConfig?.show_secondary === false,
        })}
      >
        <slot></slot>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin: calc(-1 * var(--ha-card-border-width, 1px));
      }
      .container {
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        flex-grow: 0;
        box-sizing: border-box;
        justify-content: space-between;
        height: 100%;
      }
      .container.horizontal {
        flex-direction: row;
      }
      .container.horizontal > ::slotted(*) {
        flex: 1;
        min-width: 0;
      }
      .container.horizontal > ::slotted(*) {
        flex: 1;
        min-width: 0;
      }
      .container.horizontal > ::slotted(*.actions) {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        padding-left: 0 !important;
        --control-spacing: var(--spacing);
        --control-height: var(--icon-size);
      }
      .container > ::slotted(vsc-btn-state-item) {
        flex: 1;
      }
      .container.horizontal.no-info > ::slotted(vsc-btn-state-item) {
        flex: none;
      }
      .container.no-content > ::slotted(vsc-btn-state-item) {
        display: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-btn-card': VscBtnCard;
  }
}
