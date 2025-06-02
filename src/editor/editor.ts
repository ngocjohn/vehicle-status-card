// External
import { CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { CARD_VERSION, ICON, SECTION } from '../const/const';
// Import styles
import editorcss from '../css/editor.css';
import { HomeAssistant, VehicleStatusCardConfig, LovelaceCardEditor, LovelaceConfig, fireEvent } from '../types';
// Import all components
import './components/';
import { loadHaComponents, stickyPreview, Create } from '../utils';
import {
  PanelImagesEditor,
  PanelButtonCard,
  PanelEditorUI,
  PanelRangeInfo,
  PanelMapEditor,
  PanelIndicatorSingle,
  PanelIndicatorGroup,
} from './components/';
import { CONFIG_TYPES, PREVIEW_CONFIG_TYPES } from './editor-const';
import { BUTTON_GRID_SCHEMA, HIDE_SCHEMA, NAME_SCHEMA, THEME_CONFIG_SCHEMA } from './form';

@customElement('vehicle-status-card-editor')
export class VehicleStatusCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;

  @state() private activeTabIndex: null | number = null;
  @state() private _indicatorTabIndex: number = 0;

  @state() _selectedConfigType: null | string = null;

  @state() private _reloadSectionList: boolean = false;
  @query('panel-images-editor') _panelImages?: PanelImagesEditor;
  @query('panel-range-info') _panelRangeInfo?: PanelRangeInfo;
  @query('panel-editor-ui') _panelEditorUI?: PanelEditorUI;
  @query('panel-button-card') _panelButtonCard?: PanelButtonCard;
  @query('panel-map-editor') _panelMapEditor?: PanelMapEditor;
  @query('panel-indicator-single') _panelIndicatorSingle?: PanelIndicatorSingle;
  @query('panel-indicator-group') _panelIndicatorGroup?: PanelIndicatorGroup;

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

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    const oldSelectedConfigType = changedProps.get('_selectedConfigType') as string | null;
    const shouldUpdate =
      (this._selectedConfigType === null && oldSelectedConfigType !== null) ||
      (oldSelectedConfigType === 'button_card' && this._selectedConfigType !== 'button_card') ||
      (oldSelectedConfigType === 'indicators' && this._selectedConfigType !== 'indicators');
    if (shouldUpdate) {
      this._cleanConfig();
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config) return;
    if (changedProps.has('_selectedConfigType') && this._selectedConfigType !== null) {
      setTimeout(() => {
        if (this._selectedConfigType) this._dispatchEvent('toggle-helper', this._selectedConfigType);
      }, 200);
    }

    if (
      changedProps.has('_selectedConfigType') &&
      changedProps.get('_selectedConfigType') !== null &&
      (this._selectedConfigType === null || changedProps.get('_selectedConfigType') !== this._selectedConfigType)
    ) {
      this._toggleMenu();
    }

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

    return html`
      <div class="base-config">
        ${!this._selectedConfigType ? this._renderMainEditorPage() : this._renderSelectedType()}
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
      // Remove all preview config types from the _config object
      PREVIEW_CONFIG_TYPES.forEach((key) => {
        if (this._config.hasOwnProperty(key)) {
          delete this._config[key];
        }
      });

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
    // console.log('Dispatched event', type, detail);
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
      // { label: 'Select Config Type', value: '' },
      ...Object.keys(OPTIONS).map((key) => ({ label: OPTIONS[key].name, value: key })),
    ];

    const selectorWrapper = html`
      <ha-selector
        style="width: 100%;"
        .hass=${this._hass}
        .label=${'Select Config Type'}
        .value=${this._selectedConfigType ?? ''}
        .placeholder=${'Select Config Type'}
        .selector=${{
          select: {
            mode: 'dropdown',
            options: ITEMS,
          },
        }}
        .required=${false}
        @value-changed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          this._selectedConfigType = ev.detail.value;
        }}
      ></ha-selector>
    `;

    return selectorWrapper;
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

    return html`
      ${Create.VicTab({
        activeTabIndex: this._indicatorTabIndex || 0,
        onTabChange: (index: number) => (this._indicatorTabIndex = index),
        tabs: tabsConfig,
      })}
    `;
  }

  private _renderGroupIndicator(): TemplateResult {
    return html`
      <vsc-panel-indicator-group
        .hass=${this._hass}
        .editor=${this}
        .groupConfig=${this._config.indicators?.group || []}
      >
      </vsc-panel-indicator-group>
    `;
  }

  private _renderSingleIndicator(): TemplateResult {
    return html`
      <vsc-panel-indicator-single
        .hass=${this._hass}
        .editor=${this}
        .singleConfig=${this._config.indicators?.single || []}
      >
      </vsc-panel-indicator-single>
    `;
  }

  private _renderLayoutConfig(): TemplateResult {
    const layout = this._config.layout_config || {};

    const BUTTON_GRID_DATA = { ...layout.button_grid };
    const HIDE_CONFIG_DATA = { ...layout.hide };
    const THEME_DATA = { ...layout.theme_config };
    const NAME_DATA = { name: this._config.name || '' };

    const _renderPanels = (
      sections: {
        title: string;
        content: TemplateResult;
        expansion?: boolean;
      }[]
    ): TemplateResult => {
      return html`
        ${sections.map(({ title, content, expansion }) => {
          if (expansion) {
            return Create.ExpansionPanel({
              content,
              options: {
                header: title,
                expanded: false,
              },
            });
          } else {
            return html`
              <div class="sub-panel-config button-card">
                <div class="sub-header">${title}</div>
                <div class="sub-panel">${content}</div>
              </div>
            `;
          }
        })}
      `;
    };

    const buttonGridWrapper = _renderPanels([
      {
        title: 'Button Grid Configuration',
        content: this._createHaForm(BUTTON_GRID_DATA, BUTTON_GRID_SCHEMA, 'layout_config', 'button_grid'),
      },
    ]);

    // Hide configuration wrapper
    const hideWrapper = _renderPanels([
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
    const themeWrapper = _renderPanels([
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
          activeTabIndex: this.activeTabIndex || 0,
          onTabChange: (index: number) => (this.activeTabIndex = index),
          tabs: tabsConfig,
        })}
      </div>
    `;
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
              <ha-icon-button class="action-icon" .path=${ICON.DRAG}></ha-icon-button>
            </div>
            <div class="item-content">
              <div class="primary">${section.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
          </div>`
        )}
      </div>
    </ha-sortable>`;
  }

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

  private _renderMainEditorPage(): TemplateResult {
    const menuButton = html`<div class="config-menu-wrapper">
      <div id="menu-icon" class="menu-icon click-shrink">
        <div class="menu-icon-inner">
          <ha-icon icon="mdi:menu"></ha-icon>
        </div>
      </div>
      <div class="menu-wrapper">
        <div class="menu-content-wrapper">
          <div class="menu-label">
            <span class="primary">${CONFIG_TYPES.name}</span>
            <span class="secondary">${CONFIG_TYPES.description}</span>
          </div>
        </div>
      </div>
    </div>`;

    // const tipsContent = this._renderTipContent(); // Tips content
    const tipsContent = html`<div class="tip-content">
      ${Object.entries(CONFIG_TYPES.options).map(
        ([key, { description, name }]) =>
          html`<div class="tip-item click-shrink" @click=${() => (this._selectedConfigType = key)}>
            <div class="tip-title">${name}</div>
            <span>${description}</span>
          </div>`
      )}
    </div>`;

    const versionFooter = html` <div class="version-footer">Version: ${CARD_VERSION}</div>`;

    return html` ${menuButton} ${tipsContent} ${versionFooter}`;
  }

  private _renderMiniMap(): TemplateResult {
    return html`<panel-map-editor .hass=${this._hass} .editor=${this} ._config=${this._config}></panel-map-editor>`;
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

  /* ---------------------------- PANEL TEMPLATE ---------------------------- */

  private _toggleMenu(): void {
    const root = this.shadowRoot;
    const menuSelector = root?.querySelector('.menu-selector') as HTMLElement;
    const menuContent = root?.querySelector('.menu-content-wrapper') as HTMLElement;
    const menuIcon = root?.getElementById('menu-icon') as HTMLElement;
    const haIcon = menuIcon?.querySelector('ha-icon');

    if (!menuSelector || !menuContent || !menuIcon || !haIcon) return;

    const isHidden = menuSelector.classList.contains('hidden');
    menuIcon.classList.toggle('active', isHidden);
    haIcon.setAttribute('icon', isHidden ? 'mdi:close' : 'mdi:menu');
    menuSelector.classList.toggle('hidden', !isHidden);

    if (!isHidden) {
      setTimeout(() => menuContent.classList.remove('hidden'), 200);
    } else {
      menuContent.classList.add('hidden');
    }
  }

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
        const updatedOrder = this._setOrderList(newValue, sectionOrder);
        layoutConfig.section_order = updatedOrder;
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
