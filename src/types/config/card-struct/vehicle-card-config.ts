import { assign, object, string, optional, array, unknown } from 'superstruct';

import { buttonCardConfigStruct } from './button-card-struct';
import { imagesStruct } from './images-struct';
import { lovelaceCardConfigStruct } from './lovelace-card-config';

export const vehicleCardConfigStruct = assign(
  lovelaceCardConfigStruct,
  object({
    name: optional(string()),
    button_cards: buttonCardConfigStruct, // BaseButtonCardItemConfig[]
    range_info: optional(array(unknown())), // RangeInfoConfig[]
    images: imagesStruct,
    mini_map: optional(unknown()), // MiniMapConfig
    indicator_rows: optional(array(unknown())), // IndicatorRowConfig[]
    layout_config: optional(unknown()), // LayoutConfig

    /** @deprecated */
    button_card: optional(array(unknown())), // ButtonCardConfig[]
    /** @deprecated */
    image_entities: optional(array(unknown())), // (EntityConfig | string)[]
    /** @deprecated */
    indicators: optional(unknown()), // IndicatorsConfig
  })
);
