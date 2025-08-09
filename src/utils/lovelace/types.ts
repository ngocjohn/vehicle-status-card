import { HomeAssistant, LovelaceConfig } from '../../ha';
import { IndicatorRowItem } from '../../types/config';

export interface LovelaceIndicatorRowEditor extends LovelaceGenericElementEditor {
  setConfig(config: IndicatorRowItem): void;
}

export interface LovelaceGenericElementEditor extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: LovelaceConfig;
  setConfig(config: any): void;
  focusYamlEditor?: () => void;
}
