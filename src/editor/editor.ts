// External
import { CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

// Import styles
import { HomeAssistant, LovelaceCardEditor, LovelaceConfig, fireEvent } from '../ha';
// Import all components
import './components/';
import { VehicleStatusCardConfig } from '../types/config';
import { SectionOrder } from '../types/config/card/layout';
import { SECTION } from '../types/section';
import { loadHaComponents, Create, ICON, refactorEditDialog } from '../utils';
import { migrateLegacyIndicatorsConfig } from '../utils/editor/migrate-indicator';
import { reorderSection } from '../utils/editor/reorder-section';
import { Store } from '../utils/store';
import { BaseEditor } from './base-editor';
import '../utils/editor/menu-element';
import * as ELEMENT from './components';
import { ALERT_INFO, EDITOR_NAME, PANEL } from './editor-const';
import { BUTTON_GRID_SCHEMA, HIDE_SCHEMA, NAME_SCHEMA, RANGE_LAYOUT_SCHEMA, THEME_CONFIG_SCHEMA } from './form';

@customElement(EDITOR_NAME)
export class VehicleStatusCardEditor extends BaseEditor implements LovelaceCardEditor {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @property({ attribute: false }) public _config!: VehicleStatusCardConfig;

  @state() _selectedConfigType: null | string = null;

  @state() private _reloadSectionList: boolean = false;
  @state() private _layoutTabIndex: number = 0;
  @state() private _indicatorTabIndex: number = 0;
  @state() private _buttonConfigTabIndex: number = 0;

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
    if (
      config.layout_config?.section_order === undefined ||
      config.layout_config?.section_order.length === 0 ||
      config.layout_config?.section_order.includes(SECTION.HEADER_INFO)
    ) {
      const sectionOrder = reorderSection(config.layout_config?.hide || {}, config.layout_config?.section_order || []);
      // const sectionOrder = this._setOrderList(config.layout_config?.hide || {}, [...SECTION_KEYS]);
      config.layout_config = {
        ...config.layout_config,
        section_order: sectionOrder as SectionOrder[],
      };
      fireEvent(this, 'config-changed', { config });
      return;
    }

    const newConfig = JSON.parse(JSON.stringify(config)); // Deep copy the config
    this._config = newConfig;
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
    const buttonPanel = html`<panel-button-card
      ._hass=${this._hass}
      .config=${this._config}
      ._store=${this._store}
    ></panel-button-card>`;

    const tabsConfig = [
      { content: buttonPanel, key: 'buttons', label: 'Buttons' },
      { content: this._renderButtonGrid(), key: 'button_grid', label: 'Grid layout' },
    ];
    return html`
      <div class="card-config">
        ${Create.VicTab({
          activeTabIndex: this._buttonConfigTabIndex || 0,
          onTabChange: (index: number) => (this._buttonConfigTabIndex = index),
          tabs: tabsConfig,
        })}
      </div>
    `;
  }

  private _renderImages(): TemplateResult {
    return html`<panel-images-editor ._hass=${this._hass} .config=${this._config}></panel-images-editor>`;
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
    const layout = this._config.layout_config || {};

    const HIDE_CONFIG_DATA = { ...layout.hide };
    const THEME_DATA = { ...layout.theme_config };
    const NAME_DATA = { name: this._config.name || '' };

    const buttonGridWrapper = this._renderButtonGrid();

    // Hide configuration wrapper
    const hideWrapper = Create.SectionPanel([
      {
        title: 'Choose the items / sections to hide',
        content: this._createHaForm(HIDE_CONFIG_DATA, HIDE_SCHEMA, 'layout_config', 'hide'),
      },
      {
        title: 'Section Order Configuration',
        content: this._renderSectionOrder(),
        expansion: true,
      },
    ]);

    // Theme configuration wrapper
    const themeWrapper = Create.SectionPanel([
      {
        title: 'Select the name for card',
        content: this._createHaForm(NAME_DATA, NAME_SCHEMA),
      },
      {
        title: 'Theme Configuration',
        content: this._createHaForm(THEME_DATA, THEME_CONFIG_SCHEMA, 'layout_config', 'theme_config'),
      },
    ]);

    const tabsConfig = [
      { content: hideWrapper, key: 'hide', label: 'Appearance' },
      { content: buttonGridWrapper, key: 'button_grid', label: 'Button Grid' },
      { content: themeWrapper, key: 'theme_config', label: 'Theme' },
    ];

    return html`
      <div class="card-config">
        ${Create.VicTab({
          activeTabIndex: this._layoutTabIndex || 0,
          onTabChange: (index: number) => (this._layoutTabIndex = index),
          tabs: tabsConfig,
        })}
      </div>
    `;
  }

  private _renderButtonGrid(): TemplateResult {
    const BUTTON_GRID_DATA = { ...(this._config.layout_config?.button_grid || {}) };
    const useSwiper = BUTTON_GRID_DATA.swipe;
    return Create.SectionPanel([
      {
        title: 'Button Grid Configuration',
        content: this._createHaForm(BUTTON_GRID_DATA, BUTTON_GRID_SCHEMA(!useSwiper), 'layout_config', 'button_grid'),
      },
    ]);
  }

  private _renderSectionOrder(): TemplateResult {
    if (this._reloadSectionList) return html` <ha-spinner .size=${'small'}></ha-spinner> `;

    const sectionList = this._config.layout_config?.section_order || [];
    return html` <ha-sortable handle-selector=".handle" @item-moved=${this._sectionMoved}>
      <div id="section-order-list">
        ${repeat(
          sectionList,
          (section: string) => section,
          (section: string, index: number) => html` <div class="item-config-row" data-index="${index}">
            <div class="handle">
              <ha-icon-button .path=${ICON.DRAG}></ha-icon-button>
            </div>
            <div class="item-content">
              <div class="primary">${section.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
          </div>`
        )}
      </div>
    </ha-sortable>`;
  }

  private _renderMiniMap(): TemplateResult {
    return html`<panel-map-editor
      .hass=${this._hass}
      .editor=${this as any}
      ._config=${this._config}
    ></panel-map-editor>`;
  }

  private _renderRangeInfo(): TemplateResult {
    const RANGE_INFO_LAYOUT_DATA = { ...(this._config.layout_config?.range_info_config || {}) };
    const rangeLayout = this._createHaForm(
      RANGE_INFO_LAYOUT_DATA,
      RANGE_LAYOUT_SCHEMA,
      'layout_config',
      'range_info_config'
    );
    const rangeItemContent = html`<panel-range-info ._hass=${this._hass} .config=${this._config}></panel-range-info>`;

    const tabsConfig = [
      { content: rangeItemContent, key: 'range_info', label: 'Range Info Items' },
      { content: rangeLayout, key: 'range_info_layout', label: 'Layout appearance' },
    ];

    return Create.VicTab({
      activeTabIndex: this._layoutTabIndex || 0,
      onTabChange: (index: number) => (this._layoutTabIndex = index),
      tabs: tabsConfig,
    });
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

    let hiddenChanged = false;
    const updates: Partial<VehicleStatusCardConfig> = {};
    if (configType === 'layout_config' && configIndex) {
      let layoutConfig = { ...(this._config.layout_config || {}) };
      layoutConfig[configIndex] = newValue;
      if (configIndex === 'hide') {
        const sectionOrder = [...(this._config.layout_config?.section_order || [])];
        const updatedOrder = reorderSection(newValue, sectionOrder);
        layoutConfig.section_order = updatedOrder as SectionOrder[];
        hiddenChanged = true;
      }
      updates.layout_config = layoutConfig;
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
      if (hiddenChanged) {
        this._reloadSectionList = true;
        setTimeout(() => {
          this._reloadSectionList = false;
        }, 200);
      }
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
}

declare global {
  interface Window {
    EditorManager: VehicleStatusCardEditor;
  }
  interface HTMLElementTagNameMap {
    'vehicle-status-card-editor': VehicleStatusCardEditor;
  }
}
