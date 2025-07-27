import { html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import './components';
import './editor/editor';
// components
import { VehicleButtonsGrid, ImagesSlide, VscRangeInfo, VscIndicators, MiniMapBox } from './components';
import { ICON, SECTION, SECTION_ORDER } from './const/const';
// Ha utils
import { fireEvent, forwardHaptic, HomeAssistant, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from './ha';
import {
  ButtonCardConfig,
  DefaultCardConfig,
  MapData,
  PREVIEW_TYPE,
  TireEntity,
  TireTemplateConfig,
  VehicleStatusCardConfig,
} from './types/config';
import { isEmpty, applyThemesOnElement, loadAndCleanExtraMap, isDarkTheme } from './utils';
import { BaseElement } from './utils/base-element';
import { loadVerticalStackCard } from './utils/lovelace/create-card-element';
import { createCustomCard } from './utils/lovelace/create-custom-card';
import { createMapCard } from './utils/lovelace/create-map-card';
import { getTireCard } from './utils/lovelace/create-tire-card';
import { _setUpPreview, previewHandler } from './utils/lovelace/preview-helper';
import { createStubConfig, loadStubConfig } from './utils/lovelace/stub-config';
import { Store } from './utils/store';

@customElement('vehicle-status-card')
export class VehicleStatusCard extends BaseElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('vehicle-status-card-editor');
  }

  public static getStubConfig = async (hass: HomeAssistant): Promise<VehicleStatusCardConfig> => {
    const DEFAULT_CONFIG = (await loadStubConfig()) ?? (await createStubConfig(hass));
    return {
      ...DEFAULT_CONFIG,
    };
  };

  public setConfig(config: VehicleStatusCardConfig): void {
    const newConfig = JSON.parse(JSON.stringify(config)) as VehicleStatusCardConfig;
    this._config = newConfig;
    if (this._config.button_card && this._config.button_card.length) {
      this._buttonCardConfigItem = this._config.button_card as ButtonCardConfig[];
    }
  }

  @property({ attribute: false }) public layout?: string;
  @property({ attribute: false }) public isPanel?: boolean;

  @state() private _store?: Store;
  @state() public _currentPreview: PREVIEW_TYPE | null = null;
  @state() public _cardPreviewElement: LovelaceCardConfig[] = [];
  @state() public _defaultCardPreview: DefaultCardConfig[] = [];
  @state() public _tireCardPreview: TireEntity | undefined;

  @state() public _activeCardIndex: null | number | string = null;
  @state() _currentSwipeIndex?: number;

  @state() _connected = false;

  @query('vsc-button-grid') _vehicleButtonsGrid!: VehicleButtonsGrid;
  @query('images-slide') _imagesSlide!: ImagesSlide;
  @query('vsc-range-info') _rangeInfo!: VscRangeInfo;
  @query('vsc-indicators') _indicators!: VscIndicators;
  @query('mini-map-box') _miniMap!: MiniMapBox;

  @state() private _extraMapCard?: LovelaceCard; // Extra map card instance

  @state() _buttonCardConfigItem!: ButtonCardConfig[]; // Button card configuration items

  constructor() {
    super();
  }

  connectedCallback(): void {
    super.connectedCallback();
    void loadVerticalStackCard();
    window.VehicleCard = this;
    if (this.isEditorPreview) {
      // console.log('Editor preview connected');
      document.addEventListener('editor-event', this._handleEditorEvent.bind(this));
    }
    this._connected = true;
  }

  disconnectedCallback(): void {
    document.removeEventListener('editor-event', this._handleEditorEvent.bind(this));
    this._connected = false;

    super.disconnectedCallback();
  }

  protected async willUpdate(changedProps: PropertyValues): Promise<void> {
    super.willUpdate(changedProps);
    if (
      changedProps.has('_config') &&
      this._config.mini_map?.single_map_card === true &&
      this._config.mini_map?.device_tracker &&
      this._config.mini_map?.maptiler_api_key
    ) {
      console.log('Creating single map card');
      // this.createSingleMapCard();
      this._createMapElement();
    }

    if (changedProps.has('_config') && this._config.layout_config?.theme_config?.theme) {
      const oldTheme = changedProps.get('_config')?.layout_config?.theme_config?.theme;
      const newTheme = this._config.layout_config?.theme_config?.theme;
      if (oldTheme !== newTheme) {
        this.applyTheme(newTheme);
      }
    }
  }

  protected async firstUpdated(changedProps: PropertyValues): Promise<void> {
    super.firstUpdated(changedProps);
    _setUpPreview(this);
  }

  private _createMapElement(): void {
    const miniMapConfig = this._config.mini_map;
    const element = createMapCard(miniMapConfig);
    if (element) {
      if (this.hass) {
        element.hass = this.hass;
      }
      element.isPanel = this.isPanel;
      element.layout = this.layout;
      this._extraMapCard = element;
      console.log('Map element created:', this._extraMapCard);
    }
  }

  protected async updated(changedProps: PropertyValues): Promise<void> {
    super.updated(changedProps);
    if (!this._config || !this.hass) return;
    // Always configure the card preview when there are config changes
    if (changedProps.has('_config') && this._currentPreview !== null) {
      console.log('Reconfiguring card preview');

      previewHandler(this._currentPreview, this);
    }
    if (changedProps.has('_config') && this._config.active_group !== undefined && this.isEditorPreview) {
      // If active group is set, show the group indicator in the card
      const groupIndex = this._config.active_group;
      console.log('Active group index:', groupIndex);
      if (this._indicators) {
        this._indicators._activeGroupIndicator = groupIndex;
        console.log('Setting active group indicator:', this._indicators._activeGroupIndicator);
        if (this._rangeInfo) {
          this._rangeInfo._groupIndicatorActive = groupIndex;
        }
      }
    }
  }

  private _isSectionHidden(section: SECTION): boolean {
    return this._config.layout_config?.hide?.[section] || false;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    this._createStore();
    if (this._currentPreview !== null && this.isEditorPreview) {
      return this._renderCardPreview();
    }

    // if (this._config.mini_map?.single_map_card === true && this._singleMapCard.length) {
    //   const mapCard = this._singleMapCard[0];
    //   return html`${mapCard}`;
    // }
    if (this._config.mini_map?.single_map_card === true && this._extraMapCard) {
      const mapCard = this._extraMapCard;
      return html`${mapCard}`;
    }

    const headerHidden = this._isSectionHidden(SECTION.CARD_NAME) || this._config.name?.trim() === '';
    const sectionOrder = this._config.layout_config?.section_order || [...SECTION_ORDER];
    return html`
      <ha-card class=${this._computeClasses(sectionOrder)} ?no-header=${headerHidden} ?preview=${this.isEditorPreview}>
        <header id="name" ?hidden=${headerHidden}>
          <h1>${this._config.name}</h1>
        </header>
        ${this._activeCardIndex === null ? this._renderMainCard() : this._renderSelectedCard()}
      </ha-card>
    `;
  }

  private _renderMainCard(): TemplateResult {
    const sectionOrder = this._config.layout_config?.section_order ?? [...SECTION_ORDER];

    return html` <main id="main-wrapper">
      ${sectionOrder.map((section: string) => {
        switch (section) {
          case SECTION.HEADER_INFO:
            return html` <div class="header-info-box" id=${SECTION.HEADER_INFO}>
              ${this._renderIndicators()} ${this._renderRangeInfo()}
            </div>`;
          case SECTION.IMAGES:
            return this._renderImagesSlide();
          case SECTION.MINI_MAP:
            return this._renderMiniMap();
          case SECTION.BUTTONS:
            return this._renderButtons();
          default:
            return html``;
        }
      })}
    </main>`;
  }

  private _renderIndicators(): TemplateResult {
    if (!this._config.indicators || this._isSectionHidden(SECTION.INDICATORS)) return html``;
    return html` <div id="${SECTION.INDICATORS}">
      <vsc-indicators
        .hass=${this.hass}
        .config=${this._config}
        @indicator-toggle=${(ev: CustomEvent) => {
          this._rangeInfo?._handleIndicatorClick(ev.detail.active);
        }}
      ></vsc-indicators>
    </div>`;
  }

  private _renderButtons(): TemplateResult | typeof nothing {
    if (isEmpty(this._buttonCardConfigItem) || this._isSectionHidden(SECTION.BUTTONS)) return nothing;
    const visibleButtons = this._buttonCardConfigItem.filter((button) => !button.hide_button);
    return html`
      <div id=${SECTION.BUTTONS}>
        <vsc-button-grid
          .hass=${this.hass}
          .buttons=${visibleButtons}
          ._store=${this._store}
          ._cardCurrentSwipeIndex=${this._currentSwipeIndex}
        >
        </vsc-button-grid>
      </div>
    `;
  }

  private _renderCardPreview(): TemplateResult {
    if (!this._currentPreview) return html``;
    const type = this._currentPreview;
    const typeMap = {
      default: this._defaultCardPreview.map((card) => this._renderDefaultCardItems(card)),
      custom: this._cardPreviewElement.map((card) => html`<div class="added-cutom">${card}</div>`),
      tire: this._renderTireCard(this._tireCardPreview as TireEntity),
    };

    return html`
      <ha-card class="preview-card">
        <main>
          <section class="card-element"><div class="added-card">${typeMap[type]}</div></section>
        </main>
      </ha-card>
    `;
  }

  private _renderImagesSlide(): TemplateResult {
    const imageEntities = this._config.image_entities || [];
    const configImages = this._config?.images || [];
    if ((!configImages.length && !imageEntities.length) || this._isSectionHidden(SECTION.IMAGES)) return html``;

    return html`
      <div id=${SECTION.IMAGES}>
        <images-slide .hass=${this.hass} .config=${this._config}> </images-slide>
      </div>
    `;
  }

  private _renderMiniMap(): TemplateResult {
    if (this._isSectionHidden(SECTION.MINI_MAP)) return html``;
    const deviceTracker = this._config?.mini_map?.device_tracker;
    const stateObj = this.hass.states[deviceTracker];
    if (!deviceTracker || !stateObj || /(unknown)/.test(stateObj.state)) {
      return this._showWarning('Device tracker not available');
    }
    const miniMapConfig = this._config.mini_map;
    const mapData: MapData = {
      lat: stateObj.attributes.latitude,
      lon: stateObj.attributes.longitude,
    };

    return html`
      <div id=${SECTION.MINI_MAP} style=${this._computeMapStyles()}>
        <mini-map-box
          .hass=${this.hass}
          .mapConfig=${miniMapConfig}
          .mapData=${mapData}
          .isDark=${this.isDark}
        ></mini-map-box>
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult {
    const { range_info } = this._config;
    if (!range_info) return html``;
    const rangeLayout = this._config.layout_config?.range_info_config?.layout || 'column';
    return html`<div
      id="range"
      ?noMargin=${!this._config.indicators || this._isSectionHidden(SECTION.INDICATORS)}
      ?hidden=${this._isSectionHidden(SECTION.RANGE_INFO) || !range_info}
    >
      <vsc-range-info .hass=${this.hass} .rangeConfig=${range_info} ?row=${rangeLayout === 'row'}></vsc-range-info>
    </div>`;
  }

  /* -------------------------- CUSTOM CARD RENDERING -------------------------- */

  private _renderSelectedCard() {
    const index = this._activeCardIndex;
    if (index === null) return nothing;

    const {
      card_type: cardType = 'default',
      default_card: defaultCard,
      custom_card: customCard,
      tire_card: tireCard = {} as TireTemplateConfig,
    } = this._buttonCardConfigItem[index] as ButtonCardConfig;

    const renderButton = (label: string, icon: string, action: () => void): TemplateResult => {
      return html`
        <ha-icon-button
          class="click-shrink headder-btn"
          .label=${label}
          .path=${icon}
          @click=${action}
        ></ha-icon-button>
      `;
    };
    const cardHeaderBox = html`
      <div class="added-card-header">
        ${renderButton('Close', ICON.CLOSE, () => (this._activeCardIndex = null))}
        <div class="card-toggle">
          ${renderButton('Previous', ICON.CHEVRON_LEFT, () => this.toggleCard('prev'))}
          ${renderButton('Next', ICON.CHEVRON_RIGHT, () => this.toggleCard('next'))}
        </div>
      </div>
    `;

    let selectedContent: unknown = nothing;

    if (cardType === 'default') {
      selectedContent = defaultCard?.length
        ? defaultCard.map((card) => this._renderDefaultCardItems(card))
        : this._showWarning('Default card not found, configure it in the editor');
    } else if (cardType === 'custom') {
      selectedContent = customCard?.length
        ? this._renderCustomCard(customCard)
        : this._showWarning('Custom card not found');
    } else if (cardType === 'tire') {
      const tireCardConfig = getTireCard(this.hass, tireCard) as TireEntity;
      selectedContent = this._renderTireCard(tireCardConfig);
    }

    return html`
      <main id="cards-wrapper">
        ${cardHeaderBox}
        <section class="card-element">
          <div class="added-card">${selectedContent}</div>
        </section>
      </main>
    `;
  }

  private _renderCustomCard(cards: LovelaceCardConfig[]) {
    const element = createCustomCard(cards);
    if (element) {
      if (this.hass) {
        element.hass = this.hass;
      }
    }
    return html`${element}`;
  }

  private _renderDefaultCardItems(data: DefaultCardConfig): TemplateResult {
    return html` <vsc-default-card .hass=${this.hass} ._data=${data}></vsc-default-card> `;
  }

  private _renderTireCard(tireCardConfig: TireEntity): TemplateResult {
    return html` <vsc-tire-card .hass=${this.hass} .tireConfig=${tireCardConfig}> </vsc-tire-card> `;
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  private _toggleHelper(type: string): void {
    if (!this.isEditorPreview) return;
    const element = this.shadowRoot?.getElementById(type);
    if (element) {
      element.classList.add('helper-active');
      setTimeout(() => {
        element.classList.remove('helper-active');
      }, 2000);
    }
  }

  private _computeClasses(section_order: string[]) {
    const lastItem = section_order[section_order.length - 1];
    const firstItem = section_order[0];
    const mapSingle = section_order.includes(SECTION.MINI_MAP) && section_order.length === 1;
    const mapBottom = !section_order.includes(SECTION.BUTTONS) && lastItem === SECTION.MINI_MAP;
    return classMap({
      __map_last: lastItem === SECTION.MINI_MAP && firstItem !== SECTION.MINI_MAP,
      __map_first: firstItem === SECTION.MINI_MAP && lastItem !== SECTION.MINI_MAP,
      __map_single: mapSingle,
      __map_bottom: mapBottom,
    });
  }

  private _computeMapStyles() {
    const map_height = this._config.mini_map?.map_height ?? 150;
    const sectionOrder = this._config.layout_config!.section_order || [];
    const noHeader = this._isSectionHidden(SECTION.CARD_NAME) || this._config.name?.trim() === '';
    const firstItem = sectionOrder[0] === SECTION.MINI_MAP && noHeader;
    const lastItem = sectionOrder[sectionOrder.length - 1] === SECTION.MINI_MAP;
    const singleItem = sectionOrder.length === 1 && sectionOrder[0] === SECTION.MINI_MAP;

    let maskImage = 'linear-gradient(to bottom, transparent 0%, black 15%, black 90%, transparent 100%)';

    if (lastItem && !firstItem) {
      maskImage = 'linear-gradient(to bottom, transparent 0%, black 10%)';
    } else if (firstItem && !lastItem) {
      maskImage = 'linear-gradient(to bottom, black 90%, transparent 100%)';
    } else if (singleItem) {
      maskImage = 'linear-gradient(to bottom, transparent 0%, black 0%, black 100%, transparent 100%)';
    } else {
      maskImage;
    }
    return styleMap({
      '--vic-map-mask-image': maskImage,
      height: `${map_height}px`,
    });
  }

  /* --------------------------- THEME CONFIGURATION -------------------------- */
  private applyTheme(theme: string): void {
    if (!this._config.layout_config?.theme_config?.theme) return;
    const themeData = this.hass.themes.themes[theme];
    if (themeData) {
      // Filter out only top-level properties for CSS variables and the modes property
      const filteredThemeData = Object.keys(themeData)
        .filter((key) => key !== 'modes')
        .reduce((obj, key) => {
          obj[key] = themeData[key];
          return obj;
        }, {} as Record<string, string>);

      // Get the current mode (light or dark)
      const mode = this.isDark ? 'dark' : 'light';
      const modeData = themeData.modes && typeof themeData.modes === 'object' ? themeData.modes[mode] : {};

      // Merge the top-level and mode-specific variables
      const allThemeData = { ...filteredThemeData, ...modeData };
      applyThemesOnElement(
        this,
        { default_theme: this.hass.themes.default_theme, themes: { [theme]: allThemeData } },
        theme,
        false
      );
    }
  }

  private toggleCard(action: 'next' | 'prev'): void {
    forwardHaptic('light');
    setTimeout(() => {
      if (this._activeCardIndex === null) return;

      const cardIndexNum = Number(this._activeCardIndex);
      console.log('Current card index:', cardIndexNum);
      const totalCards = this._buttonCardConfigItem.filter((button) => !button.hide_button).length;

      const isNotActionType = (index: number): boolean => this._buttonCardConfigItem[index].button_type !== 'action';

      let newCardIndex = cardIndexNum;

      if (action === 'next') {
        do {
          newCardIndex = newCardIndex === totalCards - 1 ? 0 : newCardIndex + 1;
        } while (!isNotActionType(newCardIndex) && newCardIndex !== cardIndexNum);
        console.log('New card index:', newCardIndex);
      } else if (action === 'prev') {
        do {
          newCardIndex = newCardIndex === 0 ? totalCards - 1 : newCardIndex - 1;
        } while (!isNotActionType(newCardIndex) && newCardIndex !== cardIndexNum);
        console.log('New card index:', newCardIndex);
      } else {
        this._activeCardIndex = null;
        return;
      }

      this._activeCardIndex = newCardIndex;
    }, 100);
    this.requestUpdate();
  }

  toggleMoreInfo(entity: string | undefined): void {
    if (!entity) return;
    console.log('Toggled more info:', entity);
    fireEvent(this, 'hass-more-info', { entityId: entity });
  }

  /* -------------------------- EDITOR EVENT HANDLER -------------------------- */
  private _handleEditorEvent(ev: any): void {
    ev.stopPropagation();
    if (!this.isEditorPreview || this._config.mini_map?.single_map_card === true) return;
    const { detail } = ev;
    const type = detail.type;
    switch (type) {
      case 'show-button':
        if (this._isSectionHidden(SECTION.BUTTONS)) return;
        console.log('Show button:', detail.data.buttonIndex);
        if (this._currentPreview !== null) {
          this._currentPreview = null;
        }
        this.updateComplete.then(() => {
          this._vehicleButtonsGrid.showButton(detail.data.buttonIndex);
        });
        break;

      case 'show-image':
        if (this._isSectionHidden(SECTION.IMAGES)) return;
        this._imagesSlide?.showImage(detail.data.index);
        break;
      case 'toggle-preview':
        const cardType = detail.data.cardType;
        this._currentPreview = cardType;
        break;

      case 'toggle-helper':
        this._toggleHelper(detail.data);
        break;
    }
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions() {
    return {
      columns: 'full',
      rows: 'auto',
    };
  }
  public get isDark(): boolean {
    const themeMode = this._config.layout_config?.theme_config?.mode;
    if (themeMode === 'dark' && isDarkTheme(this)) {
      return true;
    } else if (themeMode === 'light') {
      return false;
    }
    return this.hass.themes.darkMode && isDarkTheme(this);
  }

  get isEditorPreview(): boolean {
    const parentElementClassPreview = this.offsetParent?.classList.contains('element-preview');
    return parentElementClassPreview || false;
  }

  private _createStore() {
    if (!this._store) {
      console.log('Creating store for VehicleStatusCard');
      this._store = new Store(this, this._config);
      super.requestUpdate();
    }
  }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'vehicle-status-card',
  name: 'Vehicle Status Card',
  description: 'A custom card to track vehicle status',
  preview: true,
  documentationURL: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#configuration',
});

declare global {
  interface Window {
    VehicleCard: VehicleStatusCard;
  }

  interface HTMLElementTagNameMap {
    'vehicle-status-card': VehicleStatusCard;
  }
}
// Load and clean extra map resources
loadAndCleanExtraMap().catch(console.error);
