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
import { customElement, property, query, state } from 'lit/decorators';

import './components';
import { VehicleButtonsGrid, ImagesSlide, VscRangeInfo, VscIndicators, MiniMapBox } from './components';
import { ICON } from './const/const';
import {
  ButtonCardEntity,
  HA as HomeAssistant,
  VehicleStatusCardConfig,
  TireEntity,
  PREVIEW_TYPE,
  MapData,
  ButtonCardEntityItem,
  DefaultCardConfig,
} from './types';
import { HaHelp, isEmpty } from './utils';

// Styles
import cardcss from './css/card.css';
import { getDefaultConfig } from './utils/ha-helper';

@customElement('vehicle-status-card')
export class VehicleStatusCard extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public _config!: VehicleStatusCardConfig;

  @state() public _currentPreview: PREVIEW_TYPE = null;
  @state() public _cardPreviewElement: LovelaceCardConfig[] = [];
  @state() public _defaultCardPreview: DefaultCardConfig[] = [];
  @state() public _tireCardPreview: TireEntity | undefined = undefined;

  @state() public _buttonCards: ButtonCardEntity = [];
  @state() public _mapData?: MapData;

  @state() public _activeCardIndex: null | number | string = null;
  @state() _currentSwipeIndex?: number;
  @state() public _buttonReady = false;

  @state() _resizeInitiated = false;
  @state() _connected = false;
  @state() private _resizeObserver: ResizeObserver | null = null;
  @state() private _resizeEntries: ResizeObserverEntry[] = [];
  @state() private _cardWidth: number = 0;
  @state() private _cardHeight: number = 0;

  @query('vehicle-buttons-grid') _vehicleButtonsGrid!: VehicleButtonsGrid;
  @query('images-slide') _imagesSlide!: ImagesSlide;
  @query('vsc-range-info') _rangeInfo!: VscRangeInfo;
  @query('vsc-indicators') _indicators!: VscIndicators;
  @query('mini-map-box') _miniMap!: MiniMapBox;

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

  public static getStubConfig = (hass: HomeAssistant): Record<string, unknown> => {
    const DEFAULT_CONFIG = getDefaultConfig(hass);
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

    this._config = structuredClone(config);
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.VehicleCard = this;
    document.addEventListener('editor-event', (ev) => this._handleEditorEvent(ev));
    this._connected = true;

    if (!this._resizeInitiated && !this._resizeObserver) {
      this.delayedAttachResizeObserver();
    }
  }

  disconnectedCallback(): void {
    document.removeEventListener('editor-event', (ev) => this._handleEditorEvent(ev));
    this.detachResizeObserver();
    this._connected = false;
    this._resizeInitiated = false;
    super.disconnectedCallback();
  }

  delayedAttachResizeObserver(): void {
    // wait for loading to finish before attaching resize observer
    setTimeout(() => {
      this.attachResizeObserver();
      this._resizeInitiated = true;
    }, 0);
  }
  attachResizeObserver(): void {
    const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      this._resizeEntries = entries;
      this.measureCard();
    });

    const card = this.shadowRoot?.querySelector('ha-card') as HTMLElement;
    if (card) {
      ro.observe(card);
      this._resizeObserver = ro;
    }
  }

  detachResizeObserver(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  private measureCard(): void {
    if (this._resizeEntries.length > 0) {
      const entry = this._resizeEntries[0];
      this._cardWidth = entry.borderBoxSize[0].inlineSize;
      this._cardHeight = entry.borderBoxSize[0].blockSize;
    }
  }
  protected async firstUpdated(changedProps: PropertyValues): Promise<void> {
    super.firstUpdated(changedProps);
    HaHelp._setUpPreview(this);
    HaHelp.handleFirstUpdated(this);
    this.measureCard();
  }

  protected async updated(changedProps: PropertyValues): Promise<void> {
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
      HaHelp.previewHandler(this._currentPreview, this);
    }

    if (changedProps.has('_connected') && this._connected) {
      this._setUpButtonAnimation();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config || !this._hass) {
      console.log('config or hass is null');
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, true);
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
    return html` <div id="indicators">
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
    if (isEmpty(this._buttonCards)) return nothing;
    if (!this._buttonReady) return html``;
    const visibleButtons = this._buttonCards.filter((button) => !button.hide_button);
    return html`
      <div id="button_card">
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
      <div id="mini_map" style=${`min-width: ${this._cardWidth}px`}>
        <mini-map-box .mapData=${this._mapData} .card=${this} .isDark=${this.isDark}> </mini-map-box>
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult {
    const { range_info } = this._config;
    if (!range_info) return html``;
    return html`<vsc-range-info .hass=${this._hass} .rangeConfig=${range_info}></vsc-range-info>`;
  }

  /* -------------------------- CUSTOM CARD RENDERING -------------------------- */

  private _renderSelectedCard(): TemplateResult {
    if (this._activeCardIndex === null) return html``;
    const index = this._activeCardIndex;
    const selectedCard = this._buttonCards[index] as ButtonCardEntityItem;
    const cardType = selectedCard.card_type;
    // const defaultCard = this._defaultItems.get(index as number);
    const defaultCard = selectedCard.default_card;
    const customCard = selectedCard.custom_card;
    const tireCard = selectedCard.tire_card || null;

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

    const selected_card =
      cardType === 'default'
        ? defaultCard!.map((card: DefaultCardConfig) => this._renderDefaultCardItems(card))
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
        <div class="data-box" ?active=${collapsed_items}>
          ${items.map((item) => {
            return html`<vsc-default-card-item
              .key=${item.entity}
              .hass=${this._hass}
              .defaultCardItem=${item}
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
      if (isString(this._activeCardIndex)) return;

      const cardIndexNum = Number(this._activeCardIndex);
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

  private _setUpButtonAnimation = (): void => {
    if (this.isEditorPreview) return;
    setTimeout(() => {
      const gridItems = this._vehicleButtonsGrid.shadowRoot?.querySelectorAll('vsc-button-single');
      if (!gridItems) return;
      gridItems.forEach((grid) => {
        if (grid.shadowRoot) {
          const gridItem = grid.shadowRoot.querySelector('.grid-item');
          if (gridItem) {
            gridItem.classList.add('zoom-in');
            gridItem.addEventListener('animationend', () => {
              gridItem.classList.remove('zoom-in');
            });
          }
        }
      });
    }, 0);
  };

  /* -------------------------- EDITOR EVENT HANDLER -------------------------- */
  private _handleEditorEvent(ev: any): void {
    ev.stopPropagation();
    if (!this.isEditorPreview) return;
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
