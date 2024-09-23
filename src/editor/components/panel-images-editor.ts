import { LitElement, html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat.js';

import { VehicleStatusCardConfig, ImageConfig } from '../../types';
import { uploadImage } from '../../utils/ha-helper';

import editorcss from '../../css/editor.css';

import { fireEvent } from 'custom-card-helpers';

import * as Create from '../../utils/create';

import Sortable from 'sortablejs';

@customElement('panel-images-editor')
export class PanelImagesEditor extends LitElement {
  @property({ type: Object }) public editor?: any;
  @property({ type: Object }) public config?: VehicleStatusCardConfig;
  @property({ type: Boolean }) isDragging = false;

  @state() _newImage: string = '';
  @state() _sortable: Sortable | null = null;
  @state() _reindexImages: boolean = false;

  static get styles(): CSSResultGroup {
    return [
      editorcss,
      css`
        .hidden {
          display: none;
        }
        #drop-area {
          margin-block: var(--vic-card-padding);
          border-block: 1px solid var(--divider-color);
        }

        .drop-area {
          border: 2px dashed var(--divider-color);
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: background-color 0.3s;
          margin-block: var(--vic-card-padding);
        }

        .drop-area.dragging {
          background-color: rgba(var(--rgb-primary-text-color), 0.05);
        }

        input[type='file'] {
          display: none;
        }

        .new-image-url {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-wrap: nowrap;
          width: 100%;
          justify-content: space-between;
        }

        .new-url-btn {
          display: none;
        }

        .new-url-btn.show {
          display: inline-block;
          color: var(--secondary-text-color);
          cursor: pointer;
        }

        .new-url-btn:hover {
          color: var(--primary-color);
        }
      `,
    ];
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this.initSortable();
  }

  private initSortable() {
    this.updateComplete.then(() => {
      const imagesList = this.shadowRoot?.getElementById('images-list') as HTMLElement;
      if (imagesList) {
        this._sortable = new Sortable(imagesList, {
          animation: 150,
          handle: '.handle',
          onEnd: (evt: Event) => this._handleSort(evt),
        });
      }
    });
  }

  protected render(): TemplateResult {
    if (this._reindexImages) {
      return html`<div>Please wait...</div>`;
    }

    const imagesList = this.config?.images || [];

    return html`
      ${this._renderDropArea()}
      <div class="images-list" id="images-list">
        ${repeat(
          imagesList,
          (image, idx) => html`
            <div class="item-config-row" data-index="${idx}">
              <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
              <div class="item-content">
                ${Create.Picker({
                  component: this,
                  label: `Image #${idx + 1}`,
                  value: image.title,
                  configType: 'images',
                  configIndex: idx,
                  configValue: 'url',
                  pickerType: 'textfield' as 'textfield',
                })}
              </div>
              <div class="item-actions hidden">
                <div class="action-icon" @click="${this.toggleAction('delete', idx)}">
                  <ha-icon icon="mdi:close"></ha-icon>
                </div>
              </div>
            </div>
          `
        )}
      </div>
      <div class="action-footer">
        <ha-button class="upload-btn" @click=${this.toggleAction('upload')}>Add Image</ha-button>

        ${this.config?.images.length !== 0
          ? html`<ha-button class="showdelete delete-btn" @click=${this.toggleAction('showDelete')}
              >Delete Image</ha-button
            >`
          : ''}
      </div>
    `;
  }

  private _renderDropArea(): TemplateResult {
    return html`
      <div id="drop-area" style="display: none;">
        <div
          class="drop-area ${this.isDragging ? 'dragging' : ''}"
          @dragover=${this._handleDragOver}
          @dragleave=${this._handleDragLeave}
          @drop=${this._handleDrop}
          @click=${() => this.shadowRoot?.getElementById('file-to-upload')?.click()}
        >
          <span>Drag & drop files here or click to select files</span>
          <p>Supports JPEG, PNG, or GIF image.</p>
            <input type="file" id="file-to-upload" multiple @change=${(ev: any) => this.handleFilePicked(ev)} />
          </p>
        </div>
        <div class="new-image-url">
          <ha-textfield
            style="width: 100%;"
            .label=${'Image URL'}
            .value=${this._newImage}
            @input=${this.toggleAddButton}
            ></ha-textfield>
          <div class="new-url-btn">
            <ha-icon icon="mdi:plus" @click=${this.toggleAction('add-new-url')}></ha-icon>
          </div>
        </div>
      </div>

    `;
  }

  private toggleAddButton(ev: Event): void {
    ev.stopPropagation();
    const target = ev.target as HTMLInputElement;
    const addButton = target.parentElement?.querySelector('.new-url-btn') as HTMLElement;
    if (!addButton) return;
    if (target.value && target.value.length > 0) {
      this._newImage = target.value;
      addButton.classList.add('show');
    } else {
      addButton.classList.remove('show');
    }
  }

  private _handleDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  private _handleDragLeave() {
    this.isDragging = false;
  }
  private _handleDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFilePicked({ target: { files } });
      console.log(event);
    }
  }

  private toggleAction(action: 'add' | 'showDelete' | 'delete' | 'upload' | 'add-new-url', idx?: number) {
    return () => {
      const updateChanged = (update: any) => {
        fireEvent(this, 'config-changed', { config: { ...this.config, images: update } });
      };

      const hideAllDeleteButtons = () => {
        const items = this.shadowRoot?.querySelectorAll('.item-actions');
        items?.forEach((item) => item.classList.add('hidden'));
      };

      if (action === 'add') {
        hideAllDeleteButtons();
        const imagesList = [...(this.config?.images || [])];
        imagesList.push({ url: '', title: '' });
        updateChanged(imagesList);
      }
      if (action === 'showDelete') {
        const items = this.shadowRoot?.querySelectorAll('.item-actions');
        const isHidden = items?.[0].classList.contains('hidden');

        const deleteBtn = this.shadowRoot?.querySelector('.showdelete');
        if (deleteBtn) {
          deleteBtn.innerHTML = isHidden ? 'Cancel' : 'Delete';
          items?.forEach((item) => item.classList.toggle('hidden'));
        }
      }

      if (action === 'delete' && idx !== undefined) {
        const imagesList = [...(this.config?.images || [])];
        imagesList.splice(idx, 1);
        updateChanged(imagesList);
        this._validateAndReindexImages();
      }

      if (action === 'upload') {
        const dropArea = this.shadowRoot?.getElementById('drop-area') as HTMLElement;
        const imageList = this.shadowRoot?.getElementById('images-list') as HTMLElement;
        const addImageBtn = this.shadowRoot?.querySelector('.upload-btn') as HTMLElement;
        const isHidden = dropArea?.style.display === 'none';
        if (isHidden) {
          dropArea.style.display = 'block';
          imageList.style.display = 'none';
          addImageBtn.innerHTML = 'Cancel';
        } else {
          dropArea.style.display = 'none';
          imageList.style.display = 'block';
          addImageBtn.innerHTML = 'Add Image';
        }
      }
      if (action === 'add-new-url') {
        if (!this._newImage) return;
        const imagesList = [...(this.config?.images || [])];
        imagesList.push({ url: this._newImage, title: this._newImage });
        updateChanged(imagesList);
        this._newImage = '';
        fireEvent(this, 'config-changed', { config: { ...this.config, images: imagesList } });
      }
    };
  }

  private _handleSort(evt: any) {
    evt.preventDefault();
    const oldIndex = evt.oldIndex;
    const newIndex = evt.newIndex;

    if (oldIndex === newIndex) {
      return;
    }

    const imagesList = [...(this.config?.images || [])];
    const [movedItem] = imagesList.splice(oldIndex, 1);
    imagesList.splice(newIndex, 0, movedItem);
    fireEvent(this, 'config-changed', { config: { ...this.config, images: imagesList } });
  }

  private async handleFilePicked(ev: any): Promise<void> {
    const input = ev.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      console.log('No files selected.');
      return;
    }

    const files = Array.from(input.files); // Convert FileList to Array for easier iteration
    console.log('Files:', files);
    for (const file of files) {
      try {
        const imageUrl = await uploadImage(this.editor._hass, file);
        console.log('Image URL:', imageUrl);
        if (!imageUrl) continue;

        const imageName = file.name.toUpperCase();
        const imagesList = [...(this.config?.images || [])];
        imagesList.push({ url: imageUrl, title: imageName });
        fireEvent(this, 'config-changed', { config: { ...this.config, images: imagesList } });
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  }

  private _validateAndReindexImages(): void {
    setTimeout(() => {
      const imagesList = this.shadowRoot?.querySelectorAll('.images-list .item-config-row').length || 0;
      let configImagesCount: number = 0;
      if (this.config?.images) {
        configImagesCount = this.config.images.length;
      }
      console.log(imagesList, configImagesCount);
      if (imagesList !== configImagesCount) {
        this._sortable?.destroy();
        this._reindexImages = true;
        this._resetItems();
      }
    }, 200);
  }

  private _resetItems(): void {
    setTimeout(() => {
      this._reindexImages = false;
      this.updateComplete.then(() => {
        this.initSortable();
      });
    }, 200);
  }

  _valueChanged(ev: any) {
    if (!this.config || !this.editor) {
      return;
    }
    const target = ev.target;
    const index = target.index;
    const configValue = target.configValue;
    let newValue: any = target.value;

    if (configValue === 'url') {
      newValue = this._newImage;
      newValue = newValue.trim().replace(/'/g, '');
    } else {
      newValue = newValue.trim().replace(/'/g, '');
    }
    console.log(
      'Index:',
      index,
      'Config Value:',
      configValue,
      'Old value:',
      target.value,
      'New value:',
      newValue,
      this._newImage
    );

    let imagesList = [...(this.config?.images || [])];
    imagesList[index] = { url: newValue, title: newValue } as ImageConfig;

    fireEvent(this, 'config-changed', { config: { ...this.config, images: imagesList } });
    this.requestUpdate();
  }
}
