import {
  ButtonCardConfig,
  ButtonGridConfig,
  HideConfig,
  LayoutConfig,
  MiniMapConfig,
  RangeInfoConfig,
  VehicleStatusCardConfig,
} from '../types/config';
import { SectionOrder } from '../types/section';
import { VehicleStatusCard } from '../vehicle-status-card';

/**
 * Card storage class to manage the VehicleStatusCard configuration.
 * This class provides methods to get configurations for different sections of the card.
 */

export class Store {
  public _config: VehicleStatusCardConfig;
  public card: VehicleStatusCard;
  constructor(card: VehicleStatusCard, config: VehicleStatusCardConfig) {
    this.card = card;
    this._config = config;
  }
  public get config(): VehicleStatusCardConfig {
    return this._config;
  }

  /**
   * Get the button card configuration.
   * @returns {ButtonCardConfig[]} Array of button card configurations.
   * This method retrieves the button card configurations from the main configuration.
   */
  public get buttons(): ButtonCardConfig[] {
    return this._config.button_card || [];
  }

  public get visibleButtons(): ButtonCardConfig[] {
    return this.buttons.filter((button) => !button.hide_button);
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
    const {
      rows = 2,
      columns = 2,
      button_layout = 'horizontal',
      swipe = false,
      transparent = false,
    } = this.layoutConfig.button_grid || {};
    return { rows, columns, button_layout, swipe, transparent };
  }

  public get hiddenItemsMap(): Map<keyof HideConfig, boolean> {
    const hideConfig = this.layoutConfig.hide || {};
    return new Map(Object.entries(hideConfig).map(([key, value]) => [key as keyof HideConfig, value]));
  }
}
