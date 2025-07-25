const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
import type { LovelaceCardConfig } from '../../ha';

import { HomeAssistant } from '../../ha';
/**
 *
 * @param hass Home Assistant instance
 * @param cards Array of Lovelace card configurations
 * @returns Promise that resolves to an array of card elements or void if no cards are provided
 */
export async function createCardElement(
  hass: HomeAssistant,
  cards: LovelaceCardConfig[]
): Promise<LovelaceCardConfig[] | void> {
  if (!cards) {
    return;
  }

  // Load the helpers and ensure they are available
  let helpers;
  if ((window as any).loadCardHelpers) {
    helpers = await (window as any).loadCardHelpers();
  } else if (HELPERS) {
    helpers = HELPERS;
  }

  // Check if helpers were loaded and if createCardElement exists
  if (!helpers || !helpers.createCardElement) {
    console.error('Card helpers or createCardElement not available.');
    return;
  }

  const cardElements = await Promise.all(
    cards.map(async (card) => {
      try {
        const element = await helpers.createCardElement(card);
        element.hass = hass;
        return element;
      } catch (error) {
        console.error('Error creating card element:', error);
        return null;
      }
    })
  );
  return cardElements;
}
