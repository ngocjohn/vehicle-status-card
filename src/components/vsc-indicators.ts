import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import cardcss from '../css/card.css';
import {
  HA as HomeAssistant,
  VehicleStatusCardConfig,
  IndicatorConfig,
  IndicatorGroupConfig,
  IndicatorGroupItemConfig,
} from '../types';
import { isEmpty } from '../utils';
import { RenderTemplateResult, subscribeRenderTemplate } from '../utils/ws-templates';

const TEMPLATE_KEYS = ['state_template', 'icon_template', 'color', 'visibility'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-indicators')
export class VscIndicators extends LitElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @property({ attribute: false }) private config!: VehicleStatusCardConfig;

  @state() private _activeGroupIndicator: number | null = null;

  @state() private _singleTemplateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubSingleRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  // group indicators
  @state() private _groupTemplateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubGroupRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  // group items indicators
  @state() private _groupItemsTemplateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubGroupItemsRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return [cardcss];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
  }

  protected updated(changeProperties: PropertyValues): void {
    super.updated(changeProperties);
  }

  private isTemplate(value: string | undefined): boolean {
    if (!value || typeof value !== 'string') return false;
    return value.includes('{');
  }

  private async _tryConnect(): Promise<void> {
    // console.log('Trying to connect');
    if (!isEmpty(this.config.indicators.single)) {
      const singleIndicators = this.config.indicators.single;
      for (const singleIndicator of singleIndicators) {
        TEMPLATE_KEYS.forEach((key) => {
          this._tryConnectKey(key, singleIndicator);
          // console.log('Connected to single indicator', singleIndicator[key]);
        });
      }
    }

    if (!isEmpty(this.config.indicators.group)) {
      const groupIndicators = this.config.indicators.group;
      for (const groupIndicator of groupIndicators) {
        TEMPLATE_KEYS.forEach((key) => {
          this._tryGroupConnectKey(key, groupIndicator);
          // console.log('Connected to group indicator', groupIndicator[key]);
        });
        const groupItems = groupIndicator.items;
        // console.log('Group items', groupItems);
        if (!isEmpty(groupItems)) {
          for (const groupItem of groupItems) {
            TEMPLATE_KEYS.forEach((key) => {
              this._tryGroupItemsConnectKey(key, groupItem);
              // console.log('Connected to group item indicator', groupItem[key]);
            });
          }
        }
      }
    }
  }

  private async _tryConnectKey(key: TemplateKey, indicator: IndicatorConfig): Promise<void> {
    if (this._unsubSingleRenderTemplates.get(key) !== undefined || !this.hass || !this.isTemplate(indicator[key])) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._singleTemplateResults = { ...this._singleTemplateResults, [key]: result };
        },
        {
          template: indicator[key] ?? '',
        }
      );
      this._unsubSingleRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      const result = {
        result: indicator[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._singleTemplateResults = { ...this._singleTemplateResults, [key]: result };
      this._unsubSingleRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubSingleRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubSingleRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  private async _tryGroupConnectKey(key: TemplateKey, groupIndicator: IndicatorGroupConfig): Promise<void> {
    if (this._unsubGroupRenderTemplates.get(key) !== undefined || !this.hass || !this.isTemplate(groupIndicator[key])) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._groupTemplateResults = { ...this._groupTemplateResults, [key]: result };
        },
        {
          template: groupIndicator[key] ?? '',
        }
      );
      this._unsubGroupRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      const result = {
        result: groupIndicator[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._groupTemplateResults = { ...this._groupTemplateResults, [key]: result };
      this._unsubGroupRenderTemplates.delete(key);
    }
  }

  private async _tryGroupItemsConnectKey(
    key: TemplateKey,
    groupItemIndicator: IndicatorGroupItemConfig
  ): Promise<void> {
    if (
      this._unsubGroupItemsRenderTemplates.get(key) !== undefined ||
      !this.hass ||
      !this.isTemplate(groupItemIndicator[key])
    ) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._groupItemsTemplateResults = { ...this._groupItemsTemplateResults, [key]: result };
        },
        {
          template: groupItemIndicator[key] ?? '',
        }
      );
      this._unsubGroupItemsRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      const result = {
        result: groupItemIndicator[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._groupItemsTemplateResults = { ...this._groupItemsTemplateResults, [key]: result };
      this._unsubGroupItemsRenderTemplates.delete(key);
    }
  }

  protected render(): TemplateResult {
    return html`
      <div>
        <div class="info-box">${this._renderSingleIndicators()} ${this._renderGroupIndicators()}</div>
      </div>
      ${this._renderActiveIndicator()}
    `;
  }

  private _renderActiveIndicator(): TemplateResult {
    const activeIndex =
      this._activeGroupIndicator !== null ? this._activeGroupIndicator : this.config.indicators.group.length + 1;
    const items = this.config.indicators.group[activeIndex]?.items || [];
    const activeClass = this._activeGroupIndicator !== null ? 'info-box charge active' : 'info-box charge';

    return html`
      <div class=${activeClass}>
        ${items.map((item) => {
          const entity = item.entity;
          const icon = item.icon_template
            ? this._groupItemsTemplateResults.icon_template?.result
            : item.icon
            ? item.icon
            : '';
          const state = item.state_template
            ? this._groupItemsTemplateResults.state_template?.result
            : item.attribute
            ? this.hass.formatEntityAttributeValue(this.hass.states[entity], item.attribute)
            : this.hass.formatEntityState(this.hass.states[entity]);
          const name = item.name;
          return html`
            <div class="item charge">
              <div class="icon-state">
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
    const singleIndicators = this.config.indicators.single;
    if (!singleIndicators || singleIndicators.length === 0) return html``;
    const indicator = singleIndicators.map((indicator) => {
      const entity = indicator.entity;
      const icon = indicator.icon_template
        ? this._singleTemplateResults.icon_template?.result
        : indicator.icon
        ? indicator.icon
        : '';
      const state = indicator.state_template
        ? this._singleTemplateResults.state_template?.result
        : indicator.attribute
        ? this.hass.formatEntityAttributeValue(this.hass.states[entity], indicator.attribute)
        : this.hass.formatEntityState(this.hass.states[entity]);
      const visibility = indicator.visibility ? this._singleTemplateResults.visibility?.result : true;
      const color = indicator.color ? this._singleTemplateResults.color?.result : '';

      return html`
        <div class="item " ?hidden=${Boolean(visibility) === false}>
          <ha-state-icon
            .hass=${this.hass}
            .stateObj=${entity ? this.hass.states[entity] : undefined}
            .icon=${icon}
            style=${color ? `color: ${color}` : ''}
          ></ha-state-icon>
          <div><span>${state}</span></div>
        </div>
      `;
    });

    return html`${indicator}`;
  }

  private _renderGroupIndicators(): TemplateResult {
    const configGroupIndicators = this.config.indicators.group;
    if (!configGroupIndicators || configGroupIndicators.length === 0) return html``;
    // Helper function to render group
    const groupIndicator = (
      icon: string,
      label: string,
      color: string,
      onClick: (index: number) => void,
      isActive: boolean
    ) => html`
      <div class="item active-btn" @click=${onClick}>
        <ha-icon icon=${icon} style=${color ? `color: ${color}` : ''}></ha-icon>
        <div class="added-item-arrow">
          <span>${label}</span>
          <div class="subcard-icon" ?active=${isActive} style="margin-bottom: 2px">
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </div>
        </div>
      </div>
    `;

    // const groupWithItems = this._indicatorsGroup.filter((group) => group.visibility !== false);
    // Render group indicators
    // const groupIndicators = groupWithItems.map((group, index) => {
    //   const isActive = this._activeGroupIndicator === index;
    //   return groupIndicator(group.icon, group.name, group.color, () => this._toggleGroupIndicator(index), isActive);
    // });
    const groupWithItems = configGroupIndicators.filter((group) => {
      const visibility = group.visibility ? this._groupTemplateResults.visibility?.result : true;
      return Boolean(visibility);
    });

    const groupIndicators = groupWithItems.map((group, index) => {
      const isActive = this._activeGroupIndicator === index;
      return groupIndicator(
        group.icon,
        group.name,
        group.color ?? this._groupTemplateResults.color?.result ?? '',
        () => this._toggleGroupIndicator(index),
        isActive
      );
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
