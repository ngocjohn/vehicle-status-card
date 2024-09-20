/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators';

// Custom card helpers
import { fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { HomeAssistantExtended as HomeAssistant, VehicleStatusCardConfig } from '../types';
import { loadHaComponents, stickyPreview, getContentSlot } from '../utils/loader';
import { CARD_VERSION } from '../const/const';
import { CONFIG_TYPES } from './editor-const';

import editorcss from '../css/editor.css';

import './components/panel-indicator';
import './components/panel-range-info';
import './components/panel-images-editor';
import './components/panel-button-card';

import { Picker, TabBar } from '../utils/create';

@customElement('vehicle-status-card-editor')
export class VehicleStatusCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property() private _config!: VehicleStatusCardConfig;

  @state() private activeTabIndex: number | null = null;
  @state() _selectedConfigType: string | null = null;
  @state() _helpOverlayActive: boolean = false;

  @query('panel-indicator') _indicatorEditor?: any;
  @query('panel-range-info') _rangeInfoEditor?: any;
  @query('panel-images-editor') _imagesEditor?: any;
  @query('panel-button-card') _buttonCardEditor?: any;

  constructor() {
    super();
    this._handleTabChange = this._handleTabChange.bind(this);
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  public async setConfig(config: VehicleStatusCardConfig): Promise<void> {
    this._config = config;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (!this._config || !this._hass) {
      return false;
    }
    return true;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('_selectedConfigType') && this._selectedConfigType !== null) {
      setTimeout(() => {
        if (this._selectedConfigType) this._dispatchEvent('toggle-helper', this._selectedConfigType);
      }, 200);
    }
    if (changedProps.has('_selectedConfigType') && this._selectedConfigType === null) {
      this._cleanConfig();
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

  private _cleanConfig(): void {
    if (['btn_preview', 'card_preview', 'default_card_preview'].some((key) => this._config[key])) {
      console.log('Cleaning config of preview keys');
      this._config = { ...this._config, btn_preview: null, card_preview: null, default_card_preview: null };
      fireEvent(this, 'config-changed', { config: this._config });
    } else {
      console.log('No preview keys found');
    }
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

  private _renderTipContent(): TemplateResult {
    const options = CONFIG_TYPES.options;

    return html`<div class="tip-content">
      ${Object.entries(options).map(
        ([key, { name, description }]) =>
          html`<div class="tip-item click-shrink" @click=${() => (this._selectedConfigType = key)}>
            <div class="tip-title">${name}</div>
            <span>${description}</span>
          </div>`
      )}
    </div>`;
  }

  private _renderConfigTypeSelector(): TemplateResult {
    const OPTIONS = CONFIG_TYPES.options;
    const ITEMS = [
      { value: '', label: 'Select Config Type' },
      ...Object.keys(OPTIONS).map((key) => ({ value: key, label: OPTIONS[key].name })),
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

  private _renderSelectedType(): TemplateResult {
    if (!this._selectedConfigType) {
      return html``;
    }
    const selected = this._selectedConfigType;
    const CARDCONFIG = CONFIG_TYPES.options[selected];
    const DOC_URL = CARDCONFIG.doc;

    const typeMap = {
      indicators: this._renderIndicators(),
      range: this._renderRangeInfo(),
      images: this._renderImages(),
      mini_map: this._renderMiniMap(),
      button_card: this._renderButtonCard(),
      layout_config: this._renderLayoutConfig(),
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

  private _renderRangeInfo(): TemplateResult {
    return html`<panel-range-info .hass=${this._hass} .config=${this._config}></panel-range-info>`;
  }

  private _renderImages(): TemplateResult {
    return html`<panel-images-editor .editor=${this} .config=${this._config}></panel-images-editor>`;
  }

  private _renderMiniMap(): TemplateResult {
    const selectorNumber = {
      number: {
        min: 0,
        max: 24,
        mode: 'box',
        step: 1,
      },
    };

    const sharedConfig = {
      component: this,
      configType: 'mini_map',
      configIndex: 0,
    };
    const themeModeSelect = [
      { value: 'auto', label: 'Auto' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
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
        label: 'Device Tracker',
        value: deviceTracker,
        configValue: 'device_tracker',
        pickerType: 'entity',
        options: { includeDomains: ['device_tracker', 'person'] },
      },
      { label: 'Google API Key', value: googleApi, configValue: 'google_api_key', pickerType: 'textfield' },
      {
        label: 'Default Zoom',
        value: defaultZoom,
        configValue: 'default_zoom',
        pickerType: 'number',
        options: { selector: selectorNumber },
      },
      {
        label: 'Hours to Show',
        value: hoursToShow,
        configValue: 'hours_to_show',
        pickerType: 'number',
        options: { selector: selectorNumber },
      },

      {
        label: 'Theme Mode',
        value: themeMode,
        configValue: 'theme_mode',
        pickerType: 'attribute',
        items: themeModeSelect,
      },
      {
        label: 'Enable Popup',
        value: popupEnable,
        configValue: 'enable_popup',
        pickerType: 'selectorBoolean',
        options: { selector: { boolean: ['true', 'false'] } },
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

  private _renderButtonCard(): TemplateResult {
    return html`<panel-button-card .hass=${this._hass} .editor=${this} .config=${this._config}></panel-button-card>`;
  }

  private _renderLayoutConfig(): TemplateResult {
    const layout = this._config.layout_config || {};
    const buttonGrid = layout.button_grid || {};

    const sharedButtonConfig = {
      component: this,
      configType: 'layout_config',
      configIndex: 'button_grid',
    };

    const buttonGridPicker = [
      {
        label: 'Rows',
        value: buttonGrid.rows || 2,
        configValue: 'rows',
        pickerType: 'number',
        options: { selector: { number: { min: 1, max: 10, mode: 'box', step: 1 } } },
      },
      {
        label: 'Use swipe for buttons',
        value: buttonGrid.swipe || false,
        configValue: 'swipe',
        pickerType: 'selectorBoolean',
        options: { selector: { boolean: ['true', 'false'] } },
      },
    ];

    const hide = layout.hide || {};
    const sharedBoolConfig = {
      component: this,
      configType: 'layout_config',
      configIndex: 'hide',
      pickerType: 'selectorBoolean',
      options: { selector: { boolean: ['true', 'false'] } },
    };
    const hidePicker = [
      {
        label: 'Notify badge on buttons',
        value: hide.button_notify || false,
        configValue: 'button_notify',
      },
      { label: 'Mini Map', value: hide.mini_map || false, configValue: 'mini_map' },
      { label: 'Buttons', value: hide.buttons || false, configValue: 'buttons' },
      { label: 'Indicators', value: hide.indicators || false, configValue: 'indicators' },
      { label: 'Range Info', value: hide.range_info || false, configValue: 'range_info' },
      { label: 'Images', value: hide.images || false, configValue: 'images' },
    ];

    const themeConfig = layout.theme_config || {};

    const sharedThemeConfig = {
      component: this,
      configType: 'layout_config',
      configIndex: 'theme_config',
    };

    const themeModeSelect = [
      { value: themeConfig.theme || 'default', label: 'Theme', pickerType: 'theme' },
      {
        value: themeConfig.mode || 'auto',
        label: 'Theme Mode',
        configValue: 'mode',
        items: [
          {
            value: 'auto',
            label: 'Auto',
          },
          {
            value: 'light',
            label: 'Light',
          },
          {
            value: 'dark',
            label: 'Dark',
          },
        ],
        pickerType: 'attribute',
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
      { key: 'theme_config', label: 'Theme', content: themeWrapper },
      { key: 'button_grid', label: 'Button Grid', content: buttonGridWrapper },
      { key: 'hide', label: 'Hide', content: hideWrapper },
    ];

    return html`<div class="card-config">
      ${TabBar({
        tabs: tabsConfig,
        activeTabIndex: this.activeTabIndex || 0,
        onTabChange: (index: number) => (this.activeTabIndex = index),
      })}
    </div>`;
  }

  /* ---------------------------- PANEL TEMPLATE ---------------------------- */

  private panelTemplate(
    panelKey: string,
    subpanel: string,
    content: TemplateResult,
    options?: { expanded?: boolean; helper?: boolean }
  ): TemplateResult {
    const { name, description, icon } = CONFIG_TYPES.options[panelKey].subpanels[subpanel];
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

  private _handlerAlert(ev: CustomEvent): void {
    const alert = ev.target as HTMLElement;
    alert.style.display = 'none';
  }

  private _handlePanelExpandedChanged(ev: Event, panelKey: string): void {
    const panel = ev.target as HTMLElement;
    if (panelKey === 'indicators' && (panel as any).expanded) {
      this._indicatorEditor?._hideClearButton();
    }
  }

  private _dispatchEvent(type: string, detail: any): void {
    const event = new CustomEvent('editor-event', {
      detail: { type, data: detail },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private _toggleHelp(selected: string): void {
    const activeType = selected;
    const event = new CustomEvent('editor-event', {
      detail: { type: 'toggle-helper', activeType },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
    console.log('Toggle Help:', activeType);
  }

  private _handleSelectedConfigType(ev: any): void {
    this._selectedConfigType = ev.detail.value;
    this.requestUpdate();
  }

  private _handleTabChange(index: number): void {
    this.activeTabIndex = index;
    this.requestUpdate();
  }

  /* ------------------------- CONFIG CHANGED HANDLER ------------------------- */

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

    if (['default_zoom', 'hours_to_show', 'theme_mode', 'enable_popup'].includes(configValue)) {
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
        console.log('Theme Config:', configValue, newValue);
        const layoutConfig = { ...(this._config.layout_config || {}) };
        const themeConfig = { ...(layoutConfig.theme_config || {}) };
        themeConfig[configValue] = newValue;
        layoutConfig.theme_config = themeConfig;
        updates.layout_config = layoutConfig;
        console.log('Theme Config:', layoutConfig.theme_config);
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
