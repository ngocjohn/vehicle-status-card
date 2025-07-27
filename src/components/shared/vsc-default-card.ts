import { css, CSSResultGroup, html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { DefaultCardConfig } from '../../types/config';
import { BaseElement } from '../../utils/base-element';

@customElement('vsc-default-card')
export class VscDefaultCard extends BaseElement {
  @property({ attribute: false }) private _data!: DefaultCardConfig;

  @state() private _subCardActive: boolean = false;

  protected render(): TemplateResult {
    const { title, collapsed_items, items, state_color } = this._data;

    const header = collapsed_items
      ? html`<div class="subcard-icon" ?active=${!this._subCardActive} @click=${() => this.toggleSubCard()}>
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </div>`
      : nothing;

    return html`
      <div class="default-card">
        <div class="data-header">${title} ${header}</div>
        <div class="data-box" ?active=${(collapsed_items && !this._subCardActive) || !items.length}>
          ${items.map((item) => {
            return html`
              <div class="card-item">
                <vsc-default-card-item
                  .hass=${this.hass}
                  .defaultCardItem=${item}
                  .stateColor=${state_color || false}
                ></vsc-default-card-item>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private toggleSubCard(): void {
    this._subCardActive = !this._subCardActive;
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .default-card .data-box {
          opacity: 1;
          padding-top: var(--vic-gutter-gap);
          max-height: 1000px;
          transition: all 400ms cubic-bezier(0.3, 0, 0.8, 0.15);
        }

        .default-card .data-box.no-items,
        .default-card .data-box[active] {
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          padding: 0;
          transition: all 400ms cubic-bezier(0.3, 0, 0.8, 0.15);
        }
        .default-card .data-box .card-item {
          padding: var(--vic-gutter-gap);
          border-bottom: 1px solid var(--divider-color, #444);
        }
        .default-card .data-box .card-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .data-icon.warning,
        .warning {
          color: var(--warning-color, --error-color) !important;
        }

        .subcard-icon {
          transition: transform 0.3s;
          transform: rotate(0deg);
          display: inline-block;
          cursor: pointer;
        }

        .subcard-icon[active] {
          transform: rotate(180deg);
        }

        .subcard-icon.hidden {
          visibility: hidden;
        }
      `,
    ];
  }
}
