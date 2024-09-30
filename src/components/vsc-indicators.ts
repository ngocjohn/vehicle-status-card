import { CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import cardcss from '../css/card.css';
import { HA as HomeAssistant, VehicleStatusCardConfig, IndicatorGroupEntity, IndicatorEntity } from '../types';
import { HaHelp } from '../utils';
import { isEmpty } from '../utils';

@customElement('vsc-indicators')
export class VscIndicators extends LitElement {
  @property() private hass!: HomeAssistant;
  @property() private config!: VehicleStatusCardConfig;

  @state() private _indicatorsGroup: IndicatorGroupEntity = [];
  @state() private _indicatorsSingle: IndicatorEntity = [];

  @state() private _activeGroupIndicator: number | null = null;
  @state() private _indicatorsLoaded = false;

  static get styles(): CSSResultGroup {
    return [cardcss];
  }

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
    this._handleFirstUpdate();
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    if (!this.config || !this.hass) return false;
    if (changedProperties.has('hass') && this._indicatorsSingle && this._indicatorsLoaded) {
      this._getSingleIndicators();
    }

    if (changedProperties.has('hass') && this._indicatorsGroup && this._indicatorsLoaded) {
      this._getGroupIndicators();
    }
    return true;
  }

  private async _handleFirstUpdate(): Promise<void> {
    if (!this.config || !this.hass) return;
    this._indicatorsLoaded = false;
    // console.log('setting indicators', this._indicatorsLoaded);

    const fetchSingle = !isEmpty(this.config.indicators.single) ? this._getSingleIndicators() : Promise.resolve();
    const fetchGroup = !isEmpty(this.config.indicators.group) ? this._getGroupIndicators() : Promise.resolve();

    await Promise.all([fetchSingle, fetchGroup]);

    this._indicatorsLoaded = true;
    // console.log('indicators loaded', this._indicatorsLoaded);
  }

  private async _getSingleIndicators(): Promise<void> {
    this._indicatorsSingle = (await HaHelp.getSingleIndicators(this.hass, this.config.indicators.single)) || [];
  }

  private async _getGroupIndicators(): Promise<void> {
    this._indicatorsGroup = (await HaHelp.getGroupIndicators(this.hass, this.config.indicators.group)) || [];
  }

  protected render(): TemplateResult {
    if (!this._indicatorsLoaded) return html``;
    return html`
      <div class="indicators">
        <div class="info-box">${this._renderSingleIndicators()} ${this._renderGroupIndicators()}</div>
      </div>
      ${this._renderActiveIndicator()}
    `;
  }

  private _renderActiveIndicator(): TemplateResult {
    const activeIndex =
      this._activeGroupIndicator !== null ? this._activeGroupIndicator : this._indicatorsGroup.length + 1;
    const items = this._indicatorsGroup[activeIndex]?.items || [];
    const activeClass = this._activeGroupIndicator !== null ? 'info-box charge active' : 'info-box charge';

    return html`
      <div class=${activeClass}>
        ${items.map(({ entity, icon, name, state }) => {
          return html`
            <div class="item charge">
              <div>
                <ha-state-icon .hass=${this.hass} .stateObj=${this.hass.states[entity]} .icon=${icon}></ha-state-icon>
                <span>${state}</span>
              </div>
              <div class="item-name">
                <span>${name}</span>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderSingleIndicators(): TemplateResult {
    const indicator = Object.values(this._indicatorsSingle).map(
      ({ entity, icon, state, visibility }) => html`
        <div class="item ${visibility === false ? 'hidden' : ''}">
          <ha-state-icon
            .hass=${this.hass}
            .stateObj=${entity ? this.hass.states[entity] : undefined}
            .icon=${icon}
          ></ha-state-icon>
          <div><span>${state}</span></div>
        </div>
      `
    );

    return html`${indicator}`;
  }

  private _renderGroupIndicators(): TemplateResult {
    // Helper function to render group
    const groupIndicator = (icon: string, label: string, onClick: (index: number) => void, isActive: boolean) => html`
      <div class="item active-btn" @click=${onClick}>
        <ha-icon icon=${icon}></ha-icon>
        <div class="added-item-arrow">
          <span>${label}</span>
          <div class="subcard-icon ${isActive ? 'active' : ''}" style="margin-bottom: 2px">
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </div>
        </div>
      </div>
    `;

    const groupWithItems = this._indicatorsGroup.filter((group) => group.visibility !== false);
    // Render group indicators
    const groupIndicators = groupWithItems.map((group, index) => {
      const isActive = this._activeGroupIndicator === index;
      return groupIndicator(group.icon, group.name, () => this._toggleGroupIndicator(index), isActive);
    });

    return html`${groupIndicators}`;
  }

  private _toggleGroupIndicator(index: number): void {
    const distpatchEvent = (active: number | null) => {
      this.dispatchEvent(
        new CustomEvent('indicator-toggle', {
          detail: {
            active,
          },
          bubbles: true,
          composed: true,
        })
      );
    };

    if (this._activeGroupIndicator === index) {
      this._activeGroupIndicator = null;
      distpatchEvent(null);
    } else {
      this._activeGroupIndicator = null;
      setTimeout(() => {
        this._activeGroupIndicator = index;
        distpatchEvent(index);
      }, 400);
    }
  }
}
