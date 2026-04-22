import { TemplateResult } from 'lit';

import { NAMESPACE_TITLE } from '../../constants/const';

export const showConfirmDialog = async (
  element: HTMLElement,
  message: string,
  confirmText: string,
  cancelText?: string
): Promise<boolean> => {
  // Check if loadCardHelpers is available (older HA versions)
  if (typeof (window as any).loadCardHelpers === 'function') {
    const helpers = await (window as any).loadCardHelpers();
    const result = await helpers.showConfirmationDialog(element, {
      title: NAMESPACE_TITLE,
      text: message,
      confirmText,
      dismissText: cancelText ? cancelText : 'Cancel',
    });

    console.log('showConfirmDialog', result);
    return result;
  }

  // Fallback for HA 2026.2+ where loadCardHelpers is not available
  // Use the native confirm dialog
  return new Promise<boolean>((resolve) => {
    const confirmed = window.confirm(`${NAMESPACE_TITLE}\n\n${message}`);
    resolve(confirmed);
  });
};

export const showPromptDialog = async (
  element: HTMLElement,
  text: string,
  placeholder: string,
  confirmText?: string,
  cancelText?: string
): Promise<string | null> => {
  // Check if loadCardHelpers is available (older HA versions)
  if (typeof (window as any).loadCardHelpers === 'function') {
    const helpers = await (window as any).loadCardHelpers();
    const result = await helpers.showPromptDialog(element, {
      title: NAMESPACE_TITLE,
      text,
      placeholder,
      confirmText: confirmText ?? 'Add',
      inputType: 'string',
      defaultValue: '',
      cancelText: cancelText ? cancelText : 'Cancel',
      confirmation: true,
    });

    console.log('showPromptDialog', result);
    return result;
  }

  // Fallback for HA 2026.2+ where loadCardHelpers is not available
  // Use the native prompt dialog
  return new Promise<string | null>((resolve) => {
    const result = window.prompt(`${NAMESPACE_TITLE}\n\n${text}`, placeholder);
    resolve(result);
  });
};

export const showAlertDialog = async (element: HTMLElement, message: string | TemplateResult): Promise<void> => {
  // Check if loadCardHelpers is available (older HA versions)
  if (typeof (window as any).loadCardHelpers === 'function') {
    const helpers = await (window as any).loadCardHelpers();
    await helpers.showAlertDialog(element, {
      title: NAMESPACE_TITLE,
      text: message,
    });
    return;
  }

  // Fallback for HA 2026.2+ where loadCardHelpers is not available
  // Use the native alert dialog
  return new Promise<void>((resolve) => {
    window.alert(`${NAMESPACE_TITLE}\n\n${typeof message === 'string' ? message : ''}`);
    resolve();
  });
};
