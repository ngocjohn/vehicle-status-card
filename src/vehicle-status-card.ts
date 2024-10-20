/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  applyThemesOnElement,
  fireEvent,
  hasConfigOrEntityChanged,
  LovelaceCardConfig,
  LovelaceCardEditor,
  forwardHaptic,
} from 'custom-card-helpers';
import { isString } from 'es-toolkit';
import { CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, query, state } from 'lit/decorators';

import './components';
import { VehicleButtonsGrid, ImagesSlide, VscRangeInfo, VscIndicators } from './components';
import { DEFAULT_CONFIG, ICON } from './const/const';
import { TIRE_BG } from './const/img-const';
import cardcss from './css/card.css';
import {
  ButtonCardEntity,
  DefaultCardEntity,
  HA as HomeAssistant,
  VehicleStatusCardConfig,
  TireEntity,
  TireTemplateConfig,
  DefaultCardConfig,
  PREVIEW_TYPE,
} from './types';
import { HaHelp } from './utils';
import { isEmpty } from './utils/helpers';

@customElement('vehicle-status-card')
export class VehicleStatusCard extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ type: Object }) private _config!: VehicleStatusCardConfig;

  @state() private _currentPreview: PREVIEW_TYPE = null;
  @state() private _cardPreviewElement: LovelaceCardConfig[] = [];
  @state() private _defaultCardPreview: DefaultCardEntity[] = [];
  @state() private _tireCardPreview: TireEntity | undefined = undefined;

  @state() private _buttonCards: ButtonCardEntity = [];
  @state() private _mapPopupLovelace: LovelaceCardConfig[] = [];

  @state() public _activeCardIndex: null | number | string = null;
  @state() private _buttonReady = false;

  @state() private _defaultItems: Map<number, DefaultCardEntity[]> = new Map();

  @query('vehicle-buttons-grid') _vehicleButtonsGrid!: VehicleButtonsGrid;
  @query('images-slide') _imagesSlide!: ImagesSlide;
  @query('vsc-range-info') _rangeInfo!: VscRangeInfo;
  @query('vsc-indicators') _indicators!: VscIndicators;

  constructor() {
    super();
    this._handleEditorEvent = this._handleEditorEvent.bind(this);
  }

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
  }

  public static getStubConfig = (): Record<string, unknown> => {
    return {
      ...DEFAULT_CONFIG,
    };
  };

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor/editor');
    return document.createElement('vehicle-status-card-editor');
  }

  public async setConfig(config: VehicleStatusCardConfig): Promise<void> {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this._config = {
      ...config,
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (process.env.ROLLUP_WATCH === 'true') {
      window.VehicleCard = this;
    }
    window.addEventListener('editor-event', (ev) => this._handleEditorEvent(ev));
  }

  disconnectedCallback(): void {
    window.removeEventListener('editor-event', (ev) => this._handleEditorEvent(ev));
    super.disconnectedCallback();
  }

  protected async firstUpdated(changedProps: PropertyValues): Promise<void> {
    super.firstUpdated(changedProps);
    this._getButtonCardsConfig();
    this._setUpPreview();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!this._config || !this._hass) return;

    const oldHass = changedProps.get('_hass') as HomeAssistant | undefined;
    const oldConfig = changedProps.get('_config') as VehicleStatusCardConfig | undefined;

    // Apply theme when the theme configuration changes
    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this._hass.themes ||
      oldConfig.layout_config?.theme_config?.theme !== this._config.layout_config?.theme_config?.theme
    ) {
      this.applyTheme(this._config.layout_config.theme_config.theme);
    }

    // Always configure the card preview when there are config changes
    if (changedProps.has('_config') && this._currentPreview !== null) {
      this._configureCardPreview(this._currentPreview);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config || !this._hass) {
      console.log('config or hass is null');
      return false;
    }

    if (
      changedProps.has('_config') &&
      this._config.mini_map?.enable_popup &&
      this._config.mini_map?.device_tracker &&
      this._config.layout_config?.hide?.mini_map !== true
    ) {
      this._configureMiniMapPopup();
    }

    if (changedProps.has('_hass') && this._activeCardIndex !== null) {
      this._getDefaultCardItems();
    }

    return hasConfigOrEntityChanged(this, changedProps, true);
  }

  private async _getButtonCardsConfig(): Promise<void> {
    if (this._currentPreview !== null) return;
    if (!this._config.button_card) {
      console.log('No button cards found in config');
      return;
    }
    this._buttonReady = false;
    this._buttonCards = await HaHelp.getButtonCard(this._hass, this._config.button_card);
    this._buttonReady = true;
    this._getDefaultCardItems();
  }

  private async _getDefaultCardItems(): Promise<void> {
    const defaultCardItemsMap = new Map<number, DefaultCardEntity[]>();
    for (let index = 0; index < this._buttonCards.length; index++) {
      const button = this._buttonCards[index];
      const cardItems = button.default_card;
      const items = await HaHelp.getDefaultCard(this._hass, cardItems);
      if (items) {
        defaultCardItemsMap.set(index, items);
      }
    }
    this._defaultItems = defaultCardItemsMap;
  }

  private async _setUpPreview(): Promise<void> {
    // Ensure a card preview is configured during the first update if applicable
    if (!this._currentPreview && this._config?.card_preview) {
      this._currentPreview = 'custom'; // Set a default card preview type if none is set
    } else if (!this._currentPreview && this._config?.default_card_preview) {
      this._currentPreview = 'default';
    } else if (!this._currentPreview && this._config?.tire_preview) {
      this._currentPreview = 'tire';
    }

    if (this._currentPreview !== null) {
      await this._configureCardPreview(this._currentPreview);
    } else {
      this._currentPreview = null;
    }
  }

  private async _configureCardPreview(cardType: 'custom' | 'default' | 'tire' | null): Promise<void> {
    if (!cardType && !this.isEditorPreview) return;
    let cardConfig: LovelaceCardConfig[] | DefaultCardConfig[] | TireTemplateConfig;
    let cardElement: LovelaceCardConfig[] | DefaultCardEntity[] | TireEntity | undefined;

    switch (cardType) {
      case 'custom':
        cardConfig = this._config?.card_preview as LovelaceCardConfig[];
        if (!cardConfig) return;
        cardElement = (await HaHelp.createCardElement(this._hass, cardConfig)) as LovelaceCardConfig[];
        this._cardPreviewElement = cardElement;
        break;
      case 'default':
        cardConfig = this._config?.default_card_preview as DefaultCardConfig[];
        if (!cardConfig) return;
        cardElement = (await HaHelp.getDefaultCard(this._hass, cardConfig)) as DefaultCardEntity[];
        this._defaultCardPreview = cardElement;
        break;
      case 'tire':
        cardConfig = this._config?.tire_preview as TireTemplateConfig;
        if (!cardConfig) return;
        cardElement = (await HaHelp.getTireCard(this._hass, cardConfig)) as TireEntity;
        this._tireCardPreview = cardElement as TireEntity;
        break;
      default:
        return;
    }

    if (!cardElement) {
      this._resetCardPreviews();
      return;
    }

    this._currentPreview = cardType;
    this.requestUpdate();
  }

  private _resetCardPreviews(): void {
    this._cardPreviewElement = [];
    this._defaultCardPreview = [];
    this._tireCardPreview = undefined;
    this._currentPreview = null;
    this.requestUpdate();
  }

  private async _configureMiniMapPopup(): Promise<void> {
    if (!this._config.mini_map?.enable_popup || !this._config.mini_map?.device_tracker) return;
    const miniMap = this._config.mini_map || {};
    const mapCardConfig: LovelaceCardConfig = {
      default_zoom: miniMap.default_zoom || 14,
      entities: [
        {
          entity: miniMap.device_tracker,
        },
      ],
      hours_to_show: miniMap.hours_to_show || 0,
      theme_mode: miniMap.theme_mode || 'auto',
      type: 'map',
    };

    const mapCardElement = (await HaHelp.createCardElement(this._hass, [mapCardConfig])) as LovelaceCardConfig[];
    this._mapPopupLovelace = mapCardElement;
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    if (this._currentPreview !== null && this.isEditorPreview) {
      return this._renderCardPreview();
    }

    return html`
      <ha-card>
        <header id="name">
          <h1>${this._config.name}</h1>
        </header>
        ${this._activeCardIndex === null ? this._renderMainCard() : this._renderSelectedCard()}
      </ha-card>
    `;
  }

  private _renderMainCard(): TemplateResult | typeof nothing {
    const hide = this._config.layout_config?.hide || {};

    const section = [
      hide.indicators ? null : this._renderIndicators(),
      hide.range_info ? null : this._renderRangeInfo(),
      hide.images ? null : this._renderImagesSlide(),
      hide.mini_map ? null : this._renderMiniMap(),
      hide.buttons ? null : this._renderButtons(),
    ];

    return html`
      <main id="main-wrapper">
        <div class="header-info-box">${section.slice(0, 2).map((item) => item)}</div>
        ${section.slice(2).map((item) => item)}
      </main>
    `;
  }

  private _renderIndicators(): TemplateResult {
    if (!this._config.indicators) return html``;
    return html` <vsc-indicators
      .hass=${this._hass}
      .config=${this._config}
      @indicator-toggle=${(ev: CustomEvent) => {
        this._rangeInfo?._handleIndicatorClick(ev.detail.active);
      }}
    ></vsc-indicators>`;
  }

  private _renderButtons(): TemplateResult | typeof nothing {
    if (isEmpty(this._buttonCards)) return nothing;
    if (!this._buttonReady) return html``;
    return html`
      <div id="button_card">
        <vehicle-buttons-grid .hass=${this._hass} .card=${this} .config=${this._config} .buttons=${this._buttonCards}>
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
    if (!this._config.images || this._config.images.length === 0) return html``;

    return html`
      <div id="images">
        <images-slide .images=${this._config.images} .config=${this._config}> </images-slide>
      </div>
    `;
  }

  private _renderMiniMap(): TemplateResult {
    if (!this._config?.mini_map?.device_tracker) return this._showWarning('Device tracker not available');

    return html`
      <div id="mini_map">
        <mini-map-box
          .hass=${this._hass}
          .config=${this._config}
          .card=${this}
          @toggle-map-popup=${() => (this._activeCardIndex = 'map')}
        >
        </mini-map-box>
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult {
    if (!this._config.range_info) return html``;
    return html`<vsc-range-info .hass=${this._hass} .config=${this._config}></vsc-range-info>`;
  }

  /* -------------------------- CUSTOM CARD RENDERING -------------------------- */

  private _renderSelectedCard(): TemplateResult {
    if (this._activeCardIndex === null) return html``;
    const index = this._activeCardIndex;
    const selectedCard = this._buttonCards[index];
    const cardType = selectedCard.card_type;
    const defaultCard = this._defaultItems.get(index as number);
    const customCard = selectedCard.custom_card;
    const tireCard = selectedCard.tire_card;

    const cardHeaderBox = html` <div class="added-card-header">
      <ha-icon-button
        class="click-shrink headder-btn"
        .label=${'Close'}
        .path=${ICON.CLOSE}
        @click="${() => (this._activeCardIndex = null)}"
      >
      </ha-icon-button>
      <div class="card-toggle">
        <ha-icon-button
          class="click-shrink headder-btn"
          @click=${() => this.toggleCard('prev')}
          .label=${'Previous'}
          .path=${ICON.CHEVRON_LEFT}
        ></ha-icon-button>
        <ha-icon-button
          class="click-shrink headder-btn"
          @click=${() => this.toggleCard('next')}
          .label=${'Next'}
          .path=${ICON.CHEVRON_RIGHT}
        ></ha-icon-button>
      </div>
    </div>`;

    const selected_card = isString(index)
      ? this._mapPopupLovelace
      : cardType === 'default'
        ? defaultCard!.map((card: DefaultCardEntity) => this._renderDefaultCardItems(card))
        : cardType === 'tire'
          ? this._renderTireCard(tireCard)
          : !isEmpty(customCard)
            ? customCard.map((card: LovelaceCardConfig) => html`<div class="added-cutom">${card}</div>`)
            : this._showWarning('Card not found');

    const content = html`
      <main id="cards-wrapper">
        ${cardHeaderBox}
        <section class="card-element">
          <div class="added-card">${selected_card}</div>
        </section>
      </main>
    `;
    return content;
  }

  private _renderDefaultCardItems(data: DefaultCardEntity): TemplateResult {
    const title = data.title;
    const items = data.items;
    const collapsed_items = data.collapsed_items;

    const itemRender = (name: string, state: string, entity: string, icon: string): TemplateResult => {
      return html`
        <div class="data-row">
          <div>
            <ha-state-icon
              class="data-icon"
              @click=${() => {
                this.toggleMoreInfo(entity);
              }}
              .hass=${this._hass}
              .icon=${icon}
              .stateObj=${this._hass.states[entity]}
            ></ha-state-icon>
            <span> ${name} </span>
          </div>
          <div
            class="data-value-unit"
            @click=${() => {
              this.toggleMoreInfo(entity);
            }}
          >
            <span> ${state} </span>
          </div>
        </div>
      `;
    };

    const header = collapsed_items
      ? html`<div class="subcard-icon" @click=${(ev: Event) => this.toggleSubCard(ev)}>
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </div>`
      : html``;

    return html`
      <div class="default-card">
        <div class="data-header">${title} ${header}</div>
        <div class="data-box ${collapsed_items ? 'hidden' : ''}">
          ${items.map((item) => itemRender(item.name, item.state, item.entity, item.icon))}
        </div>
      </div>
    `;
  }

  private _renderTireCard(tireConfig: TireEntity | null): TemplateResult {
    if (!tireConfig) {
      return html`<div class="error">Tire configuration not available</div>`;
    }

    const background = tireConfig.background || TIRE_BG;
    const isHorizontal = tireConfig.horizontal || false;
    const tireCardTitle = tireConfig.title || '';
    const tireCardSize = tireConfig.image_size || 100;
    const tireValueSize = tireConfig.value_size || 100;
    const tireTop = tireConfig.top || 50;
    const tireLeft = tireConfig.left || 50;
    const tires = tireConfig.tires;

    const sizeStyle = {
      '--vic-tire-top': `${tireTop}%`,
      '--vic-tire-left': `${tireLeft}%`,
      '--vic-tire-size': `${tireCardSize}%`,
      '--vic-tire-value-size': tireValueSize / 100,
    };

    return html`
      <div class="default-card">
        <div class="data-header">${tireCardTitle}</div>
        <div class="tyre-toggle-btn click-shrink" @click=${(ev: Event) => this.toggleTireDirection(ev)}>
          <ha-icon icon="mdi:rotate-right-variant"></ha-icon>
        </div>

        <div class="data-box tyre-wrapper" rotated=${isHorizontal} style=${styleMap(sizeStyle)}>
          <div class="background" style="background-image: url(${background})"></div>
          ${Object.keys(tires).map((key) => {
            const cssClass = key.replace('_', '').toLowerCase();
            return html` <div class="tyre-box ${cssClass}">
              <span class="tyre-value">${tires[key].state}</span>
              <span class="tyre-name">${tires[key].name}</span>
            </div>`;
          })}
        </div>
      </div>
    `;
  }

  private toggleTireDirection(ev: Event): void {
    ev.stopPropagation();
    const target = ev.target as HTMLElement;
    const tyreWrapper = target.closest('.default-card')?.querySelector('.tyre-wrapper');
    if (!tyreWrapper) return;

    const isHorizontal = tyreWrapper.getAttribute('rotated') === 'true';
    tyreWrapper.setAttribute('rotated', isHorizontal ? 'false' : 'true');
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

  /* --------------------------- THEME CONFIGURATION -------------------------- */
  private applyTheme(theme: string): void {
    if (!this._config.layout_config?.theme_config?.theme) return;
    const themeData = this._hass.themes.themes[theme];
    if (themeData) {
      // Filter out only top-level properties for CSS variables and the modes property
      const filteredThemeData = Object.keys(themeData)
        .filter((key) => key !== 'modes')
        .reduce(
          (obj, key) => {
            obj[key] = themeData[key];
            return obj;
          },
          {} as Record<string, string>
        );

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
      if (isString(this._activeCardIndex)) return;

      const cardIndexNum = Number(this._activeCardIndex);
      const totalCards = this._buttonCards.length;

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
      } else {
        this._activeCardIndex = null;
        return;
      }

      this._activeCardIndex = newCardIndex;
    }, 100);
    this.requestUpdate();
  }

  private toggleMoreInfo(entity: string | undefined): void {
    if (!entity) return;
    console.log('Toggled more info:', entity);
    fireEvent(this, 'hass-more-info', { entityId: entity });
  }

  private toggleSubCard(ev: Event): void {
    const target = (ev.target as HTMLElement).closest('.default-card');
    if (!target) return;

    const dataBoxElement = target.querySelector('.data-box');
    if (!dataBoxElement) return;

    // Toggle the 'hidden' class and 'active' class on the parent
    const isHidden = dataBoxElement.classList.toggle('hidden');
    target.querySelector('.subcard-icon')?.classList.toggle('active', !isHidden);
  }

  /* -------------------------- EDITOR EVENT HANDLER -------------------------- */
  private _handleEditorEvent(ev: any): void {
    ev.stopPropagation();
    const { detail } = ev;
    const type = detail.type;
    switch (type) {
      case 'show-button':
        console.log('Show button:', detail.data.buttonIndex);
        if (this._currentPreview !== null) {
          this._currentPreview = null;
        }
        this.updateComplete.then(() => {
          this._vehicleButtonsGrid.showButton(detail.data.buttonIndex);
        });
        break;

      case 'show-image':
        this._imagesSlide?.showImage(detail.data.index);
        break;
      case 'toggle-preview':
        const cardType = detail.data.cardType;
        this._currentPreview = cardType;
        this.updateComplete.then(() => {
          this._configureCardPreview(cardType);
        });
        break;

      case 'toggle-helper':
        this._toggleHelper(detail.data);
        break;
    }
  }

  public getCardSize(): number {
    return 5;
  }

  public get isDark(): boolean {
    if (this._config.layout_config?.theme_config?.mode === 'dark') {
      return true;
    } else if (this._config.layout_config?.theme_config?.mode === 'light') {
      return false;
    }
    return this._hass.themes.darkMode;
  }

  private get isEditorPreview(): boolean {
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
  description: 'A custom card to track vehicle status',
  documentationURL: 'https://github.com/ngocjohn/vehicle-status-card?tab=readme-ov-file#configuration',
  name: 'Vehicle Status Card',
  preview: true,
  type: 'vehicle-status-card',
});

declare global {
  interface Window {
    VehicleCard: VehicleStatusCard;
  }
  interface Window {
    loadCardHelpers?: () => Promise<any>;
  }
  interface HTMLElementTagNameMap {
    'vehicle-status-card': VehicleStatusCard;
  }
}
