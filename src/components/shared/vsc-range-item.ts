import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import cardcss from '../../css/card.css';
import {
  ButtonActionConfig,
  HomeAssistant,
  RangeInfoConfig,
  RangeItemConfig,
  RenderTemplateResult,
  subscribeRenderTemplate,
} from '../../types';
import { addActions, hasTemplate } from '../../utils';
import { hasActions } from '../../utils/ha-helper';

const TEMPLATE_KEYS = ['color_template', 'charging_template', 'charge_target_visibility'] as const;
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
        .fuel-container {
          display: flex;
          align-items: center;
          justify-content: center;
          /* height: 100%; */
          max-width: 100%;
          width: var(--vsc-bar-width);
          position: relative;
        }
        .fuel-wrapper {
          width: 100%;
          height: var(--vsc-bar-height);
          border-radius: var(--vsc-bar-radius);
          background-color: #90909040;
          align-items: center;
        }

        .fuel-level-bar {
          position: absolute;
          background-color: #4caf50;
          border-radius: var(--vsc-bar-radius);
          height: 100%;
          width: var(--vic-range-width);
          display: inline-flex;
          justify-content: flex-end;
          align-items: center;
          z-index: 4;
          padding-inline: var(--vic-card-padding);
          box-sizing: border-box;
          min-width: fit-content;
        }
        .fuel-level-bar[charging] {
          justify-content: space-between;
          gap: var(--vic-gutter-gap);
        }
        /* .fuel-wrapper span {
          text-shadow: 1px 1px 2px #000000;
          font-weight: 500;
        } */
        .fuel-wrapper span.energy-inside {
          z-index: 3;
          position: absolute;
          top: 50%;
          right: 0;
          opacity: 0.8;
          transform: translateY(-50%);
          padding-inline-end: var(--vic-card-padding);
        }

        .charging-icon {
          --mdc-icon-size: inherit;
          position: relative;
          animation: fill-color 4s steps(5) infinite;
          color: var(--range-bar-color);
          transform: rotate(90deg) !important;
          margin-bottom: 0 !important;
        }

        .fuel-level-bar > .charging-icon {
          color: var(--primary-text-color) !important;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        }

        @keyframes fill-color {
          0%,
          100% {
            clip-path: inset(100% 0 0 0);
            /* Fully hidden */
            color: var(--primary-text-color) !important;
          }

          50% {
            clip-path: inset(0 0 0 0);
            color: var(--range-bar-color);
          }

          75% {
            clip-path: inset(0 0 0 0);
            color: var(--range-bar-color);
          }
        }
        ha-tooltip .charge-target {
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
          z-index: 5;
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
    const r = this.rangeItem;
    const hass = this.hass;

    const getEntityState = (entity?: string, attr?: string) =>
      entity && hass.states[entity]
        ? attr
          ? hass.formatEntityAttributeValue(hass.states[entity], attr)
          : hass.formatEntityState(hass.states[entity])
        : '';

    const getActions = (config?: RangeItemConfig): ButtonActionConfig => ({
      entity: config?.entity || '',
      tap_action: config?.tap_action,
      hold_action: config?.hold_action,
      double_tap_action: config?.double_tap_action,
    });

    switch (key) {
      case 'icon':
        return r.energy_level?.icon ?? '';

      case 'rangeIcon':
        return r.range_level?.icon ?? '';
      case 'energyState':
        return getEntityState(r.energy_level?.entity, r.energy_level?.attribute);

      case 'rangeState':
        return getEntityState(r.range_level?.entity, r.range_level?.attribute);

      case 'level':
        return parseInt(this.getValue('energyState'), 10) || 0;

      case 'barColor':
        return this._templateResults['color_template']?.result ?? r.progress_color;

      case 'chargingState': {
        if (r.charging_template) {
          return this._templateResults['charging_template']?.result.toString() === 'true';
        }
        const state = hass.states[r.charging_entity || '']?.state;
        return ['on', 'charging', 'true'].includes(state);
      }

      case 'targetEntityState':
        return getEntityState(r.charge_target_entity);

      case 'targetChargeState': {
        const state = getEntityState(r.charge_target_entity);
        return parseInt(state, 10) || 0;
      }

      case 'targetChargeColor':
        return r.charge_target_color || 'accent';

      case 'targetChargeVisibility':
        return r.charge_target_visibility
          ? this._templateResults['charge_target_visibility']?.result.toString() === 'true'
          : r.charge_target_entity ?? false;

      case 'targetTooltip':
        return r.charge_target_tooltip || false;

      case 'barHeight':
        return r.bar_height || 5;

      case 'barWidth':
        return r.bar_width || 100;

      case 'barRadius':
        return r.bar_radius || 4;

      case 'energyActions':
        return getActions(r.energy_level);

      case 'rangeActions':
        return getActions(r.range_level);

      case 'energyPosition':
        return r.energy_level?.value_position || 'outside';
      case 'rangePosition':
        return r.range_level?.value_position || 'outside';
      default:
        return undefined;
    }
  }

  protected render(): TemplateResult {
    const icon = this.getValue('icon');
    const energyState = this.getValue('energyState');
    const rangeState = this.getValue('rangeState');
    const rangeIcon = this.getValue('rangeIcon');
    const level = this.getValue('level');
    const barColor = this.getValue('barColor');
    const booleanChargingState = this.getValue('chargingState');
    const barHeight = this.getValue('barHeight');
    const barWidth = this.getValue('barWidth') || 100; // Default to 100% width
    const barRadius = this.getValue('barRadius');
    const targetEntityState = this.getValue('targetEntityState');
    const targetChargeState = this.getValue('targetChargeState');
    const targetChargeColor = this.getValue('targetChargeColor');
    const targetChargeVisibility = this.getValue('targetChargeVisibility');
    const targetTooltip = this.getValue('targetTooltip');
    const energyPosition = this.getValue('energyPosition');
    const rangePosition = this.getValue('rangePosition');

    const styles = {
      '--vsc-bar-height': `${barHeight}px`,
      '--vsc-bar-width': `${barWidth}%`,
      '--vsc-bar-radius': `${barRadius}px`,
      '--vsc-bar-level': `${level}%`,
      '--vsc-bar-color': barColor,
      '--vsc-range-bar-color': barColor,
      '--vsc-bar-charge-target': `${targetChargeState}%`,
      '--vsc-bar-target-display': targetChargeVisibility ? 'block' : 'none',
      '--vsc-bar-target-color': `var(--${targetChargeColor}-color)`,
      '--vsc-energy-state': `${energyState}`,
      '--vsc-range-state': `${rangeState}`,
    };

    const chargingIcon = html`<ha-icon
      icon="mdi:battery-high"
      class="charging-icon"
      ?hidden="${!booleanChargingState}"
      style="--range-bar-color: ${barColor};"
      title="Charging"
    ></ha-icon>`;

    const energyItem =
      !energyState || energyPosition !== 'outside'
        ? nothing
        : html` <div class="item" ?hidden="${!energyState || energyPosition !== 'outside'}" id="energy-item">
            <ha-icon icon="${icon}"></ha-icon>
            <span>${energyState}</span>
            ${chargingIcon}
          </div>`;

    return html` <div class="info-box range" style="${styleMap(styles)}">
      ${energyItem}
      </ha-icon>
      <div class="fuel-container">
        <ha-tooltip
          content=${`Target: ${targetEntityState}`}
          placement="right"
          distance="10"
          ?disabled="${!targetTooltip}"
        >
          <div class="charge-target"></div>
        </ha-tooltip>
        <div class="fuel-wrapper">
          <div class="fuel-level-bar" style="width: ${level}%; background: ${barColor};" ?charging="${booleanChargingState}">

            ${energyPosition === 'inside' ? html`${chargingIcon}<span id="energy-item">${energyState}</span>` : nothing}
          </div>
          ${
            rangePosition === 'inside'
              ? html`<span class="energy-inside" id="range-item">${rangeState}</span>`
              : nothing
          }
        </div>
      </div>
      <div class="item" ?hidden="${!rangeState || rangePosition !== 'outside'}" id="range-item">
        <ha-icon icon="${rangeIcon}"></ha-icon>
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
