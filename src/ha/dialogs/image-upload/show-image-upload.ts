import { fireEvent } from '../../common/dom/fire_event';

export type ImageUploadDialogData = Record<string, any>;

export interface ImageUploadDialogParams {
  title: string;
  data?: ImageUploadDialogData;
  submit?: (data?: ImageUploadDialogData) => void;
  cancel?: () => void;
}

export const showImageUploadDialog = (element: HTMLElement, dialogParams: ImageUploadDialogParams) =>
  new Promise<ImageUploadDialogData | null>((resolve) => {
    const origCancel = dialogParams.cancel;
    const origSubmit = dialogParams.submit;

    fireEvent(element, 'show-dialog', {
      dialogTag: 'vsc-image-upload',
      dialogImport: () => import('./vsc-image-upload'),
      dialogParams: {
        ...dialogParams,
        cancel: () => {
          resolve(null);
          if (origCancel) {
            origCancel();
          }
        },
        submit: (data: ImageUploadDialogData) => {
          resolve(data);
          if (origSubmit) {
            origSubmit(data);
          }
        },
      },
    });
  });
