import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import cardcss from '../../css/card.css';
import { HomeAssistant, RenderTemplateResult, subscribeRenderTemplate, hasTemplate } from '../../ha';
import {
  ActionsSharedConfig,
  hasItemAction,
  RangeInfoConfig,
  RangeItemConfig,
  RangeInfoTemplateKey,
  RANGE_INFO_TEMPLATE_KEYS,
} from '../../types/config';
import { BaseElement } from '../../utils/base-element';
import { generateColorBlocks, generateGradient, getColorForLevel, getNormalizedValue } from '../../utils/colors';
import { addActions } from '../../utils/lovelace/tap-action';

@customElement('vsc-range-item')
export class VscRangeItem extends BaseElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @property({ attribute: false }) rangeItem!: RangeInfoConfig;

  @state() private _templateResults: Partial<Record<RangeInfoTemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubRenderTemplates: Map<RangeInfoTemplateKey, Promise<UnsubscribeFunc>> = new Map();

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
        .fuel-container[itemsInside] {
          min-height: fit-content !important;
        }
        .fuel-wrapper {
          width: 100%;
          height: var(--vsc-bar-height);
          border-radius: var(--vsc-bar-radius);
          background-color: var(--vsc-bar-background);
          align-items: center;
        }

        .fuel-level-background {
          position: absolute;
          width: calc(var(--vsc-bar-level) - 1px);
          background: -moz-linear-gradient(90deg, var(--vsc-range-gradient-color));
          background: -webkit-linear-gradient(90deg, var(--vsc-range-gradient-color));
          background: linear-gradient(90deg, var(--vsc-range-gradient-color));
          border-radius: var(--vsc-bar-radius);
          max-width: 100% !important;
          transition: width 0.4s ease-in-out;
          top: 0;
          bottom: 0;
          z-index: 2;
          margin: 2px 0;
        }

        .fuel-container[itemsInside] .fuel-wrapper {
          height: 100%;
          min-height: var(--vsc-bar-min-height);
        }

        .fuel-level-bar {
          position: absolute;
          background-color: transparent;
          width: var(--vsc-bar-level);
          display: inline-flex;
          z-index: 2;
          padding-inline: var(--vic-card-padding);
          box-sizing: border-box;
          max-width: 100% !important;
          transition: width 0.4s ease-in-out;
          top: 0;
          bottom: 0;
          min-width: fit-content;
          /* color: black; */
          gap: var(--vic-gutter-gap);
          align-items: center;
        }

        .fuel-level-bar[align='start'] {
          justify-content: flex-start;
        }

        .fuel-level-bar:not([charging])[align='end'] {
          justify-content: flex-end;
        }

        .fuel-level-bar[charging][align='end'] {
          justify-content: space-between;
        }

        .energy-inside {
          /* text-shadow: 1px 1px 2px var(--card-background-color); */
          color: var(--vsc-bar-energy-color);
          filter: invert(1) grayscale(1) brightness(1.3) contrast(9000);
          mix-blend-mode: luminosity;
          opacity: 0.8;
          font-weight: 500;
        }

        .fuel-wrapper span.range-inside {
          z-index: 1;
          position: absolute;
          top: 50%;
          right: 0.5em;
          opacity: 0.8;
          transform: translateY(-50%);
          /* padding-inline-end: var(--vic-card-padding); */
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
          z-index: 4;
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
    await new Promise((resolve) => setTimeout(resolve, 0));
    this._addActions();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      this._tryConnect();
    }
  }

  private async _tryConnect(): Promise<void> {
    RANGE_INFO_TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: RangeInfoTemplateKey): Promise<void> {
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
    RANGE_INFO_TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: RangeInfoTemplateKey): Promise<void> {
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
    if (hasItemAction(energeActions)) {
      const energyItem = this.shadowRoot?.getElementById('energy-item') as HTMLElement;
      if (!energyItem) {
        return;
      }
      addActions(energyItem, energeActions);
    }
    if (hasItemAction(rangeActions)) {
      const rangeItem = this.shadowRoot?.getElementById('range-item') as HTMLElement;
      if (!rangeItem) {
        return;
      }
      addActions(rangeItem, rangeActions);
    }
  }

  private getValue(key: string) {
    if (!this.hass || !this.rangeItem) {
      return undefined;
    }
    const r = this.rangeItem;
    const hass = this.hass;

    const getEntityState = (entity?: string, attr?: string) =>
      entity && hass.states[entity]
        ? attr
          ? hass.formatEntityAttributeValue(hass.states[entity], attr)
          : hass.formatEntityState(hass.states[entity])
        : '';

    const getActions = (config?: RangeItemConfig): ActionsSharedConfig => ({
      entity: config?.entity || '',
      tap_action: config?.tap_action,
      hold_action: config?.hold_action,
      double_tap_action: config?.double_tap_action,
    });

    const entityMax = r.energy_level?.max_value
      ? r.energy_level.max_value
      : hass.states?.[r.energy_level?.entity || '']?.attributes?.max ?? 100;

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

      case 'barBackground':
        return r.bar_background || 'var(--secondary-background-color, #90909040)';

      case 'gradient':
        if (!r.color_thresholds || r.color_thresholds.length === 0) {
          return this.getValue('barColor');
        }
        const background = r.color_blocks
          ? generateColorBlocks(r.color_thresholds, this.getValue('level'), entityMax)
          : generateGradient(r.color_thresholds, this.getValue('level'), entityMax);
        return background;

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
        return r.bar_height || 14;

      case 'barWidth':
        return r.bar_width || 100;

      case 'barRadius':
        return r.bar_radius || 5;

      case 'energyActions':
        return getActions(r.energy_level);

      case 'rangeActions':
        return getActions(r.range_level);

      case 'energyPosition':
        return r.energy_level?.value_position || 'outside';
      case 'rangePosition':
        return r.range_level?.value_position || 'outside';
      case 'energyAlignment':
        return r.energy_level?.value_alignment || 'start';

      case 'normalizedWidth':
        return getNormalizedValue(r.color_thresholds || [], this.getValue('level'), entityMax);

      case 'energyMax':
        return entityMax;

      case 'energyStateColor':
        const currentColor =
          r.color_thresholds && r.energy_level?.value_alignment === 'start'
            ? this.getValue('level') < 3
              ? this.getValue('barBackground')
              : r.color_thresholds[0]?.color || this.getValue('barBackground')
            : r.color_thresholds && r.energy_level?.value_alignment === 'end'
            ? getColorForLevel(r.color_thresholds, this.getValue('level'), entityMax) || this.getValue('barBackground')
            : this.getValue('level') > 2
            ? r.progress_color
            : this.getValue('barBackground');

        return currentColor;

      default:
        return undefined;
    }
  }
  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this.rangeItem) {
      return nothing;
    }
    const get = (key: string) => this.getValue(key);
    const itemsInside = get('energyPosition') === 'inside' || get('rangePosition') === 'inside';
    const minHeight = get('barHeight') > 20 ? get('barHeight') : 20; // Ensure minimum height for the bar
    const styles = {
      '--vsc-bar-height': `${get('barHeight')}px`,
      '--vsc-bar-min-height': `${minHeight}px`,
      '--vsc-bar-width': `${get('barWidth') || 100}%`,
      '--vsc-bar-radius': `${get('barRadius')}px`,
      '--vsc-bar-level': `${get('normalizedWidth')}%`,
      '--vsc-bar-color': get('barColor'),
      '--vsc-range-gradient-color': get('gradient'),
      '--vsc-bar-charge-target': `${get('targetChargeState')}%`,
      '--vsc-bar-target-display': get('targetChargeVisibility') ? 'block' : 'none',
      '--vsc-bar-target-color': `var(--${get('targetChargeColor')}-color)`,
      '--vsc-energy-state': `${get('energyState')}`,
      '--vsc-range-state': `${get('rangeState')}`,
      '--vsc-bar-background': get('barBackground'),
      '--vsc-bar-energy-color': get('energyStateColor'),
    };

    const chargingIcon = html`
      <ha-icon
        icon="mdi:battery-high"
        class="charging-icon"
        ?hidden=${!get('chargingState')}
        style="--range-bar-color: ${get('barColor')};"
        title="Charging"
      ></ha-icon>
    `;

    const showEnergyItem = get('energyState') && get('energyPosition') === 'outside';
    const energyItem = showEnergyItem
      ? html`
          <div class="item" id="energy-item">
            <ha-icon icon="${get('icon')}"></ha-icon>
            <span>${get('energyState')}</span>
            ${chargingIcon}
          </div>
        `
      : nothing;

    const insideEnergy =
      get('energyPosition') === 'inside'
        ? html`${chargingIcon}<span id="energy-item" class="energy-inside">${get('energyState')}</span>`
        : nothing;

    const insideRange =
      get('rangePosition') === 'inside'
        ? html`<span class="range-inside" id="range-item">${get('rangeState')}</span>`
        : nothing;

    const outsideRange =
      get('rangePosition') !== 'off'
        ? html`
            <div class="item" ?hidden=${!get('rangeState') || get('rangePosition') !== 'outside'} id="range-item">
              <ha-icon icon="${get('rangeIcon')}"></ha-icon>
              <span>${get('rangeState')}</span>
            </div>
          `
        : nothing;

    return html`
      <div class="info-box range" style=${styleMap(styles)}>
        ${energyItem}
        <div class="fuel-container" ?itemsInside=${itemsInside}>
          <ha-tooltip
            content="Target: ${get('targetEntityState')}"
            placement="right"
            distance="10"
            ?disabled=${!get('targetTooltip')}
          >
            <div class="charge-target"></div>
          </ha-tooltip>
          <div class="fuel-wrapper">
            <div class="fuel-level-background"></div>
            <div class="fuel-level-bar" ?charging=${get('chargingState')} align=${get('energyAlignment')}>
              ${insideEnergy}
            </div>
            ${insideRange}
          </div>
        </div>
        ${outsideRange}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-range-item': VscRangeItem;
  }
}
