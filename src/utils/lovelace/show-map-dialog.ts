import { fireEvent } from '../../ha';
import { MiniMapConfig } from '../../types/config';

export const enum DIALOG {
  HA_MAP = 'vsc-dialog-ha-map',
  EXTRA_MAP = 'vsc-dialog-extra-map',
}

export interface MapDialogParams {
  map_config: MiniMapConfig;
  use_map_tiler?: boolean;
}

export const showHaMapDialog = (element: HTMLElement, params: MapDialogParams): void => {
  fireEvent(element, 'show-dialog', {
    dialogTag: DIALOG.HA_MAP,
    dialogImport: () => import('../../components/shared/vsc-dialog-ha-map'),
    dialogParams: params,
  });
};
