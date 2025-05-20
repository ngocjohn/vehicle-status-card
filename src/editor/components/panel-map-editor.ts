import { EntityConfig } from 'custom-card-helpers';
import { processConfigEntities } from 'extra-map-card';
import { ExtraMapCardConfig, MapEntityConfig } from 'extra-map-card/dist/types/config';
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { VehicleStatusCardConfig, HomeAssistant, fireEvent, MiniMapConfig, LovelaceConfig } from '../../types';
import { Create } from '../../utils';
import { _convertToExtraMapConfig } from '../../utils/ha-helper';
import { VehicleStatusCardEditor } from '../editor';
import { ALERT_INFO } from '../editor-const';
import { baseMapConfigSchema, miniMapConfigSchema } from '../form';

@customElement('panel-map-editor')
export class PanelMapEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @property({ attribute: false }) editor!: VehicleStatusCardEditor;
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;
  @state() _mapCardConfig?: MiniMapConfig;
  @state() _mapEntitiesConfig?: EntityConfig[];
  @state() _yamlMode: boolean = false;
  @state() _useSingleMapCard: boolean = false;

  @state() private _tmpYamlConfig?: ExtraMapCardConfig;
  @query('hui-card-element-editor') private _mapCardEditor?: HTMLElement;

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  private get _mapConfig(): MiniMapConfig {
    return this._config?.mini_map || {};
  }

  private get _extraMapCardConfig(): ExtraMapCardConfig {
    const mapConfig = _convertToExtraMapConfig(this._mapConfig, this._mapEntitiesConfig);
    return mapConfig;
  }

  private get _deviceTrackerEntity(): MapEntityConfig {
    return {
      entity: this._mapConfig.device_tracker,
      label_mode: this._mapConfig.label_mode,
      attribute: this._mapConfig.attribute,
    };
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_config') && this._config.mini_map) {
      this._mapCardConfig = {
        ...(this._config.mini_map || {}),
      };
      this._mapEntitiesConfig = this._mapCardConfig.extra_entities
        ? processConfigEntities<MapEntityConfig>(this._mapCardConfig.extra_entities, false)
        : processConfigEntities<MapEntityConfig>([this._deviceTrackerEntity], false);
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

    if (_changedProperties.has('_yamlMode') && !this._yamlMode) {
      const oldYamlMode = _changedProperties.get('_yamlMode') as boolean;
      if (oldYamlMode === true && this._yamlMode === false) {
        if (this._tmpYamlConfig) {
          const mapConfig = this._convertToBaseMapConfig(this._tmpYamlConfig);
          const miniMapConfig = { ...(this._config.mini_map || {}) };
          this._config = {
            ...this._config,
            map_popup_config: {
              ...miniMapConfig,
              ...mapConfig,
            },
          };
          fireEvent(this, 'config-changed', {
            config: this._config,
          });
          this._tmpYamlConfig = undefined;
        }
      }
    }

    if (
      (_changedProperties.has('_useSingleMapCard') && this._useSingleMapCard) ||
      _changedProperties.has('_yamlMode')
    ) {
      setTimeout(() => {
        this._hideSelectors();
      }, 0);
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

    const content = this._yamlMode
      ? this._renderYamlEditor()
      : html` <div class="tip-content">
          ${baseMapSection} ${useSingleMap}
          ${!this._useSingleMapCard ? this._renderDefaultMapConfig() : this._renderSingleMapConfig()}
        </div>`;

    return html`
      <div class="card-config">
        ${content}
        <div style="justify-content: flex-end; display: flex; margin-top: 1rem;">
          <ha-button
            @click=${() => (this._yamlMode = !this._yamlMode)}
            .label=${this._yamlMode ? 'Show UI editor' : 'Show Code editor'}
          ></ha-button>
        </div>
      </div>
    `;
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

  private _hideSelectors() {
    const formRoot = this._mapCardEditor?.shadowRoot
      ?.querySelector('extra-map-editor')
      ?.shadowRoot?.querySelector('ha-form')?.shadowRoot;

    if (formRoot) {
      const selectors = formRoot.querySelectorAll('.root > ha-selector') as NodeListOf<HTMLElement>;
      selectors.forEach((el: HTMLElement) => {
        el.style.display = 'none'; // hide title and apikey formns
      });
    }
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
    let extra_entities: MapEntityConfig[] = [];
    const entities = config.entities ? processConfigEntities<MapEntityConfig>(config.entities) : [];
    if (entities.length === 0) {
      extra_entities = [this._deviceTrackerEntity];
    } else if (entities.length > 0 && !entities.find((e) => e.entity === this._deviceTrackerEntity.entity)) {
      extra_entities = [this._deviceTrackerEntity, ...entities];
    } else {
      extra_entities = entities;
    }
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
      <hui-card-element-editor
        .hass=${this.hass}
        .value=${this._extraMapCardConfig}
        .lovelace=${this.editor.lovelace}
        @config-changed=${this._mapCardConfigChanged}
      ></hui-card-element-editor>
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

  private _renderYamlEditor(): TemplateResult {
    return html`
      <div id="yaml-editor">
        ${!this._useSingleMapCard
          ? html` <vsc-sub-panel-yaml
              .hass=${this.hass}
              .config=${this._config}
              .configDefault=${this._config.mini_map}
              .extraAction=${true}
              @yaml-config-changed=${this._yamlChanged}
              @close-editor=${() => (this._yamlMode = false)}
            >
            </vsc-sub-panel-yaml>`
          : html`
              <ha-yaml-editor
                .hass=${this.hass}
                .defaultValue=${this._extraMapCardConfig}
                .copyClipboard=${true}
                @value-changed=${this._yamlConfigChanged}
              ></ha-yaml-editor>
            `}
      </div>
    `;
  }

  private _yamlConfigChanged(ev: CustomEvent): void {
    const { isValid, value } = ev.detail;
    if (!isValid || !this._config) {
      return;
    }
    this._tmpYamlConfig = value as ExtraMapCardConfig;
    console.log('yaml config changed:', this._tmpYamlConfig);
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
