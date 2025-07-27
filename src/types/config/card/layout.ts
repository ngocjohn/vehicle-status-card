import { SectionOrder } from '../../section';

/**
 * Layout configuration Interface
 */
export interface LayoutConfig {
  button_grid: ButtonGridConfig;
  images_swipe?: ImagesSwipeConfig;
  hide: HideConfig;
  theme_config?: ThemeConfig;
  section_order?: SectionOrder[];
  range_info_config?: RangeInfoConfig;
}

type SWIPE_EFFECT = 'slide' | 'fade' | 'coverflow';

type ImagesSwipeConfig = Partial<{
  max_height: number;
  max_width: number;
  autoplay: boolean;
  loop: boolean;
  delay: number;
  speed: number;
  effect: SWIPE_EFFECT;
  hide_pagination: boolean;
}>;

export type HideConfig = Partial<{
  button_notify: boolean;
  buttons: boolean;
  images: boolean;
  indicators: boolean;
  mini_map: boolean;
  range_info: boolean;
  card_name: boolean;
  map_address: boolean;
}>;

type BUTTON_LAYOUT = 'horizontal' | 'vertical';
export type ButtonGridConfig = Partial<{
  rows: number;
  columns: number;
  swipe: boolean;
  button_layout: BUTTON_LAYOUT;
  transparent: boolean;
}>;

type RANGE_INFO_LAYOUT = 'column' | 'row';

type RangeInfoConfig = Partial<{
  layout: RANGE_INFO_LAYOUT;
}>;

type THEME_MODE = 'auto' | 'light' | 'dark';
type ThemeConfig = Partial<{
  mode: THEME_MODE;
  theme: string;
}>;
