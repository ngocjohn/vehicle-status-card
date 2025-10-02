import { isEmpty } from 'es-toolkit/compat';
import { CSSResultGroup, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, queryAll, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

import './components';
import './editor/editor';
import './utils/custom-tire-card';
import * as SEC from './components';
import { COMPONENT, CARD_NAME } from './constants/const';
import { EditorEventParams } from './editor/base-editor';
import { EDITOR_AREA_SELECTED, EDITOR_SUB_CARD_PREVIEW } from './events';
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
  TireTemplateConfig,
  VehicleStatusCardConfig,
  BaseButtonCardItemConfig,
  ButtonCardSubCardConfig,
  CardDefaultConfig,
} from './types/config';
import { ConfigArea } from './types/config-area';
import { SECTION_KEYS } from './types/config/card/layout';
import { SECTION } from './types/section';
import { applyThemesOnElement, loadAndCleanExtraMap, isDarkTheme, ICON } from './utils';
import { BaseElement } from './utils/base-element';
import { ButtonSubCardPreviewConfig } from './utils/editor/types';
import { createMapCard } from './utils/lovelace/create-map-card';
import { createStubConfig, loadStubConfig } from './utils/lovelace/stub-config';
import { Store } from './utils/store';

@customElement(CARD_NAME)
export class VehicleStatusCard extends BaseElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    Store.selectedConfigArea = ConfigArea.DEFAULT;
    return document.createElement('vehicle-status-card-editor');
  }

  public static getStubConfig = async (hass: HomeAssistant): Promise<VehicleStatusCardConfig> => {
    const DEFAULT_CONFIG = (await loadStubConfig()) ?? (await createStubConfig(hass));
    return {
      ...DEFAULT_CONFIG,
    };
  };

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._extraMapCard) {
      this._extraMapCard.hass = hass;
    }
  }
  get hass(): HomeAssistant {
    return this._hass;
  }

  private _onEditorEvent = (e: CustomEvent<EditorEventParams>) => this._handleEditorEvent(e);
  private _onEditorConfigAreaSelected = (e: Event) => this._handleEditorConfigAreaSelected(e);
  private _onEditorSubCardPreview = (e: Event) => this._handleEditorSubCardPreview(e);

  constructor() {
    super();
  }

  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public _config!: VehicleStatusCardConfig;
  @property({ attribute: false }) public layout?: string;
  @property({ attribute: false }) public isPanel?: boolean;

  @state() public _activeCardIndex: null | number | string = null;

  @state() _hasAnimated: boolean = false;
  @state() _currentSwipeIndex?: number;

  @state() _connected = false;
  @state() private _extraMapCard?: LovelaceCard; // Extra map card instance

  @state() _buttonCardConfigItem?: ButtonCardConfig[]; // Button card configuration items
  @state() private _newButtonConfig!: BaseButtonCardItemConfig[]; // New button card configuration items
  @state() private configSection!: SECTION | undefined;
  @state() private subCardPreviewConfig?: ButtonSubCardPreviewConfig;

  // section queries
  @query(COMPONENT.BUTTONS_GROUP) _secButtonsGroup!: SEC.VscButtonsGroup;
  @query(COMPONENT.IMAGES_SLIDE) _secImages!: SEC.ImagesSlide;
  @query(COMPONENT.RANGE_INFO) _secRangeInfo!: SEC.VscRangeInfo;
  @query(COMPONENT.MINI_MAP) _secMiniMap!: SEC.MiniMapBox;
  @query(COMPONENT.INDICATORS_GROUP) _secIndiGroup!: SEC.VscIndicatorsGroup;
  @queryAll(COMPONENT.INDICATOR_ROW) _secIndicatorRows!: NodeListOf<SEC.VscIndicatorRow>;
  // legacy query
  @query(COMPONENT.BUTTONS_GRID) _secButtons!: SEC.VehicleButtonsGrid;
  @query(COMPONENT.INDICATORS) _secIndicatorsLegacy!: SEC.VscIndicators;

  @query('#main-wrapper', true) _mainWrapper!: HTMLElement;

  public setConfig(config: VehicleStatusCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    const newConfig = JSON.parse(JSON.stringify(config));
    if (newConfig.button_card && newConfig.button_card.length) {
      console.debug('legacy button_card config found');
      // Backward compatibility for legacy button_card config
      this._buttonCardConfigItem = newConfig.button_card as ButtonCardConfig[];
      console.debug('config button_card:', this._buttonCardConfigItem);
    }
    // this._config = newConfig;
    this._config = {
      ...updateDeprecatedConfig(newConfig),
    };

    if (this._config.button_cards && this._config.button_cards.length) {
      this._newButtonConfig = this._config.button_cards as BaseButtonCardItemConfig[];
    }

    if (this._store != null) {
      console.debug('Updating store config');
      this._store._config = this._config;
    } else {
      // console.debug('Store not found, will create on first update');
      this._createStore();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.VehicleCard = this;
    if (this.isEditorPreview) {
      window.addEventListener('editor-event', this._onEditorEvent);
      document.addEventListener(EDITOR_AREA_SELECTED, this._onEditorConfigAreaSelected);
      document.addEventListener(EDITOR_SUB_CARD_PREVIEW, this._onEditorSubCardPreview, { once: true });
    }
  }
  disconnectedCallback(): void {
    this._connected = false;
    window.removeEventListener('editor-event', this._onEditorEvent);
    document.removeEventListener(EDITOR_AREA_SELECTED, this._onEditorConfigAreaSelected);
    document.removeEventListener(EDITOR_SUB_CARD_PREVIEW, this._onEditorSubCardPreview);
    super.disconnectedCallback();
  }

  protected async willUpdate(changedProps: PropertyValues): Promise<void> {
    super.willUpdate(changedProps);
    if (
      changedProps.has('_config') &&
      this._config.mini_map?.single_map_card === true &&
      this._config.mini_map?.device_tracker !== undefined &&
      this._config.mini_map?.maptiler_api_key !== undefined
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
  }

  private _createMapElement(): void {
    if (!this._config.mini_map) return;
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

    if (changedProps.has('_config') && this.isEditorPreview) {
      if (this._config.active_group !== undefined) {
        // If active group is set, show the group indicator in the card
        const groupIndex = this._config.active_group;
        console.log('Active group index:', groupIndex);
        if (this._secIndicatorsLegacy) {
          this._secIndicatorsLegacy._activeGroupIndicator = groupIndex;
          console.log('Setting active group indicator:', this._secIndicatorsLegacy._activeGroupIndicator);
        }
      }
      if (this._config.row_group_preview !== undefined) {
        const { row_index, group_index, entity_index } = this._config.row_group_preview;

        if (this._secIndicatorRows) {
          this._toggleIndicatorRow({ rowIndex: row_index, groupIndex: group_index });
          this._toggleIndicatorEntity({ row_index, group_index, entity_index });
        }
      }
    }
  }

  _isSectionHidden(section: SECTION): boolean {
    return !this._config.layout_config?.section_order?.includes(section);
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    this._createStore();
    const _config = this._config;
    if (this.subCardPreviewConfig && this.isEditorPreview) {
      return this._renderSubCardPreview();
    }

    if (_config.mini_map?.single_map_card === true && this._extraMapCard) {
      return html`${this._extraMapCard}`;
    }
    const notMainCard = this._activeCardIndex !== null;

    const headerHidden = Boolean(
      _config.layout_config?.hide_card_name || _config.name?.trim() === '' || !_config.name || notMainCard
    );

    const headerDimmed = this.isEditorPreview && this.configSection !== SECTION.DEFAULT && !notMainCard;

    return html`
      <ha-card
        class=${this._computeClasses(notMainCard)}
        ?notMainCard=${notMainCard}
        ?no-header=${headerHidden}
        ?preview=${this.isEditorPreview}
      >
        ${!headerHidden
          ? html`<div class="card-header" id="name" ?header-dimmed=${headerDimmed}>${this._config.name}</div>`
          : nothing}
        ${!notMainCard ? this._renderMainCard() : this._renderSelectedCard()}
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
            return nothing;
        }
      })}
    </main>`;
  }

  private _renderIndicators(): TemplateResult {
    if (this._isSectionHidden(SECTION.INDICATORS)) return html``;
    const hasRows = this._config.indicator_rows && this._config.indicator_rows.length > 0;
    const hasBoth = this._config.indicators && hasRows;
    const inFirstSection = this._config.layout_config?.section_order![0] === SECTION.INDICATORS;
    if (!hasRows && !this._config.indicators) return html``;
    return html`<div id=${SECTION.INDICATORS} ?noMargin=${inFirstSection}>
      <vsc-indicators-group ._hass=${this._hass} ._store=${this._store}>
        ${hasBoth
          ? html`${this._renderIndicatorRows()} ${this._renderIndicatorsLegacy()}`
          : hasRows
          ? this._renderIndicatorRows()
          : this._renderIndicatorsLegacy()}
      </vsc-indicators-group>
    </div>`;
  }

  private _renderIndicatorRows(): TemplateResult {
    if (!this._config.indicator_rows?.length) return html``;
    const rows = this._config.indicator_rows;
    return html`
      ${repeat(
        rows,
        (row: IndicatorRowConfig) => row,
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
    if (this._isSectionHidden(SECTION.BUTTONS)) return nothing;
    if (this._buttonCardConfigItem) {
      const visibleButtons = this._buttonCardConfigItem.filter((button) => !button.hide_button);
      return html`
        <div id=${SECTION.BUTTONS}>
          <vsc-buttons-grid
            .buttons=${visibleButtons}
            .hass=${this._hass}
            ._store=${this._store}
            ._cardCurrentSwipeIndex=${this._currentSwipeIndex}
          ></vsc-buttons-grid>
        </div>
      `;
    }
    // const visibleButtons = this._buttonCardConfigItem.filter((button) => !button.hide_button);
    return html`
      <div id=${SECTION.BUTTONS}>
        <vsc-buttons-group
          .hass=${this._hass}
          ._store=${this._store}
          ._cardCurrentSwipeIndex=${this._currentSwipeIndex}
        >
        </vsc-buttons-group>
      </div>
    `;
  }

  private _renderSubCardPreview(): TemplateResult {
    if (!this.subCardPreviewConfig) return html``;
    const { type, config } = this.subCardPreviewConfig;

    let cardContent: unknown = nothing;
    switch (type) {
      case 'default_card':
        const defaultConfig = config as DefaultCardConfig[];
        cardContent = defaultConfig?.length
          ? defaultConfig.map((card) => this._renderDefaultCardItems(card))
          : this._showWarning('Default card not found, configure it in the editor');
        break;
      case 'custom_card':
        const cardConfig = config as LovelaceCardConfig[];
        cardContent = cardConfig?.length
          ? cardConfig.map((card) => this._renderCustomCard(card))
          : this._showWarning('Custom card not found, configure it in the editor');
        break;
      case 'tire_card':
        cardContent = this._renderTireCard(config as TireTemplateConfig);
        break;
    }

    return html`
      <ha-card class="preview-card">
        <main>
          <section class="card-element"><div class="added-card">${cardContent}</div></section>
        </main>
      </ha-card>
    `;
  }

  private _renderImagesSlide(): TemplateResult {
    if (!this._config.images?.length || this._isSectionHidden(SECTION.IMAGES)) return html``;

    return html`
      <div id=${SECTION.IMAGES}>
        <vsc-images-slide .hass=${this._hass} .config=${this._config} ._store=${this._store}> </vsc-images-slide>
      </div>
    `;
  }

  private _renderMiniMap(): TemplateResult {
    if (this._isSectionHidden(SECTION.MINI_MAP) || isEmpty(this._config.mini_map)) return html``;
    const deviceTracker = this._config.mini_map?.device_tracker;
    const stateObj = deviceTracker ? this._hass.states[deviceTracker] : null;
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
        ._hass=${this._hass}
        .rangeConfig=${range_info}
        ._store=${this._store}
        ?row=${rangeLayout === 'row'}
      ></vsc-range-info>
    </div>`;
  }

  /* -------------------------- CUSTOM CARD RENDERING -------------------------- */

  private _renderSelectedCard(): TemplateResult {
    const index = this._activeCardIndex;
    if (index === null) return html``;
    const cardConfig = this._newButtonConfig![Number(index)] as BaseButtonCardItemConfig;
    const subCardConfig = cardConfig?.sub_card;

    const cardType = cardConfig?.card_type ?? 'default';

    const { default_card, custom_card, tire_card } = subCardConfig || ({} as ButtonCardSubCardConfig);

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
      selectedContent = default_card?.length
        ? default_card.map((card) => this._renderDefaultCardItems(card))
        : this._showWarning('Default card not found, configure it in the editor');
    } else if (cardType === 'custom') {
      selectedContent = custom_card?.length
        ? custom_card.map((card) => this._renderCustomCard(card))
        : this._showWarning('Custom card not found');
    } else if (cardType === 'tire') {
      selectedContent = this._renderTireCard(tire_card as TireTemplateConfig);
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
    return html`<vsc-custom-card-element
      .hass=${this._hass}
      ._config=${card}
      ._store=${this._store}
    ></vsc-custom-card-element>`;
  }

  private _renderDefaultCardItems(data: DefaultCardConfig | CardDefaultConfig): TemplateResult {
    return html` <vsc-default-card .hass=${this._hass} ._data=${data} ._store=${this._store}></vsc-default-card> `;
  }

  private _renderTireCard(tireCardConfig: TireTemplateConfig): TemplateResult {
    return html`
      <vsc-tire-card .hass=${this._hass} .tireConfig=${tireCardConfig} ._store=${this._store}> </vsc-tire-card>
    `;
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  private _toggleIndicatorRow(data: { rowIndex?: number | null; groupIndex?: number }, peek: boolean = false): void {
    if (!this.isEditorPreview) return;

    let { rowIndex } = data;
    const rows = this._secIndicatorRows;
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
    const indicatorRow = this._secIndicatorRows[row_index];
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

  private _computeClasses(notMainCard: boolean = false) {
    if (notMainCard) {
      return classMap({
        __not_main_card: true,
      });
    }
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
    const noHeader = this._config.layout_config?.hide_card_name || this._config.name?.trim() === '';
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
      const totalCards = this._newButtonConfig!.filter((button) => !button.hide_button).length;

      const isNotActionType = (index: number): boolean => this._newButtonConfig![index].button_type !== 'action';

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

  protected _handleEditorConfigAreaSelected = (ev: Event): void => {
    ev.stopPropagation();
    const evArgs = (ev as CustomEvent).detail;
    const selectedArea = evArgs.section as SECTION;
    if (this.configSection !== selectedArea) {
      console.debug('Area changed from', this.configSection, 'to', selectedArea);
      if (selectedArea === SECTION.DEFAULT) {
        this._setEditorSection(SECTION.DEFAULT);
        return;
      }
      const isHidden = this._isSectionHidden(selectedArea);
      const sectionIsEmpty = this.isSectionConfigEmpty(selectedArea) === true;

      // If the selected area is hidden or has no config, default to SECTION.DEFAULT
      const newArea = isHidden ? SECTION.DEFAULT : sectionIsEmpty ? SECTION.DEFAULT : selectedArea;

      this._setEditorSection(newArea);
    } else {
      // console.debug('Area not changed');
    }
  };

  public _setEditorSection = (section: SECTION) => {
    this.configSection = section;
    this._store.SetSelectedSection(section);
  };

  protected _handleEditorSubCardPreview = (ev: Event): void => {
    ev.stopPropagation();
    const evArgs = (ev as CustomEvent).detail;
    const previewConfig = evArgs.config as ButtonSubCardPreviewConfig;
    console.log('Received sub-card preview config:', previewConfig);
    if (previewConfig.type !== null) {
      this.subCardPreviewConfig = previewConfig;
    } else {
      this.subCardPreviewConfig = undefined;
    }
  };

  protected isSectionConfigEmpty(section: SECTION): boolean {
    if (!this._config || section === SECTION.DEFAULT) {
      return false;
    }
    if (section === SECTION.BUTTONS) {
      return isEmpty(this._config.button_cards);
    } else if (section === SECTION.INDICATORS) {
      section = SECTION.INDICATOR_ROWS;
    }
    return isEmpty(this._config[section]);
  }

  public _handleEditorEvent(ev: CustomEvent<EditorEventParams>): void {
    ev.stopPropagation();
    if (!this.isEditorPreview || this._config.mini_map?.single_map_card === true) return;
    const { type, data } = ev.detail;
    switch (type) {
      case 'show-button':
        if (this._isSectionHidden(SECTION.BUTTONS)) return;
        this._secButtonsGroup?.peekButton(data.buttonIndex);
        break;

      case 'show-image':
        if (this._isSectionHidden(SECTION.IMAGES)) return;
        this._secImages?.showImage(data.index);
        break;

      case 'toggle-helper':
        console.log('Toggling helper for section:', data);

        // this._toggleHelper(data);
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
      case 'reset-preview':
        console.log('resetting preview');
        this.subCardPreviewConfig = undefined;
        document.addEventListener(EDITOR_SUB_CARD_PREVIEW, this._handleEditorSubCardPreview.bind(this), { once: true });
        break;
      case 'highlight-button':
        console.debug('Highlighting button', data.buttonIndex);
        if (this._isSectionHidden(SECTION.BUTTONS)) return;
        this._secButtonsGroup?.highlightButton(data.buttonIndex);
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

  get isGroupIndiActive(): boolean {
    if (!this._secIndiGroup) return false;
    return this._secIndiGroup.isSubGroupActive;
  }

  private _createStore() {
    if (!this._store) {
      // console.log('Creating store for VehicleStatusCard', this._config.name);
      this._store = new Store(this, this._config);
      super.requestUpdate();
    }
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
