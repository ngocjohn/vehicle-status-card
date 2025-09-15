import { html, TemplateResult, CSSResultGroup, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { fireEvent } from '../../../ha';
import { showFormDialog } from '../../../ha/dialogs/form/show-form-dialog';
import '../../shared/badge-editor-item';
import '../../../components/shared/vsc-image-item';
import { ImageItem } from '../../../types/config/card/images';
import { IMAGE_MENU_ACTIONS } from '../../../utils/editor/create-actions-menu';
import { showConfirmDialog } from '../../../utils/editor/show-dialog-box';
import { BaseEditor } from '../../base-editor';
import { ImageSchema } from '../../form';

declare global {
  interface HASSDomEvents {
    'images-changed': { images: ImageItem[] };
  }
}

@customElement('panel-images-preview')
export class PanelImagesPreview extends BaseEditor {
  @property({ attribute: false }) public images?: ImageItem[];

  protected render(): TemplateResult {
    if (!this.images || this.images.length === 0) {
      return html` <div class="card-config">
        <p>No images configured. Add images to see a preview here.</p>
      </div>`;
    }

    return html`
      <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved} .noStyle=${true}>
        <div class="image-preview">
          ${repeat(
            this.images,
            (image, index) => html`
              <badge-editor-item
                class="handle"
                .index=${index}
                ._menuAction=${IMAGE_MENU_ACTIONS}
                .defaultAction=${'show-image'}
                @badge-action-item=${this._handleImageAction}
              >
                <div class="image-item">
                  <vsc-image-item .hass=${this._hass} ._imageConfig=${image}> </vsc-image-item>
                </div>
              </badge-editor-item>
            `
          )}
        </div>
      </ha-sortable>
    `;
  }

  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newImages = this.images?.concat() || [];
    newImages.splice(newIndex, 0, newImages.splice(oldIndex, 1)[0]);
    this._updateImages(newImages);
  }

  private _handleImageAction(ev: CustomEvent): void {
    ev.stopPropagation();
    const action = ev.detail.action;
    const index = (ev.target as any).index;
    console.debug('Image action:', action, index);
    switch (action) {
      case 'show-image':
        this._dispatchEditorEvent('show-image', { index: index });
        break;
      case 'edit-image':
        this._editItem(index);
        break;
      case 'delete-image':
        this._deleteItem(index);
        break;
    }
  }

  private async _editItem(index: number) {
    const image = this.images![index];
    const newImage = await showFormDialog(this, {
      title: 'Edit Image',
      schema: [...ImageSchema],
      data: image,
      submitText: 'Update',
    });
    if (!newImage) {
      return;
    }
    const newImages = this.images?.concat() || [];
    newImages[index] = { ...newImages[index], ...newImage };
    this._updateImages(newImages);
  }

  private async _deleteItem(index: number) {
    if (!this.images) {
      return;
    }
    let confirmed = await showConfirmDialog(this, 'Are you sure you want to delete this image?', 'Delete');
    if (!confirmed) {
      return;
    }
    const newImages = this.images?.concat() || [];
    newImages.splice(index, 1);
    this._updateImages(newImages);
  }

  private _updateImages(images: ImageItem[]): void {
    // console.debug('Images updated:', images);
    fireEvent(this, 'images-changed', { images });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .image-preview {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 8px;
          padding: 4px;
        }
        .image-item {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          min-height: 100px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--divider-color);
          transition: border 0.3s ease;
        }
      `,
    ];
  }
}
