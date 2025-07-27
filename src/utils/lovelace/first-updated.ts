import { HomeAssistant } from '../../ha';
import { VehicleStatusCardConfig } from '../../types/config';
import { VehicleStatusCard } from '../../vehicle-status-card';
// Utils
import { getMapData } from './create-map-card';

export async function handleFirstUpdated(card: VehicleStatusCard): Promise<void> {
  if (card._currentPreview !== null && !card.isEditorPreview) {
    return;
  }
  const hass = card.hass as HomeAssistant;
  const config = card._config as VehicleStatusCardConfig;

  card.MapData = getMapData(hass, config) ?? undefined;
}
