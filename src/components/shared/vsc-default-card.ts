import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { HomeAssistant } from '../../ha';
import { DefaultCardConfig } from '../../types/config';

@customElement('vsc-default-card')
export class VscDefaultCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _data!: DefaultCardConfig;

  protected render(): TemplateResult {
    const { title, collapsed_items, items, state_color } = this._data;

    const header = collapsed_items
      ? html`<div class="subcard-icon" ?active=${collapsed_items} @click=${() => this.toggleSubCard()}>
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </div>`
      : html``;

    return html`
      <div class="default-card">
        <div class="data-header">${title} ${header}</div>
        <div class="data-box" ?active=${collapsed_items || !items.length}>
          ${items.map((item, index) => {
            const isLastItem = index === items.length - 1;
            return html`
              <div class="card-item">
                <vsc-default-card-item
                  .hass=${this.hass}
                  .defaultCardItem=${item}
                  .stateColor=${state_color || false}
                  .lastItem=${isLastItem}
                ></vsc-default-card-item>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private toggleSubCard(): void {
    const dataBox = this.shadowRoot?.querySelector('.data-box');
    const subCardIcon = this.shadowRoot?.querySelector('.subcard-icon');

    if (dataBox && subCardIcon) {
      const isCollapsed = dataBox.hasAttribute('active');
      dataBox.toggleAttribute('active', !isCollapsed);
      subCardIcon.toggleAttribute('active', !isCollapsed);
    }
    // this.requestUpdate();
  }

  static get styles(): CSSResultGroup {
    return css`
      .default-card {
        align-items: center;
        padding: var(--vic-card-padding);
        background: var(--ha-card-background-color, var(--secondary-background-color));
        box-shadow: var(--ha-card-box-shadow);
        box-sizing: border-box;
        border-radius: var(--ha-card-border-radius, 12px);
        border-width: var(--ha-card-border-width, 1px);
        border-style: solid;
        border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
        transition: all 0.3s ease-out;
        position: relative;
      }

      .default-card .data-header {
        color: var(--ha-card-header-color, --primary-text-color);
        font-family: var(--ha-card-header-font-family, inherit);
        font-size: 1.3rem;
        line-height: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: auto;
        min-height: 24px;

        /* padding: 8px 0; */
      }

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
      }
      .default-card .data-box .card-item {
        padding: var(--vic-gutter-gap);
        border-bottom: 1px solid var(--divider-color, #444);
      }
      .default-card .data-box .card-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .default-card.remote-tab {
        border: none !important;
        background: none !important;
        padding: 0px;
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
    `;
  }
}
