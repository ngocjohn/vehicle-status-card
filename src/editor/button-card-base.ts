import { CSSResultGroup, html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

import { BaseButtonCardItemConfig } from '../types/config';
import { ButtonArea } from '../types/config-area';
import { BaseEditor } from './base-editor';

export const PREVIEW = ['custom', 'default', 'tire'] as const;
export type PreviewType = (typeof PREVIEW)[number];

export class ButtonCardBaseEditor extends BaseEditor {
  @property({ attribute: false }) protected _btnConfig!: BaseButtonCardItemConfig;
  @state() public _currentArea!: ButtonArea;
  @state() public _activePreview: PreviewType | null = null;

  protected buttonArea?: ButtonArea;

  constructor(area?: ButtonArea) {
    super();
    if (area) {
      this.buttonArea = area;
    }
  }

  set activePreview(preview: PreviewType | null) {
    this._activePreview = preview;
  }
  get activePreview(): PreviewType | null {
    return this._activePreview;
  }

  set currentArea(area: ButtonArea) {
    this._currentArea = area;
  }
  get currentArea(): ButtonArea {
    return this._currentArea;
  }

  protected _renderPreviewBtn(): TemplateResult {
    const isActive = this._activePreview !== null;
    const label = isActive ? 'Exit Preview' : 'Preview Card';
    const variant = isActive ? 'warning' : 'neutral';
    return html` <ha-button size="small" variant=${variant} appearance="plain"> ${label} </ha-button> `;
  }

  static get styles(): CSSResultGroup {
    return super.styles;
  }
}
