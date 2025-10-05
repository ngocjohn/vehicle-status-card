import { html, TemplateResult, CSSResultGroup, nothing, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
// utils
import tinycolor from 'tinycolor2';

import '../shared/panel-yaml-editor';
import { findBatteryChargingEntity, findPowerEntities, fireEvent, getEntitiesByDomain, hasPercent } from '../../ha';
import { RangeInfoConfig, RangeItemConfig, Threshold, VehicleStatusCardConfig } from '../../types/config';
import { ConfigArea } from '../../types/config-area';
import { ICON } from '../../utils';
import {
  colorToRgb,
  createRandomPallete,
  generateColorBlocks,
  generateGradient,
  getColorForLevel,
  getNormalizedValue,
  randomHexColor,
  rgb2hex,
} from '../../utils/colors';
import * as Create from '../../utils/editor/create';
import { BaseEditor } from '../base-editor';
import { PANEL } from '../editor-const';
import {
  CHARGE_TARGET_KEYS,
  CHARGE_TARGET_SCHEMA,
  CHARGING_STATE_SCHEMA,
  DIMENSION_KEYS,
  PROGRESS_BAR_SCHEMA,
  RANGE_ITEM_SCHEMA,
  RANGE_LAYOUT,
} from '../form';

type ITEM_ACTION = 'add' | 'delete-item' | 'edit-item' | 'edit-yaml' | 'back-to-list';

const COLOR_STYLES = ['basic', 'color_thresholds'] as const;
type ColorStyle = (typeof COLOR_STYLES)[number];

@customElement(PANEL.RANGE_INFO)
export class PanelRangeInfo extends BaseEditor {
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;

  @state() private _activeIndexItem: number | null = null;
  @state() private _colorTestValue?: number | undefined = undefined;
  @state() private _selectedStyle: ColorStyle = 'basic';

  @state() private _yamlEditorActive = false;
  @state() private _yamlItemEditorActive = false;
  @state() private _rangeItemConfig?: RangeInfoConfig;
  @state() private _colorThresholds?: Threshold[];

  @state() private _maxValue?: number;
  @state() private _overValue?: number;
  @state() private _overValueTimeout?: number;

  constructor() {
    super(ConfigArea.RANGE_INFO);
  }
  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        *[hidden] {
          display: none;
        }
        ha-icon.tooltip-icon {
          color: var(--secondary-text-color);
          cursor: pointer;
        }
        .tooltip-icon:hover {
          color: var(--primary-text-color);
        }

        .sub-panel.section {
          margin-block: var(--vic-card-padding);
        }
        @keyframes glowBorder {
          0% {
            box-shadow: 0 0 5px var(--primary-color, #03a9f4);
          }
          50% {
            box-shadow: 0 0 15px var(--primary-color, #03a9f4);
          }
          100% {
            box-shadow: 0 0 5px var(--primary-color, #03a9f4);
          }
        }

        .animation-glow {
          animation: glowBorder 1.5s ease-in-out;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }

        .item-content.gradient-preview {
          padding: var(--vic-card-padding) var(--vic-gutter-gap);
          display: flex;
          flex-direction: column;
          width: auto;
          margin: auto;
          background-color: var(--card-background-color);
          border-radius: var(--ha-card-border-radius, 8px);
          border: 1px solid var(--divider-color);
          gap: var(--vic-card-padding);
          padding: var(--vic-card-padding);
          margin-bottom: 0.5rem;
        }

        .item-content.gradient-preview .range-bar-row {
          display: flex;
          flex-direction: row;
          width: 100%;
          position: relative;
          align-items: center;
          gap: 0.5rem;
        }
        .range-bar-row .range-outside,
        .range-bar-row .energy-outside {
          display: flex;
          width: fit-content;
          margin-inline: 0.5rem;
          align-items: center;
          --mdc-icon-size: 17px;
          gap: 4px;
          line-height: 0;
          height: max-content;
        }
        .range-bar-row .range-outside[hidden],
        .range-bar-row .energy-outside[hidden] {
          display: none !important;
        }
        .range-inside {
          /* z-index: 3; */
          position: absolute;
          top: 50%;
          right: 0.5em;
          opacity: 0.8;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .range-bar-row .bar-wrapper {
          display: flex;
          flex: 1 1 0;
          position: relative;
          width: 100%;
          flex-direction: column;
        }

        .on-hover-value {
          position: relative;
          width: 100%;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .on-hover-value .hover-value {
          position: absolute;
          top: 0;
          bottom: 0;
          width: fit-content;
          justify-content: center;
          align-items: center;
          color: var(--primary-text-color);
          background-color: var(--primary-color, #03a9f4);
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
          text-shadow: 1px 1px 2px var(--card-background-color);
          padding: 0 0.5rem;
        }

        .gradient-bg {
          display: block;
          position: relative;
          width: 100%;
          align-items: center;
          box-sizing: border-box;
          overflow: hidden;
          cursor: copy;
        }
        .gradient-bg .fill-bg {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          transition: width 0.4s ease-in-out;
          max-width: 100%;
          pointer-events: none;
          z-index: 1;
        }
        .gradient-bg .energy-inside {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          box-sizing: border-box;
          padding-inline: 1em;
          min-width: fit-content;
          transition: width 0.4s ease-in-out;
          pointer-events: none;
          font-weight: 500;
          z-index: 2;
          pointer-events: none;
        }

        .gradient-bg .energy-inside span {
          filter: invert(1) grayscale(1) brightness(1.3) contrast(9000);
          mix-blend-mode: luminosity;
          opacity: 0.8;
          color: currentcolor;
          pointer-events: none;
        }
        .bar-wrapper:hover .threshold-dot-container {
          visibility: visible;
        }

        .threshold-dot-container {
          position: relative;
          height: 1.5em;
          margin-top: 0.3em;
          width: 100%;
          opacity: 0.6;
          visibility: hidden;
        }
        .threshold-dot-container:hover {
          opacity: 1;
        }
        .threshold-dot {
          position: absolute;
          top: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: transform 200ms ease-in-out, opacity 200ms ease-in-out;
          opacity: 0.8;
        }

        .threshold-dot:hover {
          transform: translate(-50%, -50%) scale(1.3) !important;
          opacity: 1 !important;
          border: 1px solid var(--white-color, #ffffff);
        }
        .threshold-dot:hover::after {
          content: attr(title);
          position: absolute;
          top: -2.5em;
          left: 50%;
          transform: translateX(-50%);
          background-color: var(--primary-text-color, #000000);
          color: var(--card-background-color, #ffffff);
          padding: 0.2em 0.5em;
          border-radius: 4px;
          font-size: 0.8em;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
        }

        .warning {
          --mdc-theme-primary: var(--accent-color, var(--warning-color));
        }
        .error {
          --mdc-theme-primary: var(--error-color);
        }
      `,
    ];
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (
      _changedProperties.has('_activeIndexItem') &&
      _changedProperties.get('_activeIndexItem') !== this._activeIndexItem
    ) {
      this._selectedStyle = 'basic'; // Reset to basic style when changing item
    }
    if (
      (_changedProperties.has('_selectedStyle') && this._selectedStyle === 'color_thresholds') ||
      (_changedProperties.has('_colorThresholds') &&
        _changedProperties.get('_colorThresholds') !== this._colorThresholds)
    ) {
      setTimeout(() => {
        const gradientEl = this.shadowRoot?.getElementById('gradient-bg') as HTMLDivElement;
        if (gradientEl) {
          gradientEl.addEventListener('click', this._manageGradientEvent.bind(this));
          gradientEl.addEventListener('mousemove', this._manageGradientEvent.bind(this));
          gradientEl.addEventListener('mouseleave', () => {
            this._overValue = undefined; // Reset on mouse leave
            if (this._overValueTimeout) {
              clearTimeout(this._overValueTimeout);
              this._overValueTimeout = undefined;
            }
          });
        }
      }, 0);
    }
  }

  private _manageGradientEvent(event: MouseEvent): void {
    event.stopPropagation();
    const target = event.target as HTMLDivElement;
    const width = target.clientWidth;

    const offsetX = event.offsetX;

    const percentage = Math.round((offsetX / width) * 100);

    const eventType = event.type;

    if (eventType === 'mousemove') {
      if (this._overValueTimeout) {
        clearTimeout(this._overValueTimeout);
      }

      this._overValueTimeout = window.setTimeout(() => {
        this._overValue = percentage;
      }, 250);
    } else if (eventType === 'click') {
      const valueNormalizer = Math.round((percentage / 100) * (this._maxValue || 100));
      this._addColorThreshold(valueNormalizer);
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="card-config">
        ${this._activeIndexItem !== null ? this._renderRangeConfigContent() : this._renderRangeConfigList()}
      </div>
    `;
  }

  private _toggleAction(action: ITEM_ACTION, index?: number): void {
    const updateChanged = (update: RangeInfoConfig[]) => {
      this._config = { ...this._config, range_info: update };
      fireEvent(this, 'config-changed', { config: this._config });
    };
    switch (action) {
      case 'add':
        let rangeInfo = [...(this._config.range_info || [])];

        const entities = Object.values(this._hass.states);

        const energyEntity = [
          ...(findPowerEntities(this._hass, entities) || []),
          ...(getEntitiesByDomain(this._hass.states, 50, ['number']) || []),
        ].map((entity) => {
          if (typeof entity === 'object') {
            return entity.entity_id;
          }
          return entity;
        });

        const batteryChargingEntity = findBatteryChargingEntity(this._hass, entities);

        // select entity that is not already in range_info
        const uniqueEntity = (energyEntity || []).find(
          (entity) => !rangeInfo.some((item) => item.energy_level.entity === entity)
        );
        console.log('Unique energy entity', uniqueEntity);

        const randomHex = randomHexColor();
        const newRangeInfo = {
          energy_level: {
            entity: uniqueEntity || '',
          },
          charging_entity: batteryChargingEntity?.entity_id || '',
          progress_color: randomHex,
        };
        rangeInfo.push(newRangeInfo);
        updateChanged(rangeInfo);
        this._activeIndexItem = rangeInfo.length - 1; // Set to the newly added item
        break;

      case 'delete-item':
        if (index !== undefined) {
          const rangeInfo = [...(this._config.range_info || [])];
          rangeInfo.splice(index, 1);
          updateChanged(rangeInfo);
        }
        break;

      case 'edit-item':
        if (index !== undefined) {
          console.log('Edit item', index);
          this._activeIndexItem = index;
          // this.requestUpdate();
        }
        break;
      case 'edit-yaml':
        this._yamlItemEditorActive = !this._yamlItemEditorActive;
        break;
      case 'back-to-list':
        this._yamlItemEditorActive = false;
        this._activeIndexItem = null;
        break;
      default:
        break;
    }
  }

  private _renderRangeConfigContent(): TemplateResult | typeof nothing {
    if (this._activeIndexItem === null) return nothing;

    const index = this._activeIndexItem;
    const rangeItem = { ...(this._config.range_info || [])[index] } as RangeInfoConfig;
    this._rangeItemConfig = rangeItem;

    const createSection = this._createSection;
    const selectedStyle = this._selectedStyle;

    const colorStyleSelect = html`
      <ha-control-select
        .hass=${this._hass}
        .options=${COLOR_STYLES.map((style) => ({
          value: style,
          label: style.replace('_', ' ').toUpperCase(),
        }))}
        .value=${selectedStyle}
        @value-changed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          this._selectedStyle = ev.detail.value;
        }}
      ></ha-control-select>
    `;

    const headerActions = this._yamlItemEditorActive
      ? [{ title: 'Close Editor', action: () => (this._yamlItemEditorActive = false), icon: ICON.CLOSE }]
      : [{ title: 'Back to list', action: () => this._toggleAction('back-to-list'), icon: ICON.CHEVRON_LEFT }];

    const yamlEditorToggle = [{ action: () => (this._yamlItemEditorActive = !this._yamlItemEditorActive) }];

    const energyLevelSection = createSection({
      energy_level: {
        title: 'Energy entity (Required)',
        helper: 'Entity to display the energy level (e.g., battery, fuel)',
        config: this._renderEnergyLevelConfig(rangeItem),
      },
    });

    const rangeLevelSection = createSection({
      range_level: {
        title: 'Range Level (Optional)',
        helper: 'Entity to display the range level (e.g., distance, range)',
        config: this._renderRangeLevelConfig(rangeItem),
      },
    });

    const chargingEntitiesSection = createSection({
      charging_entity: {
        title: 'Charging Entity',
        helper: 'Entity to display the charging status',
        config: this._renderChargingEntityConfig(rangeItem),
      },
      charge_target_entity: {
        title: 'Charge Target Entity',
        helper: 'Entity to display the target charge level',
        config: this._renderChargeTargetEntityConfig(rangeItem),
      },
    });

    const colorConfigSection =
      selectedStyle === 'basic'
        ? createSection({
            progress_color: {
              title: 'Progress Color',
              helper: 'Color to display the progress bar',
              config: this._renderBasicColors(rangeItem),
            },
            bar_background: {
              title: '',
              config: this._renderBarBackground(rangeItem),
            },
            color_template: {
              title: '',
              config: this._renderColorTemplate(rangeItem),
            },
          })
        : createSection({
            progress_color: {
              title: '',
              config: this._renderBasicColors(rangeItem),
            },
            color_thresholds: {
              title: 'Color Thresholds',
              helper: 'Define color thresholds for the progress bar',
              config: this._renderColorThresholds(rangeItem),
            },
          });

    const customizationSection = createSection({
      bar_dimensions: {
        title: 'Bar Dimensions',
        helper: 'Height(px) and Width(%) of the progress bar',
        config: this._renderBarDimensions(rangeItem),
      },
      color_style: {
        title: 'Choose Bar Style to Customize',
        config: colorStyleSelect,
      },
      color_section: {
        title: '',
        config: colorConfigSection,
      },
    });

    return html`
      ${this._renderHeader(`Range Info #${index + 1}`, undefined, headerActions, yamlEditorToggle)}
      ${this._yamlItemEditorActive
        ? html`
            <panel-yaml-editor
              .hass=${this._hass}
              .configDefault=${rangeItem}
              .configIndex=${index}
              .configKey=${'range_info_item'}
              has-extra-actions
              @close-editor=${() => (this._yamlItemEditorActive = false)}
              @yaml-config-changed=${this._onYamlConfigChanged}
            ></panel-yaml-editor>
          `
        : html`
            <div class="sub-panel-config" data-index=${index}>
              ${Create.ExpansionPanel({ content: energyLevelSection, options: { header: 'Energy level' } })}
              ${Create.ExpansionPanel({
                content: rangeLevelSection,
                options: { header: 'Range level (Optional)' },
              })}
              ${Create.ExpansionPanel({
                content: chargingEntitiesSection,
                options: { header: 'Charging entities (Optional)' },
              })}
              ${Create.ExpansionPanel({
                content: customizationSection,
                options: { header: 'Progress Bar Customization' },
              })}
            </div>
          `}
    `;
  }

  private _createSection(section: any): TemplateResult[] | TemplateResult {
    return Object.keys(section).map((key: string) => {
      const { title, helper, config } = section[key];
      return html` <div class="sub-panel section">
        <div class="sub-header">
          <span>${title}</span>
          ${helper
            ? html`
                <ha-tooltip content=${helper}>
                  <ha-icon class="tooltip-icon" icon="mdi:help-circle"></ha-icon>
                </ha-tooltip>
              `
            : nothing}
        </div>
        ${config}
      </div>`;
    });
  }

  private _renderRangeConfigList(): TemplateResult {
    const actionMap = [
      {
        title: 'Edit',
        icon: ICON.PENCIL,
        action: (index: number) => this._toggleAction('edit-item', index),
      },
      {
        title: 'Remove',
        icon: ICON.DELETE,
        action: (index: number) => this._toggleAction('delete-item', index),
        color: 'var(--error-color)',
        class: 'delete',
      },
    ];
    const LAYOUT_DATA = {
      layout: this._config.layout_config?.range_info_config?.layout ?? 'column',
    };
    const layoutForm = this._createVscForm(LAYOUT_DATA, RANGE_LAYOUT, 'layout_config', 'range_info_config');

    return html`${!this._yamlEditorActive && this._config.range_info
        ? html`
            ${layoutForm}
            <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved}>
              <div class="range-info-list">
                ${repeat(
                  this._config.range_info || [],
                  (rangeItem: RangeInfoConfig) => rangeItem.energy_level.entity,
                  (rangeItem: RangeInfoConfig, index: number) => {
                    const entity = rangeItem.energy_level.entity || '';
                    const icon = rangeItem.energy_level.icon || '';
                    const progressColor = rangeItem.progress_color || 'var(--primary-color)';
                    return html`
                      <div class="item-config-row" data-index=${index}>
                        <div class="handle">
                          <ha-svg-icon .path=${ICON.DRAG}></ha-svg-icon>
                        </div>
                        <ha-icon
                          icon=${icon ? icon : 'mdi:gas-station'}
                          style=${`color: ${progressColor}; margin-inline-end: 0.5rem;`}
                        ></ha-icon>
                        <div class="item-content click-shrink" @click=${() => this._toggleAction('edit-item', index)}>
                          <div class="primary">Range Info #${index + 1}</div>
                          <div class="secondary">${entity}</div>
                        </div>
                        <div class="item-actions">
                          ${actionMap.map(
                            (action) => html`
                              <ha-icon-button
                                class=${action.class || ''}
                                .path=${action.icon}
                                @click=${() => action.action(index)}
                                .label=${action.title}
                              ></ha-icon-button>
                            `
                          )}
                        </div>
                      </div>
                    `;
                  }
                )}
              </div>
            </ha-sortable>
          `
        : this._renderYamlEditor()}
      <div class="action-footer" ?hidden=${this._yamlEditorActive}>
        <ha-button size="small" appearance="filled" @click=${() => this._toggleAction('add')}>
          <ha-svg-icon .path=${ICON.PLUS} slot="start"></ha-svg-icon>
          Add new bar
        </ha-button>
        <ha-button
          size="small"
          variant="neutral"
          appearance="filled"
          @click=${() => (this._yamlEditorActive = !this._yamlEditorActive)}
          >Edit YAML
        </ha-button>
      </div> `;
  }

  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newRangeInfo = this._config.range_info?.concat() || [];
    newRangeInfo.splice(newIndex, 0, newRangeInfo.splice(oldIndex, 1)[0]);
    this._config = { ...this._config, range_info: newRangeInfo };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _renderYamlEditor(): TemplateResult | typeof nothing {
    if (!this._yamlEditorActive) {
      return nothing;
    }

    return html`
      <div class="card-config">
        <panel-yaml-editor
          .hass=${this._hass}
          .config=${this._config}
          .configDefault=${this._config.range_info}
          .configKey=${'range_info'}
          has-extra-actions
          @close-editor=${() => (this._yamlEditorActive = false)}
          @yaml-config-changed=${this._onYamlConfigChanged}
        ></panel-yaml-editor>
      </div>
    `;
  }

  private _onYamlConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const detail = ev.detail;
    const { isValid, value, key, index } = detail;
    if (!isValid || !this._config) {
      return;
    }
    console.log('YAML config changed', key, index, value);

    const newConfig = value;
    let rangeInfo = [...(this._config.range_info || [])];
    let rangeItem = { ...rangeInfo[index] }; // Clone the item at the specific index
    if (key === 'range_info') {
      // Update the entire range_info array
      rangeInfo = newConfig;
    } else if (key === 'range_info_item') {
      // Update the specific range_info item
      rangeItem = newConfig;
      rangeInfo[index] = rangeItem; // Replace the modified item in the range_info array
    }

    fireEvent(this, 'config-changed', { config: { ...this._config, range_info: rangeInfo } });
  }

  private _renderEnergyLevelConfig(config: RangeInfoConfig): TemplateResult {
    const DATA = { ...config.energy_level } as RangeItemConfig;
    const ENERGY_SCHEMA = RANGE_ITEM_SCHEMA(DATA.entity || '', true, DATA?.value_position === 'inside');
    // console.log('Energy schema', ENERGY_SCHEMA);
    return this._createHaForm(DATA, ENERGY_SCHEMA, 'energy_level');
  }

  private _renderRangeLevelConfig(config: RangeInfoConfig): TemplateResult {
    const DATA = { ...config.range_level } as RangeItemConfig;
    return this._createHaForm(DATA, RANGE_ITEM_SCHEMA(DATA.entity || ''), 'range_level');
  }

  private _renderChargingEntityConfig(config: RangeInfoConfig): TemplateResult {
    const DATA = {
      charging_entity: config.charging_entity,
      charging_template: config.charging_template,
    };

    return this._createHaForm(DATA, CHARGING_STATE_SCHEMA);
  }

  private _renderChargeTargetEntityConfig(config: RangeInfoConfig): TemplateResult {
    const DATA = CHARGE_TARGET_KEYS.reduce((acc, key) => {
      acc[key] = config[key];
      return acc;
    }, {} as RangeInfoConfig);

    return this._createHaForm(DATA, CHARGE_TARGET_SCHEMA(DATA.charge_target_entity));
  }

  private _renderBarBackground(config: RangeInfoConfig): TemplateResult {
    const backgroundColor = config.bar_background || '';
    const backgroundSchema = [
      {
        name: 'bar_background',
        label: 'Bar Background Color',
        helper: 'Color to display the background of the progress bar',
        type: 'string',
      },
    ];
    const backgroundData = {
      bar_background: backgroundColor,
    } as RangeInfoConfig;

    return html`
      <div class="item-content">
        <div class="item-config-row">
          <div style="flex: 1; width: 100%;">${this._createHaForm(backgroundData, backgroundSchema)}</div>
          <ha-icon-button
            ?hidden=${!backgroundColor || backgroundColor === ''}
            .path=${ICON.RESTART}
            @click=${this._resetBackgroundColor}
            .label=${'Reset Background Color'}
          ></ha-icon-button>
        </div>
      </div>
    `;
  }

  private _renderColorTemplate(config: RangeInfoConfig): TemplateResult {
    const DATA = {
      color_template: config.color_template || '',
    };
    const colorTemplateSchema = [
      {
        name: 'color_template',
        label: 'Color Template',
        helper: 'Template to set the color of the progress bar, this will replace the progress_color',
        selector: { template: {} },
      },
    ] as const;
    return this._createHaForm(DATA, colorTemplateSchema);
  }

  private _renderBarDimensions(config: RangeInfoConfig): TemplateResult {
    const DATA = DIMENSION_KEYS.reduce((acc, key) => {
      acc[key] = config[key];
      return acc;
    }, {} as RangeInfoConfig);

    return this._createHaForm(DATA, PROGRESS_BAR_SCHEMA);
  }

  private _renderColorThresholds(config: RangeInfoConfig): TemplateResult {
    this._colorThresholds = config.color_thresholds || [];
    const noColors = this._colorThresholds.length === 0;
    const noEntity = !config.energy_level?.entity;

    // check if color thresholds are sorted
    const isSorted = this._colorThresholds.every(
      (threshold, index, arr) => index === 0 || threshold.value >= arr[index - 1].value
    );

    const COLOR_BLOCK_DATA = {
      color_blocks: config.color_blocks,
    } as RangeInfoConfig;
    const COLOR_BLOCK_SCHEMA = [
      {
        name: 'color_blocks',
        label: 'Color Blocks',
        helper: 'Use color blocks instead of a gradient for the progress bar',
        default: false,
        type: 'boolean',
      },
    ] as const;

    const colorBlocksForm = this._createHaForm(COLOR_BLOCK_DATA, COLOR_BLOCK_SCHEMA);
    const gradienPreview = this._renderPreviewColor();

    return html`
      ${colorBlocksForm} ${gradienPreview}
      ${noColors
        ? html`<div class="empty-list">No color thresholds added yet.</div>`
        : html`<ha-sortable handle-selector=".handle" @item-moved=${this._colorMoved}>
            <div class="indicator-list">
              ${repeat(
                this._colorThresholds || [],
                (threshold: Threshold) => threshold.value,
                (threshold: Threshold, index: number) => html`
                <div class="item-config-row color-threshold" data-index=${index}>
                  <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
                    <ha-textfield
                      .label=${'Value'}
                      .value=${threshold.value}
                      .min=${0}
                      .index=${index}
                      .configValue=${'value'}
                      .type=${'number'}
                      .required=${false}
                      @change=${this._colorThreholdChanged}
                      ></ha-textfield>
                    <ha-selector
                      .hass=${this._hass}
                      .label=${`Color ${threshold.color}`}
                      .value=${threshold.color ? colorToRgb(threshold.color) : ''}
                      .selector=${{ color_rgb: {} }}
                      @value-changed=${this._colorThreholdChanged}
                      .configValue=${'color'}
                      .index=${index}
                      .required=${false}
                    ></ha-selector>
                    <div class="item-actions">
                      <ha-icon-button
                        class="delete"
                        .path=${ICON.CLOSE}
                        @click=${() => this._removeColorThreshold(index)}
                      ></ha-icon-button>
                    </div>
                  </div>
                </div>
              `
              )}
            </div>
          </ha-sortable>`}
      <div class="indicator-list">
        <div class="item-config-row" style="flex-direction: row-reverse; align-items: center;">
          ${!noColors
            ? html`
                <ha-button
                  size="small"
                  variant="neutral"
                  appearance="filled"
                  ?hidden=${isSorted}
                  @click=${() => this._sortColorArr()}
                  >Sort</ha-button
                >
                <ha-button
                  size="small"
                  variant="warning"
                  appearance="filled"
                  @click=${() => this._rangeColorThresholdsChanged([])}
                  >Remove All</ha-button
                >
              `
            : html`<ha-button
                ?hidden=${noEntity}
                .label=${'Random color pallete'}
                size="small"
                variant="neutral"
                appearance="filled"
                @click=${() => this._createRandomPallete()}
                >Random color pallete</ha-button
              >`}
          <ha-button
            ?hidden=${noEntity}
            size="small"
            appearance="filled"
            .label=${'Add'}
            @click=${() => this._addColorThreshold()}
            >Add</ha-button
          >
        </div>
      </div>
    `;
  }

  private _colorMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newColorThresholds = this._colorThresholds?.concat() || [];
    newColorThresholds.splice(newIndex, 0, newColorThresholds.splice(oldIndex, 1)[0]);
    this._colorThresholds = newColorThresholds;
    this._rangeColorThresholdsChanged(this._colorThresholds);
  }

  private _createRandomPallete = () => {
    const rangeItem = this._rangeItemConfig;
    const energyEntity = rangeItem?.energy_level?.entity || '';
    const state = this._hass.states[energyEntity];

    if (!state) return;

    const baseColor = rangeItem?.progress_color || randomHexColor();
    const isPercent = hasPercent(state);
    const rawMax = rangeItem?.energy_level?.max_value
      ? rangeItem.energy_level.max_value
      : state.attributes?.max_value || state.attributes?.max || undefined;
    // Default max value if not defined in config or state
    const maxValue = rawMax ?? (isPercent ? 100 : undefined) ?? 100;

    const palette = createRandomPallete(baseColor, maxValue);

    this._colorThresholds = palette;
    this._colorTestValue = maxValue;
    this._rangeColorThresholdsChanged(palette);

    console.log('Generated random palette:', palette);
  };

  private _renderPreviewColor(): TemplateResult | typeof nothing {
    if (!this._colorThresholds?.length) return nothing;
    const hass = this._hass;
    const getEntityState = (entity?: string, attr?: string) =>
      entity && hass.states[entity]
        ? attr
          ? hass.formatEntityAttributeValue(hass.states[entity], attr)
          : hass.formatEntityState(hass.states[entity])
        : '';

    const config = this._rangeItemConfig!;
    const barBackground = config.bar_background || 'var(--secondary-background-color, #90909040)';
    const energyConf = config.energy_level || {};
    const rangeConf = config.range_level || {};

    const icon = energyConf?.icon || '';
    const energyState = this._hass.states[energyConf?.entity || ''];
    const isPercent = hasPercent(energyState);
    const unit = isPercent ? '%' : energyState.attributes?.unit_of_measurement || '';
    const max = energyConf?.max_value ? energyConf.max_value : energyState.attributes?.max ?? 100;

    this._maxValue = max;
    const testValue = this._colorTestValue ?? max;

    const background = config.color_blocks
      ? generateColorBlocks(this._colorThresholds, testValue, max)
      : generateGradient(this._colorThresholds, testValue, max);

    const currentColor =
      energyConf?.value_alignment === 'start'
        ? testValue < 3
          ? barBackground
          : this._colorThresholds[0]?.color || barBackground
        : getColorForLevel(this._colorThresholds, testValue, max) || barBackground;

    const normalizedWidth = getNormalizedValue(this._colorThresholds, testValue, max);

    const itemInside = config.energy_level?.value_position === 'inside' || false;
    const itemOutside = config.energy_level?.value_position === 'outside' || false;
    const valueAlign = config.energy_level?.value_alignment || 'start';

    const radius = `${config.bar_radius ?? 5}px`;
    const height = `${config.bar_height ?? 14}px`;
    const minHeight = height > '20px' ? height : '20px';
    const overValuePer = this._overValue !== undefined ? this._overValue : undefined;
    const overValueNormalized = overValuePer !== undefined ? Math.round((overValuePer / 100) * max) : undefined;

    const rangeState = rangeConf?.entity ? getEntityState(rangeConf.entity, rangeConf.attribute) : '';
    const rangePosition = rangeConf?.value_position || 'outside';

    const barPreviewStyle = {
      height: height,
      'min-height': !itemInside ? 'unset' : minHeight,
      'border-radius': radius,
      'background-color': config.bar_background || 'var(--secondary-background-color, #90909040)',
    };
    const overValue = {
      left: `${overValuePer}%`,
      transform: `translateX(-${overValuePer}%)`,
      display: overValuePer !== undefined ? 'flex' : 'none',
      'border-radius': radius,
    };

    const fillStyle = {
      background: `linear-gradient(to right, ${background})`,
      width: `${normalizedWidth}%`,
      borderRadius: radius,
    };

    const valueStyle = {
      width: `${normalizedWidth}%`,
      'justify-content': `flex-${valueAlign}`,
      color: currentColor,
    };

    const thresholdDots = this._colorThresholds.map((t) => {
      const left = (t.value / max) * 100;
      return html`
        <div
          class="threshold-dot"
          title="Value: ${t.value}"
          style=${styleMap({
            left: `${left}%`,
            transform: `translateX(-50%)`,
            backgroundColor: t.color,
            zIndex: 3,
          })}
          @click=${() => this._editColorThreshold?.(t.value)}
        ></div>
      `;
    });

    const energyOutside = html`
      <div class="energy-outside" ?hidden=${!itemOutside}>
        <ha-icon icon=${icon}></ha-icon>
        <span>${testValue} ${unit}</span>
      </div>
    `;

    const rangeEl = rangeState
      ? html`
          <div class="range-outside" ?hidden=${!rangeState || rangePosition !== 'outside'}>
            <ha-icon icon=${rangeConf?.icon || ''}></ha-icon>
            <span>${rangeState}</span>
          </div>
        `
      : nothing;

    const rangeInside =
      rangeState && rangePosition === 'inside' ? html` <span class="range-inside">${rangeState}</span> ` : nothing;

    return html`
      <div class="item-content gradient-preview">
        <ha-selector
          .hass=${this._hass}
          .label=${'Test value & Bar Preview'}
          .helper=${'Click on the bar to add a color stop at the clicked value or click on dot to edit color on that value.'}
          .value=${testValue}
          .selector=${{
            number: { min: 0, max, step: 1, mode: 'slider', unit_of_measurement: unit },
          }}
          @value-changed=${(ev: CustomEvent) => {
            this._colorTestValue = ev.detail.value;
          }}
          .required=${false}
        ></ha-selector>
        <div class="range-bar-row">
          ${energyOutside}
          <div class="bar-wrapper">
            <div class="on-hover-value">
              <div style=${styleMap(overValue)} class="hover-value">${overValueNormalized}</div>
            </div>
            <div style=${styleMap(barPreviewStyle)} id="gradient-bg" class="gradient-bg">
              <div style=${styleMap(fillStyle)} class="fill-bg"></div>
              <div style=${styleMap(valueStyle)} class="energy-inside">
                <span ?hidden=${!itemInside}> ${testValue} ${unit}</span>
              </div>
              ${rangeInside}
            </div>
            <div class="threshold-dot-container">${thresholdDots}</div>
          </div>
          ${rangeEl}
        </div>
      </div>
    `;
  }

  private _editColorThreshold(value: number): void {
    const sortEl = this.shadowRoot?.querySelector('.indicator-list');
    if (!sortEl) return;

    const index = this._colorThresholds?.findIndex((t) => t.value === value);
    if (index === undefined || index < 0) return;

    const target = sortEl.querySelector<HTMLElement>(`.item-config-row.color-threshold[data-index="${index}"]`);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('animation-glow');
    target.addEventListener('animationend', () => target.classList.remove('animation-glow'), { once: true });

    const input = target
      .querySelector('ha-selector')
      ?.shadowRoot?.querySelector('ha-selector-color_rgb')
      ?.shadowRoot?.querySelector('ha-textfield')
      ?.shadowRoot?.querySelector('input') as HTMLInputElement | null;

    input?.click();
  }

  private _colorThreholdChanged(ev: any): void {
    ev.stopPropagation();
    const target = ev.target;
    const { index, configValue } = target;
    const newValue = configValue === 'value' ? target.value : ev.detail.value;

    const thresholds: Threshold[] = [...(this._colorThresholds ?? [])];
    const selectedThreshold = { ...thresholds[index] };

    if (configValue === 'value') {
      // Ensure the value is a number
      if (newValue === '' || isNaN(newValue)) return;
      selectedThreshold.value = Number(newValue); // Convert to number
    } else {
      // Ensure the color is a valid hex color
      const convertedColor = Array.isArray(newValue)
        ? rgb2hex(newValue as [number, number, number])
        : tinycolor(newValue).toHexString();

      selectedThreshold.color = convertedColor; // Convert to hex color
    }
    console.log('Updated color threshold:', selectedThreshold);
    thresholds[index] = selectedThreshold;
    this._colorThresholds = thresholds;

    this._rangeColorThresholdsChanged(this._colorThresholds);
  }

  private _addColorThreshold(clickValue?: number): void {
    const thresholds: Threshold[] = [...(this._colorThresholds ?? [])];
    const base = this._rangeItemConfig?.progress_color ?? randomHexColor();

    const shade = (c: string) => {
      const t = tinycolor(c);
      return t.isDark() ? t.lighten(30).toHexString() : t.darken(30).toHexString();
    };

    const updateThresholds = () => {
      this._rangeColorThresholdsChanged(thresholds);
    };

    // Insert keeping order by value
    const insert = (value: number, color: string) => {
      const idx = thresholds.findIndex((t) => t.value > value);
      if (idx === -1) thresholds.push({ value, color });
      else thresholds.splice(idx, 0, { value, color });
    };

    if (clickValue !== undefined) {
      // ignore if exact value already exists
      if (!thresholds.some((t) => t.value === clickValue)) {
        const idx = thresholds.findIndex((t) => t.value > clickValue);
        const prevColor = idx > 0 ? thresholds[idx - 1].color : base;
        insert(clickValue, shade(prevColor));
        updateThresholds();
        // allow DOM to update before opening editor
        setTimeout(() => this._editColorThreshold?.(clickValue), 100);
      }
      return;
    }

    // No click value: seed or append a new step
    if (thresholds.length === 0) {
      thresholds.push({ value: 0, color: base }, { value: 5, color: shade(base) });
    } else {
      const last = thresholds[thresholds.length - 1];
      insert(last.value + 5, shade(last.color ?? base));
    }

    updateThresholds();
  }

  private _sortColorArr(): void {
    if (!this._colorThresholds || this._colorThresholds.length === 0) {
      return;
    }
    // Sort the color thresholds by value in ascending order
    this._colorThresholds.sort((a, b) => (a.value || 0) - (b.value || 0));
    this._rangeColorThresholdsChanged(this._colorThresholds);
  }

  private _removeColorThreshold(index: number): void {
    if (!this._colorThresholds || this._colorThresholds.length === 0) {
      return;
    }
    this._colorThresholds.splice(index, 1);
    this._rangeColorThresholdsChanged(this._colorThresholds);
  }

  private _rangeColorThresholdsChanged(colorThresholds: Threshold[]): void {
    if (!this._rangeItemConfig) return;
    const rangeItem = { ...(this._rangeItemConfig || {}) } as RangeInfoConfig;
    if (colorThresholds.length === 0) {
      delete rangeItem.color_thresholds; // Remove the color_thresholds property if empty
    } else {
      rangeItem.color_thresholds = colorThresholds; // Update the color thresholds
    }
    this._rangeItemConfig = rangeItem;
    this._rangeItemChanged(this._rangeItemConfig);
  }

  private _renderBasicColors(config: RangeInfoConfig): TemplateResult {
    const progressColor = config.progress_color;
    const colorFieldSchema = [
      {
        name: 'progress_color',
        label: 'Progress Color',
        helper: 'Color to display the progress bar',
        type: 'string',
      },
    ] as const;
    const DATA = { progress_color: progressColor } as RangeInfoConfig;
    return html`
      <div class="item-content">
        <div class="sub-content">
          ${this._createHaForm(DATA, colorFieldSchema)}
          <ha-selector
            .hass=${this._hass}
            .label=${'Progress Color'}
            .value=${progressColor ? colorToRgb(progressColor) : ''}
            .selector=${{ color_rgb: {} }}
            @value-changed=${this._progressColorChanged}
            .configValue=${'progress_color'}
            .required=${false}
          ></ha-selector>
        </div>
      </div>
    `;
  }

  private _resetBackgroundColor(): void {
    const rangeItemConfig = { ...(this._rangeItemConfig || {}) } as RangeInfoConfig;
    delete rangeItemConfig.bar_background; // Remove the bar_background property
    this._rangeItemConfig = rangeItemConfig;
    this._rangeItemChanged(rangeItemConfig);
  }

  private _progressColorChanged(ev: CustomEvent): void {
    if (!this._rangeItemConfig) return;
    ev.stopPropagation();
    const value = ev.detail.value;
    const hexValue = rgb2hex(value);

    this._rangeItemConfig = { ...(this._rangeItemConfig || {}) } as RangeInfoConfig;

    this._rangeItemConfig.progress_color = hexValue;
    this._rangeItemChanged(this._rangeItemConfig);
  }

  private _renderHeader(
    title: string,
    icon?: string,
    actions?: Array<{ title?: string; action: (ev?: Event) => void; icon?: string }>,
    addedAction?: Array<{ action: (ev?: Event) => void; icon?: string }>
  ): TemplateResult {
    return html` <div class="header-row">
      ${actions?.map(
        (action) =>
          html` <div class="icon-title" @click=${(ev: Event) => action.action(ev)}>
            ${ifDefined(action.icon) ? html`<ha-icon-button .path=${action.icon}></ha-icon-button>` : nothing}
            <span>${action.title}</span>
          </div>`
      )}
      <div class="header-title">${title} ${icon ? html`<ha-icon icon=${icon}></ha-icon>` : nothing}</div>
      ${addedAction?.map(
        (action) =>
          html` <ha-icon-button
            class="header-yaml-icon"
            @click=${(ev: Event) => action.action(ev)}
            .path=${ICON.CODE_JSON}
          >
          </ha-icon-button>`
      )}
    </div>`;
  }

  private _createHaForm = (data: any, schema: any, configyType?: string) => {
    return html`
      <ha-form
        .hass=${this._hass}
        .configType=${configyType}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._rangeItemValueChanged}
      ></ha-form>
    `;
  };
  private _computeLabel(schema: any) {
    return schema.label || '';
  }
  private _computeHelper(schema: any) {
    return schema.helper || '';
  }

  private _rangeItemValueChanged(ev: CustomEvent<{ value: any }>): void {
    ev.stopPropagation();
    if (!this._config) return;

    const configType = (ev.target as any)?.configType as keyof RangeInfoConfig | undefined;
    const value = ev.detail?.value ?? {};

    const currentRangeInfo = { ...(this._rangeItemConfig ?? {}) } as RangeInfoConfig;

    const mergeWithCleanup = (dest: Record<string, any>, src: Record<string, any>): boolean => {
      let changed = false;
      for (const key of Object.keys(src)) {
        const v = src[key];
        if (v === undefined || v === '') {
          if (key in dest) {
            delete dest[key];
            changed = true;
          }
        } else if (dest[key] !== v) {
          dest[key] = v;
          changed = true;
        }
      }
      return changed;
    };
    let changed = false;

    if (configType !== undefined) {
      const section = { ...((currentRangeInfo[configType] as any) ?? {}) };
      changed = mergeWithCleanup(section, value) || changed;
      if (Object.keys(section).length === 0) {
        if (configType in currentRangeInfo) {
          delete currentRangeInfo[configType];
          changed = true;
        }
      } else if (JSON.stringify(currentRangeInfo[configType]) !== JSON.stringify(section)) {
        (currentRangeInfo as Record<string, any>)[configType] = section;
        changed = true;
      }
    } else {
      changed = mergeWithCleanup(currentRangeInfo as any, value) || changed;
    }

    if (!changed) return;

    this._rangeItemConfig = currentRangeInfo;
    this._rangeItemChanged(currentRangeInfo);
  }

  private _rangeItemChanged(config: RangeInfoConfig): void {
    if (!this._config) {
      return;
    }
    const activeIndex = this._activeIndexItem;
    let rangeInfo = [...(this._config.range_info || [])]; // Clone the range_info array
    let rangeItem = { ...rangeInfo[activeIndex!] }; // Clone the item at the active index
    rangeItem = config; // Replace the item with the new config
    rangeInfo[activeIndex!] = rangeItem; // Replace the modified item in the range_info array
    this._config = { ...this._config, range_info: rangeInfo }; // Update the config with the modified range_info
    fireEvent(this, 'config-changed', { config: this._config });
    // console.log('Range item changed', rangeItem);
    this.requestUpdate();
  }
  protected _onValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config) return;
    const value = ev.detail.value;
    const config = { ...(this._config || {}) };
    const layoutConfigRange = { ...(config.layout_config?.range_info_config || {}) };
    if (value && value.layout) {
      layoutConfigRange.layout = value.layout;
    } else {
      delete layoutConfigRange.layout;
    }
    if (Object.keys(layoutConfigRange).length === 0) {
      if (config.layout_config && config.layout_config.range_info_config) {
        delete config.layout_config.range_info_config;
      }
    } else {
      config.layout_config = { ...(config.layout_config || {}), range_info_config: layoutConfigRange };
    }
    this._config = config;
    fireEvent(this, 'config-changed', { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-range-info': PanelRangeInfo;
  }
}
