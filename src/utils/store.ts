import { VehicleStatusCardEditor } from '../editor/editor';
import { HomeAssistant } from '../ha/types';
import {
  BaseButtonCardItemConfig,
  ButtonCardConfig,
  ButtonGridConfig,
  IndicatorRowConfig,
  LayoutConfig,
  MiniMapConfig,
  RangeInfoConfig,
  VehicleStatusCardConfig,
} from '../types/config';
import { ConfigArea } from '../types/config-area';
import { SectionOrder } from '../types/config/card/layout';
import { SECTION } from '../types/section';
import { VehicleStatusCard } from '../vehicle-status-card';
/**
 * Card storage class to manage the VehicleStatusCard configuration.
 * This class provides methods to get configurations for different sections of the card.
 */

export class Store {
  public _config: VehicleStatusCardConfig;
  public card!: VehicleStatusCard;
  public _editor?: VehicleStatusCardEditor;
  public hass?: HomeAssistant;
  static selectedConfigArea: ConfigArea = ConfigArea.DEFAULT;
  public sectionInEditor?: SECTION;
  public _cardPreview?: VehicleStatusCard;

  constructor(
    card: VehicleStatusCard | VehicleStatusCardEditor,
    config: VehicleStatusCardConfig,
    sectionInEditor?: SECTION
  ) {
    this._config = config;
    if (card instanceof VehicleStatusCardEditor) {
      this._editor = card;
      this.hass = card._hass;
    } else if (card instanceof VehicleStatusCard) {
      this.card = card;
      this.hass = card.hass;
    } else {
      throw new Error('Invalid card type. Expected VehicleStatusCard or VehicleStatusCardEditor.');
    }
    if (sectionInEditor) {
      this.sectionInEditor = sectionInEditor;
    }
  }

  set cardPreview(card: VehicleStatusCard | undefined) {
    this._cardPreview = card;
  }

  get cardPreview(): VehicleStatusCard | undefined {
    return this._cardPreview;
  }

  public SetSelectedSection(section: SECTION | undefined) {
    this.sectionInEditor = section;
  }

  public get _sectionInEditor(): SECTION | undefined {
    return this.sectionInEditor;
  }
  /**
   * Get the button card configuration.
   * @returns {ButtonCardConfig[]} Array of button card configurations.
   * This method retrieves the button card configurations from the main configuration.
   */
  public get buttons(): (ButtonCardConfig | BaseButtonCardItemConfig)[] {
    return this._config.button_card || this._config.button_cards || [];
  }

  public get visibleButtons(): (ButtonCardConfig | BaseButtonCardItemConfig)[] {
    return this.buttons.filter((button) => !button.hide_button);
  }

  /**
   * Get the indicator rows configuration.
   * @returns {IndicatorRowConfig[]} Array of indicator row configurations.
   * This method retrieves the indicator rows configurations from the main configuration.
   */
  public get indicatorRows(): IndicatorRowConfig[] {
    return this._config.indicator_rows || [];
  }

  /**
   * Get the range information configuration.
   * @returns {RangeInfoConfig[]} Array of range information configurations.
   * This method retrieves the range information configurations from the main configuration.
   */
  public get rangeInfo(): RangeInfoConfig[] {
    return this._config.range_info || [];
  }

  /**
   * Get mini map configuration.
   * @returns {MiniMapConfig} The mini map configuration object.
   * This method retrieves the mini map configuration from the main configuration.
   */
  public get miniMap(): MiniMapConfig {
    return this._config.mini_map || ({} as MiniMapConfig);
  }

  /**
   * Get the layout configuration.
   * @returns {LayoutConfig} The layout configuration object.
   * This method retrieves the layout configuration from the main configuration.
   */
  public get layoutConfig(): LayoutConfig {
    return this._config.layout_config || {};
  }

  public get sectionOrder(): SectionOrder[] {
    return this.layoutConfig.section_order || [];
  }

  public get sectionOrderMap(): Map<SectionOrder, number> {
    return new Map(this.sectionOrder.map((section, index) => [section, index]));
  }

  public get gridConfig(): ButtonGridConfig {
    const button_grid = this.layoutConfig?.button_grid || {};
    return {
      rows: button_grid?.rows ?? 2,
      columns: button_grid?.columns ?? 2,
      button_layout: button_grid?.button_layout ?? 'horizontal',
      swipe: button_grid?.swipe ?? false,
      transparent: button_grid?.transparent ?? false,
      hide_notify_badge: button_grid?.hide_notify_badge ?? false,
    };
  }

  public get hasCardName(): boolean {
    return Boolean(this.layoutConfig?.hide_card_name !== true && this._config.name !== undefined);
  }
}
