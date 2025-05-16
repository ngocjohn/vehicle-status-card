import { EntityConfig } from 'custom-card-helpers';
import { processConfigEntities } from 'extra-map-card';
import { ExtraMapCardConfig, MapEntityConfig } from 'extra-map-card/dist/types/config';
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { VehicleStatusCardConfig, HomeAssistant, fireEvent, MiniMapConfig, LovelaceConfig } from '../../types';
import { Create } from '../../utils';
import { _convertToExtraMapConfig, hasLocation } from '../../utils/ha-helper';
import { VehicleStatusCardEditor } from '../editor';
import { ALERT_INFO } from '../editor-const';
import { singleMapConfingSchema, baseMapConfigSchema, miniMapConfigSchema } from '../form';

@customElement('panel-map-editor')
export class PanelMapEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @property({ attribute: false }) editor!: VehicleStatusCardEditor;
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;
  @state() _mapCardConfig?: MiniMapConfig;
  @state() _mapEntitiesConfig?: EntityConfig[];
  @state() _yamlEditor: boolean = false;
  @state() _useSingleMapCard: boolean = false;

  private get _mapConfig(): MiniMapConfig {
    return this._config?.mini_map || {};
  }

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  private get _extraMapCardConfig(): ExtraMapCardConfig {
    const mapConfig = _convertToExtraMapConfig(this._mapConfig, this._mapEntitiesConfig);
    return mapConfig;
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_config') && this._config.mini_map) {
      this._mapCardConfig = {
        ...(this._config.mini_map || {}),
      };
      this._mapEntitiesConfig = this._mapCardConfig.extra_entities
        ? processConfigEntities<MapEntityConfig>(this._mapCardConfig.extra_entities)
        : [];
      this._useSingleMapCard = this._mapCardConfig.single_map_card ?? false;
      if (!this._mapCardConfig.maptiler_api_key && this._mapCardConfig.single_map_card) {
        this._useSingleMapCard = false;
        fireEvent(this, 'config-changed', {
          config: {
            ...this._config,
            mini_map: {
              ...this._mapCardConfig,
              single_map_card: false,
            },
          },
        });
      }
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const baseMapSection = this._renderBaseMapSection();

    const useSingleMap = html`
      <ha-form
        .hass=${this.hass}
        .data=${this._mapConfig}
        .schema=${[
          {
            name: 'single_map_card',
            label: 'Mini Map as Single Card (MapTiler API Key is required)',
            selector: { boolean: {} },
            default: false,
            disabled: this._mapCardConfig?.maptiler_api_key ? false : true,
          },
        ]}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      >
      </ha-form>
    `;

    const content = this._yamlEditor
      ? this._renderYamlEditor()
      : html` <div class="tip-content">
          ${baseMapSection} ${useSingleMap}
          ${!this._useSingleMapCard ? this._renderDefaultMapConfig() : this._renderSingleMapConfig()}
          <ha-button slot="actions" @click=${() => (this._yamlEditor = true)}> Edit YAML </ha-button>
        </div>`;

    return content;
  }

  private _renderDefaultMapConfig() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._mapConfig}
        .schema=${miniMapConfigSchema(this._mapConfig.device_tracker, this._mapConfig.label_mode !== 'attribute')}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      >
      </ha-form>
    `;
  }

  private _renderMapCardConfig() {
    // const mapConfig = this._convertToExtraMapConfig(this._mapCardConfig!, this._mapEntitiesConfig);

    return html`
      <hui-card-element-editor
        .hass=${this.hass}
        .value=${this._extraMapCardConfig}
        .lovelace=${this.editor.lovelace}
        @config-changed=${this._mapCardConfigChanged}
      ></hui-card-element-editor>
    `;
  }

  private _mapCardConfigChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config) return;
    const config = ev.detail.config;
    const mapConfig = this._convertToBaseMapConfig(config);
    // console.log('Map Config:', mapConfig);
    const miniMapConfig = { ...(this._config.mini_map || {}) };
    this._config = {
      ...this._config,
      mini_map: {
        ...miniMapConfig,
        ...mapConfig,
      },
    };

    fireEvent(this, 'config-changed', {
      config: this._config,
    });
  }

  private _convertToBaseMapConfig(config: ExtraMapCardConfig): Partial<MiniMapConfig> {
    const map_styles = config.custom_styles;
    const extra_entities = config.entities;
    const {
      fit_zones,
      default_zoom,
      hours_to_show,
      theme_mode,
      history_period,
      auto_fit,
      aspect_ratio,
      use_more_info,
    } = config;
    return {
      map_styles,
      extra_entities,
      fit_zones,
      default_zoom,
      hours_to_show,
      theme_mode,
      history_period,
      auto_fit,
      aspect_ratio,
      use_more_info,
    };
  }

  private _renderSingleMapConfig() {
    const haForms = html`
      <ha-form
        .hass=${this.hass}
        .data=${this._mapConfig}
        .schema=${singleMapConfingSchema(this.hass.localize)}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      >
      </ha-form>
      <hui-entity-editor
        .hass=${this.hass}
        .label=${'Extra Entities to show on map'}
        .entities=${this._mapEntitiesConfig}
        .entityFilter=${hasLocation}
        @entities-changed=${this._entitiesValueChanged}
      ></hui-entity-editor>
    `;

    return html`
      ${Create.HaAlert({
        message: ALERT_INFO.MAP_SINGLE_CARD,
        options: {
          action: [
            {
              callback: () => window.open(ALERT_INFO.MAP_SINGLE_LINK),
            },
          ],
        },
      })}
      ${this._renderMapCardConfig()}
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const config = ev.detail.value;
    fireEvent(this, 'config-changed', {
      config: {
        ...this._config,
        mini_map: {
          ...config,
        },
      },
    });
  }

  private _entitiesValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (ev.detail && ev.detail.entities) {
      this._config = {
        ...this._config,
        mini_map: {
          ...this._config.mini_map,
          extra_entities: ev.detail.entities,
        },
      };
    }
    this._mapEntitiesConfig = processConfigEntities<MapEntityConfig>(ev.detail.entities);

    fireEvent(this, 'config-changed', {
      config: this._config,
    });
    console.log('Entities Config:', this._mapEntitiesConfig);
  }

  private _renderYamlEditor(): TemplateResult {
    return html`
      <div id="yaml-editor">
        <vsc-sub-panel-yaml
          .hass=${this.hass}
          .config=${this._config}
          .configDefault=${this._config.mini_map}
          .extraAction=${true}
          @yaml-config-changed=${this._yamlChanged}
          @close-editor=${() => (this._yamlEditor = false)}
        >
        </vsc-sub-panel-yaml>
      </div>
    `;
  }

  private _yamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value } = ev.detail;
    if (!isValid || !this._config) return;
    this._config = { ...this._config, mini_map: value };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _renderBaseMapSection(): TemplateResult {
    const baseContent = html`
      <ha-form
        .hass=${this.hass}
        .data=${this._mapConfig}
        .schema=${baseMapConfigSchema()}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      >
      </ha-form>

      ${Create.HaAlert({
        message: ALERT_INFO.MAPTILER_GET,
        options: {
          action: [
            {
              callback: () => window.open(ALERT_INFO.MAPTILER_DOC_LINK),
            },
          ],
        },
      })}
    `;
    return Create.ExpansionPanel({
      options: { header: 'Base Map Configuration' },
      content: baseContent,
    });
  }

  private _computeLabel = (schema: any) => {
    let label = this.hass?.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);
    if (label) return label;
    label = this.hass?.localize(`ui.panel.lovelace.editor.card.${schema.label}`);
    if (label) return label;
    return schema.label;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-map-editor': PanelMapEditor;
  }
}
