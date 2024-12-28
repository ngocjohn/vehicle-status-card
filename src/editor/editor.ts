// External
import { fireEvent, LovelaceCardEditor, LovelaceConfig } from 'custom-card-helpers';
import { CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat.js';
import Sortable from 'sortablejs';

import { CARD_SECTIONS, CARD_VERSION, ICON, SECTION, SECTION_ORDER } from '../const/const';
import { HA as HomeAssistant, VehicleStatusCardConfig } from '../types';
import {
  _saveConfig,
  convertRangeEntityToObject,
  convertSecondaryToObject,
  loadHaComponents,
  stickyPreview,
  Create,
} from '../utils';
// Import all components
import './components/';
import { PanelImagesEditor, PanelIndicator, PanelButtonCard, PanelEditorUI, PanelRangeInfo } from './components/';
import { CONFIG_TYPES, PREVIEW_CONFIG_TYPES } from './editor-const';
// Import styles
import editorcss from '../css/editor.css';

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
    if (process.env.ROLLUP_WATCH === 'true') {
      window.EditorManager = this;
    }
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
    const { button_card: buttonCard, range_info: rangeInfo } = config;

    // Validate button configuration
    const isButtonValid = buttonCard.every(
      (button) =>
        button.button.secondary !== null &&
        typeof button.button.secondary === 'object' &&
        !Array.isArray(button.button.secondary)
    );

    // Validate range configuration
    const isRangeValid = rangeInfo.every(({ energy_level, range_level }) =>
      [energy_level, range_level].every((level) => level !== null && typeof level === 'object' && !Array.isArray(level))
    );

    console.log('Button Valid:', isButtonValid, 'Range Valid:', isRangeValid);

    // If button configuration is invalid
    if (!isButtonValid) {
      const cardId = `vsc-${Math.random().toString(36).substring(2, 9)}`;
      const newButtonConfig = convertSecondaryToObject(buttonCard);
      this._updateConfig({ button_card: newButtonConfig, card_id: cardId });
      console.log('Converted button card and saved:', cardId);
      return;
    }

    // If range configuration is invalid
    if (!isRangeValid) {
      const cardId = `vsc-${Math.random().toString(36).substring(2, 9)}`;
      const newRangeConfig = convertRangeEntityToObject(rangeInfo);
      this._updateConfig({ range_info: newRangeConfig, card_id: cardId });
      console.log('Converted range info and saved:', cardId);
      return;
    }

    // If everything is valid but card_id exists
    if (isButtonValid && isRangeValid && config.card_id !== undefined) {
      console.log('Valid config, removing cardId');
      this._updateConfig({ ...config, card_id: undefined });
      return;
    }

    console.log('Configuration is already valid.');
  }

  // Helper method to update configuration and fire events
  private async _updateConfig(newConfig: Partial<VehicleStatusCardConfig>): Promise<void> {
    this._config = { ...this._config, ...newConfig };
    fireEvent(this, 'config-changed', { config: this._config });

    if (newConfig.card_id) {
      await _saveConfig(newConfig.card_id, this._config);
      console.log('Saved config with cardId:', newConfig.card_id);
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
      if (sectionList) {
        this._sectionSortable = new Sortable(sectionList, {
          animation: 150,
          handle: '.handle',
          ghostClass: 'sortable-ghost',
          onEnd: (evt) => {
            this._handleSectionSort(evt);
          },
        });
      }
    });
    console.log('Section sortable initialized');
  }

  private _handleSectionSort(evt: Sortable.SortableEvent): void {
    if (!this._config) return;
    evt.preventDefault();
    const oldIndex = evt.oldIndex as number;
    const newIndex = evt.newIndex as number;
    const sections = [...(this._config.layout_config.section_order || [...SECTION_ORDER])];
    const [removed] = sections.splice(oldIndex, 1);
    sections.splice(newIndex, 0, removed);

    this._config.layout_config.section_order = sections;

    fireEvent(this, 'config-changed', { config: this._config });
    setTimeout(() => {
      if (this._sectionSortable) {
        this._sectionSortable.destroy();
        setTimeout(() => {
          this._initSectionSortable();
        }, 0);
      }
    }, 50);
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

    // Check if any preview key is not null
    if (PREVIEW_CONFIG_TYPES.some((key) => this._config[key] !== null)) {
      console.log('Cleaning config of preview keys');
      this._config = {
        ...this._config,
        ...PREVIEW_CONFIG_TYPES.reduce((acc: any, key: string) => {
          acc[key] = null;
          return acc;
        }, {}),
      };
      fireEvent(this, 'config-changed', { config: this._config });
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

    const themeModeSelect = [
      { label: 'Theme', pickerType: 'theme', value: themeConfig.theme || 'default' },
      {
        configValue: 'mode',
        items: [
          {
            label: 'Auto',
            value: 'auto',
          },
          {
            label: 'Light',
            value: 'light',
          },
          {
            label: 'Dark',
            value: 'dark',
          },
        ],
        label: 'Theme Mode',
        pickerType: 'attribute',
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
    if (this._reloadSectionList) return html`<div>Loading...</div>`;

    const sectionList = this._config.layout_config.section_order || [...SECTION_ORDER];
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
    const selectorNumber = {
      number: {
        max: 24,
        min: 0,
        mode: 'box',
        step: 1,
      },
    };

    const sharedConfig = {
      component: this,
      configIndex: 0,
      configType: 'mini_map',
    };
    const themeModeSelect = [
      { label: 'Auto', value: 'auto' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
    ];

    const miniMap = this._config?.mini_map || {};
    const deviceTracker = miniMap.device_tracker ?? '';
    const defaultZoom = miniMap.default_zoom ?? 14;
    const hoursToShow = miniMap.hours_to_show ?? 0;
    const googleApi = miniMap.google_api_key ?? '';
    const themeMode = miniMap.theme_mode ?? 'auto';
    const popupEnable = miniMap.enable_popup ?? false;
    const mapHeight = miniMap.map_height ?? 150;

    const pickerConfig = [
      {
        configValue: 'device_tracker',
        label: 'Device Tracker',
        options: { includeDomains: ['device_tracker', 'person'] },
        pickerType: 'entity',
        value: deviceTracker,
      },
      {
        configValue: 'google_api_key',
        label: 'Google API Key',
        pickerType: 'textfield' as 'textfield',
        value: googleApi ?? '',
      },
      {
        configValue: 'default_zoom',
        label: 'Default Zoom',
        options: { selector: selectorNumber },
        pickerType: 'number',
        value: defaultZoom,
      },
      {
        configValue: 'hours_to_show',
        label: 'Hours to Show',
        options: { selector: selectorNumber },
        pickerType: 'number',
        value: hoursToShow,
      },

      {
        configValue: 'theme_mode',
        items: themeModeSelect,
        label: 'Theme Mode',
        pickerType: 'attribute',
        value: themeMode,
      },
      {
        configValue: 'enable_popup',
        label: 'Enable Popup',
        options: { selector: { boolean: ['true', 'false'] } },
        pickerType: 'selectorBoolean',
        value: popupEnable,
      },
      {
        configValue: 'map_height',
        label: 'Minimap Height (px)',
        options: { selector: { number: { max: 500, min: 150, mode: 'slider', step: 10 } } },
        pickerType: 'number',
        value: mapHeight,
      },
    ];

    const createPickers = (config: any) => {
      return Create.Picker({ ...sharedConfig, ...config });
    };

    return html`
      <div class="sub-panel">
        <div class="sub-header">Mini Map Configuration</div>
        <div class="sub-panel-config">
          <div class="sub-content">${pickerConfig.map((config) => createPickers(config))}</div>
        </div>
      </div>
    `;
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

    // Ensure we handle the boolean value correctly
    let newValue: any = target.checked !== undefined ? target.checked : target.value;
    if (['default_zoom', 'enable_popup', 'hours_to_show', 'theme_mode', 'map_height'].includes(configValue)) {
      newValue = ev.detail.value;
    }
    let hiddenChanged = false;
    // console.log('Config Value:', configValue, 'Config Type:', configType, 'New Value:', newValue);
    const updates: Partial<VehicleStatusCardConfig> = {};

    if (configType === 'mini_map') {
      const miniMap = { ...(this._config.mini_map || {}) };

      miniMap[configValue] = newValue;
      updates.mini_map = miniMap;
      console.log('Mini Map Updates:', configValue, newValue);
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
          let sectionOrder = [...(layoutConfig.section_order ?? [...SECTION_ORDER])];
          const section = {
            indicators: SECTION.INDICATORS,
            range_info: SECTION.RANGE_INFO,
            images: SECTION.IMAGES,
            mini_map: SECTION.MINI_MAP,
            buttons: SECTION.BUTTONS,
          };
          for (const key in section) {
            if (['indicators', 'range_info'].includes(key)) {
              if (hide.indicators === true && hide.range_info === true) {
                sectionOrder = sectionOrder.filter((s) => s !== SECTION.HEADER_INFO);
              } else if (hide.indicators === false || hide.range_info === false) {
                sectionOrder.push(SECTION.HEADER_INFO);
              }
            } else if (hide[key] === true) {
              sectionOrder = sectionOrder.filter((s) => s !== key);
            } else {
              sectionOrder.push(key);
            }
          }

          sectionOrder = SECTION_ORDER.filter((s) => sectionOrder.includes(s));
          layoutConfig.section_order = sectionOrder;
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
          if (this._sectionSortable) {
            this._sectionSortable.destroy();
            this._reloadSectionList = false;
            setTimeout(() => {
              this._initSectionSortable();
            }, 0);
          }
        }, 50);
      }
    }
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
