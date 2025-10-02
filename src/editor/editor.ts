// External
import { CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
// Internal

import { EditorConfigAreaSelectedEvent } from '../events/editor-config-area';
// Import all components
import './components/';
// Import styles
import { HomeAssistant, LovelaceCardEditor, LovelaceConfig, fireEvent } from '../ha';
import { configHasDeprecatedProps, updateDeprecatedConfig, VehicleStatusCardConfig } from '../types/config';
import { ConfigArea } from '../types/config-area';
import { loadHaComponents, Create, refactorEditDialog } from '../utils';
import '../utils/editor/menu-element';
import { getSectionFromConfigArea } from '../utils/editor/area-select';
import { cleanConfig } from '../utils/editor/clean-config';
import { MenuElement } from '../utils/editor/menu-element';
import { migrateLegacyIndicatorsConfig } from '../utils/editor/migrate-indicator';
// Import struct
import { selectTree } from '../utils/helpers-dom';
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

  @state() private configArea: ConfigArea = ConfigArea.DEFAULT;

  @state() private _indicatorTabIndex: number = 0;

  public _migratedIndicatorsConfig: boolean = false;

  // Config Area Elements
  @query(PANEL.INDICATOR_ROWS) _panelIndicatorRows?: ELEMENT.PanelIndicatorRows;
  @query(PANEL.IMAGES_EDITOR) _panelImages?: ELEMENT.PanelImagesEditor;
  @query(PANEL.RANGE_INFO) _panelRangeInfo?: ELEMENT.PanelRangeInfo;
  @query(PANEL.MAP_EDITOR) _panelMapEditor?: ELEMENT.PanelMapEditor;
  @query(PANEL.BUTTON_SEC) _panelButtons?: ELEMENT.PanelButtonCardSec;
  @query(PANEL.LAYOUT_EDITOR) _panelLayoutEditor?: ELEMENT.PanelLayoutEditor;

  // Legacy Indicator Elements
  @query(PANEL.INDICATOR_SINGLE) _panelIndicatorSingle?: ELEMENT.PanelIndicatorSingle;
  @query(PANEL.INDICATOR_GROUP) _panelIndicatorGroup?: ELEMENT.PanelIndicatorGroup;

  // Legacy Button Card Element
  @query(PANEL.BUTTON_CARD) _panelButtonCard?: ELEMENT.PanelButtonCard;

  @query('vsc-menu-element') _vscMenuElement?: MenuElement;
  constructor() {
    super(ConfigArea.DEFAULT);
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

  public setConfig(config: VehicleStatusCardConfig): void {
    const isLegacyConfig = config.indicators && Object.keys(config.indicators).length > 0;
    this._migratedIndicatorsConfig = !isLegacyConfig;
    // const keepLegacyBtnTest = config?.name?.includes('LEGACY BTN');
    if (configHasDeprecatedProps(config)) {
      const updatedConfig = updateDeprecatedConfig(config);
      fireEvent(this, 'config-changed', { config: updatedConfig });
      return;
    } else {
      this._config = cleanConfig(config);
    }

    if (this._store !== undefined) {
      this._store._config = this._config;
    } else {
      this.createStore();
    }
    this.updateComplete.then(() => {
      console.debug('Editor setConfig called from:', this.configArea);
      const selectedArea = getSectionFromConfigArea(this.configArea);
      document.dispatchEvent(EditorConfigAreaSelectedEvent(selectedArea));
      this._panelButtons?._reloadPreview();
    });
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

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._config) return;
    const oldArea = changedProps.get('configArea') as ConfigArea | undefined;
    const shouldUpdate =
      (oldArea === undefined && this.configArea !== undefined) ||
      (oldArea === ConfigArea.BUTTONS && this.configArea !== ConfigArea.BUTTONS) ||
      (oldArea === ConfigArea.INDICATORS && this.configArea !== ConfigArea.INDICATORS);
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
          ._store=${this._store}
          ._hass=${this._hass}
          ._config=${this._config}
          .value=${this.configArea}
          @menu-value-changed=${this._handleMenuValueChange}
        ></vsc-menu-element>
        ${this._renderSelectedConfigType()}
      </div>
    `;
  }

  /* ---------------------------- RENDER SELECTED TYPE ---------------------------- */

  private _renderSelectedConfigType(): TemplateResult {
    const selected = this.configArea;
    const typeMap = {
      [ConfigArea.INDICATORS]: this._renderIndicators(),
      [ConfigArea.RANGE_INFO]: this._renderRangeInfo(),
      [ConfigArea.IMAGES]: this._renderImages(),
      [ConfigArea.MINI_MAP]: this._renderMiniMap(),
      [ConfigArea.BUTTONS]: this._renderButtonCard(),
      [ConfigArea.LAYOUT_CONFIG]: this._renderLayoutConfig(),
    };
    return typeMap[selected] || html``;
  }

  /* ---------------------------- RENDER CONFIG TYPES ---------------------------- */

  private _renderButtonCard(): TemplateResult {
    return html`<panel-button-card-sec
      ._hass=${this._hass}
      ._buttonList=${this._config?.button_cards}
      .config=${this._config}
      ._store=${this._store}
    ></panel-button-card-sec>`;
  }
  private _renderLEgacyButtonCard(): TemplateResult {
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
      ._rows=${this._config.indicator_rows || []}
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

    const configArea = value ? (value as ConfigArea) : ConfigArea.DEFAULT;
    this.configArea = configArea;

    Store.selectedConfigArea = configArea;
    const sectionNew = getSectionFromConfigArea(configArea);
    document.dispatchEvent(EditorConfigAreaSelectedEvent(sectionNew));
  }

  private createStore(): void {
    this._getCardInPreview();
    this._store = new Store(this, this._config);
    // console.debug('Store created:', this, this._config);
    this._store.hass = this._hass;
    if (this._vscElem) {
      this._store.cardPreview = this._vscElem;
    }

    super.requestUpdate();
  }

  // convert the legacy indicators config to the new format
  private _convertLegacyIndicatorsConfig(): void {
    if (!this._config) {
      console.error('No config found to migrate.');
      return;
    }
    const newConfig = JSON.parse(JSON.stringify(this._config)) as VehicleStatusCardConfig;
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
