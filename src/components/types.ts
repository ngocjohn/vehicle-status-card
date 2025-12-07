import * as SEC from './index';

declare global {
  interface Window {
    VscButttonGroup: SEC.VscButtonsGroup;
    VscImages: SEC.ImagesSlide;
    VscMiniMap: SEC.MiniMapBox;
    VscIndiGroup: SEC.VscIndicatorsGroup;
    VscIndiRow: SEC.VscIndicatorRow;
    VscButtonGrid: SEC.VehicleButtonsGrid;
    VscRangeInfo: SEC.VscRangeInfo;
  }
}
