import { css, CSSResultGroup, html, LitElement, nothing, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import type { ButtonShowConfig } from '../../../types/config/card/button-card';

@customElement('vsc-state-item')
export class VscStateItem extends LitElement {
  @property({ attribute: false }) public btnShowConfig?: ButtonShowConfig;

  protected render(): TemplateResult {
    return html`
      <div
        class=${classMap({
          container: true,
          vertical: this.btnShowConfig?.layout === 'vertical',
        })}
      >
        ${this.btnShowConfig?.show_icon !== false
          ? html`
              <div class="icon">
                <slot name="icon"></slot>
                <slot name="badge"></slot>
              </div>
            `
          : nothing}
        ${this.btnShowConfig?.show_primary !== false || this.btnShowConfig?.show_secondary !== false
          ? html`
              <div class="info">
                <slot name="info"></slot>
              </div>
            `
          : nothing}
      </div>
    `;
  }
  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: 100%;
      }
      .container {
        height: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: var(--vic-gutter-gap);
        gap: var(--vic-gutter-gap);
      }
      .icon {
        position: relative;
      }
      .icon ::slotted(*[slot='badge']) {
        position: absolute;
        top: -3px;
        right: -3px;
      }

      .info {
        min-width: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .container.vertical {
        flex-direction: column;
      }
      .container.vertical .info {
        text-align: center;
      }
    `;
  }
}
