import { getEntitiesByDomain, HomeAssistant } from '../../ha';
import {
  ImageItem,
  SECTION_KEYS,
  type LayoutConfig,
  type MiniMapConfig,
  type SectionOrder,
  type VehicleStatusCardConfig,
} from '../../types/config';
import { createButtonCard, generateButtonCardConfig } from './stub-config_button';
import { getIndicatorRows } from './stub-config_idicators';
import { getRangeInfoConfig } from './stub-config_range';

const STORAGE_STUB_CONFIG = 'vsc-stub-config';

const GIT_ASSETS_URL =
  'https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/refs/heads/main/assets/sample-images/';
const SAMPLE_IMAGES = ['sample-car-1.png', 'sample-car-2.png', 'sample-car-3.png'] as const;

const getSampleImages = (): ImageItem[] => {
  return SAMPLE_IMAGES.map((image) => ({
    image: `${GIT_ASSETS_URL}${image}`,
  }));
};

const DEFAULT_CONFIG: Partial<VehicleStatusCardConfig> = {
  name: 'Vehicle Status Card',
  button_card: [createButtonCard('default'), createButtonCard('custom')],
  images: [...getSampleImages()],
  layout_config: {
    button_grid: {
      rows: 2,
      columns: 2,
      swipe: true,
      button_layout: 'horizontal',
      transparent: false,
      hide_notify_badge: false,
    },
    images_swipe: {
      height: 150,
    },
    section_order: SECTION_KEYS,
  },
};

export const createStubConfig = async (hass: HomeAssistant): Promise<VehicleStatusCardConfig> => {
  const deviceTracker = getEntitiesByDomain(hass.states, 1, ['device_tracker']);
  const buttonCardConfig = generateButtonCardConfig(hass);
  const indicatorRows = getIndicatorRows(hass);
  const rangeInfo = getRangeInfoConfig(hass);
  const sectionOrder: SectionOrder[] = [];
  let clonedConfig = { ...DEFAULT_CONFIG } as VehicleStatusCardConfig;

  if (deviceTracker.length) {
    const miniMap: MiniMapConfig = { ...(clonedConfig.mini_map || {}) };
    const layoutConfig: LayoutConfig = { ...(clonedConfig.layout_config || {}) };
    miniMap.device_tracker = deviceTracker[0];
    miniMap.enable_popup = true;
    clonedConfig.mini_map = miniMap;
    clonedConfig.layout_config = layoutConfig;
  }
  if (buttonCardConfig.length) {
    clonedConfig.button_card = buttonCardConfig;
  }
  if (indicatorRows) {
    clonedConfig.indicator_rows = [indicatorRows];
  }
  if (rangeInfo) {
    let layoutConfig: LayoutConfig = { ...(clonedConfig.layout_config || {}) };
    clonedConfig.range_info = rangeInfo;
    layoutConfig = {
      ...layoutConfig,
      range_info_config: {
        layout: 'row',
      },
    };
    clonedConfig.layout_config = layoutConfig;
    sectionOrder.push('range_info');
  }

  saveStubConfig(clonedConfig);
  return clonedConfig;
};

export const loadStubConfig = async (): Promise<VehicleStatusCardConfig | null> => {
  const storedConfig = sessionStorage.getItem(STORAGE_STUB_CONFIG);
  if (storedConfig) {
    try {
      console.log('Loading stub config from localStorage');
      return JSON.parse(storedConfig) as VehicleStatusCardConfig;
    } catch (error) {
      console.error('Failed to parse stored stub config:', error);
    }
  }
  return null;
};

export const saveStubConfig = async (config: VehicleStatusCardConfig): Promise<void> => {
  try {
    sessionStorage.setItem(STORAGE_STUB_CONFIG, JSON.stringify(config));
    console.log('Stub config saved successfully.');
  } catch (error) {
    console.error('Failed to save stub config:', error);
  }
};
