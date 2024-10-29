import { CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import cardcss from '../css/card.css';
import { HA as HomeAssistant, VehicleStatusCardConfig, RangeInfoEntity } from '../types';
import { HaHelp } from '../utils';
import { isEmpty } from '../utils';

@customElement('vsc-range-info')
export class VscRangeInfo extends LitElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;

  @state() private _rangeInfo: RangeInfoEntity = [];

  @state() private _rangeInfoLoaded = false;
  @state() public _groupIndicatorActive: number | null = null;

  static get styles(): CSSResultGroup {
    return [cardcss];
  }

  protected firstUpdated(changeProperties: PropertyValues): void {
    super.firstUpdated(changeProperties);
    this._getRangeInfo();
  }

  private async _getRangeInfo(): Promise<void> {
    if (!this.config || !this.hass) return;
    this._rangeInfoLoaded = false;
    const rangeInfo = this.config.range_info;
    if (isEmpty(rangeInfo)) return;
    this._rangeInfo = (await HaHelp.getRangeInfo(this.hass, rangeInfo)) ?? [];
    this._rangeInfoLoaded = true;
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    if (!this.config || !this.hass) return false;
    if (changedProperties.has('hass') && this._rangeInfo && this._rangeInfoLoaded) {
      this._getRangeInfo();
    }
    return true;
  }

  protected render(): TemplateResult {
    if (!this._rangeInfoLoaded || this._groupIndicatorActive !== null) return html``;

    const renderInfoBox = (icon: string, level: number, energy: string, range: string, progress_color: string) => html`
      <div class="info-box range">
        <div class="item">
          <ha-icon icon="${icon}"></ha-icon>
          <div><span>${energy}</span></div>
        </div>
        <div class="fuel-wrapper">
          <div class="fuel-level-bar" style="--vic-range-width: ${level}%; background-color:${progress_color};"></div>
        </div>
        <div class="item">
          <span>${range}</span>
        </div>
      </div>
    `;

    const rangeInfo = this._rangeInfo.map(({ energy, icon, level, progress_color, range }) => {
      return renderInfoBox(icon, level, energy, range, progress_color);
    });

    // Wrap rangeInfo in a div if there are more than one entries
    return html`<div id="range"><div class="combined-info-box">${rangeInfo}</div></div>`;
  }

  public _handleIndicatorClick(index: number | null): void {
    this._groupIndicatorActive = this._groupIndicatorActive === index ? null : index;
  }
}
