// List of all section keys
export const SECTION_KEYS = ['indicators', 'range_info', 'images', 'mini_map', 'buttons'];
// section order type is array of section keys, e.g. ['indicators', 'buttons', 'mini_map']
export type SectionOrder = (typeof SECTION_KEYS)[number];
/**
 * Layout configuration Interface
 */
export interface LayoutConfig {
  button_grid?: ButtonGridConfig;
  images_swipe?: ImagesSwipeConfig;
  theme_config?: ThemeConfig;
  section_order?: SectionOrder[];
  range_info_config?: RangeInfoConfig;
  hide_card_name?: boolean;
  /**
   * @deprecated is replaced by 'section_order' option
   */
  hide?: HideConfig;
}

type SWIPE_EFFECT = 'slide' | 'fade' | 'coverflow';

interface ImagesSwipeConfig {
  autoplay?: boolean;
  loop?: boolean;
  delay?: number;
  speed?: number;
  effect?: SWIPE_EFFECT;
  hide_pagination?: boolean;
  height?: number;
  width?: number;
  /**
   * @deprecated use `height`instead
   */
  max_height?: number;
  /**
   * @deprecated use`width` instead
   */
  max_width?: number;
}

/**
 * @deprecated section 'hide' is replaced by 'section_order' option
 */
export type HideConfig = Partial<{
  buttons: boolean;
  images: boolean;
  indicators: boolean;
  mini_map: boolean;
  range_info: boolean;
  card_name: boolean;
}>;

type BUTTON_LAYOUT = 'horizontal' | 'vertical';
export type ButtonGridConfig = {
  rows?: number;
  columns?: number;
  swipe?: boolean;
  /**@deprecated Use `layout` in button config instead */
  button_layout?: BUTTON_LAYOUT;
  /**@deprecated Use `transparent` in button config instead */
  transparent?: boolean;
  /**@deprecated Use `notify` template in button config instead */
  hide_notify_badge?: boolean;
};

type RANGE_INFO_LAYOUT = 'column' | 'row';

type RangeInfoConfig = Partial<{
  layout: RANGE_INFO_LAYOUT;
}>;

type THEME_MODE = 'auto' | 'light' | 'dark';
type ThemeConfig = Partial<{
  mode: THEME_MODE;
  theme: string;
}>;
