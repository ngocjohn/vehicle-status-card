/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators';

// Custom card helpers
import { fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { CARD_VERSION } from '../const/const';
import editorcss from '../css/editor.css';
import { HomeAssistantExtended as HomeAssistant, VehicleStatusCardConfig } from '../types';
import { Picker, TabBar } from '../utils/create';
import { loadHaComponents, stickyPreview } from '../utils/loader';
import './components/panel-button-card';
import './components/panel-images-editor';
import './components/panel-indicator';
import './components/panel-range-info';
import { CONFIG_TYPES, PREVIEW_CONFIG_TYPES } from './editor-const';

@customElement('vehicle-status-card-editor')
export class VehicleStatusCardEditor extends LitElement implements LovelaceCardEditor {
  @property() private _config!: VehicleStatusCardConfig;
  @state() private activeTabIndex: null | number = null;

  @query('panel-button-card') _buttonCardEditor?: any;
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @state() _helpOverlayActive: boolean = false;

  @query('panel-images-editor') _imagesEditor!: any;
  @query('panel-indicator') _indicatorEditor?: any;
  @query('panel-range-info') _rangeInfoEditor?: any;
  @state() _selectedConfigType: null | string = null;

  constructor() {
    super();
    this._handleTabChange = this._handleTabChange.bind(this);
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

    // if (changedProps.has('_selectedConfigType') && this._selectedConfigType === 'images') {
    //   console.log('Init sortable');
    //   this._imagesEditor.initSortable();
    // }
  }

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
    if (PREVIEW_CONFIG_TYPES.some((key) => this._config[key])) {
      console.log('Cleaning config of preview keys');
      this._config = {
        ...this._config,
        btn_preview: null,
        card_preview: null,
        default_card_preview: null,
        tire_preview: null,
      };
      fireEvent(this, 'config-changed', { config: this._config });
    } else {
      console.log('No preview keys found');
    }
  }

  public _dispatchEvent(type: string, detail: any): void {
    const event = new CustomEvent('editor-event', {
      bubbles: true,
      composed: true,
      detail: { data: detail, type },
    });
    this.dispatchEvent(event);
  }

  private _handlePanelExpandedChanged(ev: Event, panelKey: string): void {
    const panel = ev.target as HTMLElement;
    if (panelKey === 'indicators' && (panel as any).expanded) {
      this._indicatorEditor?._hideClearButton();
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
    return html`<panel-button-card .hass=${this._hass} .editor=${this} .config=${this._config}></panel-button-card>`;
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
    return html`<panel-images-editor .editor=${this} .config=${this._config}></panel-images-editor>`;
  }

  private _renderIndicators(): TemplateResult {
    const panelKey = 'indicators';
    const singleIndicatorPanel = this.panelTemplate(
      panelKey,
      'single',
      html`
        <panel-indicator
          .hass=${this._hass}
          .editor=${this}
          .config=${this._config}
          .type=${'single'}
        ></panel-indicator>
      `
    );

    const groupIndicatorPanel = this.panelTemplate(
      panelKey,
      'group',
      html`
        <panel-indicator .hass=${this._hass} .editor=${this} .config=${this._config} .type=${'group'}></panel-indicator>
      `
    );

    const content = html` <div class="indicator-config">${singleIndicatorPanel} ${groupIndicatorPanel}</div> `;

    return content;
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
      {
        configValue: 'button_notify',
        label: 'Notify badge on buttons',
        value: hide.button_notify || false,
      },
      { configValue: 'mini_map', label: 'Mini Map', value: hide.mini_map || false },
      { configValue: 'buttons', label: 'Buttons', value: hide.buttons || false },
      { configValue: 'indicators', label: 'Indicators', value: hide.indicators || false },
      { configValue: 'range_info', label: 'Range Info', value: hide.range_info || false },
      { configValue: 'images', label: 'Images', value: hide.images || false },
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
      return Picker({ ...config, ...sharedConfig });
    };

    const buttonGridWrapper = html`
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <div class="sub-header-title">Button Grid Configuration</div>
        </div>
        <div class="sub-panel">
          <div class="sub-content">${buttonGridPicker.map((config) => createPickers(config, sharedButtonConfig))}</div>
        </div>
      </div>
    `;

    const hideWrapper = html`
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <div class="sub-header-title">Hide Configuration</div>
        </div>
        <div class="sub-panel">
          <div class="sub-content">${hidePicker.map((config) => createPickers(config, sharedBoolConfig))}</div>
        </div>
      </div>
    `;
    const themeWrapper = html`
      <div class="sub-panel-config button-card">
        <div class="sub-header">
          <div class="sub-header-title">Select the name for card</div>
        </div>
        <div class="sub-panel">
          <div class="item-config-row">
            <ha-textfield
              style="width: 100%;"
              .label=${'Name (Optional)'}
              .placeholder=${'Vehicle Status Card'}
              .configValue=${'name'}
              .value=${this._config.name}
              @change=${this._valueChanged}
            ></ha-textfield>
          </div>
          <div class="sub-header">
            <div class="sub-header-title">Theme Configuration</div>
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
      { content: hideWrapper, key: 'hide', label: 'Hide' },
    ];

    return html`<div class="card-config">
      ${TabBar({
        activeTabIndex: this.activeTabIndex || 0,
        onTabChange: (index: number) => (this.activeTabIndex = index),
        tabs: tabsConfig,
      })}
    </div>`;
  }

  private _renderMainEditorPage(): TemplateResult {
    const cardTypeSelector = this._renderConfigTypeSelector();

    const menuButton = html`<div class="config-menu-wrapper">
      <div id="menu-icon" class="menu-icon click-schrink" @click="${() => this._toggleMenu()}">
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
    const defaultZoom = miniMap.default_zoom ?? 0;
    const hoursToShow = miniMap.hours_to_show ?? 0;
    const googleApi = miniMap.google_api_key ?? '';
    const themeMode = miniMap.theme_mode ?? 'auto';
    const popupEnable = miniMap.enable_popup ?? false;

    const pickerConfig = [
      {
        configValue: 'device_tracker',
        label: 'Device Tracker',
        options: { includeDomains: ['device_tracker', 'person'] },
        pickerType: 'entity',
        value: deviceTracker,
      },
      { configValue: 'google_api_key', label: 'Google API Key', pickerType: 'textfield', value: googleApi },
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
    ];

    const createPickers = (config: any) => {
      return Picker({ ...sharedConfig, ...config });
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
    const CARDCONFIG = CONFIG_TYPES.options[selected];
    const DOC_URL = CARDCONFIG.doc;

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
      <div class="menu-icon click-schrink" @click="${() => (this._selectedConfigType = null)}">
        <div class="menu-icon-inner">
          <ha-icon icon="mdi:home"></ha-icon>
        </div>
      </div>
      <div id="menu-icon" class="menu-icon click-schrink" @click="${() => this._toggleMenu()}">
        <div class="menu-icon-inner">
          <ha-icon icon="mdi:menu"></ha-icon>
        </div>
      </div>
      <div class="menu-wrapper">
        <div class="menu-selector hidden">${cardTypeSelector}</div>
        <div class="menu-content-wrapper">
          <div class="menu-label">
            <span class="primary">${CARDCONFIG.name}</span>
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

  private _toggleHelp(selected: string): void {
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

  private panelTemplate(
    panelKey: string,
    subpanel: string,
    content: TemplateResult,
    options?: { expanded?: boolean; helper?: boolean }
  ): TemplateResult {
    const { icon, name } = CONFIG_TYPES.options[panelKey].subpanels[subpanel];
    const expanded = options?.expanded ?? false;

    return html`
      <ha-expansion-panel
        id="${panelKey}"
        .outlined=${true}
        .expanded=${expanded}
        .header=${name}
        .secondary=${''}
        .leftChevron=${true}
        @expanded-changed=${(e: Event) => this._handlePanelExpandedChanged(e, panelKey)}
      >
        <div slot="icons">
          <ha-icon icon=${icon ? icon : ''}></ha-icon>
        </div>
        <div class="card-config">${content}</div>
      </ha-expansion-panel>
    `;
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
    let newValue: any = target.value;

    if (['default_zoom', 'enable_popup', 'hours_to_show', 'theme_mode'].includes(configValue)) {
      newValue = ev.detail.value;
    } else {
      newValue = target.checked !== undefined ? target.checked : target.value;
    }

    // console.log('Config Value:', configValue, 'Config Type:', configType, 'New Value:', newValue);
    const updates: Partial<VehicleStatusCardConfig> = {};

    if (configType === 'mini_map') {
      if (['default_zoom', 'hours_to_show', 'theme_mode'].includes(configValue)) {
        const miniMap = { ...(this._config.mini_map || {}) };
        miniMap[configValue] = newValue;
        updates.mini_map = miniMap;
      } else {
        const miniMap = { ...this._config.mini_map };
        miniMap[configValue] = newValue;
        updates.mini_map = miniMap;
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
    }
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

  public async setConfig(config: VehicleStatusCardConfig): Promise<void> {
    this._config = config;
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
