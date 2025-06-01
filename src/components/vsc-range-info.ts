import { CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import cardcss from '../css/card.css';
import { HomeAssistant, RangeInfoConfig } from '../types';
import './shared/vsc-range-item';

@customElement('vsc-range-info')
export class VscRangeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) rangeConfig!: RangeInfoConfig[];
  @state() public _groupIndicatorActive: number | null = null;

  static get styles(): CSSResultGroup {
    return [cardcss];
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
    return html`<div class=${_class}>${rangeInfo}</div>`;
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
