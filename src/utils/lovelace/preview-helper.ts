import { DEFAULT_TIRE_CONFIG } from '../../editor/form';
import { HomeAssistant, LovelaceCardConfig } from '../../ha';
import {
  DefaultCardConfig,
  PREVIEW_TYPE,
  TireEntity,
  TireTemplateConfig,
  VehicleStatusCardConfig,
} from '../../types/config';
import { VehicleStatusCard } from '../../vehicle-status-card';
import { createCardElement } from './create-card-element';
import { getTireCard } from './create-tire-card';

export async function previewHandler(cardType: PREVIEW_TYPE | null, card: VehicleStatusCard): Promise<void> {
  if (!cardType && !card.isEditorPreview) return;
  const hass = card.hass as HomeAssistant;
  const config = card._config as VehicleStatusCardConfig;
  let cardConfig: LovelaceCardConfig[] | DefaultCardConfig[] | TireTemplateConfig;
  let cardElement: LovelaceCardConfig[] | DefaultCardConfig[] | TireEntity | undefined;

  switch (cardType) {
    case PREVIEW_TYPE.CUSTOM:
      cardConfig = config?.card_preview as LovelaceCardConfig[];
      if (!cardConfig) return;
      cardElement = (await createCardElement(hass, cardConfig)) as LovelaceCardConfig[];
      card._cardPreviewElement = cardElement;
      break;
    case PREVIEW_TYPE.DEFAULT:
      cardConfig = config?.default_card_preview as DefaultCardConfig[];
      if (!cardConfig) return;
      cardElement = cardConfig;
      card._defaultCardPreview = cardElement;
      break;
    case PREVIEW_TYPE.TIRE:
      cardConfig = config?.tire_preview as TireTemplateConfig;
      if (!cardConfig) return;
      cardElement = getTireCard(hass, cardConfig ?? DEFAULT_TIRE_CONFIG) as TireEntity;
      card._tireCardPreview = cardElement;
      break;
    default:
      return;
  }
  if (!cardElement) {
    _resetCardPreviews(card);
    return;
  }

  card._currentPreview = cardType;
  card.requestUpdate();
}

const _resetCardPreviews = (card: VehicleStatusCard): void => {
  card._cardPreviewElement = [];
  card._defaultCardPreview = [];
  card._tireCardPreview = undefined;
  card._currentPreview = null;
  card.requestUpdate();
};

export async function _setUpPreview(card: VehicleStatusCard): Promise<void> {
  if (!card._currentPreview && !card.isEditorPreview) return;

  // Ensure a card preview is configured during the first update if applicable
  if (!card._currentPreview && card._config?.card_preview) {
    card._currentPreview = PREVIEW_TYPE.CUSTOM;
  } else if (!card._currentPreview && card._config?.default_card_preview) {
    card._currentPreview = PREVIEW_TYPE.DEFAULT;
  } else if (!card._currentPreview && card._config?.tire_preview) {
    card._currentPreview = PREVIEW_TYPE.TIRE;
  }

  if (card._currentPreview !== null) {
    console.log('Setting up preview');
    await previewHandler(card._currentPreview, card);
  } else {
    card._currentPreview = null;
  }
}
