// External
import { CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

// Import styles
import { HomeAssistant, LovelaceCardEditor, LovelaceConfig, fireEvent } from '../ha';
// Import all components
import './components/';
import { VehicleStatusCardConfig } from '../types/config';
import { loadHaComponents, Create, refactorEditDialog } from '../utils';
import { migrateLegacyIndicatorsConfig } from '../utils/editor/migrate-indicator';
import { selectTree } from '../utils/helpers-dom';
import '../utils/editor/menu-element';
import { Store } from '../utils/store';
import { migrateLegacySectionOrder, VehicleStatusCard } from '../vehicle-status-card';
import { BaseEditor } from './base-editor';
import * as ELEMENT from './components';
import { ALERT_INFO, EDITOR_NAME, PANEL } from './editor-const';
import { CARD_NAME_SCHEMA, CARD_THEME_SCHEMA, SECTION_ORDER_SCHEMA, BUTTON_GRID_LAYOUT_SCHEMA } from './form';

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
    let needUpdate = false;
    if (config.layout_config.hide && Object.keys(config.layout_config.hide).length > 0) {
      console.debug('Migrating legacy layout_config.hide to section_order');
      config = {
        ...config,
        ...migrateLegacySectionOrder(config),
      };
      needUpdate = true;
    }

    if (needUpdate) {
      fireEvent(this, 'config-changed', { config });
      return;
    }

    const newConfig = JSON.parse(JSON.stringify(config)); // Deep copy the config
    this._config = newConfig;
    this.createStore();
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
      buttons: this._renderButtonCard(),
      images: this._renderImages(),
      indicators: this._renderIndicators(),
      layout_config: this._renderLayoutConfig(),
      mini_map: this._renderMiniMap(),
      range: this._renderRangeInfo(),
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

  private _renderIndicators(): TemplateResult {
    const isMigrated = this._migratedIndicatorsConfig;
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

    return html` ${!isMigrated ? alertMigration : this._renderIndicatorRows()} ${this._renderIndicatorsLegacy()}`;
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
    if (this._migratedIndicatorsConfig) {
      return nothing;
    }

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
      ${Create.VicTab({
        activeTabIndex: this._indicatorTabIndex || 0,
        onTabChange: (index: number) => (this._indicatorTabIndex = index),
        tabs: tabsConfig,
      })}
    `;
  }

  private _renderLayoutConfig(): TemplateResult {
    const config = { ...(this._config || {}) };
    const LAYOUT_DATA = {
      section_order: config.layout_config?.section_order,
      theme_config: config.layout_config?.theme_config,
    };
    const NAME_GRID_DATA = {
      name: config?.name,
      hide_card_name: config.layout_config?.hide_card_name,
    };
    const BUTTON_GRID_DATA = { ...config.layout_config?.button_grid };

    const nameGrid = this._createHaForm(NAME_GRID_DATA, CARD_NAME_SCHEMA(NAME_GRID_DATA), 'card_name_config');

    const sectionOrderWrapper = this._createHaForm(LAYOUT_DATA, SECTION_ORDER_SCHEMA, 'layout_config');

    const themeWrapper = this._createHaForm(LAYOUT_DATA, CARD_THEME_SCHEMA, 'layout_config');

    const buttonGridWrapper = this._createVscForm(
      BUTTON_GRID_DATA,
      BUTTON_GRID_LAYOUT_SCHEMA(!BUTTON_GRID_DATA.swipe),
      'layout_config',
      'button_grid'
    );

    return html`
      <div class="sub-panel-config">${sectionOrderWrapper} ${buttonGridWrapper} ${nameGrid} ${themeWrapper}</div>
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
    return html`<panel-range-info ._hass=${this._hass} .config=${this._config}></panel-range-info>`;
  }

  /* ---------------------------- PANEL TEMPLATE ---------------------------- */

  private _createHaForm(data: any, schema: any, configType?: string, configIndex?: string): TemplateResult {
    return html`
      <ha-form
        .hass=${this._hass}
        .data=${data}
        .schema=${schema}
        .configIndex=${configIndex}
        .configType=${configType}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel(schema: any) {
    if (schema.name === 'entity') {
      return '';
    }
    return schema.label || schema.name;
  }
  private _computeHelper(schema: any) {
    return schema.helper || '';
  }

  public _valueChanged(ev: any): void {
    if (!this._config || !this._hass) {
      return;
    }

    const target = ev.target;
    const configType = target.configType;
    const configIndex = target.configIndex;

    // Ensure we handle the boolean value correctly
    const newValue = ev.detail.value;
    console.debug('Value changed:', { configType, configIndex, newValue });

    const updates: Partial<VehicleStatusCardConfig> = {};
    if (configType === 'layout_config' && configIndex) {
      let layoutConfig = { ...(this._config.layout_config || {}) };
      layoutConfig[configIndex] = newValue;
      updates.layout_config = layoutConfig;
    } else if (configType === 'layout_config' && !configIndex) {
      updates.layout_config = {
        ...(this._config.layout_config || {}),
        ...newValue,
      };
    } else if (configType === 'card_name_config') {
      updates.name = newValue.name;
      updates.layout_config = {
        ...(this._config.layout_config || {}),
        hide_card_name: newValue.hide_card_name,
      };
    } else {
      this._config = {
        ...this._config,
        ...newValue,
      };
      fireEvent(this, 'config-changed', { config: this._config });
      return;
    }

    // Apply the updates and trigger the config change event
    if (Object.keys(updates).length > 0) {
      this._config = { ...this._config, ...updates };
      fireEvent(this, 'config-changed', { config: this._config });
    }
  }

  /* ---------------------------- SECTION MOVED HANDLER ---------------------------- */
  private _sectionMoved(event: CustomEvent): void {
    event.stopPropagation();
    if (!this._config) return;
    const { oldIndex, newIndex } = event.detail;
    console.log('Section moved from', oldIndex, 'to', newIndex);
    const sections = [...(this._config.layout_config.section_order || [])];
    sections.splice(newIndex, 0, sections.splice(oldIndex, 1)[0]);
    this._config = {
      ...this._config,
      layout_config: {
        ...this._config.layout_config,
        section_order: sections,
      },
    };
    fireEvent(this, 'config-changed', { config: this._config });
    console.log('Updated section order:', this._config.layout_config.section_order);
  }

  /* ------------------------- CONFIG CHANGED HANDLER ------------------------- */

  private _handleMenuValueChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (value) {
      this._selectedConfigType = value;
      setTimeout(() => this._dispatchEditorEvent('toggle-helper', value), 200);
    } else {
      this._selectedConfigType = null;
    }
  }

  private createStore(): void {
    this._store = new Store(this, this._config);
    // console.debug('Store created:', this, this._config);
    this._getCardInPreview();
    super.requestUpdate();
  }

  // convert the legacy indicators config to the new format
  private _convertLegacyIndicatorsConfig(): void {
    if (!this._config.indicators || Object.keys(this._config.indicators).length === 0) {
      return;
    }
    const oldConfig = this._config.indicators;
    const newConfig = migrateLegacyIndicatorsConfig(oldConfig);
    delete this._config.indicators; // Remove old indicators config
    const indicatorRows = (this._config.indicator_rows || []).concat(newConfig);
    this._config = {
      ...this._config,
      indicator_rows: indicatorRows,
    };
    fireEvent(this, 'config-changed', { config: this._config });
    console.log('Converted:', { oldConfig, newConfig });
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
