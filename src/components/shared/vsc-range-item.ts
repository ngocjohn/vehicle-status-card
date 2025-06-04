import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import cardcss from '../../css/card.css';
import {
  ButtonActionConfig,
  HomeAssistant,
  RangeInfoConfig,
  RenderTemplateResult,
  subscribeRenderTemplate,
} from '../../types';
import { addActions, hasTemplate } from '../../utils';
import { hasActions } from '../../utils/ha-helper';

const TEMPLATE_KEYS = ['color_template', 'charging_template'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-range-item')
export class VscRangeItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) rangeItem!: RangeInfoConfig;

  @state() private _templateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return [
      cardcss,
      css`
        *[has-actions]:hover {
          color: var(--primary-color);
          transition: color 0.3s ease-in-out;
        }
        .fuel-wrapper {
          height: var(--vsc-bar-height);
          border-radius: var(--vsc-bar-radius);
          flex-basis: var(--vsc-bar-width);
          position: relative;
        }
        .fuel-wrapper::after {
          content: '';
          position: absolute;
          top: 50%;
          left: var(--vsc-bar-charge-target);
          width: 3px;
          height: calc(var(--vsc-bar-height) - 3px);
          background-color: var(--vsc-bar-target-color);
          border-radius: var(--vsc-bar-radius);
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
          transform: translateY(-50%);
          display: var(--vsc-bar-target-display, none);
        }
      `,
    ];
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
    this._addActions();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      this._tryConnect();
    }
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
    const templateValue = this.rangeItem[key];
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
          template: templateValue ?? '',
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
        result: templateValue ?? '',
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

  private _addActions(): void {
    const energeActions = this.getValue('energyActions');
    const rangeActions = this.getValue('rangeActions');
    if (hasActions(energeActions)) {
      // console.log('energy', this.rangeItem.energy_level.entity, 'has actions', energeActions);
      const energyItem = this.shadowRoot?.getElementById('energy-item') as HTMLElement;
      addActions(energyItem, energeActions);
    }
    if (hasActions(rangeActions)) {
      // console.log(this.rangeItem.range_level?.entity, 'has actions', rangeActions);
      const rangeItem = this.shadowRoot?.getElementById('range-item') as HTMLElement;
      addActions(rangeItem, rangeActions);
    }
  }

  private getValue(key: string) {
    const {
      energy_level,
      range_level,
      charging_entity,
      progress_color,
      bar_height,
      bar_radius,
      bar_width,
      charging_template,
      charge_target_entity,
      charge_target_color,
    } = this.rangeItem;
    const energyEntity = energy_level?.entity;
    const energyAttr = energy_level?.attribute;
    const rangeEntity = range_level?.entity;
    const rangeAttr = range_level?.attribute;
    const energyActions = {
      entity: energyEntity,
      tap_action: energy_level?.tap_action,
      hold_action: energy_level?.hold_action,
      double_tap_action: energy_level?.double_tap_action,
    } as ButtonActionConfig;
    const rangeActions = {
      entity: rangeEntity || '',
      tap_action: range_level?.tap_action,
      hold_action: range_level?.hold_action,
      double_tap_action: range_level?.double_tap_action,
    } as ButtonActionConfig;

    const getEntityState = (entity?: string, attr?: string) =>
      entity && this.hass.states[entity]
        ? attr
          ? this.hass.formatEntityAttributeValue(this.hass.states[entity], attr)
          : this.hass.formatEntityState(this.hass.states[entity])
        : '';

    switch (key) {
      case 'icon':
        return energy_level?.icon ?? '';

      case 'energyState':
        return getEntityState(energyEntity, energyAttr);

      case 'rangeState':
        return getEntityState(rangeEntity, rangeAttr);

      case 'level':
        return parseInt(this.getValue('energyState'), 10) || 0;

      case 'barColor':
        return this._templateResults['color_template']?.result ?? progress_color;

      case 'chargingState': {
        const state = charging_template
          ? this._templateResults['charging_template']?.result.toString() === 'true'
          : charging_entity
          ? ['on', 'charging', 'true'].includes(this.hass.states[charging_entity]?.state)
          : '';
        return state;
      }

      case 'targetChargeState':
        if (!charge_target_entity) {
          return '';
        }
        const targetState = getEntityState(charge_target_entity);
        return parseInt(targetState, 10) || 0;

      case 'targetChargeColor':
        return charge_target_color || 'accent';

      case 'energyEntity':
        return energyEntity;

      case 'rangeEntity':
        return rangeEntity;
      case 'barHeight':
        return bar_height || 5;
      case 'barWidth':
        return bar_width || 60;
      case 'barRadius':
        return bar_radius || 4;
      case 'energyActions':
        return energyActions || {};
      case 'rangeActions':
        return rangeActions || {};
    }
  }

  protected render(): TemplateResult {
    const icon = this.getValue('icon');
    const energyState = this.getValue('energyState');
    const rangeState = this.getValue('rangeState');
    const level = this.getValue('level');
    const barColor = this.getValue('barColor');
    const booleanChargingState = this.getValue('chargingState');
    const barHeight = this.getValue('barHeight');
    const barWidth = this.getValue('barWidth');
    const barRadius = this.getValue('barRadius');
    const targetChargeState = this.getValue('targetChargeState');
    const targetChargeColor = this.getValue('targetChargeColor');

    const styles = {
      '--vsc-bar-height': `${barHeight}px`,
      '--vsc-bar-width': `${barWidth}%`,
      '--vsc-bar-radius': `${barRadius}px`,
      '--vsc-bar-level': `${level}%`,
      '--vsc-bar-color': barColor,
      '--vsc-bar-charge-target': `${targetChargeState}%`,
      '--vsc-bar-target-display': booleanChargingState ? 'block' : 'none',
      '--vsc-bar-target-color': `var(--${targetChargeColor}-color)`,
    };

    return html` <div class="info-box range" style="${styleMap(styles)}">
      <div class="item" ?hidden="${!energyState}" id="energy-item">
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
        <div class="fuel-level-bar" style="width: ${level}%; background: ${barColor};"></div>
      </div>
      <div class="item" ?hidden="${!rangeState}" id="range-item">
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
