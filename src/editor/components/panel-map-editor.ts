import { EntityConfig } from 'custom-card-helpers';
import { processConfigEntities } from 'extra-map-card';
import { MapEntityConfig } from 'extra-map-card/dist/types/config';
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { VehicleStatusCardConfig, HomeAssistant, fireEvent, MiniMapConfig } from '../../types';
import { Create } from '../../utils';
import { hasLocation } from '../../utils/ha-helper';
import { VehicleStatusCardEditor } from '../editor';
import { ALERT_INFO } from '../editor-const';
import { singleMapConfingSchema, baseMapConfigSchema, miniMapConfigSchema } from '../form';

@customElement('panel-map-editor')
export class PanelMapEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) cardEditor!: VehicleStatusCardEditor;
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
