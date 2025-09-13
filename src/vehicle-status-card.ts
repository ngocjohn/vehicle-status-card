import { CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, queryAll, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

import './components';
import './editor/editor';
// components
import {
  VehicleButtonsGrid,
  ImagesSlide,
  VscRangeInfo,
  VscIndicators,
  MiniMapBox,
  VscIndicatorRow,
} from './components';
import { COMPONENT, CARD_NAME } from './constants/const';
import { EditorEventParams } from './editor/base-editor';
// Ha utils
import {
  fireEvent,
  forwardHaptic,
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from './ha';
import {
  ButtonCardConfig,
  DefaultCardConfig,
  IndicatorRowConfig,
  updateDeprecatedConfig,
  TireEntity,
  TireTemplateConfig,
  VehicleStatusCardConfig,
} from './types/config';
import { SECTION_KEYS } from './types/config/card/layout';
import { SECTION } from './types/section';
import { isEmpty, applyThemesOnElement, loadAndCleanExtraMap, isDarkTheme, ICON } from './utils';
import { BaseElement } from './utils/base-element';
import { loadVerticalStackCard } from './utils/lovelace/create-card-element';
import { createMapCard } from './utils/lovelace/create-map-card';
import { getTireCard } from './utils/lovelace/create-tire-card';
import { _setUpPreview, PREVIEW_TYPE, previewHandler } from './utils/lovelace/preview-helper';
import { createStubConfig, loadStubConfig } from './utils/lovelace/stub-config';
import { Store } from './utils/store';

@customElement(CARD_NAME)
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
    if (!config) {
      throw new Error('Invalid configuration');
    }

    const newConfig = JSON.parse(JSON.stringify(config)) as VehicleStatusCardConfig;
    // this._config = newConfig;
    this._config = {
      ...newConfig,
      ...updateDeprecatedConfig(newConfig),
    };

    if (this._config.button_card && this._config.button_card.length) {
      this._buttonCardConfigItem = this._config.button_card as ButtonCardConfig[];
    }
    if (this._store) {
      console.debug('Updating store config');
      this._store._config = this._config;
    } else {
      // console.debug('Store not found, will create on first update');
      this._createStore();
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._extraMapCard) {
      this._extraMapCard.hass = hass;
    }
  }
  get hass(): HomeAssistant {
    return this._hass;
  }

  constructor() {
    super();
  }

  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public _config!: VehicleStatusCardConfig;
  @property({ attribute: false }) public layout?: string;
  @property({ attribute: false }) public isPanel?: boolean;

  @state() public _currentPreview: PREVIEW_TYPE | null = null;
  @state() public _cardPreviewElement: LovelaceCardConfig[] = [];
  @state() public _defaultCardPreview: DefaultCardConfig[] = [];
  @state() public _tireCardPreview: TireEntity | undefined;

  @state() public _activeCardIndex: null | number | string = null;

  @state() _hasAnimated: boolean = false;
  @state() _currentSwipeIndex?: number;

  @state() _connected = false;

  @state() private _singleMapMode: boolean = false;
  @state() private _extraMapCard?: LovelaceCard; // Extra map card instance

  @state() _buttonCardConfigItem!: ButtonCardConfig[]; // Button card configuration items

  @query(COMPONENT.BUTTONS_GRID, true) _vehicleButtonsGrid!: VehicleButtonsGrid;
  @query(COMPONENT.IMAGES_SLIDE, true) _imagesSlide!: ImagesSlide;
  @query(COMPONENT.RANGE_INFO, true) _rangeInfo!: VscRangeInfo;
  @query(COMPONENT.INDICATORS, true) _indicators!: VscIndicators;
  @query(COMPONENT.MINI_MAP, true) _miniMap!: MiniMapBox;
  @queryAll(COMPONENT.INDICATOR_ROW) _indicatorRows!: NodeListOf<VscIndicatorRow>;
  @query('ha-card', true) _haCard!: HTMLElement;

  connectedCallback(): void {
    super.connectedCallback();
    void loadVerticalStackCard();
    window.VehicleCard = this;
    this._connected = true;
    if (this.isEditorPreview) {
      window.addEventListener('editor-event', this._handleEditorEvent.bind(this));
    }
  }

  disconnectedCallback(): void {
    this._connected = false;
    window.removeEventListener('editor-event', this._handleEditorEvent.bind(this));
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
      if (this._hass) {
        element.hass = this._hass;
      }
      element.isPanel = this.isPanel;
      element.layout = this.layout;
      this._extraMapCard = element;
      // console.log('Map element created:', this._extraMapCard);
    }
  }

  protected async updated(changedProps: PropertyValues): Promise<void> {
    super.updated(changedProps);
    if (!this._config || !this._hass) return;
    // Always configure the card preview when there are config changes
    if (changedProps.has('_config') && this._currentPreview !== null) {
      console.log('Reconfiguring card preview');
      previewHandler(this._currentPreview, this);
    }

    if (changedProps.has('_config') && this.isEditorPreview) {
      if (this._config.active_group !== undefined) {
        // If active group is set, show the group indicator in the card
        const groupIndex = this._config.active_group;
        console.log('Active group index:', groupIndex);
        if (this._indicators) {
          this._indicators._activeGroupIndicator = groupIndex;
          console.log('Setting active group indicator:', this._indicators._activeGroupIndicator);
        }
      }
      if (this._config.row_group_preview !== undefined) {
        const { row_index, group_index, entity_index } = this._config.row_group_preview;

        if (this._indicatorRows) {
          this._toggleIndicatorRow({ rowIndex: row_index, groupIndex: group_index });
          this._toggleIndicatorEntity({ row_index, group_index, entity_index });
        }
      }
    }
  }

  private _isSectionHidden(section: SECTION): boolean {
    return !this._config.layout_config?.section_order?.includes(section);
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    this._createStore();

    if (this._currentPreview !== null && this.isEditorPreview) {
      return this._renderCardPreview();
    }

    if (this._config.mini_map?.single_map_card === true && this._extraMapCard) {
      return html`${this._extraMapCard}`;
    }

    const headerHidden =
      this._config.layout_config?.hide_card_name || this._config.name?.trim() === '' || !this._config.name;
    return html`
      <ha-card class=${this._computeClasses()} ?no-header=${headerHidden} ?preview=${this.isEditorPreview}>
        ${!headerHidden ? html`<div class="card-header" id="name">${this._config.name}</div>` : nothing}
        ${this._activeCardIndex === null ? this._renderMainCard() : this._renderSelectedCard()}
      </ha-card>
    `;
  }

  private _renderMainCard(): TemplateResult {
    const sectionOrder = this._config.layout_config?.section_order || SECTION_KEYS;

    return html` <main id="main-wrapper">
      ${sectionOrder.map((section: string) => {
        switch (section) {
          case SECTION.INDICATORS:
            return this._renderIndicators();
          case SECTION.RANGE_INFO:
            return this._renderRangeInfo();
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

  private _renderIndicators() {
    if (this._isSectionHidden(SECTION.INDICATORS)) return html``;
    const hasRows = this._config.indicator_rows && this._config.indicator_rows.length > 0;
    const hasBoth = this._config.indicators && hasRows;
    const inFirstSection = this._config.layout_config?.section_order![0] === SECTION.INDICATORS;
    if (!hasRows && !this._config.indicators) return html``;
    return html`<div id=${SECTION.INDICATORS} ?noMargin=${inFirstSection}>
      ${hasBoth
        ? html`${this._renderIndicatorRows()} ${this._renderIndicatorsLegacy()}`
        : hasRows
        ? this._renderIndicatorRows()
        : this._renderIndicatorsLegacy()}
    </div>`;
  }

  private _renderIndicatorRows(): TemplateResult {
    if (!this._config.indicator_rows?.length) return html``;
    const rows = this._config.indicator_rows;
    return html`
      <div id="indicator-rows" class="indicator-rows">
        ${repeat(
          rows,
          (row: IndicatorRowConfig) => row.row_items.map((item) => item.type).join('-'),
          (row: IndicatorRowConfig, index: number) => {
            return html`
              <vsc-indicator-row
                data-index=${index}
                ._hass=${this._hass}
                .rowConfig=${row}
                ._store=${this._store}
              ></vsc-indicator-row>
            `;
          }
        )}
      </div>
    `;
  }

  private _renderIndicatorsLegacy(): TemplateResult | typeof nothing {
    if (!this._config.indicators) return nothing;
    return html`
      <div class="header-info-box">
        <vsc-indicators .hass=${this._hass} .config=${this._config} ._store=${this._store}></vsc-indicators>
      </div>
    `;
  }

  private _renderButtons(): TemplateResult | typeof nothing {
    if (isEmpty(this._buttonCardConfigItem) || this._isSectionHidden(SECTION.BUTTONS)) return nothing;
    // const visibleButtons = this._buttonCardConfigItem.filter((button) => !button.hide_button);
    return html`
      <div id=${SECTION.BUTTONS}>
        <vsc-buttons-grid .hass=${this._hass} ._store=${this._store} ._cardCurrentSwipeIndex=${this._currentSwipeIndex}>
        </vsc-buttons-grid>
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
    const imageEntities = this._config?.image_entities || [];
    const configImages = this._config?.images || [];
    if ((!configImages.length && !imageEntities.length) || this._isSectionHidden(SECTION.IMAGES)) return html``;

    return html`
      <div id=${SECTION.IMAGES}>
        <vsc-images-slide .hass=${this._hass} .config=${this._config} ._store=${this._store}> </vsc-images-slide>
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
    const miniMapConfig = this._config.mini_map;

    return html`
      <div id=${SECTION.MINI_MAP} style=${this._computeMapStyles()}>
        <vsc-mini-map
          ._hass=${this._hass}
          .mapConfig=${miniMapConfig}
          .isDark=${this.isDark}
          ._store=${this._store}
        ></vsc-mini-map>
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult {
    const { range_info } = this._config;
    if (this._isSectionHidden(SECTION.RANGE_INFO) || !range_info) return html``;
    const rangeLayout = this._config.layout_config?.range_info_config?.layout || 'column';
    return html`<div id="${SECTION.RANGE_INFO}">
      <vsc-range-info
        .hass=${this._hass}
        .rangeConfig=${range_info}
        ._store=${this._store}
        ._store=${this._store}
        ?row=${rangeLayout === 'row'}
      ></vsc-range-info>
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
        ? customCard.map((card) => this._renderCustomCard(card))
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

  private _renderCustomCard(card: LovelaceCardConfig) {
    return html`<vsc-custom-card-element .hass=${this._hass} ._config=${card} ._store=${this._store}>
    </vsc-custom-card-element>`;
  }

  // private _renderCustomCard(cards: LovelaceCardConfig[]) {
  //   const element = createCustomCard(cards);
  //   if (element) {
  //     if (this._hass) {
  //       element.hass = this._hass;
  //     }
  //   }
  //   return html`${element}`;
  // }

  private _renderDefaultCardItems(data: DefaultCardConfig): TemplateResult {
    return html` <vsc-default-card .hass=${this._hass} ._data=${data} ._store=${this._store}></vsc-default-card> `;
  }

  private _renderTireCard(tireCardConfig: TireEntity): TemplateResult {
    return html`
      <vsc-tire-card .hass=${this._hass} .tireConfig=${tireCardConfig} ._store=${this._store}> </vsc-tire-card>
    `;
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

  private _toggleIndicatorRow(data: { rowIndex?: number | null; groupIndex?: number }, peek: boolean = false): void {
    if (!this.isEditorPreview) return;

    let { rowIndex } = data;
    const rows = this._indicatorRows;
    if (!rows || rows.length === 0) return;

    // normalize: if out of bounds, treat as null
    if (rowIndex === undefined || rowIndex === null || rowIndex >= rows.length) {
      rowIndex = null;
    }

    if (rowIndex !== null) {
      // one active row: disable all others
      rows.forEach((row, index) => {
        if (index === rowIndex) {
          row.classList.remove('disabled');
          if (peek) {
            row.classList.add('peek');
            setTimeout(() => {
              row.classList.remove('peek');
            }, 2000);
          }
        } else {
          row.classList.add('disabled');
        }
      });
    } else {
      // no active row or invalid index: clear disabled from all
      rows.forEach((row) => row.classList.remove('disabled'));
    }
  }

  private _toggleIndicatorEntity(
    data: { row_index: number; group_index?: number | null; entity_index?: number | null },
    peek: boolean = false
  ): void {
    const { row_index, group_index, entity_index } = data;
    const indicatorRow = this._indicatorRows[row_index];
    if (indicatorRow) {
      indicatorRow.updateComplete.then(() => {
        const items = indicatorRow._itemEls;
        if (group_index !== null && group_index !== undefined) {
          indicatorRow._toggleGroupIndicator(group_index);
          console.log('Toggled group indicator:', group_index);
        }
        if (entity_index !== null && entity_index !== undefined) {
          // dim all items except the one at entity_index
          // console.debug('set highlight entity index:', entity_index);
          const entityItem = items?.[entity_index];
          if (entityItem) {
            entityItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            if (peek) {
              entityItem.classList.add('peek');
              setTimeout(() => {
                entityItem.classList.remove('peek');
              }, 2000);
            }
          }
          items.forEach((item, index) => {
            if (index === entity_index) {
              item.classList.remove('dimmed');
            } else {
              item.classList.add('dimmed');
              if (peek) {
                setTimeout(() => {
                  item.classList.remove('dimmed');
                }, 2000);
              }
            }
          });
        } else {
          // if entity_index is null, remove dimmed from all items
          items.forEach((item) => item.classList.remove('dimmed'));
        }
      });
    }
  }

  private _computeClasses() {
    const section_order = this._config.layout_config?.section_order || [];
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

  public _handleEditorEvent(ev: CustomEvent<EditorEventParams>): void {
    ev.stopPropagation();
    if (!this.isEditorPreview || this._config.mini_map?.single_map_card === true) return;
    const { type, data } = ev.detail;
    switch (type) {
      case 'show-button':
        if (this._isSectionHidden(SECTION.BUTTONS)) return;
        console.log('Show button:', data.buttonIndex);
        if (this._currentPreview !== null) {
          this._currentPreview = null;
        }
        console.log('Current preview cleared, showing button', data.buttonIndex);
        this.updateComplete.then(() => {
          this._vehicleButtonsGrid.showButton(data.buttonIndex);
        });
        break;

      case 'show-image':
        if (this._isSectionHidden(SECTION.IMAGES)) return;
        this._imagesSlide?.showImage(data.index);
        break;
      case 'toggle-preview':
        const cardType = data.cardType;
        this._currentPreview = cardType;
        break;

      case 'toggle-helper':
        this._toggleHelper(data);
        break;
      case 'toggle-indicator-row':
        const peek = data.peek ?? false;
        this._toggleIndicatorRow(data, peek);
        break;
      case 'toggle-highlight-row-item':
        const preview = { row_index: data.rowIndex, group_index: data.groupIndex, entity_index: data.itemIndex };
        const peekItem = data.peek ?? false;
        this._toggleIndicatorEntity(preview, peekItem);
        break;
    }
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): LovelaceGridOptions {
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
    return this.hass.themes.darkMode || isDarkTheme(this);
  }

  get isEditorPreview(): boolean {
    const parentElementClassPreview = this.offsetParent?.classList.contains('element-preview');
    return parentElementClassPreview || false;
  }

  private _createStore() {
    if (!this._store) {
      // console.log('Creating store for VehicleStatusCard', this._config.name);
      this._store = new Store(this, this._config);
      super.requestUpdate();
    }
  }

  public _peekBorder(): void {
    this._haCard.classList.add('peek-border');
    setTimeout(() => {
      this._haCard.classList.remove('peek-border');
    }, 2000);
  }
  static get styles(): CSSResultGroup {
    return [super.styles];
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
    [CARD_NAME]: VehicleStatusCard;
  }
}
// Load and clean extra map resources
loadAndCleanExtraMap().catch(console.error);
