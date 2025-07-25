import { fireEvent, HASSDomEvent, ValidHassDomEvent } from '../../ha';
import { MiniMapConfig } from '../../types/config';

export const enum DIALOG {
  HA_MAP = 'vsc-dialog-ha-map',
  EXTRA_MAP = 'vsc-dialog-extra-map',
}

export interface MapDialogParams {
  map_config: MiniMapConfig;
  use_map_tiler?: boolean;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    'close-dialog': undefined;
    'dialog-closed': DialogClosedParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    'show-dialog': HASSDomEvent<ShowDialogParams<unknown>>;
    'dialog-closed': HASSDomEvent<DialogClosedParams>;
  }
}

export interface HassDialog<T = HASSDomEvents[ValidHassDomEvent]> extends HTMLElement {
  showDialog(params: T);
  closeDialog?: () => boolean;
}

interface ShowDialogParams<T> {
  dialogTag: keyof HTMLElementTagNameMap;
  dialogImport: () => Promise<unknown>;
  dialogParams: T;
  addHistory?: boolean;
}

export interface DialogClosedParams {
  dialog: string;
}

export const showHaMapDialog = (element: HTMLElement, params: MapDialogParams): void => {
  fireEvent(element, 'show-dialog', {
    dialogTag: DIALOG.HA_MAP,
    dialogImport: () => import('../../components/shared/vsc-dialog-ha-map'),
    dialogParams: params,
  });
};
