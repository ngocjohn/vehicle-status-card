import { ButtonSubCardPreviewConfig } from '../utils/editor/types';
export const EDITOR_SUB_CARD_PREVIEW = 'vsc-editor-sub-card-preview';

export class EditorSubCardPreviewEventArgs {
  public config: ButtonSubCardPreviewConfig;

  constructor(config?: ButtonSubCardPreviewConfig) {
    this.config = config || {};
  }
}

export function EditorSubCardPreviewEvent(config: ButtonSubCardPreviewConfig) {
  const args = new EditorSubCardPreviewEventArgs();
  args.config = config;

  return new CustomEvent(EDITOR_SUB_CARD_PREVIEW, {
    detail: args,
    bubbles: true,
    composed: true,
  });
}
