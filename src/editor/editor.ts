// External
import { CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import Sortable from 'sortablejs';

import { CARD_SECTIONS, CARD_VERSION, ICON, SECTION } from '../const/const';
// Import styles
import editorcss from '../css/editor.css';
import { HomeAssistant, VehicleStatusCardConfig, LovelaceCardEditor, LovelaceConfig, fireEvent } from '../types';
// Import all components
import './components/';
import { loadHaComponents, stickyPreview, Create } from '../utils';
import { PanelImagesEditor, PanelIndicator, PanelButtonCard, PanelEditorUI, PanelRangeInfo } from './components/';
import { CONFIG_TYPES, PREVIEW_CONFIG_TYPES } from './editor-const';

@customElement('vehicle-status-card-editor')
export class VehicleStatusCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;

  @state() private activeTabIndex: null | number = null;
  @state() private _indicatorTabIndex: number = 0;

  @query('panel-button-card') _buttonCardEditor?: any;
  @state() _helpOverlayActive: boolean = false;

  @query('panel-images-editor') _panelImages!: PanelImagesEditor;
  @query('panel-indicator') _panelIndicator!: PanelIndicator;
  @query('panel-range-info') _panelRangeInfo!: PanelRangeInfo;
  @query('panel-editor-ui') _panelEditorUI?: PanelEditorUI;
  @query('panel-button-card') _panelButtonCard?: PanelButtonCard;

  @state() _selectedConfigType: null | string = null;

  @state() _sectionSortable: Sortable | null = null;
  @state() private _reloadSectionList: boolean = false;

  public async setConfig(config: VehicleStatusCardConfig): Promise<void> {
    this._config = { ...config };
  }
  connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
    void stickyPreview();
    window.EditorManager = this;
    this._cleanConfig();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  constructor() {
    super();
    this._handleTabChange = this._handleTabChange.bind(this);
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    await new Promise((resolve) => setTimeout(resolve, 0));
    this._handleFirstConfig(this._config);
  }

  private async _handleFirstConfig(config: VehicleStatusCardConfig): Promise<void> {
    if (config.layout_config?.section_order === undefined) {
      const layoutConfig = { ...(config.layout_config || {}) };
      console.log('current layout config:', layoutConfig);
      let sectionOrder = layoutConfig.section_order || [];
      const section = {
        indicators: SECTION.INDICATORS,
        range_info: SECTION.RANGE_INFO,
        images: SECTION.IMAGES,
        mini_map: SECTION.MINI_MAP,
        buttons: SECTION.BUTTONS,
      };

      for (const key in section) {
        if (['indicators', 'range_info'].includes(key)) {
          if (config.layout_config.hide.range_info === false || config.layout_config.hide.indicators === false) {
            sectionOrder.push(SECTION.HEADER_INFO);
          }
        } else if (config.layout_config.hide[key] === false) {
          sectionOrder.push(section[key]);
        }
      }
      sectionOrder = [...new Set(sectionOrder)]; // Remove duplicates

      layoutConfig.section_order = sectionOrder;
      console.log('Updated layout config with new section order:', layoutConfig.section_order);
      this._config = {
        ...this._config,
        layout_config: layoutConfig,
      };
      fireEvent(this, 'config-changed', { config: this._config });
      console.log('Updated config with new layout config:', this._config.layout_config);
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('_selectedConfigType') && this._selectedConfigType !== null) {
      setTimeout(() => {
        if (this._selectedConfigType) this._dispatchEvent('toggle-helper', this._selectedConfigType);
      }, 200);
    }
    if (
      (changedProps.has('_selectedConfigType') && this._selectedConfigType === null) ||
      this._selectedConfigType !== 'button_card'
    ) {
      this._cleanConfig();
    }

    if (changedProps.has('_selectedConfigType') && this._selectedConfigType === 'images') {
      console.log('Init sortable');
      this._panelImages.initSortable();
    }

    if (
      changedProps.has('activeTabIndex') &&
      this.activeTabIndex === 2 &&
      this._selectedConfigType === 'layout_config'
    ) {
      this._initSectionSortable();
    }
  }

  private _initSectionSortable(): void {
    this.updateComplete.then(() => {
      const sectionList = this.shadowRoot?.getElementById('section-list') as HTMLElement;
      if (!sectionList) return;
      this._sectionSortable = new Sortable(sectionList, {
        animation: 150,
        handle: '.handle',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
          this._handleSectionSort(evt);
        },
      });
      console.log('Section sortable initialized');
    });
  }

  private _handleSectionSort(evt: Sortable.SortableEvent): void {
    if (!this._config) return;
    evt.preventDefault();
    const oldIndex = evt.oldIndex as number;
    const newIndex = evt.newIndex as number;
    const sections = [...(this._config.layout_config.section_order || [])];
    const [removed] = sections.splice(oldIndex, 1);
    sections.splice(newIndex, 0, removed);

    this._config.layout_config.section_order = sections;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  /* ---------------------------- RENDER FUNCTIONS ---------------------------- */
  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="base-config">
          ${!this._selectedConfigType ? this._renderMainEditorPage() : this._renderSelectedType()}
        </div>
      </div>
    `;
  }

  public _cleanConfig(): void {
    // Check if _config exists and is an object
    if (!this._config || typeof this._config !== 'object') {
      return;
    }

    if (
      PREVIEW_CONFIG_TYPES.some(
        (key) => this._config.hasOwnProperty(key) && (this._config[key] === null || this._config[key] !== null)
      )
    ) {
      console.log('Cleaning config of preview keys');
      this._config = {
        ...this._config,
        ...PREVIEW_CONFIG_TYPES.reduce((acc: any, key: string) => {
          acc[key] = undefined;
          return acc;
        }, {}),
      };
      fireEvent(this, 'config-changed', { config: this._config });
    } else {
      return;
    }
  }

  public _dispatchEvent(type: string, detail: any): void {
    const event = new CustomEvent('editor-event', {
      bubbles: true,
      composed: true,
      detail: { data: detail, type },
    });
    this.dispatchEvent(event);
    console.log('Dispatched event', type, detail);
  }

  private _handlePanelExpandedChanged(ev: Event, panelKey: string): void {
    const panel = ev.target as HTMLElement;
    if (panelKey === 'indicators' && (panel as any).expanded) {
      this._panelIndicator?._hideClearButton();
    }
  }

  private _handleSelectedConfigType(ev: any): void {
    this._selectedConfigType = ev.detail.value;
    this.requestUpdate();
  }

  private _handleTabChange(index: number): void {
    this.activeTabIndex = index;
    this.requestUpdate();
  }

  private _renderButtonCard(): TemplateResult {
    return html`<panel-button-card
      .hass=${this._hass}
      .cardEditor=${this as any}
      .config=${this._config}
    ></panel-button-card>`;
  }

  private _renderConfigTypeSelector(): TemplateResult {
    const OPTIONS = CONFIG_TYPES.options;
    const ITEMS = [
      { label: 'Select Config Type', value: '' },
      ...Object.keys(OPTIONS).map((key) => ({ label: OPTIONS[key].name, value: key })),
    ];

    const selectorComboBox = html`<ha-combo-box
      .label=${CONFIG_TYPES.name}
      .item-value-path=${'value'}
      .item-label-path=${'label'}
      .placeholder=${'Select Config Type'}
      .configValue=${'type'}
      .value=${this._selectedConfigType}
      .items=${ITEMS}
      @value-changed=${this._handleSelectedConfigType}
    ></ha-combo-box>`;

    return selectorComboBox;
  }

  private _renderImages(): TemplateResult {
    return html`<panel-images-editor
      .hass=${this._hass}
      .editor=${this}
      .config=${this._config}
    ></panel-images-editor>`;
  }

  private _renderIndicators(): TemplateResult {
    const single = this._renderSingleIndicator();
    const group = this._renderGroupIndicator();

    const tabsConfig = [
      { content: single, key: 'single', label: 'Single' },
      { content: group, key: 'group', label: 'Group' },
    ];

    return html`<div class="card-config">
      ${Create.TabBar({
        activeTabIndex: this._indicatorTabIndex || 0,
        onTabChange: (index: number) => (this._indicatorTabIndex = index),
        tabs: tabsConfig,
      })}
    </div>`;
  }

  private _renderGroupIndicator(): TemplateResult {
    return html`
      <panel-indicator .hass=${this._hass} .editor=${this} .config=${this._config} .type=${'group'}></panel-indicator>
    `;
  }

  private _renderSingleIndicator(): TemplateResult {
    return html`
      <panel-indicator .hass=${this._hass} .editor=${this} .config=${this._config} .type=${'single'}></panel-indicator>
    `;
  }

  private _renderLayoutConfig(): TemplateResult {
    const layout = this._config.layout_config || {};
    const buttonGrid = layout.button_grid || {};

    const sharedButtonConfig = {
      component: this,
      configIndex: 'button_grid',
      configType: 'layout_config',
    };

    const buttonGridPicker = [
      {
        configValue: 'rows',
        label: 'Rows',
        options: { selector: { number: { max: 10, min: 1, mode: 'box', step: 1 } } },
        pickerType: 'number',
        value: buttonGrid.rows || 2,
      },
      {
        configValue: 'columns',
        label: 'Columns',
        options: { selector: { number: { max: 10, min: 1, mode: 'box', step: 1 } } },
        pickerType: 'number',
        value: buttonGrid.columns || 2,
      },
      {
        configValue: 'swipe',
        label: 'Use swipe for buttons',
        options: { selector: { boolean: ['true', 'false'] } },
        pickerType: 'selectorBoolean',
        value: buttonGrid.swipe || false,
      },
    ];

    const hide = layout.hide || {};
    const sharedBoolConfig = {
      component: this,
      configIndex: 'hide',
      configType: 'layout_config',
      options: { selector: { boolean: ['true', 'false'] } },
      pickerType: 'selectorBoolean',
    };
    const hidePicker = [
      { configValue: 'card_name', label: 'Card Name', value: hide.card_name || false },
      { configValue: 'indicators', label: 'Indicators', value: hide.indicators || false },
      { configValue: 'range_info', label: 'Range Info', value: hide.range_info || false },
      { configValue: 'images', label: 'Images', value: hide.images || false },
      { configValue: 'mini_map', label: 'Mini Map', value: hide.mini_map || false },
      { configValue: 'buttons', label: 'Buttons', value: hide.buttons || false },
      {
        configValue: 'button_notify',
        label: 'Notify badge on buttons',
        value: hide.button_notify || false,
      },
      { configValue: 'map_address', label: 'Address on map', value: hide.map_address || false },
    ];

    const themeConfig = layout.theme_config || {};

    const sharedThemeConfig = {
      component: this,
      configIndex: 'theme_config',
      configType: 'layout_config',
    };

    const themeMode = [
      { value: 'auto', label: 'Auto' },
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
    ];
    const themeModeSelect = [
      {
        configValue: 'theme',
        label: 'Theme',
        pickerType: 'baseSelector',
        value: themeConfig.theme || 'default',
        options: {
          selector: {
            theme: {
              include_default: true,
            },
          },
          required: true,
        },
      },
      {
        configValue: 'mode',
        options: {
          selector: {
            select: {
              sort: true,
              mode: 'dropdown',
              options: themeMode,
            },
          },
        },
        label: 'Theme Mode',
        pickerType: 'baseSelector',
        value: themeConfig.mode || 'auto',
      },
    ];

    const createPickers = (config: any, sharedConfig: any) => {
      return Create.Picker({ ...config, ...sharedConfig });
    };

    const buttonGridWrapper = html`
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <div>Button Grid Configuration</div>
        </div>
        <div class="sub-panel">
          <div class="sub-content">${buttonGridPicker.map((config) => createPickers(config, sharedButtonConfig))}</div>
        </div>
      </div>
    `;

    const hideWrapper = html`
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <div>Choose the items / sections to hide</div>
        </div>
        <div class="sub-panel">
          <div class="sub-content">${hidePicker.map((config) => createPickers(config, sharedBoolConfig))}</div>
        </div>
      </div>
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <div>Section Order Configuration</div>
        </div>
        <div class="sub-panel">${this._renderSectionOrder()}</div>
      </div>
    `;

    const themeWrapper = html`
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <div>Select the name for card</div>
        </div>
        <div class="sub-panel">
          <div class="item-config-row">
            <ha-textfield
              style="width: 100%;"
              .label=${'Name (Optional)'}
              .placeholder=${'Vehicle Status Card'}
              .configValue=${'name'}
              .value=${this._config.name}
              .required=${false}
              @change=${this._valueChanged}
            ></ha-textfield>
          </div>
          <div class="sub-header">
            <div>Theme Configuration</div>
          </div>
          <div class="sub-panel">
            <div class="sub-content">${themeModeSelect.map((config) => createPickers(config, sharedThemeConfig))}</div>
          </div>
        </div>
      </div>
    `;

    const tabsConfig = [
      { content: themeWrapper, key: 'theme_config', label: 'Theme' },
      { content: buttonGridWrapper, key: 'button_grid', label: 'Button Grid' },
      { content: hideWrapper, key: 'hide', label: 'Appearance' },
    ];

    return html`<div class="card-config">
      ${Create.TabBar({
        activeTabIndex: this.activeTabIndex || 0,
        onTabChange: (index: number) => (this.activeTabIndex = index),
        tabs: tabsConfig,
      })}
    </div>`;
  }

  private _renderSectionOrder(): TemplateResult {
    if (this._reloadSectionList) return html``;

    const sectionList = this._config.layout_config?.section_order || [];
    return html` <div id="section-list">
      ${repeat(
        sectionList,
        (section) => section,
        (section, index) => html` <div class="item-config-row" data-index="${index}">
          <div class="handle">
            <ha-icon-button class="action-icon" .path=${ICON.DRAG}></ha-icon-button>
          </div>
          <div class="item-content">
            <div class="primary">${section.replace(/_/g, ' ').toUpperCase()}</div>
          </div>
        </div>`
      )}
    </div>`;
  }

  private _renderMainEditorPage(): TemplateResult {
    const cardTypeSelector = this._renderConfigTypeSelector();

    const menuButton = html`<div class="config-menu-wrapper">
      <div id="menu-icon" class="menu-icon click-shrink" @click="${() => this._toggleMenu()}">
        <div class="menu-icon-inner">
          <ha-icon icon="mdi:menu"></ha-icon>
        </div>
      </div>
      <div class="menu-wrapper">
        <div class="menu-selector hidden">${cardTypeSelector}</div>
        <div class="menu-content-wrapper">
          <div class="menu-label">
            <span class="primary">${CONFIG_TYPES.name}</span>
            <span class="secondary">${CONFIG_TYPES.description}</span>
          </div>
        </div>
      </div>
    </div>`;

    const tipsContent = this._renderTipContent(); // Tips content

    const versionFooter = html` <div class="version-footer">Version: ${CARD_VERSION}</div>`;

    return html` ${menuButton} ${tipsContent} ${versionFooter}`;
  }

  private _renderMiniMap(): TemplateResult {
    const docLink = 'https://github.com/ngocjohn/vehicle-status-card/wiki/Mini-map#maptiler-popup';

    const sharedConfig = { component: this, configIndex: 0, configType: 'mini_map' };

    const miniMap = this._config?.mini_map || {};
    const layoutConfig = this._config?.layout_config?.hide || {};

    const getBooleanPicker = (
      configValue: string,
      label: string,
      value: boolean,
      configType?: string,
      configIndex?: string | number
    ) => ({
      configValue,
      label,
      pickerType: 'selectorBoolean',
      value,
      options: { selector: { boolean: ['true', 'false'] } },
      configType: configType || 'mini_map',
      configIndex: configIndex || 0,
    });

    const getNumberPicker = (
      configValue: string,
      label: string,
      value: number,
      max = 500,
      min = 0,
      step = 1,
      mode = 'box'
    ) => ({
      configValue,
      label,
      pickerType: 'number',
      value,
      options: { selector: { number: { max, min, step, mode } } },
    });

    const configFields = [
      getBooleanPicker('enable_popup', 'Enable Popup', miniMap.enable_popup ?? false),
      getBooleanPicker('us_format', 'US Address Format', miniMap.us_format ?? false),
      getBooleanPicker('map_address', 'Hide Address', layoutConfig.map_address ?? false, 'layout_config', 'hide'),
      getNumberPicker('map_zoom', 'Map Zoom', miniMap.map_zoom ?? 14),
      getNumberPicker('map_height', 'Minimap Height (px)', miniMap.map_height ?? 150, 500, 150, 10, 'slider'),
    ];

    const apiKeys = [
      {
        configValue: 'device_tracker',
        label: 'Device Tracker',
        pickerType: 'entity',
        value: miniMap.device_tracker ?? '',
        options: { includeDomains: ['device_tracker', 'person'] },
      },
      {
        configValue: 'google_api_key',
        label: 'Google API Key (Optional)',
        pickerType: 'textfield',
        value: miniMap.google_api_key ?? '',
      },
      {
        configValue: 'maptiler_api_key',
        label: 'Maptiler API Key (Optional)',
        pickerType: 'textfield',
        value: miniMap.maptiler_api_key ?? '',
      },
    ];

    const popupConfig = [
      getNumberPicker('default_zoom', 'Default Zoom', miniMap.default_zoom || 14),
      getNumberPicker('hours_to_show', 'Hours to Show', miniMap.hours_to_show || 0),
      {
        configValue: 'theme_mode',
        label: 'Theme Mode',
        pickerType: 'attribute',
        value: miniMap.theme_mode ?? 'auto',
        items: [
          { label: 'Auto', value: 'auto' },
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ],
      },
      getBooleanPicker('auto_fit', 'Auto Fit', miniMap.auto_fit ?? false),
      {
        configValue: 'path_color',
        label: 'Path Color',
        pickerType: 'baseSelector',
        value: miniMap.path_color,
        options: { selector: { ui_color: { include_none: false, include_state: false } } },
      },
      {
        configValue: 'history_period',
        label: 'History Period',
        pickerType: 'attribute',
        value: miniMap.history_period || undefined,
        items: [
          { label: 'Today', value: 'today' },
          { label: 'Yesterday', value: 'yesterday' },
        ],
      },
    ];

    const createPickers = (configs: any[]) =>
      configs.map((config) => html`<div class="item-content">${Create.Picker({ ...sharedConfig, ...config })}</div>`);

    const expansionPanels = [
      {
        options: { header: 'Map Configuration' },
        content: html`
          <div class="sub-content">${createPickers(apiKeys)}</div>
          <ha-alert alert-type="info">
            How to get Maptiler API Key?
            <mwc-button slot="action" @click="${() => window.open(docLink)}" label="More"></mwc-button>
          </ha-alert>
        `,
      },
      {
        options: { header: 'Mini Map Layout' },
        content: html`<div class="sub-content">${createPickers(configFields)}</div>`,
      },
      {
        options: { header: 'Popup Configuration' },
        content: html`
          <div class="sub-content">${createPickers(popupConfig)}</div>
          <ha-alert alert-type="info">This options is for Map popup.</ha-alert>
        `,
      },
    ];

    return html`${expansionPanels.map(Create.ExpansionPanel)}`;
  }

  private _renderRangeInfo(): TemplateResult {
    return html`<panel-range-info .hass=${this._hass} .config=${this._config}></panel-range-info>`;
  }

  private _renderSelectedType(): TemplateResult {
    if (!this._selectedConfigType) {
      return html``;
    }
    const selected = this._selectedConfigType;
    const CARDCONFIG = CONFIG_TYPES.options[selected] || {};
    const DOC_URL = CARDCONFIG.doc || '';

    const typeMap = {
      button_card: this._renderButtonCard(),
      images: this._renderImages(),
      indicators: this._renderIndicators(),
      layout_config: this._renderLayoutConfig(),
      mini_map: this._renderMiniMap(),
      range: this._renderRangeInfo(),
    };
    const cardTypeSelector = this._renderConfigTypeSelector();

    const isMainEditor = ['layout_config'].includes(selected);

    const menuButton = html`<div class="config-menu-wrapper">
      <div class="menu-icon click-shrink" @click="${() => (this._selectedConfigType = null)}">
        <div class="menu-icon-inner">
          <ha-icon icon="mdi:home"></ha-icon>
        </div>
      </div>
      <div id="menu-icon" class="menu-icon click-shrink" @click="${() => this._toggleMenu()}">
        <div class="menu-icon-inner">
          <ha-icon icon="mdi:menu"></ha-icon>
        </div>
      </div>
      <div class="menu-wrapper">
        <div class="menu-selector hidden">${cardTypeSelector}</div>
        <div class="menu-content-wrapper">
          <div class="menu-label">
            <span class="primary">${CARDCONFIG.name ?? ''}</span>
          </div>
          ${isMainEditor
            ? nothing
            : html`
                <div class="menu-info-icon-wrapper">
                  <div class="menu-info-icon">
                    <ha-icon icon="mdi:eye" @click="${() => this._dispatchEvent('toggle-helper', selected)}"></ha-icon>
                  </div>
                  <div class="menu-info-icon">
                    <ha-icon icon="mdi:information" @click="${() => window.open(DOC_URL, '_blank')}"></ha-icon>
                  </div>
                </div>
              `}
        </div>
      </div>
    </div>`;

    return html`${menuButton} ${typeMap[selected]}`;
  }

  private _renderTipContent(): TemplateResult {
    const options = CONFIG_TYPES.options;

    return html`<div class="tip-content">
      ${Object.entries(options).map(
        ([key, { description, name }]) =>
          html`<div class="tip-item click-shrink" @click=${() => (this._selectedConfigType = key)}>
            <div class="tip-title">${name}</div>
            <span>${description}</span>
          </div>`
      )}
    </div>`;
  }

  /* ---------------------------- PANEL TEMPLATE ---------------------------- */

  _toggleHelp(selected: string): void {
    const activeType = selected;
    const event = new CustomEvent('editor-event', {
      bubbles: true,
      composed: true,
      detail: { activeType, type: 'toggle-helper' },
    });
    this.dispatchEvent(event);
    console.log('Toggle Help:', activeType);
  }

  private _toggleMenu(): void {
    const menuSelector = this.shadowRoot?.querySelector('.menu-selector') as HTMLElement;
    const menuContent = this.shadowRoot?.querySelector('.menu-content-wrapper') as HTMLElement;
    const menuIcon = this.shadowRoot?.getElementById('menu-icon') as HTMLElement;
    const haIcon = menuIcon?.querySelector('ha-icon') as HTMLElement;
    if (menuSelector && menuContent) {
      const isHidden = menuSelector.classList.contains('hidden');
      if (isHidden) {
        menuIcon.classList.add('active');
        haIcon?.setAttribute('icon', 'mdi:close');
        menuSelector.classList.remove('hidden');
        menuContent.classList.add('hidden');
      } else {
        menuSelector.classList.add('hidden');
        haIcon?.setAttribute('icon', 'mdi:menu');
        menuIcon.classList.remove('active');
        setTimeout(() => {
          menuContent.classList.remove('hidden');
        }, 200);
      }
    }
  }

  public _valueChanged(ev: any): void {
    if (!this._config || !this._hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;
    const configType = target.configType;
    const configIndex = target.configIndex;

    const SELECTOR_VALUES = [
      'default_zoom',
      'enable_popup',
      'hours_to_show',
      'theme_mode',
      'map_height',
      'us_format',
      'path_color',
      'map_zoom',
      'auto_fit',
      'history_period',
    ];
    // Ensure we handle the boolean value correctly
    let newValue: any = target.checked !== undefined ? target.checked : target.value;
    if (SELECTOR_VALUES.includes(configValue)) {
      newValue = ev.detail.value;
    }
    let hiddenChanged = false;
    // console.log('Config Value:', configValue, 'Config Type:', configType, 'New Value:', newValue);
    const updates: Partial<VehicleStatusCardConfig> = {};

    if (configType === 'mini_map') {
      const miniMap = { ...(this._config.mini_map || {}) };
      if (['google_api_key', 'maptiler_api_key'].includes(configValue)) {
        if (newValue.trim() === '' || newValue === '') {
          miniMap[configValue] = undefined;
          updates.mini_map = miniMap;
          console.log('Api delete', configValue, newValue);
        } else {
          miniMap[configValue] = newValue;
          updates.mini_map = miniMap;
          console.log('Api changes', configValue, newValue);
        }
      } else {
        miniMap[configValue] = newValue;
        updates.mini_map = miniMap;
        console.log('Mini Map Updates:', configValue, newValue);
      }
    } else if (configType === 'layout_config') {
      newValue = ev.detail.value;
      if (configIndex === 'button_grid') {
        const layoutConfig = { ...(this._config.layout_config || {}) };
        const buttonGrid = { ...(layoutConfig.button_grid || {}) };
        buttonGrid[configValue] = newValue;
        layoutConfig.button_grid = buttonGrid;
        updates.layout_config = layoutConfig;
      } else if (configIndex === 'hide') {
        const layoutConfig = { ...(this._config.layout_config || {}) };
        const hide = { ...(layoutConfig.hide || {}) };
        hide[configValue] = newValue;
        layoutConfig.hide = hide;

        if (CARD_SECTIONS.includes(configValue)) {
          const sectionOrder = [...(this._config.layout_config?.section_order || [])];
          const updatedOrder = this._setOrderList(hide, sectionOrder);
          layoutConfig.section_order = updatedOrder;
          hiddenChanged = true;
        }
        updates.layout_config = layoutConfig;
      } else if (configIndex === 'theme_config') {
        newValue = ev.detail.value ?? ev.target.value;
        const layoutConfig = { ...(this._config.layout_config || {}) };
        const themeConfig = { ...(layoutConfig.theme_config || {}) };
        if (themeConfig[configValue] === newValue) {
          return;
        }

        themeConfig[configValue] = newValue;
        layoutConfig.theme_config = themeConfig;
        updates.layout_config = layoutConfig;
        console.log('Theme Config:', themeConfig);
      }
    } else {
      updates[configValue] = newValue;
    }

    // Apply the updates and trigger the config change event
    if (Object.keys(updates).length > 0) {
      this._config = { ...this._config, ...updates };
      fireEvent(this, 'config-changed', { config: this._config });
      if (hiddenChanged) {
        this._reloadSectionList = true;
        setTimeout(() => {
          this._reloadSectionList = false;
          this._initSectionSortable();
        }, 0);
      }
    }
  }

  private _setOrderList(hide: VehicleStatusCardConfig['layout_config']['hide'], currentOrder: string[]) {
    let sectionOrder = [...currentOrder];
    const section = {
      indicators: SECTION.INDICATORS,
      range_info: SECTION.RANGE_INFO,
      images: SECTION.IMAGES,
      mini_map: SECTION.MINI_MAP,
      buttons: SECTION.BUTTONS,
    };
    for (const key in section) {
      if (['indicators', 'range_info'].includes(key)) {
        if (hide.indicators && hide.range_info) {
          if (sectionOrder.includes(SECTION.HEADER_INFO)) {
            sectionOrder = sectionOrder.filter((s) => s !== SECTION.HEADER_INFO);
          }
        } else if ((!hide.indicators || !hide.range_info) && !sectionOrder.includes(SECTION.HEADER_INFO)) {
          sectionOrder.push(SECTION.HEADER_INFO);
        }
      } else if (hide[key] && sectionOrder.includes(key)) {
        sectionOrder = sectionOrder.filter((s) => s !== key);
      } else if (!hide[key] && !sectionOrder.includes(key)) {
        sectionOrder.push(key);
      }
    }

    sectionOrder = [...new Set(sectionOrder)];
    return sectionOrder;
  }

  /* ------------------------- CONFIG CHANGED HANDLER ------------------------- */

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  static get styles(): CSSResultGroup {
    return editorcss;
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
