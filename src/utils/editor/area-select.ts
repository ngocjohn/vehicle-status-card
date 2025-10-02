import { ConfigArea } from '../../types/config-area';
import { SECTION } from '../../types/section';

export function getSectionFromConfigArea(area: ConfigArea) {
  let section = SECTION.DEFAULT;
  if (area === 'indicators') {
    section = SECTION.INDICATORS;
  } else if (area === 'range_info') {
    section = SECTION.RANGE_INFO;
  } else if (area === 'images') {
    section = SECTION.IMAGES;
  } else if (area === 'mini_map') {
    section = SECTION.MINI_MAP;
  } else if (area === 'buttons') {
    section = SECTION.BUTTONS;
  } else if (area === 'layout_config') {
    section = SECTION.DEFAULT;
  }
  return section;
}
