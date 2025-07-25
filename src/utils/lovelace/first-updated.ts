import { HomeAssistant } from '../../ha';
import { VehicleStatusCardConfig } from '../../types/config';
import { VehicleStatusCard } from '../../vehicle-status-card';
import { getButtonCard } from './create-button';
// Utils
import { getMapData } from './create-map-card';

export async function handleFirstUpdated(card: VehicleStatusCard): Promise<void> {
  if (card._currentPreview !== null && !card.isEditorPreview) {
    return;
  }
  const hass = card._hass as HomeAssistant;
  const config = card._config as VehicleStatusCardConfig;

  if (config.button_card && config.button_card.length > 0) {
    card._buttonReady = false;
    card._buttonCards = await getButtonCard(hass, config.button_card);
    card._buttonReady = true;
  }

  card.MapData = getMapData(hass, config) ?? undefined;
}
