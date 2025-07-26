import { LovelaceCardConfig, LovelaceCard } from '../../ha';

const VERTIAL_STACK_TAG = 'hui-vertical-stack-card';

/**
 * Creates a custom card element for the Vehicle Status Card.
 * @param config LovelaceCardConfig array of card configurations
 * @returns HuiVerticalStackCard element or undefined if no config is provided
 */
export const createCustomCard = (config: LovelaceCardConfig[]): LovelaceCard | undefined => {
  if (!config || !config.length) {
    return;
  }
  // Vertical stack lovelace config
  const verticalStackConfig: LovelaceCardConfig = {
    type: 'vertical-stack',
    cards: config,
  };

  try {
    if (customElements.get(VERTIAL_STACK_TAG)) {
      // @ts-ignore
      const element = document.createElement(VERTIAL_STACK_TAG, verticalStackConfig) as LovelaceCard;
      element.setConfig(verticalStackConfig);
      return element;
    }
    // @ts-ignore
    const element = document.createElement(VERTIAL_STACK_TAG) as LovelaceCard;
    customElements.whenDefined(VERTIAL_STACK_TAG).then(() => {
      try {
        customElements.upgrade(element);
        element.setConfig(verticalStackConfig);
        // eslint-disable-next-line unused-imports/no-unused-vars
      } catch (err) {
        // do nothing
      }
    });
    console.log('Custom card element created:', element);
    return element;
  } catch (error) {
    console.error('Error creating custom card element:', error);
    return undefined;
  }
};
