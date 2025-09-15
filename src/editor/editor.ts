// External
import { CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

// Import styles
import { HomeAssistant, LovelaceCardEditor, LovelaceConfig, fireEvent } from '../ha';
// Import all components
import './components/';
import { configHasDeprecatedProps, updateDeprecatedConfig, VehicleStatusCardConfig } from '../types/config';
import { loadHaComponents, Create, refactorEditDialog } from '../utils';
import { migrateLegacyIndicatorsConfig } from '../utils/editor/migrate-indicator';
import { selectTree } from '../utils/helpers-dom';
import '../utils/editor/menu-element';
import { Store } from '../utils/store';
import { VehicleStatusCard } from '../vehicle-status-card';
import { BaseEditor } from './base-editor';
import * as ELEMENT from './components';
import { ALERT_INFO, EDITOR_NAME, PANEL } from './editor-const';

@customElement(EDITOR_NAME)
export class VehicleStatusCardEditor extends BaseEditor implements LovelaceCardEditor {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @property({ attribute: false }) public _config!: VehicleStatusCardConfig;
  @property({ attribute: false }) public _vscElem?: VehicleStatusCard;
  @state() _selectedConfigType: null | string = null;

  @state() private _indicatorTabIndex: number = 0;

  public _migratedIndicatorsConfig: boolean = false;

  @query(PANEL.IMAGES_EDITOR) _panelImages?: ELEMENT.PanelImagesEditor;
  @query(PANEL.RANGE_INFO) _panelRangeInfo?: ELEMENT.PanelRangeInfo;
  @query(PANEL.EDITOR_UI) _panelEditorUI?: ELEMENT.PanelEditorUI;
  @query(PANEL.BUTTON_CARD) _panelButtonCard?: ELEMENT.PanelButtonCard;
  @query(PANEL.MAP_EDITOR) _panelMapEditor?: ELEMENT.PanelMapEditor;
  @query(PANEL.INDICATOR_SINGLE) _panelIndicatorSingle?: ELEMENT.PanelIndicatorSingle;
  @query(PANEL.INDICATOR_GROUP) _panelIndicatorGroup?: ELEMENT.PanelIndicatorGroup;
  @query(PANEL.INDICATOR_ROWS) _panelIndicatorRows?: ELEMENT.PanelIndicatorRows;

  constructor() {
    super();
  }
  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  get hass(): HomeAssistant {
    return this._hass;
  }
  static get styles(): CSSResultGroup {
    return [super.styles];
  }

  public async setConfig(config: VehicleStatusCardConfig): Promise<void> {
    const isLegacyConfig = config.indicators && Object.keys(config.indicators).length > 0;
    this._migratedIndicatorsConfig = !isLegacyConfig;
    if (configHasDeprecatedProps(config)) {
      const updatedConfig = updateDeprecatedConfig(config);
      fireEvent(this, 'config-changed', { config: updatedConfig });
      return;
    } else {
      this._config = { ...config };
    }

    if (this._store !== undefined) {
      this._store._config = this._config;
    } else {
      this.createStore();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
    void refactorEditDialog();
    window.EditorManager = this;
    this._cleanConfig();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  private get _hasLegacyIndicatorsConfig(): boolean {
    return !!(this._config.indicators && Object.keys(this._config.indicators).length > 0);
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    const oldSelectedConfigType = changedProps.get('_selectedConfigType') as string | null;
    const shouldUpdate =
      (this._selectedConfigType === null && oldSelectedConfigType !== null) ||
      (oldSelectedConfigType === 'buttons' && this._selectedConfigType !== 'buttons') ||
      (oldSelectedConfigType === 'indicators' && this._selectedConfigType !== 'indicators');
    if (shouldUpdate) {
      this._cleanConfig();
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config) return;

    if (changedProps.has('_indicatorTabIndex') && (changedProps.get('_indicatorTabIndex') as number) !== 0) {
      if (this._config.hasOwnProperty('active_group')) {
        // If the active group is set, we need to clean it up
        delete this._config.active_group;
        fireEvent(this, 'config-changed', { config: this._config });
      }
    }
  }

  /* ---------------------------- RENDER FUNCTIONS ---------------------------- */
  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }
    this.createStore();

    return html`
      <div class="base-config">
        <vsc-menu-element
          .legacyIndicators=${!this._migratedIndicatorsConfig}
          .value=${this._selectedConfigType || ''}
          @menu-value-changed=${this._handleMenuValueChange}
        ></vsc-menu-element>
        ${this._renderSelectedConfigType()}
      </div>
    `;
  }

  /* ---------------------------- RENDER SELECTED TYPE ---------------------------- */

  private _renderSelectedConfigType(): TemplateResult {
    if (this._selectedConfigType === null) {
      return html``;
    }
    const selected = this._selectedConfigType;
    const typeMap = {
      indicators: this._renderIndicators(),
      range_info: this._renderRangeInfo(),
      images: this._renderImages(),
      mini_map: this._renderMiniMap(),
      buttons: this._renderButtonCard(),
      layout_config: this._renderLayoutConfig(),
    };
    return typeMap[selected];
  }

  /* ---------------------------- RENDER CONFIG TYPES ---------------------------- */

  private _renderButtonCard(): TemplateResult {
    return html`<panel-button-card
      ._hass=${this._hass}
      .config=${this._config}
      ._store=${this._store}
    ></panel-button-card>`;
  }

  private _renderImages(): TemplateResult {
    return html`<panel-images-editor
      ._hass=${this._hass}
      .config=${this._config}
      ._store=${this._store}
    ></panel-images-editor>`;
  }

  private _renderIndicators() {
    if (this._migratedIndicatorsConfig) {
      return this._renderIndicatorRows();
    }
    return this._renderIndicatorsLegacy();
  }

  private _renderIndicatorRows(): TemplateResult {
    return html` <panel-indicator-rows
      ._store=${this._store}
      ._hass=${this._hass}
      ._config=${this._config}
    ></panel-indicator-rows>`;
  }

  /**
   *  @deprecated This method is kept for legacy support. It will be removed in future versions.
   *  Use _renderIndicatorRows() for the new indicator rows configuration.
   */
  private _renderIndicatorsLegacy(): TemplateResult | typeof nothing {
    if (!this._config.indicators || Object.keys(this._config.indicators).length === 0) {
      return nothing;
    }
    const alertMigration = html`${Create.HaAlert({
      message: html` For more info in the <a href=${ALERT_INFO.INDICATOR_ROW_URL} target="_blank">WIKI</a>. Or migrate
        to the new format.`,
      options: {
        title: 'New Indicators Configuration',
        action: [
          {
            label: 'Migrate',
            variant: 'warning',
            callback: () => {
              this._convertLegacyIndicatorsConfig();
            },
          },
        ],
      },
    })}`;

    const group = html`
      <panel-indicator-group
        .hass=${this._hass}
        .editor=${this as any}
        .groupConfig=${this._config.indicators?.group || []}
      >
      </panel-indicator-group>
    `;
    const single = html`
      <panel-indicator-single
        .hass=${this._hass}
        .editor=${this as any}
        .singleConfig=${this._config.indicators?.single || []}
      >
      </panel-indicator-single>
    `;

    const tabsConfig = [
      { content: single, key: 'single', label: 'Single' },
      { content: group, key: 'group', label: 'Group' },
    ];

    return html`
      ${alertMigration}
      ${Create.VicTab({
        activeTabIndex: this._indicatorTabIndex || 0,
        onTabChange: (index: number) => (this._indicatorTabIndex = index),
        tabs: tabsConfig,
      })}
    `;
  }

  private _renderMiniMap(): TemplateResult {
    return html`<panel-map-editor
      .hass=${this._hass}
      ._config=${this._config}
      ._store=${this._store}
    ></panel-map-editor>`;
  }

  private _renderRangeInfo(): TemplateResult {
    return html`<panel-range-info
      ._hass=${this._hass}
      ._config=${this._config}
      ._store=${this._store}
    ></panel-range-info>`;
  }
  private _renderLayoutConfig(): TemplateResult {
    return html`<panel-layout-editor
      ._hass=${this._hass}
      ._config=${this._config}
      ._store=${this._store}
    ></panel-layout-editor>`;
  }

  /* ------------------------- CONFIG CHANGED HANDLER ------------------------- */

  private _handleMenuValueChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value || null;
    this._selectedConfigType = value;
    setTimeout(() => this._dispatchEditorEvent('toggle-helper', value), 200);

    // if (value) {
    //   this._selectedConfigType = value;
    //   setTimeout(() => this._dispatchEditorEvent('toggle-helper', value), 200);
    // } else {
    //   this._selectedConfigType = null;
    // }
  }

  private createStore(): void {
    this._store = new Store(this, this._config);
    // console.debug('Store created:', this, this._config);
    this._getCardInPreview();
    super.requestUpdate();
  }

  // convert the legacy indicators config to the new format
  private _convertLegacyIndicatorsConfig(): void {
    if (!this._hasLegacyIndicatorsConfig) {
      return;
    }
    if (!this._config) {
      console.error('No config found to migrate.');
      return;
    }
    const newConfig = { ...(this._config as VehicleStatusCardConfig) };
    if (newConfig.indicators) {
      console.log('Migrating legacy indicators config:', newConfig.indicators);
      const migratedIndicators = migrateLegacyIndicatorsConfig(newConfig.indicators);
      if (!newConfig.indicator_rows) {
        newConfig.indicator_rows = [];
      }
      newConfig.indicator_rows.push(migratedIndicators);
      delete newConfig.indicators;
      this._migratedIndicatorsConfig = true;
      this._config = newConfig;
      fireEvent(this, 'config-changed', { config: this._config });
      console.log('Migrated indicators config:', this._config);
    }
  }

  private async _getCardInPreview(): Promise<VehicleStatusCard | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const cardElement = await selectTree(document.body, 'home-assistant$hui-dialog-edit-card$vehicle-status-card');
    if (cardElement) {
      this._vscElem = cardElement as VehicleStatusCard;
      // console.debug('Found card in preview:', this._vscElem);
    }
    return this._vscElem;
  }
}

declare global {
  interface Window {
    EditorManager: VehicleStatusCardEditor;
  }
  interface HTMLElementTagNameMap {
    'vehicle-status-card-editor': VehicleStatusCardEditor;
  }
}
