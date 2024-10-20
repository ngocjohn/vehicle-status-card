import { REPOSITORY } from '../const/const';
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
};

export const loadCustomElement = async <T = any>(name: string) => {
  const Component = customElements.get(name) as T;
  if (Component) {
    return Component;
  }
  await customElements.whenDefined(name);
  return customElements.get(name) as T;
};

export async function fetchLatestReleaseTag() {
  const apiUrl = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;

  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      const releaseTag = data.tag_name;
      return releaseTag;
    } else {
      console.error('Failed to fetch the latest release tag:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching the latest release tag:', error);
  }
}

export const stickyPreview = () => {
  // Change the default preview element to be sticky
  const root = document.querySelector('body > home-assistant')?.shadowRoot;
  const dialog = root?.querySelector('hui-dialog-edit-card')?.shadowRoot;
  const previewElement = dialog?.querySelector('ha-dialog > div.content > div.element-preview') as HTMLElement;
  if (previewElement && previewElement.style.position !== 'sticky') {
    previewElement.style.position = 'sticky';
    previewElement.style.top = '0';
  }
};

export const getContentSlot = () => {
  const root = document.querySelector('body > home-assistant')?.shadowRoot;
  const dialog = root?.querySelector('hui-dialog-edit-card')?.shadowRoot;
  const contentSlot = dialog?.querySelector('ha-dialog > div.content') as HTMLSlotElement;

  return contentSlot;
};
