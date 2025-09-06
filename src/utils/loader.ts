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

export const stickyPreview = () => {
  // Get the root and required elements
  const root = document.querySelector('body > home-assistant')?.shadowRoot;
  const dialog = root?.querySelector('hui-dialog-edit-card')?.shadowRoot;
  const content = dialog?.querySelector('ha-dialog')?.shadowRoot?.getElementById('content');
  const previewElement = dialog?.querySelector('div.element-preview') as HTMLElement;
  const editorElement = dialog?.querySelector('div.element-editor') as HTMLElement;
  const previewHui = previewElement?.querySelector('hui-card') as HTMLElement;

  // Exit early if any required element is missing
  if (!content || !editorElement || !previewElement) return;

  // Apply styles
  Object.assign(content.style, { padding: '8px' });
  Object.assign(editorElement.style, { margin: '0 8px' });
  Object.assign(previewElement.style, {
    position: 'sticky',
    top: '0',
    marginTop: '3em',

    // justifyItems: 'center',
  });
  Object.assign(previewHui.style, {
    padding: '4px',
    margin: '3em auto',
    // display: 'block',
  });
};

let mql = window.matchMedia('(min-width: 1000px) and (max-width: 1440px)');

export const refactorEditDialog = async () => {
  const editorDialog = await selectTree(document.body, 'home-assistant$hui-dialog-edit-card');

  if (!editorDialog) return;
  // console.debug('Found editor dialog', editorDialog);
  // Add custom styles

  const newStyle = css`
    .element-preview {
      flex: 0 0 50% !important;
      margin: 3em auto 1em !important;
    }
    @media (min-width: 1000px) {
      .content hui-card {
        margin: 0 auto !important;
        padding: inherit !important;
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
