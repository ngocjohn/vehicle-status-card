import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import cardcss from '../css/card.css';
import { HomeAssistant, RangeInfoConfig } from '../types';
import './shared/vsc-range-item';

@customElement('vsc-range-info')
export class VscRangeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) rangeConfig!: RangeInfoConfig[];
  @property({ type: Boolean, reflect: true }) public row = false;
  @state() public _groupIndicatorActive: number | null = null;

  static get styles(): CSSResultGroup {
    return [
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
          column-gap: 0.5rem;
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
      cardcss,
    ];
  }

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
  }

  protected render(): TemplateResult {
    // if (this._groupIndicatorActive !== null) return html``;
    const _class = this._groupIndicatorActive !== null ? 'combined-info-box not-visible' : 'combined-info-box';
    const rangeInfo = this.rangeConfig.map((rangeItem) => {
      return html`<vsc-range-item .hass=${this.hass} .rangeItem=${rangeItem}></vsc-range-item>`;
    });

    // Wrap rangeInfo in a div if there are more than one entries
    return html`<div class=${_class} ?row=${this.row}>${rangeInfo}</div>`;
  }

  public _handleIndicatorClick(index: number | null): void {
    this._groupIndicatorActive = this._groupIndicatorActive === index ? null : index;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-range-info': VscRangeInfo;
  }
}
