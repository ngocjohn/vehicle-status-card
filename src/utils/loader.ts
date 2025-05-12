const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

import { LovelaceConfig } from 'custom-card-helpers';

import { VehicleStatusCardConfig } from '../types';

interface HuiRootElement extends HTMLElement {
  lovelace: {
    config: LovelaceConfig;
    current_view: number;
    [key: string]: any;
  };
  ___curView: number;
}
// Hack to load ha-components needed for editor
export const loadHaComponents = () => {
  if (!customElements.get('ha-form')) {
    (customElements.get('hui-button-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-entity-picker')) {
    (customElements.get('hui-entities-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-card-conditions-editor')) {
    (customElements.get('hui-conditional-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-form-multi_select')) {
    // Load the component by invoking a related component's method
    (customElements.get('hui-entities-card') as any)?.getConfigElement();
  }

  if (!customElements.get('hui-entity-editor')) {
    // Load the component by invoking a related component's method
    (customElements.get('hui-glance-card') as any)?.getConfigElement();
  }
};

export const stickyPreview = () => {
  // Get the root and required elements
  const root = document.querySelector('body > home-assistant')?.shadowRoot;
  const dialog = root?.querySelector('hui-dialog-edit-card')?.shadowRoot;
  const content = dialog?.querySelector('ha-dialog')?.shadowRoot?.getElementById('content');
  const previewElement = dialog?.querySelector('div.element-preview') as HTMLElement;
  const editorElement = dialog?.querySelector('div.element-editor') as HTMLElement;

  // Exit early if any required element is missing
  if (!content || !editorElement || !previewElement) return;

  // Apply styles
  Object.assign(content.style, { padding: '8px' });
  Object.assign(editorElement.style, { margin: '0 4px' });
  Object.assign(previewElement.style, {
    position: 'sticky',
    top: '0',
    padding: '0',
    justifyItems: 'center',
  });
};

const getLovelace = () => {
  const root = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main')?.shadowRoot;

  const resolver =
    root?.querySelector('ha-drawer partial-panel-resolver') ||
    root?.querySelector('app-drawer-layout partial-panel-resolver');

  const huiRoot = (resolver?.shadowRoot || resolver)
    ?.querySelector<HuiRootElement>('ha-panel-lovelace')
    ?.shadowRoot?.querySelector<HuiRootElement>('hui-root');

  if (huiRoot) {
    const ll = huiRoot.lovelace;
    ll.current_view = huiRoot.___curView;
    return ll;
  }

  return null;
};

const getDialogEditor = () => {
  const root = document.querySelector('home-assistant')?.shadowRoot;
  const editor = root?.querySelector('hui-dialog-edit-card');
  if (editor) {
    return editor;
  }
  return null;
};

export function convertSecondaryToObject(buttoncards: any[]) {
  return buttoncards.map((buttoncard) => {
    // Clone the buttoncard to avoid mutating the original
    const updatedButtoncard = { ...buttoncard };

    // If secondary is an array, convert it to the first object or null
    if (Array.isArray(updatedButtoncard.button.secondary)) {
      updatedButtoncard.button.secondary =
        updatedButtoncard.button.secondary.length > 0 ? updatedButtoncard.button.secondary[0] : null;
    } else if (typeof updatedButtoncard.button.secondary === 'string') {
      // If secondary is a string, convert it to an object with a state_template property
      updatedButtoncard.button.secondary = {
        state_template: updatedButtoncard.button.secondary,
      };
    }

    return updatedButtoncard;
  });
}

export function convertRangeEntityToObject(rangeEntity: any[]) {
  return rangeEntity.map((entity) => {
    // Clone the entity to avoid mutating the original
    const updatedEntity = { ...entity };

    // If entity is an array, convert it to the first object or null
    if (Array.isArray(updatedEntity.energy_level)) {
      updatedEntity.energy_level = updatedEntity.energy_level.length > 0 ? updatedEntity.energy_level[0] : null;
    }
    if (Array.isArray(updatedEntity.range_level)) {
      updatedEntity.range_level = updatedEntity.range_level.length > 0 ? updatedEntity.range_level[0] : null;
    }

    return updatedEntity;
  });
}

export async function _saveConfig(cardId: string, config: VehicleStatusCardConfig): Promise<void> {
  const lovelace = getLovelace();
  if (!lovelace) {
    console.log('Lovelace not found');
    return;
  }
  const dialogEditor = getDialogEditor() as any;
  const currentView = lovelace.current_view;

  const cardConfig = lovelace.config.views[currentView].cards;

  let cardIndex =
    cardConfig?.findIndex((card) => card.cardId === cardId) === -1 ? dialogEditor?._params?.cardIndex : -1;
  console.log('Card index:', cardIndex);
  if (cardIndex === -1) {
    console.log('Card not found in the config');
    return;
  }

  let newCardConfig = [...(cardConfig || [])];
  newCardConfig[cardIndex] = config;
  const newView = { ...lovelace.config.views[currentView], cards: newCardConfig };
  const newViews = [...lovelace.config.views];
  newViews[currentView] = newView;
  lovelace.saveConfig({ views: newViews });
  console.log('Saving new config:', newViews[currentView].cards![cardIndex]);
}

export const loadMapCard = async (entities: string[]): Promise<void> => {
  if (!customElements.get('ha-entity-marker')) {
    console.log('Loading ha-entity-marker');
    const mapConfig = { type: 'map', entities: entities, theme_mode: 'auto' };

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

    const card = await helpers.createCardElement(mapConfig);
    if (!card) {
      console.error('Failed to create card element.');
      return;
    }
  }
};
