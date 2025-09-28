import { html, TemplateResult, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { fireEvent } from '../../ha';
import {
  LovelaceMapPopupConfig,
  MiniMapConfig,
  toPopupShared,
  VehicleStatusCardConfig,
  computePopupCardConfig,
} from '../../types/config';
import { ConfigArea } from '../../types/config-area';
import { createSecondaryCodeLabel } from '../../utils/editor/sub-editor-header';
import { SubElementEditorConfig } from '../../utils/editor/types';
import { BaseEditor } from '../base-editor';
import { PANEL } from '../editor-const';
import '../shared/vsc-sub-element-editor';
import { BASE_MAP_CONFIG_SCHEMA } from '../form';

@customElement(PANEL.MAP_EDITOR)
export class PanelMapEditor extends BaseEditor {
  constructor() {
    super(ConfigArea.MINI_MAP);
  }
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;
  @state() _mapCardConfig?: MiniMapConfig;
  @state() _yamlMode: boolean = false;
  @state() _useSingleMapCard: boolean = false;
  @state() private _subElementConfig?: SubElementEditorConfig;

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('_config') && this._config.mini_map) {
      this._mapCardConfig = {
        ...(this._config.mini_map || {}),
      };

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

  private get _mapConfig(): MiniMapConfig {
    return this._config.mini_map || ({} as MiniMapConfig);
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const isSingleMapCard = this._useSingleMapCard;
    const header = isSingleMapCard ? 'Single Map Card Configuration' : 'Popup Card Configuration';
    if (this._subElementConfig) {
      return html` <vsc-sub-element-editor
        ._hass=${this.hass}
        ._store=${this._store}
        ._config=${this._subElementConfig}
        .headerLabel=${header}
        @sub-element-editor-closed=${this._closeSubElementEditor}
        @sub-element-config-changed=${this._handleSubElementConfigChanged}
      ></vsc-sub-element-editor>`;
    }

    const editorHeader = html`
      <sub-editor-header
        .hidePrimaryAction=${true}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlMode)}
        @secondary-action=${() => (this._yamlMode = !this._yamlMode)}
      ></sub-editor-header>
    `;

    const DATA = { ...(this._mapCardConfig || {}) };
    const noEntity = !DATA?.device_tracker || DATA?.device_tracker === '';
    const baseMapWrapper = this._createVscForm(DATA, BASE_MAP_CONFIG_SCHEMA(DATA), 'mini_map');

    const mapLayoutPopup = html`
      <ha-button .disabled=${noEntity} appearance="filled" @click=${() => this._editPopupConfig()}>${header}</ha-button>
    `;
    return html`
      ${editorHeader}
      <div class="base-config gap">
        ${this._yamlMode ? this._renderYamlEditor() : html` ${baseMapWrapper} ${mapLayoutPopup} `}
      </div>
    `;
  }

  private _editPopupConfig(): void {
    const popupConfig = computePopupCardConfig(this._mapConfig);
    this._subElementConfig = {
      type: popupConfig.type,
      elementConfig: popupConfig,
    };
  }

  private _closeSubElementEditor(ev: CustomEvent): void {
    ev.stopPropagation();
    this._subElementConfig = undefined;
  }

  private _handleSubElementConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this._subElementConfig) return;
    const value = { ...ev.detail.config } as LovelaceMapPopupConfig;
    // console.debug('Sub Element Config Changed', value);

    if (!value.entities || value.entities.length === 0) {
      value.entities = [{ entity: this._mapConfig.device_tracker! }];
    }

    this._subElementConfig = {
      ...this._subElementConfig,
      elementConfig: value,
    };
    const mapConfig = { ...this._config.mini_map } as MiniMapConfig;
    const popupShared = toPopupShared(value);
    this._mapCardConfig = mapConfig;

    this._config = {
      ...this._config,
      mini_map: {
        ...mapConfig,
        ...popupShared,
      },
    };

    // console.debug('New Config:', this._config.mini_map);

    fireEvent(this, 'config-changed', {
      config: this._config,
    });
  }

  private _renderYamlEditor(): TemplateResult {
    return html`
      <div id="yaml-editor">
        <panel-yaml-editor
          .hass=${this.hass}
          .config=${this._config}
          .configDefault=${this._config.mini_map}
          @yaml-config-changed=${this._yamlChanged}
        >
        </panel-yaml-editor>
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

  static get styles(): CSSResultGroup {
    return [super.styles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-map-editor': PanelMapEditor;
  }
}
