import { RowGroupPreviewConfig } from '../utils/editor/types';
export const EDITOR_INDICATOR_ROW_SELECTED = 'vsc-editor-indicator-row-selected';

export class EditorIndicatorRowEventArgs {
  public config: RowGroupPreviewConfig;

  constructor(config?: RowGroupPreviewConfig) {
    this.config = config || {};
  }
}

export function EditorIndicatorRowSelectedEvent(config: RowGroupPreviewConfig) {
  const args = new EditorIndicatorRowEventArgs();
  args.config = config;

  return new CustomEvent(EDITOR_INDICATOR_ROW_SELECTED, {
    detail: args,
    bubbles: true,
    composed: true,
  });
}
