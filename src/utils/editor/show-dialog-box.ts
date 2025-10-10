import { TemplateResult } from 'lit';

import { NAMESPACE_TITLE } from '../../constants/const';
const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
let helpers: any;
if ((window as any).loadCardHelpers) {
  helpers = await (window as any).loadCardHelpers();
} else if (HELPERS) {
  helpers = HELPERS;
}

export const showConfirmDialog = async (
  element: HTMLElement,
  message: string,
  confirmText: string,
  cancelText?: string
): Promise<boolean> => {
  const result = await helpers.showConfirmationDialog(element, {
    title: NAMESPACE_TITLE,
    text: message,
    confirmText,
    dismissText: cancelText ? cancelText : 'Cancel',
  });

  console.log('showConfirmDialog', result);
  return result;
};

export const showPromptDialog = async (
  element: HTMLElement,
  text: string,
  placeholder: string,
  confirmText?: string,
  cancelText?: string
): Promise<string | null> => {
  const result = await helpers.showPromptDialog(element, {
    title: NAMESPACE_TITLE,
    text,
    placeholder,
    confirmText: confirmText ? confirmText : 'Add',
    inputType: 'string',
    defaultValue: '',
    cancelText: cancelText ? cancelText : 'Cancel',
    confirmation: true,
  });

  console.log('showPromptDialog', result);
  return result;
};

export const showAlertDialog = async (element: HTMLElement, message: string | TemplateResult): Promise<void> => {
  await helpers.showAlertDialog(element, {
    title: NAMESPACE_TITLE,
    text: message,
  });
};
