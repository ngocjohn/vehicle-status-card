import type { LovelaceCardConfig } from '../../ha';

import { HomeAssistant } from '../../ha';

const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
// Load the helpers and ensure they are available
let helpers;
if ((window as any).loadCardHelpers) {
  helpers = await (window as any).loadCardHelpers();
} else if (HELPERS) {
  helpers = HELPERS;
}

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

const VERTICAL_STACK_TAG = 'hui-vertical-stack-card';
export const loadVerticalStackCard = async (): Promise<void> => {
  if (customElements.get(VERTICAL_STACK_TAG)) {
    // console.log('Vertical stack card already loaded');
    return;
  }

  if (!customElements.get(VERTICAL_STACK_TAG)) {
    helpers.createCardElement({
      type: 'vertical-stack',
      cards: [],
    });
  }
};

const HUI_PICTURE_CARD = 'hui-picture-card';
export const loadPictureCard = async (): Promise<void> => {
  if (customElements.get(HUI_PICTURE_CARD)) {
    // console.log('Picture card already loaded');
    return;
  }

  console.log('Loading picture card...');
  helpers.createCardElement({
    type: 'picture',
    image: 'https://demo.home-assistant.io/stub_config/t-shirt-promo.png',
  });
};

// get the ha-picture-upload editor to load the upload form component
export const loadPictureCardHelper = async (hass: HomeAssistant): Promise<void> => {
  await loadPictureCard();
  const picConfig = {
    type: 'picture',
    image: 'https://demo.home-assistant.io/stub_config/t-shirt-promo.png',
  };
  const pictureEditor = await (customElements.get(HUI_PICTURE_CARD) as any).getConfigElement();
  pictureEditor.setConfig(picConfig);
  pictureEditor.hass = hass;
  const dummy = document.createElement('div');
  dummy.style.display = 'none';
  dummy.appendChild(pictureEditor);
  document.body.appendChild(dummy);
  // remove the dummy element after a delay to ensure the upload form is loaded.
  window.setTimeout(() => {
    if (dummy.parentNode) {
      dummy.parentNode.removeChild(dummy);
    }
  }, 100);
  return;
};
