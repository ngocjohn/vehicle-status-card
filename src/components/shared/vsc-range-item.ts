import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import cardcss from '../../css/card.css';
import { HomeAssistant, RangeInfoConfig, RenderTemplateResult, subscribeRenderTemplate } from '../../types';
import { fireEvent } from '../../types/ha-frontend/fire-event';
import { hasTemplate } from '../../utils';

const TEMPLATE_KEYS = ['color_template'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-range-item')
export class VscRangeItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) rangeItem!: RangeInfoConfig;

  @state() private _templateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

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

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      this._tryConnect();
    }
  }

  private isTemplate(key: string) {
    const value = this.rangeItem[key];
    return hasTemplate(value);
  }

  private async _tryConnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this.hass || !hasTemplate(this.rangeItem[key])) {
      return;
    }

    const rangeItem = this.rangeItem;
    const colorTemplate = rangeItem.color_template;
    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [key]: result,
          };
        },
        {
          template: colorTemplate ?? '',
          entity_ids: rangeItem.energy_level.entity ? [rangeItem.energy_level.entity] : undefined,
          variables: {
            config: rangeItem,
            user: this.hass.user!.name,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error rendering template', e);
      const result = {
        result: colorTemplate ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [key]: result,
      };
      this._unsubRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  private getValue(key: string) {
    const { energy_level, range_level, charging_entity, progress_color } = this.rangeItem;
    const energyEntity = energy_level?.entity;
    const energyAttr = energy_level?.attribute;
    const rangeEntity = range_level?.entity;
    const rangeAttr = range_level?.attribute;

    const getEntityState = (entity?: string, attr?: string) =>
      entity && this.hass.states[entity]
        ? attr
          ? this.hass.formatEntityAttributeValue(this.hass.states[entity], attr)
          : this.hass.formatEntityState(this.hass.states[entity])
        : '';

    switch (key) {
      case 'icon':
        return energy_level?.icon ?? this.hass.states[energyEntity]?.attributes.icon ?? 'mdi:gas-station';

      case 'energyState':
        return getEntityState(energyEntity, energyAttr);

      case 'rangeState':
        return getEntityState(rangeEntity, rangeAttr);

      case 'level':
        return parseInt(this.getValue('energyState'), 10) || 0;

      case 'barColor':
        return this._templateResults['color_template']?.result ?? progress_color;

      case 'chargingState': {
        const state = this.hass.states[charging_entity || '']?.state;
        return ['charging', 'on', 'true'].includes(state);
      }

      case 'energyEntity':
        return energyEntity;

      case 'rangeEntity':
        return rangeEntity;
    }
  }

  protected render(): TemplateResult {
    const icon = this.getValue('icon');
    const energyState = this.getValue('energyState');
    const rangeState = this.getValue('rangeState');
    const level = this.getValue('level');
    const barColor = this.getValue('barColor');
    const booleanChargingState = this.getValue('chargingState');
    const energyEntity = this.getValue('energyEntity');
    const rangeEntity = this.getValue('rangeEntity');

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
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-range-item': VscRangeItem;
  }
}
