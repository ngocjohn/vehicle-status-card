import { css, CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { ActionsSharedConfig, hasItemAction, RangeItemConfig } from '../../../types/config';
import { VscBaseRange } from '../../../utils/base-range';
import { generateColorBlocks, generateGradient, getColorForLevel, getNormalizedValue } from '../../../utils/colors';
import { addActions } from '../../../utils/lovelace/tap-action';
import './vsc-range-bar';

@customElement('vsc-range-item')
export class VscRangeItem extends VscBaseRange {
  constructor() {
    super();
  }
  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    await new Promise((resolve) => setTimeout(resolve, 0));
    this._addActions();
  }

  private _addActions(): void {
    const { _energyActionsConfig, _rangeActionsConfig } = this;
    if (hasItemAction(_energyActionsConfig)) {
      const energyItem = this.shadowRoot?.getElementById('energy-item') as HTMLElement;
      if (!energyItem) {
        return;
      }
      addActions(energyItem, _energyActionsConfig);
    }
    if (hasItemAction(_rangeActionsConfig)) {
      const rangeItem = this.shadowRoot?.getElementById('range-item') as HTMLElement;
      if (!rangeItem) {
        return;
      }
      addActions(rangeItem, _rangeActionsConfig);
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
        return r.energy_level?.icon;
      case 'energyIconHidden':
        return r.energy_level?.hide_icon ?? false;

      case 'rangeIcon':
        return r.range_level?.icon;

      case 'rangeIconHidden':
        return r.range_level?.hide_icon ?? false;

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
        if (!state) {
          return undefined;
        }
        return parseInt(state, 10);
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
      case 'rangeStateColor':
        const normalizedLevel = this.getValue('normalizedWidth');
        const level = this.getValue('level');
        if (normalizedLevel > 90) {
          const rangeColor = r.color_thresholds
            ? getColorForLevel(r.color_thresholds, level, entityMax) || this.getValue('barBackground')
            : r.progress_color;
          return rangeColor;
        } else {
          return this.getValue('barBackground');
        }
        break;
      case 'chargingColor':
        const currentLevel = this.getValue('normalizedWidth');
        const chargingColor = r.color_thresholds
          ? currentLevel <= 4
            ? this.getValue('barBackground')
            : r.color_thresholds[0]?.color || this.getValue('barBackground')
          : 'var(--vsc-bar-background)';
        return chargingColor;

        break;

      default:
        return undefined;
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this.rangeItem) {
      return nothing;
    }

    const get = (key: string) => this.getValue(key);
    const targetState = get('targetChargeState');
    const itemsInside = get('energyPosition') === 'inside' || get('rangePosition') === 'inside';
    return html` <div class="info-box range" style=${this._computeStyles()}>
      ${this._renderLevelItem('energy')}
      <vsc-range-bar ?itemsInside=${itemsInside} ._targetChargeState=${targetState}>
        ${this._renderInsideItems()}
      </vsc-range-bar>
      ${this._renderLevelItem('range')}
    </div>`;
  }

  private _renderChargingIcon(): TemplateResult {
    const notCharging = !this.getValue('chargingState');
    if (notCharging) {
      return html``;
    }
    const barColor = this.getValue('barColor');
    return html`
      <ha-icon
        icon="mdi:battery-high"
        class="charging-icon"
        style="--range-bar-color: ${barColor};"
        title="Charging"
      ></ha-icon>
    `;
  }

  private _renderLevelItem(type: 'energy' | 'range'): TemplateResult | typeof nothing {
    const levelState = type === 'energy' ? this.getValue('energyState') : this.getValue('rangeState');
    const levelConfig = type === 'energy' ? this._energyLevel : this._rangeLevel;
    const { value_position, hide_icon, icon, entity } = levelConfig || {};
    if (!levelState || value_position === 'off' || value_position === 'inside') {
      return nothing;
    }
    const levelStateObj = this.hass.states[entity!];
    return html`
      <div class="item" id="${type}-item">
        ${!hide_icon
          ? html` <ha-state-icon .hass=${this._hass} .stateObj=${levelStateObj} icon=${icon}></ha-state-icon> `
          : nothing}
        <span>${levelState}</span>
        ${type === 'energy' ? this._renderChargingIcon() : nothing}
      </div>
    `;
  }

  private _renderInsideItems(): TemplateResult[] {
    const get = (key: string) => this.getValue(key);
    const enegyInside = get('energyPosition') === 'inside';
    const rangeInside = get('rangePosition') === 'inside';
    const insideItems: TemplateResult[] = [];
    if (enegyInside) {
      insideItems.push(
        html`
          <div
            slot="energy-level"
            class="energy-inside-container"
            ?charging=${get('chargingState')}
            align=${get('energyAlignment')}
          >
            ${this._renderChargingIcon()}
            <span id="energy-item" class="energy-inside">${get('energyState')}</span>
          </div>
        `
      );
    }
    if (rangeInside) {
      insideItems.push(
        html` <span id="range-item" class="range-inside" slot="range-level">${get('rangeState')}</span> `
      );
    }
    return insideItems;
  }

  private _computeStyles() {
    const get = (key: string) => this.getValue(key);
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
      '--vsc-bar-range-color': get('rangeStateColor'),
      '--vsc-bar-charging-color': get('chargingColor'),
    };
    return styleMap(styles);
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .energy-inside-container {
          gap: var(--vic-gutter-gap);
          padding-inline-end: var(--vic-card-padding);
        }

        .energy-inside-container[align='start'] {
          justify-content: flex-start;
        }

        .energy-inside-container:not([charging])[align='end'] {
          justify-content: flex-end;
        }

        .energy-inside-container[charging][align='end'] {
          justify-content: space-between;
        }
        .energy-inside-container > .charging-icon,
        .energy-inside,
        .range-inside {
          filter: invert(1) grayscale(1) brightness(1.3) contrast(9000);
          mix-blend-mode: luminosity;
          opacity: 0.8;
          font-weight: 500;
        }
        .energy-inside {
          /* text-shadow: 1px 1px 2px var(--card-background-color); */
          color: var(--vsc-bar-energy-color);
        }
        .range-inside {
          color: var(--vsc-bar-range-color);
        }

        .charging-icon {
          --mdc-icon-size: inherit;
          position: relative;
          animation: fill-color 4s steps(5) infinite;
          color: var(--range-bar-color);
          transform: rotate(90deg) !important;
          margin-bottom: 0 !important;
        }

        .energy-inside-container > .charging-icon {
          color: var(--vsc-bar-charging-color) !important;
        }
        /* .energy-inside-container > .charging-icon {
          color: var(--primary-text-color) !important;
        } */

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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-range-item': VscRangeItem;
  }
}
