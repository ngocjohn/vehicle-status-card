import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import cardcss from '../css/card.css';
import { HomeAssistant, IndicatorGroupConfig, VehicleStatusCardConfig } from '../types';
// components items
import './shared/vsc-indicator-single';
import './shared/vsc-indicator-group-item';
import { RenderTemplateResult, subscribeRenderTemplate } from '../types';
import { VscIndicatorGroupItem } from './shared/vsc-indicator-group-item';

const TEMPLATE_KEYS = ['color', 'visibility'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-indicators')
export class VscIndicators extends LitElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @property({ attribute: false }) private config!: VehicleStatusCardConfig;

  @state() public _activeGroupIndicator: number | null = null;
  @query('vsc-indicator-group-item') _groupIndicatorItem?: VscIndicatorGroupItem;

  // group indicators
  @state() private _groupTemplateResults: Record<
    number,
    Partial<Record<TemplateKey, RenderTemplateResult | undefined>>
  > = {};
  @state() private _unsubGroupRenderTemplates: Record<number, Map<TemplateKey, Promise<UnsubscribeFunc>>> = {};

  static get styles(): CSSResultGroup {
    return [cardcss];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    this._tryDisconnect();
    super.disconnectedCallback();
  }

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    if (changedProperties.has('hass') || changedProperties.has('config')) {
      this._tryConnect();
    }
    return true;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('_activeGroupIndicator') && this._activeGroupIndicator !== null) {
      setTimeout(() => {
        // this._addEventListeners();
      }, 0);
    }
  }

  private async _addEventListeners(): Promise<void> {
    const groupIndicators = this.shadowRoot?.querySelectorAll(
      'vsc-indicator-group-item'
    ) as NodeListOf<VscIndicatorGroupItem>;
    if (!groupIndicators || groupIndicators.length === 0) return;
    groupIndicators.forEach((groupIndicator: VscIndicatorGroupItem) => {
      const actionConfig = groupIndicator.item.action_config;
      if (!actionConfig) return;
      groupIndicator._setEventListeners();
    });
  }

  private async _tryConnect(): Promise<void> {
    if (!this.config.indicators.group?.length) {
      return;
    }

    const groupIndicators = this.config.indicators.group;

    groupIndicators.forEach((_, index) => {
      TEMPLATE_KEYS.forEach((key) => {
        this._subscribeRenderTemplate(index, key);
      });
    });
  }

  private async _subscribeRenderTemplate(index: number, key: TemplateKey): Promise<void> {
    const groupIndicators = this.config.indicators.group;
    if (!groupIndicators) return;

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._groupTemplateResults = {
            ...this._groupTemplateResults,
            [index]: { ...this._groupTemplateResults[index], [key]: result },
          };
        },
        { template: groupIndicators[index][key] ?? '' }
      );
      if (!this._unsubGroupRenderTemplates[index]) {
        this._unsubGroupRenderTemplates[index] = new Map();
      }
      this._unsubGroupRenderTemplates[index].set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
      const result = {
        result: groupIndicators[index][key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._groupTemplateResults = {
        ...this._groupTemplateResults,
        [index]: { ...this._groupTemplateResults[index], [key]: result },
      };
      if (this._unsubGroupRenderTemplates[index]) {
        this._unsubGroupRenderTemplates[index].delete(key);
      }
    }
  }

  private async _tryDisconnect(): Promise<void> {
    for (const [index, unsubRenderTemplates] of Object.entries(this._unsubGroupRenderTemplates)) {
      unsubRenderTemplates.forEach((_, key) => {
        this._tryDisconnectKey(Number(index), key);
      });
    }
  }

  private async _tryDisconnectKey(index: number, key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubGroupRenderTemplates[index]?.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubGroupRenderTemplates[index]?.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
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
    if (!this.config.indicators.group) return html``;
    const activeIndex = this._activeGroupIndicator!;
    const items = this.config.indicators.group[activeIndex]?.items || [];
    const activeClass = this._activeGroupIndicator !== null ? 'info-box charge active' : 'info-box charge';

    return html`
      <div class=${activeClass}>
        ${items.map((item) => {
          return html`
            <vsc-indicator-group-item
              .hass=${this.hass}
              .item=${item}
              ?hidden=${item.entity === ''}
            ></vsc-indicator-group-item>
          `;
        })}
      </div>
    `;
  }

  private _renderSingleIndicators(): TemplateResult {
    if (!this.config.indicators?.single) return html``;
    const singleIndicators = this.config.indicators.single;
    if (!singleIndicators || singleIndicators.length === 0) return html``;
    const indicator = singleIndicators.map((indicator) => {
      return html` <vsc-indicator-single .hass=${this.hass} .indicator=${indicator}></vsc-indicator-single> `;
    });

    return html`${indicator}`;
  }

  private _renderGroupIndicators(): TemplateResult {
    if (!this.config.indicators?.group || this.config.indicators.group.length === 0) {
      return html``;
    }
    const configGroupIndicators = this.config.indicators?.group || [];

    return html`${repeat(
      configGroupIndicators || [],
      (group: IndicatorGroupConfig) => group.name,
      (group: IndicatorGroupConfig, index: number) => {
        const visibility = group.visibility
          ? this._groupTemplateResults[index]?.visibility?.result.toString() !== 'false'
          : true;
        const color = group.color ? this._groupTemplateResults[index]?.color?.result : group.color;
        const { icon, name } = group;
        const active = this._activeGroupIndicator === index;
        const activeColor = color ? `--group-indicator-color: ${color}` : '';
        return html`
          <div
            class="item active-btn"
            style=${activeColor}
            @click=${() => this._toggleGroupIndicator(index)}
            ?active=${active}
            ?hidden=${!visibility}
          >
            <ha-icon icon=${icon}></ha-icon>
            <div class="added-item-arrow">
              <span>${name}</span>
              <div class="subcard-icon" ?active=${active} style="margin-bottom: 2px">
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </div>
            </div>
          </div>
        `;
      }
    )}`;
  }

  public _toggleGroupIndicator(index: number): void {
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
      setTimeout(() => {
        distpatchEvent(null);
      }, 0);
    } else {
      this._activeGroupIndicator = null;
      setTimeout(() => {
        this._activeGroupIndicator = index;
        distpatchEvent(index);
      }, 400);
    }
  }
}
