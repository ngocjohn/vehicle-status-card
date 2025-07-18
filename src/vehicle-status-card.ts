import { fireEvent, forwardHaptic } from 'custom-card-helpers';
import { CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';

import './components';

import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { VehicleButtonsGrid, ImagesSlide, VscRangeInfo, VscIndicators, MiniMapBox } from './components';
import { ICON, SECTION, SECTION_ORDER } from './const/const';
import cardcss from './css/card.css';
import {
  ButtonCardEntity,
  HomeAssistant,
  VehicleStatusCardConfig,
  TireEntity,
  PREVIEW_TYPE,
  ButtonCardEntityItem,
  DefaultCardConfig,
  MapData,
} from './types';
import { LovelaceCardEditor, LovelaceCard, LovelaceCardConfig } from './types/';
import { HaHelp, isDarkColor, isEmpty, applyThemesOnElement, getDefaultConfig, loadAndCleanExtraMap } from './utils';
import { createSingleMapCard } from './utils/ha-helper';

@customElement('vehicle-status-card')
export class VehicleStatusCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor/editor');
    return document.createElement('vehicle-status-card-editor');
  }

  public static getStubConfig = async (hass: HomeAssistant): Promise<VehicleStatusCardConfig> => {
    const DEFAULT_CONFIG = await getDefaultConfig(hass);
    return {
      ...DEFAULT_CONFIG,
    };
  };

  public setConfig(config: VehicleStatusCardConfig): void {
    this._config = config;
  }

  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public _config!: VehicleStatusCardConfig;
  @property({ attribute: false }) public layout?: string;

  @state() public _currentPreview: PREVIEW_TYPE | null = null;
  @state() public _cardPreviewElement: LovelaceCardConfig[] = [];
  @state() public _defaultCardPreview: DefaultCardConfig[] = [];
  @state() public _tireCardPreview: TireEntity | undefined = undefined;

  @state() public _singleMapCard: LovelaceCardConfig[] = [];
  @state() MapData?: MapData;

  @state() public _buttonCards: ButtonCardEntity = [];

  @state() public _activeCardIndex: null | number | string = null;
  @state() _currentSwipeIndex?: number;
  @state() public _buttonReady = false;

  @state() _connected = false;
  @state() _singleLoaded = false;

  @query('vehicle-buttons-grid') _vehicleButtonsGrid!: VehicleButtonsGrid;
  @query('images-slide') _imagesSlide!: ImagesSlide;
  @query('vsc-range-info') _rangeInfo!: VscRangeInfo;
  @query('vsc-indicators') _indicators!: VscIndicators;
  @query('mini-map-box') _miniMap!: MiniMapBox;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._buttonReady && this._buttonCards) {
      this._buttonCards.map((button) => {
        const cardType = button.card_type;
        if (cardType === 'custom') {
          button.custom_card.map((card) => {
            card.hass = hass;
          });
        }
      });
    }
    if (this._singleMapCard && this._singleMapCard.length) {
      this._singleMapCard.map((card) => {
        card.hass = hass;
      });
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
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
    if (changedProps.has('_config') && !this._buttonReady) {
      await HaHelp.handleFirstUpdated(this);
    }
    if (
      changedProps.has('_config') &&
      this._config.mini_map?.single_map_card === true &&
      this._config.mini_map?.device_tracker &&
      this._config.mini_map?.maptiler_api_key
    ) {
      console.log('Creating single map card');
      this._singleLoaded = false;
      this.createSingleMapCard();
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
    HaHelp._setUpPreview(this);
  }

  private createSingleMapCard() {
    const miniMapConfig = this._config.mini_map;
    setTimeout(async () => {
      this._singleMapCard = (await createSingleMapCard(miniMapConfig, this._hass)) as LovelaceCardConfig[];

      setTimeout(() => {
        // check if the map card is loaded
        // console.log('Single map card created:', this._singleMapCard, this._extraMapCard);
        const _extraMapCard = this.shadowRoot?.querySelector('extra-map-card') as any;
        if (_extraMapCard && this.layout === 'panel' && !this.isEditorPreview) {
          const root = _extraMapCard.shadowRoot?.getElementById('root') as HTMLElement;
          root.style.setProperty('height', '100%', 'important');
          console.log('Extra map card:', _extraMapCard, 'Root element:', root);
        }
      }, 0);
    }, 0);
  }

  protected async updated(changedProps: PropertyValues): Promise<void> {
    super.updated(changedProps);
    if (!this._config || !this._hass) return;
    // Always configure the card preview when there are config changes
    if (changedProps.has('_config') && this._currentPreview !== null) {
      console.log('Reconfiguring card preview');
      HaHelp.previewHandler(this._currentPreview, this);
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
    if (!this._config || !this._hass) {
      return html``;
    }

    if (this._currentPreview !== null && this.isEditorPreview) {
      return this._renderCardPreview();
    }

    if (this._config.mini_map?.single_map_card === true && this._singleMapCard.length) {
      const mapCard = this._singleMapCard[0];
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
      ${sectionOrder.map((section) => {
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
        .hass=${this._hass}
        .config=${this._config}
        @indicator-toggle=${(ev: CustomEvent) => {
          this._rangeInfo?._handleIndicatorClick(ev.detail.active);
        }}
      ></vsc-indicators>
    </div>`;
  }

  private _renderButtons(): TemplateResult | typeof nothing {
    if (isEmpty(this._buttonCards) || this._isSectionHidden(SECTION.BUTTONS)) return nothing;
    if (!this._buttonReady) return html``;
    const visibleButtons = this._buttonCards.filter((button) => !button.hide_button);
    return html`
      <div id=${SECTION.BUTTONS}>
        <vehicle-buttons-grid
          .hass=${this._hass}
          .card=${this}
          .config=${this._config}
          .buttons=${visibleButtons}
          ._cardCurrentSwipeIndex=${this._currentSwipeIndex}
        >
        </vehicle-buttons-grid>
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
        <images-slide .hass=${this._hass} .config=${this._config}> </images-slide>
      </div>
    `;
  }

  private _renderMiniMap(): TemplateResult {
    if (this._isSectionHidden(SECTION.MINI_MAP)) return html``;
    const deviceTracker = this._config?.mini_map?.device_tracker;
    const stateObj = this._hass.states[deviceTracker];
    if (!deviceTracker || !stateObj || /(unknown)/.test(stateObj.state)) {
      return this._showWarning('Device tracker not available');
    }

    return html`
      <div id=${SECTION.MINI_MAP}>
        <mini-map-box .hass=${this._hass} .mapData=${this.MapData} .card=${this} .isDark=${this.isDark}> </mini-map-box>
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
      <vsc-range-info .hass=${this._hass} .rangeConfig=${range_info} ?row=${rangeLayout === 'row'}></vsc-range-info>
    </div>`;
  }

  /* -------------------------- CUSTOM CARD RENDERING -------------------------- */

  private _renderSelectedCard(): TemplateResult {
    const index = this._activeCardIndex;
    if (index === null) return html``;

    const {
      card_type: cardType = 'default',
      default_card: defaultCard,
      custom_card: customCard,
      tire_card: tireCard = null,
    } = this._buttonCards[index] as ButtonCardEntityItem;

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
        ? customCard.map((card) => html`<div class="added-cutom">${card}</div>`)
        : this._showWarning('Custom card not found');
    } else if (cardType === 'tire') {
      selectedContent = this._renderTireCard(tireCard);
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

  private _renderDefaultCardItems(data: DefaultCardConfig): TemplateResult {
    const title = data.title;
    const items = data.items;
    const collapsed_items = data.collapsed_items;

    const header = collapsed_items
      ? html`<div class="subcard-icon" ?active=${collapsed_items} @click=${(ev: Event) => this.toggleSubCard(ev)}>
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </div>`
      : html``;

    return html`
      <div class="default-card">
        <div class="data-header">${title} ${header}</div>
        <div class="data-box" ?active=${collapsed_items || !items.length}>
          ${items.map((item, index) => {
            const isLastItem = index === items.length - 1;
            return html`<vsc-default-card-item
              .lastItem=${isLastItem}
              .key=${item.entity}
              .hass=${this._hass}
              .defaultCardItem=${item}
              .stateColor=${data?.state_color || false}
              ._card=${this as any}
            ></vsc-default-card-item>`;
          })}
        </div>
      </div>
    `;
  }

  private _renderTireCard(tireConfig: TireEntity | null): TemplateResult {
    if (!tireConfig) {
      return html`<div class="error">Tire configuration not available</div>`;
    }

    return html` <vsc-tire-card .hass=${this._hass} .card=${this as any} .tireConfig=${tireConfig}> </vsc-tire-card> `;
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

  /* --------------------------- THEME CONFIGURATION -------------------------- */
  private applyTheme(theme: string): void {
    if (!this._config.layout_config?.theme_config?.theme) return;
    const themeData = this._hass.themes.themes[theme];
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
        { default_theme: this._hass.themes.default_theme, themes: { [theme]: allThemeData } },
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
      const totalCards = this._buttonCards.filter((button) => !button.hide_button).length;

      const isNotActionType = (index: number): boolean => this._buttonCards[index].button_type !== 'action';

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

  private toggleSubCard(ev: Event): void {
    const target = (ev.target as HTMLElement).closest('.default-card');
    if (!target) return;

    const dataBoxElement = target?.querySelector('.data-box');
    const subIcon = target?.querySelector('.subcard-icon');
    if (!dataBoxElement || !subIcon) return;

    // Toggle the 'hidden' class and 'active' class on the parent
    const isHidden = dataBoxElement.hasAttribute('active');
    subIcon.toggleAttribute('active', !isHidden);
    dataBoxElement.toggleAttribute('active', !isHidden);
  }

  /* -------------------------- EDITOR EVENT HANDLER -------------------------- */
  private _handleEditorEvent(ev: any): void {
    ev.stopPropagation();
    if (!this.isEditorPreview) return;
    const { detail } = ev;
    const type = detail.type;
    switch (type) {
      case 'show-button':
        if (this._isSectionHidden(SECTION.BUTTONS) || this._config.mini_map?.single_map_card === true) return;
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
  private _isDarkTheme(): boolean {
    const css = getComputedStyle(this);
    const primaryTextColor = css.getPropertyValue('--primary-text-color');
    const isDark = isDarkColor(primaryTextColor);
    return isDark;
  }

  public get isDark(): boolean {
    if (this._config.layout_config?.theme_config?.mode === 'dark') {
      return true;
    } else if (this._config.layout_config?.theme_config?.mode === 'light') {
      return false;
    }
    return this._hass.selectedTheme?.dark ?? this._isDarkTheme();
  }

  get isEditorPreview(): boolean {
    const parentElementClassPreview = this.offsetParent?.classList.contains('element-preview');
    return parentElementClassPreview || false;
  }

  // https://lit.dev/docs/components/styles/
  public static get styles(): CSSResultGroup {
    return [cardcss];
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
