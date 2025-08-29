import { css, CSSResultGroup, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { COMPONENT } from '../constants/const';
import './shared/vsc-range-item';
import { HomeAssistant } from '../ha';
import { RangeInfoConfig } from '../types/config/card/range-info';
import { BaseElement } from '../utils/base-element';

@customElement(COMPONENT.RANGE_INFO)
export class VscRangeInfo extends BaseElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @property({ attribute: false }) rangeConfig!: RangeInfoConfig[];
  @property({ type: Boolean, reflect: true }) public row = false;

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .combined-info-box[row] {
          display: flex;
          flex-direction: column;
          gap: var(--vic-gutter-gap);
        }
        .combined-info-box {
          display: grid;
          width: 100%;
          grid-template-columns: repeat(auto-fill, minmax(49%, 1fr));
          gap: var(--vic-gutter-gap);
          opacity: 1;
          transition: all 400ms cubic-bezier(0.3, 0, 0.8, 0.15);
          max-height: 1000px;
          padding: 0px;
        }

        .combined-info-box.not-visible {
          opacity: 0;
          padding-top: var(--vic-card-padding);
          max-height: 0;
          overflow: hidden;
          /* transition: padding-top 400ms linear, max-height 400ms cubic-bezier(0.3, 0.0, 0.8, 0.15); */
          transition: all 400ms cubic-bezier(0.3, 0, 0.8, 0.15);
          transition-delay: 400ms;
        }
      `,
    ];
  }

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
  }

  protected render(): TemplateResult {
    // if (this._groupIndicatorActive !== null) return html``;
    const rangeInfo = this.rangeConfig.map((rangeItem) => {
      return html`<vsc-range-item .hass=${this.hass} .rangeItem=${rangeItem}></vsc-range-item>`;
    });

    // Wrap rangeInfo in a div if there are more than one entries
    return html`<div class="combined-info-box" ?row=${this.row}>${rangeInfo}</div>`;
  }
}
