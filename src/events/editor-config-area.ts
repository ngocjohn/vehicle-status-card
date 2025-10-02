import { SECTION } from '../types/section';

export const EDITOR_AREA_SELECTED = 'vsc-editor-area-selected';

export class EditorConfigAreaEventArgs {
  public section: SECTION;

  constructor(section?: SECTION) {
    this.section = section || SECTION.UNDEFINED;
  }
}

export function EditorConfigAreaSelectedEvent(section: SECTION) {
  const args = new EditorConfigAreaEventArgs();
  args.section = section;

  return new CustomEvent(EDITOR_AREA_SELECTED, {
    detail: args,
    bubbles: true,
    composed: true,
  });
}
