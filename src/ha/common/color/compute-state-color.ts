import { HassEntity } from 'home-assistant-js-websocket/dist/types';
import memoizeOne from 'memoize-one';

import { computeDomain } from '../..';
import { hsv2rgb, rgb2hex, rgb2hsv } from '../../../utils';
import { stateActive } from '../entity/state_active';
import { stateColorCss } from '../entity/state_color';
import { computeCssColor } from './compute-color';

export const computeStateColor = memoizeOne((stateObj: HassEntity, color?: string) => {
  if (!stateObj) {
    return undefined;
  }
  // Use custom color if active
  if (color) {
    return stateActive(stateObj) ? computeCssColor(color) : undefined;
  }

  // Use light color if the light support rgb
  if (computeDomain(stateObj.entity_id) === 'light' && stateObj.attributes.rgb_color) {
    const hsvColor = rgb2hsv(stateObj.attributes.rgb_color);

    // Modify the real rgb color for better contrast
    if (hsvColor[1] < 0.4) {
      // Special case for very light color (e.g: white)
      if (hsvColor[1] < 0.1) {
        hsvColor[2] = 225;
      } else {
        hsvColor[1] = 0.4;
      }
    }
    return rgb2hex(hsv2rgb(hsvColor));
  }

  // Fallback to state color
  return stateColorCss(stateObj);
});
