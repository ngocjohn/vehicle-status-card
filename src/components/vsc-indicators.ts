import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import cardcss from '../css/card.css';
import { HomeAssistant, VehicleStatusCardConfig } from '../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../types';
import { isEmpty } from '../utils';
// components items
import './shared/vsc-indicator-single';
import './shared/vsc-indicator-group-item';

const TEMPLATE_KEYS = ['color', 'visibility'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-indicators')
export class VscIndicators extends LitElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @property({ attribute: false }) private config!: VehicleStatusCardConfig;

  @state() private _activeGroupIndicator: number | null = null;

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
      this._checkVisibleSingle();
    }
    return true;
  }

  private _checkVisibleSingle(): void {
    const singleIndicators = this.shadowRoot?.querySelectorAll('vsc-indicator-single') as any;
    if (!singleIndicators || singleIndicators.length === 0) return;
    // console.log(singleIndicators);
    singleIndicators.forEach((single) => {
      // console.log(single);
      if (single._visibility === false) {
        single.style.display = 'none';
      } else {
        single.style.display = '';
      }
    });
  }

  private isTemplate(value: string | undefined): boolean {
    if (!value || typeof value !== 'string') return false;
    return value.includes('{');
  }

  private async _tryConnect(): Promise<void> {
    if (!isEmpty(this.config.indicators.group)) {
      const groupIndicators = this.config.indicators.group;
      for (let index = 0; index < groupIndicators.length; index++) {
        TEMPLATE_KEYS.forEach((key) => {
          this._subscribeRenderTemplate(index, key);
        });
      }
    }
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
    const activeIndex =
      this._activeGroupIndicator !== null ? this._activeGroupIndicator : this.config.indicators.group.length + 1;
    const items = this.config.indicators.group[activeIndex]?.items || [];
    const activeClass = this._activeGroupIndicator !== null ? 'info-box charge active' : 'info-box charge';

    return html`
      <div class=${activeClass}>
        ${items.map((item) => {
          return html` <vsc-indicator-group-item .hass=${this.hass} .item=${item}></vsc-indicator-group-item> `;
        })}
      </div>
    `;
  }

  private _renderSingleIndicators(): TemplateResult {
    const singleIndicators = this.config.indicators.single;
    if (!singleIndicators || singleIndicators.length === 0) return html``;
    const indicator = singleIndicators.map((indicator) => {
      return html` <vsc-indicator-single .hass=${this.hass} .indicator=${indicator}></vsc-indicator-single> `;
    });

    return html`${indicator}`;
  }

  private _renderGroupIndicators(): TemplateResult {
    const configGroupIndicators = this.config.indicators.group;
    if (!configGroupIndicators || configGroupIndicators.length === 0) return html``;

    const groupIndicators = configGroupIndicators.map((group, index) => {
      const visible =
        group.visibility === '' || this._groupTemplateResults[index]?.visibility?.result.toString() !== 'false';
      const icon = group.icon;
      const color = group.color ? this._groupTemplateResults[index]?.color?.result : group.color || '';
      const name = group.name;
      const active = this._activeGroupIndicator === index;
      return visible
        ? html`
            <div class="item active-btn" @click=${() => this._toggleGroupIndicator(index)}>
              <ha-icon icon=${icon} style=${color ? `color: ${color}` : ''}></ha-icon>
              <div class="added-item-arrow">
                <span>${name}</span>
                <div class="subcard-icon" ?active=${active} style="margin-bottom: 2px">
                  <ha-icon icon="mdi:chevron-down"></ha-icon>
                </div>
              </div>
            </div>
          `
        : html``;
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
