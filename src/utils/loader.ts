import { css } from 'lit';

import { selectTree } from './helpers-dom';

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

let mql = window.matchMedia('(min-width: 1000px) and (max-width: 1440px)');

export const refactorEditDialog = async () => {
  const editorDialog = await selectTree(document.body, 'home-assistant$hui-dialog-edit-card');

  if (!editorDialog) return;
  // console.debug('Found editor dialog', editorDialog);
  // Add custom styles

  const newStyle = css`
    ha-dialog {
      --dialog-content-padding: 8px 4px !important;
    }
    @media (min-width: 1000px) {
      .content hui-section,
      .content hui-card {
        margin: 0 auto !important;
        padding: inherit !important;
      }
      .element-preview {
        flex: 0 0 50% !important;
        margin: 3em auto 1em !important;
      }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = newStyle.cssText;
  if (!editorDialog.shadowRoot?.querySelector('style[refactored]')) {
    styleEl.setAttribute('refactored', 'true');
    editorDialog.shadowRoot?.appendChild(styleEl);
  }
  if (mql.matches) {
    editorDialog.large = true;
  }
  // console.debug('Appended new styles to editor dialog', styleEl);
};
