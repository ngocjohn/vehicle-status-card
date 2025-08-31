import { html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { fireEvent, LovelaceCardConfig } from '../../ha';
import {
  EntityConfig,
  ExtraMapCardConfig,
  MapEntityConfig,
  MiniMapConfig,
  VehicleStatusCardConfig,
} from '../../types/config';
import { Create } from '../../utils';
import { processConfigEntities } from '../../utils';
import { createSecondaryCodeLabel } from '../../utils/editor/sub-editor-header';
import { selectTree } from '../../utils/helpers-dom';
import { _convertToExtraMapConfig, convertLovelaceMapToBaseConfig } from '../../utils/lovelace/create-map-card';
import { BaseEditor } from '../base-editor';
import { BASE_MAP_CONFIG_SCHEMA } from '../form';

@customElement('panel-map-editor')
export class PanelMapEditor extends BaseEditor {
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;
  @state() _mapCardConfig?: MiniMapConfig;
  @state() _mapEntitiesConfig?: EntityConfig[];
  @state() _yamlMode: boolean = false;
  @state() _useSingleMapCard: boolean = false;

  @state() private _tmpYamlConfig?: ExtraMapCardConfig;

  @query('hui-card-element-editor') private _mapCardEditor?: HTMLElement;

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .sub-panel-config {
          margin-block-end: 1em;
        }
      `,
    ];
  }

  private get _mapConfig(): MiniMapConfig {
    return this._config?.mini_map || {};
  }

  private get _useMapTiler(): boolean {
    return !!this._mapConfig?.maptiler_api_key;
  }

  private get _extraMapCardConfig(): ExtraMapCardConfig | LovelaceCardConfig {
    const mapConfig = _convertToExtraMapConfig(this._mapConfig, this._mapEntitiesConfig, this._useMapTiler);
    return mapConfig;
  }

  private get _deviceTrackerEntity(): MapEntityConfig {
    return {
      entity: this._mapConfig.device_tracker,
      label_mode: this._mapConfig.label_mode,
      attribute: this._mapConfig.attribute,
      focus: true,
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('go-back', () => {
      setTimeout(() => this._hideEditorElements(), 50);
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('go-back', () => {
      setTimeout(() => this._hideEditorElements(), 50);
    });
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
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
          const oldTmp = _changedProperties.get('_tmpYamlConfig') as ExtraMapCardConfig | undefined;
          const newTmp = this._tmpYamlConfig;
          console.log('Old Tmp:', oldTmp);
          console.log('New Tmp:', newTmp);
          if (JSON.stringify(oldTmp) === JSON.stringify(newTmp)) {
            // No changes in YAML, do nothing
            console.log('No changes in YAML, skipping update.');
            this._tmpYamlConfig = undefined;
            return;
          }
          const mapConfig = convertLovelaceMapToBaseConfig(this._tmpYamlConfig, this._deviceTrackerEntity);
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
          this._tmpYamlConfig = undefined;
        }
      }
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);

    const needsUpdate =
      _changedProperties.has('_useSingleMapCard') ||
      _changedProperties.has('_yamlMode') ||
      _changedProperties.has('_mapCardConfig');

    if (needsUpdate) {
      setTimeout(() => this._hideEditorElements(), 50);
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const DATA = { ...(this._config.mini_map || {}) };

    const editorHeader = html`
      <sub-editor-header
        .hidePrimaryAction=${true}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlMode)}
        @secondary-action=${() => (this._yamlMode = !this._yamlMode)}
      ></sub-editor-header>
    `;

    const baseMapWrapper = this._createVscForm(DATA, BASE_MAP_CONFIG_SCHEMA(DATA), 'mini_map');

    return html`
      <div class="sub-panel-config">
        ${this._yamlMode ? this._renderYamlEditor() : html` ${baseMapWrapper} ${this._renderLayoutPopupTabs()} `}
      </div>
      ${editorHeader}
    `;
  }

  private _renderLayoutPopupTabs(): TemplateResult {
    const isSingleMapCard = this._useSingleMapCard;
    const header = isSingleMapCard ? 'Single Map Card Configuration' : 'Popup Card Configuration';
    const expanded = isSingleMapCard;

    const content = this._renderSingleMapConfig();
    return Create.ExpansionPanel({
      options: { header, icon: 'mdi:earth', expanded },
      content: content,
    });
  }

  private _renderSingleMapConfig(): TemplateResult {
    if (!this._mapCardConfig?.device_tracker) {
      return this._createAlert('Device tracker entity is required to use popup');
    }
    return html`
      <hui-card-element-editor
        .hass=${this.hass}
        .value=${this._extraMapCardConfig}
        @config-changed=${this._mapCardConfigChanged}
      ></hui-card-element-editor>
    `;
  }

  private _hideEditorElements = async (): Promise<void> => {
    const editorRoot = this._mapCardEditor?.shadowRoot;
    if (!editorRoot) return;

    if (this._useMapTiler) {
      // Hide extra-map-editor selectors
      const selectors = (await selectTree(
        editorRoot,
        'extra-map-editor$ha-form$ha-selector',
        true
      )) as NodeListOf<HTMLElement>;
      if (!selectors) return;
      selectors.forEach((el) => (el.style.display = 'none'));
    } else {
      // Hide default map config selectors
      const mapEditor = editorRoot.querySelector('hui-map-card-editor');
      const shadow = mapEditor?.shadowRoot;
      const formShadow = shadow?.querySelector('ha-form')?.shadowRoot;

      const elementsToHide: (HTMLElement | null | undefined)[] = [
        formShadow?.querySelector('ha-selector'),
        shadow?.querySelector('ha-selector-select'),
        shadow?.querySelector('h3'),
      ];

      const entitiesHeader = shadow?.querySelector('hui-entity-editor')?.shadowRoot?.querySelector('h3');

      elementsToHide.forEach((el) => el?.style.setProperty('display', 'none'));

      if (entitiesHeader) {
        entitiesHeader.textContent = 'Extra Entities';
      }
    }
  };

  private _mapCardConfigChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config) return;
    const config = ev.detail.config;
    console.debug('map card config changed:', config);

    const mapConfig = convertLovelaceMapToBaseConfig(config, this._deviceTrackerEntity);
    // const mapConfig = this._convertToBaseMapConfig(config);
    console.log('Map Config:', mapConfig);
    const miniMapConfig = { ...(this._config.mini_map || {}) };
    this._config = {
      ...this._config,
      mini_map: {
        ...miniMapConfig,
        ...mapConfig,
      },
    };
    console.debug('New Config:', this._config.mini_map);
    fireEvent(this, 'config-changed', {
      config: this._config,
    });
  }

  private _renderYamlEditor(): TemplateResult {
    return html`
      <div id="yaml-editor">
        ${!this._useSingleMapCard
          ? html` <panel-yaml-editor
              .hass=${this.hass}
              .config=${this._config}
              .configDefault=${this._config.mini_map}
              @yaml-config-changed=${this._yamlChanged}
            >
            </panel-yaml-editor>`
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
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-map-editor': PanelMapEditor;
  }
}
