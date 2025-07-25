import type { ImageConfig, LayoutConfig, MiniMapConfig, VehicleStatusCardConfig } from '../../types/config';

import { getEntitiesByDomain, HomeAssistant } from '../../ha';
import { createButtonCard, generateButtonCardConfig } from './stub-config_button';
import { getIndicatorsConfig } from './stub-config_idicators';
import { getRangeInfoConfig } from './stub-config_range';

const GIT_ASSETS_URL =
  'https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/refs/heads/main/assets/sample-images/';
const SAMPLE_IMAGES = ['sample-car-1.png', 'sample-car-2.png', 'sample-car-3.png'] as const;

const getSampleImages = (): ImageConfig[] => {
  return SAMPLE_IMAGES.map((image) => ({
    title: image,
    url: `${GIT_ASSETS_URL}${image}`,
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
    },
    hide: {
      button_notify: false,
      buttons: false,
      images: false,
      indicators: true,
      range_info: true,
      mini_map: true,
      card_name: false,
      map_address: false,
    },
  },
};

export const createStubConfig = async (hass: HomeAssistant): Promise<VehicleStatusCardConfig> => {
  const deviceTracker = getEntitiesByDomain(hass.states, 1, ['device_tracker']);
  const buttonCardConfig = generateButtonCardConfig(hass);
  const idicators = getIndicatorsConfig(hass);
  const rangeInfo = getRangeInfoConfig(hass);

  let clonedConfig = { ...DEFAULT_CONFIG } as VehicleStatusCardConfig;

  if (deviceTracker.length) {
    const miniMap: MiniMapConfig = { ...(clonedConfig.mini_map || {}) };
    const layoutConfig: LayoutConfig = { ...(clonedConfig.layout_config || {}) };
    miniMap.device_tracker = deviceTracker[0];
    miniMap.enable_popup = true;
    clonedConfig.mini_map = miniMap;
    layoutConfig.hide.mini_map = false;
    clonedConfig.layout_config = layoutConfig;
  }
  if (buttonCardConfig.length) {
    clonedConfig.button_card = buttonCardConfig;
  }
  if (idicators) {
    clonedConfig.indicators = idicators;
    clonedConfig.layout_config.hide.indicators = false;
  }
  if (rangeInfo) {
    let layoutConfig: LayoutConfig = { ...(clonedConfig.layout_config || {}) };
    clonedConfig.range_info = rangeInfo;
    layoutConfig = {
      ...layoutConfig,
      hide: {
        ...layoutConfig.hide,
        range_info: false,
      },
      range_info_config: {
        layout: 'row',
      },
    };
    clonedConfig.layout_config = layoutConfig;
  }

  return clonedConfig;
};
