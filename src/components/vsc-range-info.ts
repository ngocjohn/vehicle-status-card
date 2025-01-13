import { CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import cardcss from '../css/card.css';
import { HomeAssistant, RangeInfoConfig } from '../types';
import { fireEvent } from '../types/ha-frontend/fire-event';

@customElement('vsc-range-info')
export class VscRangeInfo extends LitElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @state() rangeConfig!: RangeInfoConfig[];
  @state() public _groupIndicatorActive: number | null = null;

  static get styles(): CSSResultGroup {
    return [cardcss];
  }

  protected render(): TemplateResult {
    if (this._groupIndicatorActive !== null) return html``;
    const rangeInfo = this.rangeConfig.map((rangeItem) => {
      return this._renderRangeInfo(rangeItem);
    });

    // Wrap rangeInfo in a div if there are more than one entries
    return html`<div class="combined-info-box">${rangeInfo}</div>`;
  }

  private _renderRangeInfo(rangeItem: RangeInfoConfig): TemplateResult {
    const { energy_level, range_level, progress_color, charging_entity } = rangeItem;
    const { attribute: energyAttribute, entity: energyEntity } = energy_level || {};
    const { attribute: rangeAttribute, entity: rangeEntity } = range_level || {};

    // Validate entities
    if (!energyEntity || !rangeEntity) {
      return html``; // Skip rendering this range item if entities are invalid
    }

    const icon = energy_level.icon
      ? energy_level.icon
      : energyEntity && this.hass.states[energyEntity]
      ? this.hass.states[energyEntity].attributes.icon
      : 'mdi:gas-station';

    const energyState = energyAttribute
      ? this.hass.formatEntityAttributeValue(this.hass.states[energyEntity], energyAttribute)
      : this.hass.formatEntityState(this.hass.states[energyEntity]);
    const rangeState = rangeAttribute
      ? this.hass.formatEntityAttributeValue(this.hass.states[rangeEntity], rangeAttribute)
      : this.hass.formatEntityState(this.hass.states[rangeEntity]);

    const level = parseInt(energyState, 10) || 0;
    const barColor = progress_color || `var(--accent-color)`;

    const chargingState = charging_entity ? this.hass.states[charging_entity].state : false;
    const booleanChargingState = chargingState === 'charging' || chargingState === 'on' || chargingState === 'true';

    const moreInfo = (entity: string) => {
      fireEvent(this, 'hass-more-info', { entityId: entity });
    };

    return html` <div class="info-box range">
      <div class="item" @click="${() => moreInfo(energyEntity)}">
        <ha-icon icon="${icon}"></ha-icon>
        <span>${energyState}</span>
        <ha-icon
          icon="mdi:battery-high"
          class="charging-icon"
          style="--range-bar-color: ${barColor}"
          ?hidden="${!booleanChargingState}"
          title="Charging"
        >
        </ha-icon>
      </div>
      <div class="fuel-wrapper">
        <div class="fuel-level-bar" style="--vic-range-width: ${level}%; background-color:${barColor};"></div>
      </div>
      <div class="item" @click="${() => moreInfo(rangeEntity)}">
        <span>${rangeState}</span>
      </div>
    </div>`;
  }
  public _handleIndicatorClick(index: number | null): void {
    this._groupIndicatorActive = this._groupIndicatorActive === index ? null : index;
  }
}
