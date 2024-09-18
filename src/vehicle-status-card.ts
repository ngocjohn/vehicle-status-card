/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators';
import { isString } from 'es-toolkit';

import {
  LovelaceCardEditor,
  hasConfigOrEntityChanged,
  LovelaceCardConfig,
  fireEvent,
  applyThemesOnElement,
} from 'custom-card-helpers';

import {
  getSingleIndicators,
  getGroupIndicators,
  getRangeInfo,
  getButtonCard,
  createCardElement,
  getDefaultCard,
} from './utils/ha-helper';

import {
  HomeAssistantExtended as HomeAssistant,
  VehicleStatusCardConfig,
  IndicatorEntity,
  IndicatorGroupEntity,
  RangeInfoEntity,
  ButtonCardEntity,
  DefaultCardEntity,
} from './types';

import { DEFAULT_CONFIG } from './const/const';
import './components/images-slide';
import './components/mini-map-box';
import './components/vehicle-buttons-grid';

import cardcss from './css/card.css';

@customElement('vehicle-status-card')
export class VehicleStatusCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor/editor');
    return document.createElement('vehicle-status-card-editor');
  }

  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ type: Object }) private _config!: VehicleStatusCardConfig;

  @property({ type: Boolean }) public editMode: boolean = false;
  @property({ type: Boolean }) public preview: boolean = false;

  @state() private _activeGroupIndicator: number | null = null;
  @state() private _activeCardIndex: number | string | null = null;

  @state() private _indicatorsSingle: IndicatorEntity = [];
  @state() private _indicatorsGroup: IndicatorGroupEntity = [];
  @state() private _rangeInfo: RangeInfoEntity = [];
  @state() private _buttonCards: ButtonCardEntity = [];

  @state() private _isCardPreview: boolean = false;
  @state() private _isDefaultCardPreview: boolean = false;
  @state() private _cardPreviewElement: LovelaceCardConfig[] = [];
  @state() private _defaultCardPreview: DefaultCardEntity[] = [];

  @query('mini-map-box') _miniMapBox!: HTMLElement;
  @query('vehicle-buttons-grid') _vehicleButtonsGrid!: any;

  private _mapPopupLovelace: LovelaceCardConfig[] = [];

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  public static getStubConfig = (): Record<string, unknown> => {
    return {
      ...DEFAULT_CONFIG,
    };
  };

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
    this._getIndicators();
    this._getRangeInfo();
    this._getButtonCardsConfig();
    this._configureCardPreview();
    this._configureDefaultCardPreview();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has('_config') && this._config.layout_config?.theme_config?.theme) {
      this.applyTheme(this._config.layout_config.theme_config.theme);
    }

    if (changedProps.has('_activeIndicator') && this._activeGroupIndicator) {
      console.log('Active Indicator:', this._activeGroupIndicator);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config || !this._hass) {
      console.log('config or hass is null');
      return false;
    }

    if (changedProps.has('_hass') && this._config.indicators) {
      this._getIndicators();
    }

    if (changedProps.has('_hass') && this._config.range_info) {
      this._getRangeInfo();
    }

    if (changedProps.has('_config') && this._isCardPreview) {
      this._configureCardPreview();
    }

    if (changedProps.has('_hass') && this._config.button_card && this._config.button_card.length > 0) {
      this._getButtonCardsConfig();
    }

    if (changedProps.has('_config') && this._isDefaultCardPreview) {
      this._configureDefaultCardPreview();
    }
    if (
      changedProps.has('_config') &&
      this._config.mini_map?.enable_popup &&
      this._config.mini_map?.device_tracker &&
      this._config.layout_config?.hide?.mini_map !== true
    ) {
      console.log('Map Popup enabled');
      this._configureMiniMapPopup();
    }

    return hasConfigOrEntityChanged(this, changedProps, true);
  }

  private async _configureMiniMapPopup(): Promise<void> {
    if (!this._config.mini_map?.enable_popup || !this._config.mini_map?.device_tracker) return;
    const miniMap = this._config.mini_map || {};
    const mapCardConfig: LovelaceCardConfig = {
      type: 'map',
      default_zoom: miniMap.default_zoom || 14,
      hours_to_show: miniMap.hours_to_show || 0,
      theme_mode: miniMap.theme_mode || 'auto',
      entities: [
        {
          entity: miniMap.device_tracker,
        },
      ],
    };

    this._mapPopupLovelace = await createCardElement(this._hass, [mapCardConfig]);
    console.log('Map Popup:', this._mapPopupLovelace);
  }

  private async _configureCardPreview(): Promise<void> {
    if (
      this._config.card_preview !== undefined &&
      this._config.card_preview !== null &&
      this._config.card_preview &&
      this.isEditorPreview
    ) {
      const cardConfig = this._config?.card_preview;
      if (!cardConfig) return;
      const cardElement = await createCardElement(this._hass, cardConfig);
      if (!cardElement) return;
      this._cardPreviewElement = cardElement;
      this._isCardPreview = true;
      this.requestUpdate();
    } else {
      this._cardPreviewElement = [];
      this._isCardPreview = false;
    }
    return;
  }

  private async _configureDefaultCardPreview(): Promise<void> {
    if (
      this._config.default_card_preview !== undefined &&
      this._config.default_card_preview !== null &&
      this._config.default_card_preview &&
      this.isEditorPreview
    ) {
      const defaultCardConfig = this._config?.default_card_preview;
      if (!defaultCardConfig) return;
      const defaultCard = await getDefaultCard(this._hass, defaultCardConfig);
      if (!defaultCard) return;
      this._defaultCardPreview = defaultCard;
      this._isDefaultCardPreview = true;
      this.requestUpdate();
    } else {
      this._defaultCardPreview = [];
      this._isDefaultCardPreview = false;
    }
    return;
  }

  private async _getButtonCardsConfig(): Promise<void> {
    if (!this._config.button_card) {
      console.log('No button cards found in config');
      return;
    }

    this._buttonCards = (await getButtonCard(this._hass, this._config)) ?? [];
  }

  private async _getIndicators(): Promise<void> {
    if (!this._config.indicators) return;
    // Handle single indicators (IndicatorConfig)
    this._indicatorsSingle = (await getSingleIndicators(this._hass, this._config)) ?? [];
    // Handle group indicators (IndicatorGroupConfig)
    this._indicatorsGroup = (await getGroupIndicators(this._hass, this._config)) ?? [];
  }

  private async _getRangeInfo(): Promise<void> {
    if (!this._config.range_info) return;
    this._rangeInfo = (await getRangeInfo(this._hass, this._config)) ?? [];
  }

  private get isEditorPreview(): boolean {
    const parentElementClassPreview = this.offsetParent?.classList.contains('element-preview');
    return parentElementClassPreview || false;
  }

  private get isDark(): boolean {
    if (this._config.layout_config?.theme_config?.mode === 'dark') {
      return true;
    } else if (this._config.layout_config?.theme_config?.mode === 'light') {
      return false;
    }
    return this._hass.themes.darkMode;
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    if (this._isCardPreview) {
      return html` <ha-card class="preview-card">${this._cardPreviewElement}</ha-card> `;
    }

    if (this._isDefaultCardPreview) {
      return this._renderCardPreview();
    }

    const name = this._config.name;

    return html`
      <ha-card>
        <header id="name">
          <h1>${name}</h1>
        </header>
        ${this._activeCardIndex === null ? this._renderMainCard() : this._renderSelectedCard()}
      </ha-card>
    `;
  }

  private _renderMainCard(): TemplateResult | typeof nothing {
    const hide = this._config.layout_config?.hide || {};

    const indicators = !hide.indicators ? this._renderIndicators() : nothing;
    const activeIndicator = this._renderActiveIndicator();
    const rangeInfo = !hide.range_info ? this._renderRangeInfo() : nothing;
    const imagesSlide = !hide.images ? this._renderImagesSlide() : nothing;
    const miniMap = !hide.mini_map ? this._renderMiniMap() : nothing;
    const buttons = !hide.buttons ? this._renderButtons() : nothing;

    return html`
      <main id="main-wrapper">
        <div class="header-info-box">${indicators} ${activeIndicator} ${rangeInfo}</div>
        ${imagesSlide} ${miniMap} ${buttons}
      </main>
    `;
  }

  private _renderIndicators(): TemplateResult {
    if (!this._config.indicators) return html``;
    // Render single indicators
    const singleIndicators = Object.values(this._indicatorsSingle).map(
      ({ state, icon }) => html`
        <div class="item">
          <ha-icon .icon=${icon}></ha-icon>
          <div><span>${state}</span></div>
        </div>
      `
    );

    // Helper function to render group
    const groupIndicator = (icon: string, label: string, onClick: (index: number) => void, isActive: boolean) => html`
      <div class="item active-btn" @click=${onClick}>
        <ha-icon icon=${icon}></ha-icon>
        <div class="added-item-arrow">
          <span>${label}</span>
          <div class="subcard-icon ${isActive ? 'active' : ''}" style="margin-bottom: 2px">
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </div>
        </div>
      </div>
    `;

    const groupWithItems = this._indicatorsGroup.filter((group) => group.visibility !== false);

    // Render group indicators
    const groupIndicators = groupWithItems.map((group, index) => {
      const isActive = this._activeGroupIndicator === index;
      return groupIndicator(group.icon, group.name, () => this._toggleGroupIndicator(index), isActive);
    });

    return html` <div id="indicators"><div class="info-box">${singleIndicators} ${groupIndicators}</div></div> `;
  }

  private _renderActiveIndicator(): TemplateResult {
    const activeIndex =
      this._activeGroupIndicator !== null ? this._activeGroupIndicator : this._indicatorsGroup.length + 1;
    const items = this._indicatorsGroup[activeIndex]?.items || [];
    const activeClass = this._activeGroupIndicator !== null ? 'info-box charge active' : 'info-box charge';

    return html`
      <div class=${activeClass}>
        ${items.map(({ name, icon, state }) => {
          return html`
            <div class="item charge">
              <div>
                <ha-icon .icon=${icon}></ha-icon>
                <span>${state}</span>
              </div>
              <div class="item-name">
                <span>${name}</span>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult {
    if (!this._rangeInfo || this._rangeInfo.length === 0 || this._activeGroupIndicator !== null) return html``;

    const renderInfoBox = (icon: string, level: number, energy: string, range: string, progress_color: string) => html`
      <div class="info-box range">
        <div class="item">
          <ha-icon icon="${icon}"></ha-icon>
          <div><span>${energy}</span></div>
        </div>
        <div class="fuel-wrapper">
          <div class="fuel-level-bar" style="--vic-range-width: ${level}%; background-color:${progress_color};"></div>
        </div>
        <div class="item">
          <span>${range}</span>
        </div>
      </div>
    `;

    const rangeInfo = this._rangeInfo.map(({ icon, level, energy, range, progress_color }) => {
      return renderInfoBox(icon, level, energy, range, progress_color);
    });

    // Wrap rangeInfo in a div if there are more than one entries
    return html`<div id="range"><div class="combined-info-box">${rangeInfo}</div></div>`;
  }

  private _renderImagesSlide(): TemplateResult {
    if (!this._config.images || this._config.images.length === 0) return html``;
    return html` <div id="images"><images-slide .images=${this._config.images}> </images-slide></div> `;
  }

  private _renderMiniMap(): TemplateResult {
    if (!this._config?.mini_map?.device_tracker) return html``; // Return early if no device tracker
    const deviceTracker = this.getDeviceTrackerLatLong();
    if (!deviceTracker) return this._showWarning('Device tracker not found');
    const google_api_key = this._config.mini_map.google_api_key || '';
    const darkMode = this.isDark;
    const mapPopup = this._config.mini_map.enable_popup;

    return html`
      <div id="mini_map">
        <mini-map-box
          .deviceTracker=${deviceTracker}
          .darkMode=${darkMode}
          .apiKey=${google_api_key || ''}
          .mapPopup=${mapPopup}
          @toggle-map-popup=${() => (this._activeCardIndex = 'map')}
        >
        </mini-map-box>
      </div>
    `;
  }

  private _renderButtons(): TemplateResult {
    return html`
      <div id="button_card">
        <vehicle-buttons-grid
          .hass=${this._hass}
          .component=${this}
          .config=${this._config}
          .buttons=${this._buttonCards}
        >
        </vehicle-buttons-grid>
      </div>
    `;
  }

  /* -------------------------- CUSTO CARD RENDERING -------------------------- */
  private _renderSelectedCard(): TemplateResult {
    if (this._activeCardIndex === null) return html``;
    const index = this._activeCardIndex;
    const selectedCard = this._buttonCards[index];
    const cardType = selectedCard.card_type;
    const defaultCard = selectedCard.default_card;
    const customCard = selectedCard.custom_card;

    const cardHeaderBox = html` <div class="added-card-header">
      <div class="headder-btn click-shrink" @click="${() => (this._activeCardIndex = null)}">
        <ha-icon icon="mdi:close"></ha-icon>
      </div>
      <div class="card-toggle">
        <div class="headder-btn click-shrink" @click=${() => this.toggleCard('prev')}>
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </div>
        <div class="headder-btn click-shrink" @click=${() => this.toggleCard('next')}>
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </div>
      </div>
    </div>`;

    const selected_card = isString(index)
      ? this._mapPopupLovelace
      : cardType === 'default'
        ? defaultCard.map((card: DefaultCardEntity) => this._renderDefaultCardItems(card))
        : customCard.map((card: LovelaceCardConfig) => card);

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

  private _renderCardPreview(): TemplateResult {
    if (!this._isDefaultCardPreview) return html``; // Return early if no default card preview

    const defaultCardPreview = this._defaultCardPreview.map((card) => this._renderDefaultCardItems(card));

    return html`
      <ha-card>
        <main>
          <section class="card-element"><div class="added-card">${defaultCardPreview}</div></section>
        </main>
      </ha-card>
    `;
  }

  private _renderDefaultCardItems(data: DefaultCardEntity): TemplateResult {
    const title = data.title;
    const items = data.items;
    const collapsed_items = data.collapsed_items;

    const itemRender = (icon: string, name: string, state: string, entity?: string): TemplateResult => {
      return html`
        <div class="data-row">
          <div>
            <ha-icon
              @click=${() => {
                this.toggleMoreInfo(entity);
              }}
              class="data-icon"
              icon="${icon ? icon : 'mdi:nothing'}"
            ></ha-icon>
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
          ${items.map((item) => itemRender(item.icon, item.name, item.state, item.entity))}
        </div>
      </div>
    `;
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

  private toggleCard(action: 'next' | 'prev'): void {
    if (this._activeCardIndex === null) return;
    if (isString(this._activeCardIndex)) return;
    const cardIndexNum = Number(this._activeCardIndex);
    const totalCards = this._buttonCards.length;
    if (action === 'next') {
      this._activeCardIndex = this._activeCardIndex === totalCards - 1 ? 0 : cardIndexNum + 1;
    } else if (action === 'prev') {
      this._activeCardIndex = this._activeCardIndex === 0 ? totalCards - 1 : cardIndexNum - 1;
    } else {
      this._activeCardIndex = null;
    }
    this.requestUpdate();
  }

  private _toggleGroupIndicator(index: number): void {
    if (this._activeGroupIndicator === index) {
      this._activeGroupIndicator = null;
    } else {
      this._activeGroupIndicator = null;
      setTimeout(() => {
        this._activeGroupIndicator = index;
      }, 400);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  private getStateDisplay(entityId: string | undefined): string {
    if (!entityId || !this._hass.states[entityId]) return '';
    return this._hass.formatEntityState(this._hass.states[entityId]);
  }

  private getFormattedAttributeValue(entity: string | undefined, attribute: string): string {
    if (!entity || !this._hass.states[entity] || !this._hass.states[entity].attributes) return '';
    return this._hass.formatEntityAttributeValue(this._hass.states[entity], attribute);
  }

  private getEntityAttribute(entity: string | undefined, attribute: string): any {
    if (!entity || !this._hass.states[entity] || !this._hass.states[entity].attributes) return undefined;
    return this._hass.states[entity].attributes[attribute];
  }

  private getDeviceTrackerLatLong = (): { lat: number; lon: number } | undefined => {
    if (!this._config?.mini_map?.device_tracker) return;
    const deviceTracker = this._hass.states[this._config.mini_map.device_tracker];
    if (!deviceTracker) return;
    const lat = deviceTracker.attributes.latitude;
    const lon = deviceTracker.attributes.longitude;
    return { lat, lon };
  };

  /* -------------------------- EDITOR EVENT HANDLER -------------------------- */
  private _handleEditorEvent(ev: any): void {
    const { detail } = ev;
    const type = detail.type;
    switch (type) {
      case 'toggle-helper':
        this._toggleHelper(detail.data);
        break;
      case 'toggle-card-preview':
        this._isCardPreview = detail.data.isCardPreview;
        this.updateComplete.then(() => {
          this._configureCardPreview();
        });
        break;
      case 'toggle-default-card':
        this._isDefaultCardPreview = detail.data.isDefaultCardPreview;
        this.updateComplete.then(() => {
          this._configureDefaultCardPreview();
        });
        break;
      case 'show-button':
        console.log('Show button:', detail.data.buttonIndex);
        this._isCardPreview = false;
        this.updateComplete.then(() => {
          this._vehicleButtonsGrid?.showButton(detail.data.buttonIndex);
        });
        break;
    }
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
    console.log('Applying theme:', theme);
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
        { themes: { [theme]: allThemeData }, default_theme: this._hass.themes.default_theme },
        theme,
        false
      );
    }
  }

  // https://lit.dev/docs/components/styles/
  public static get styles(): CSSResultGroup {
    return [cardcss];
  }

  public getCardSize(): number {
    return 5;
  }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'vehicle-status-card',
  name: 'Vehicle Status Card',
  preview: true,
  description: 'A custom card to track vehicle status',
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
