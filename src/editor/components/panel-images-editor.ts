import { LitElement, html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat.js';

import { VehicleStatusCardConfig, ImageConfig, HomeAssistantExtended as HomeAssistant } from '../../types';
import { uploadImage } from '../../utils/ha-helper';

import editorcss from '../../css/editor.css';

import { fireEvent } from 'custom-card-helpers';
import { debounce } from 'es-toolkit';
import { TabBar } from '../../utils/create';

import { Picker } from '../../utils/create';

import { IMAGE_CONFIG_ACTIONS, CONFIG_VALUES } from '../editor-const';

import Sortable from 'sortablejs';

@customElement('panel-images-editor')
export class PanelImagesEditor extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ type: Object }) public editor?: any;
  @property({ type: Object }) public config!: VehicleStatusCardConfig;
  @property({ type: Array }) _images!: ImageConfig[];
  @property({ type: Boolean }) isDragging = false;

  @state() _newImage: string = '';
  @state() _sortable: Sortable | null = null;
  @state() _reindexImages: boolean = false;
  @state() private _activeTabIndex: number = 0;
  private _helpDismissed = false;
  private _debouncedConfigChanged = debounce(this.configChanged.bind(this), 300);

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  constructor() {
    super();
    this._handleTabChange = this._handleTabChange.bind(this);
  }

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
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (_changedProperties.has('config')) {
      this._images = this.config.images;
      return true;
    }
    if (_changedProperties.has('_activeTabIndex') && this._activeTabIndex === 0) {
      this.initSortable();
    }

    return true;
  }

  public initSortable() {
    this.updateComplete.then(() => {
      const imagesList = this.shadowRoot?.getElementById('images-list');
      if (imagesList) {
        console.log(imagesList);
        this._sortable = new Sortable(imagesList, {
          animation: 150,
          handle: '.handle',
          ghostClass: 'sortable-ghost',
          onEnd: (evt: Event) => {
            this._handleSort(evt);
          },
        });
        console.log('Sortable initialized');
      }
    });
  }

  protected render(): TemplateResult {
    if (!this.config || !this._hass) {
      return html`<div class="config-wrapper">Loading...</div>`;
    }
    const imagesList = this._renderImageList();
    const layoutConfig = this._renderImageLayoutConfig();

    const tabsconfig = [
      { key: 'image_list', label: 'Images', content: imagesList },
      { key: 'layout_config', label: 'Slide config', content: layoutConfig },
    ];

    return html`
      <div class="card-config">
        ${TabBar({ tabs: tabsconfig, activeTabIndex: this._activeTabIndex, onTabChange: this._handleTabChange })}
      </div>
    `;
  }

  private _renderImageList(): TemplateResult {
    const infoText = !this._helpDismissed
      ? html` <ha-alert
          alert-type="info"
          dismissable
          @alert-dismissed-clicked=${(ev: CustomEvent) => this._handlerAlert(ev)}
        >
          To change order of images, use ${html`<ha-icon icon="mdi:drag"></ha-icon>`} drag and drop the image row. To
          delete an image, click on the delete button and select the image to delete.
        </ha-alert>`
      : html``;
    const dropArea = this._renderDropArea();

    const imageList = this._reindexImages
      ? html`<div>Please wait...</div>`
      : html` <div class="images-list" id="images-list">
          ${repeat(
            this._images || [],
            (image) => image.url,
            (image, idx) => html`
              <div class="item-config-row" data-url="${image.url}">
                <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
                <div class="item-content">
                  <ha-textfield
                    .label=${`Image #${idx + 1}`}
                    .value=${image.title}
                    .configType=${'images'}
                    .configIndex=${idx}
                    .configValue=${'url'}
                    @input=${(ev: any) => this._imageInputChanged(ev, idx)}
                  ></ha-textfield>
                </div>
                <div class="item-actions hidden">
                  <div class="action-icon" @click="${this.toggleAction('delete', idx)}">
                    <ha-icon icon="mdi:close"></ha-icon>
                  </div>
                </div>
                <div class="item-actions">
                  <div class="action-icon" @click="${this.toggleAction('show-image', idx)}">
                    <ha-icon icon="mdi:eye"></ha-icon>
                  </div>
                </div>
              </div>
            `
          )}
        </div>`;

    const actionFooter = html`<div class="action-footer">
      <ha-button class="upload-btn" @click=${this.toggleAction('upload')}>Add Image</ha-button>

      ${this.config?.images.length !== 0
        ? html`<ha-button class="showdelete delete-btn" @click=${this.toggleAction('showDelete')}
            >Delete Image</ha-button
          >`
        : ''}
    </div> `;
    return html` ${infoText} ${dropArea} ${imageList} ${actionFooter} `;
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
        <ha-alert class="image-alert hidden" alert-type="success">New image added successfully!</ha-alert>
      </div>
    `;
  }

  private _renderImageLayoutConfig(): TemplateResult {
    const layoutConfig = this.config?.layout_config || {};
    const image = layoutConfig?.images_swipe || {};

    const sharedConfig = {
      component: this,
      configType: 'layout_config',
      configIndex: 'images_swipe',
    };

    const swiperConfig = [
      {
        value: image.max_height || 150,
        configValue: 'max_height',
        label: 'Max Height (px)',
        options: { selector: { number: { min: 100, max: 500, mode: 'slider', step: 1 } } },
        pickerType: 'number' as 'number',
      },
      {
        value: image.max_width || 450,
        configValue: 'max_width',
        label: 'Max Width (px)',
        options: { selector: { number: { min: 100, max: 500, mode: 'slider', step: 1 } } },
        pickerType: 'number' as 'number',
      },

      {
        value: image.delay || 3000,
        configValue: 'delay',
        label: 'Delay (ms)',
        options: { selector: { number: { min: 500, max: 10000, mode: 'slider', step: 50 } } },
        pickerType: 'number' as 'number',
      },
      {
        value: image.speed || 500,
        configValue: 'speed',
        label: 'Speed (ms)',
        options: { selector: { number: { min: 100, max: 5000, mode: 'slider', step: 50 } } },
        pickerType: 'number' as 'number',
      },
      {
        value: image.effect || 'slide',
        configValue: 'effect',
        label: 'Effect',
        items: [
          {
            value: 'slide',
            label: 'Slide',
          },
          {
            value: 'fade',
            label: 'Fade',
          },
          {
            value: 'coverflow',
            label: 'Coverflow',
          },
        ],
        pickerType: 'attribute' as 'attribute',
      },
    ];
    const swiperBooleanConfig = [
      {
        value: image.autoplay || false,
        configValue: 'autoplay',
        label: 'Autoplay',
        pickerType: 'selectorBoolean' as 'selectorBoolean',
      },
      {
        value: image.loop || true,
        configValue: 'loop',
        label: 'Loop',
        pickerType: 'selectorBoolean' as 'selectorBoolean',
      },
    ];

    return html` <div class="sub-panel-config button-card">
      <div class="sub-header">
        <div class="sub-header-title">Slide layout configuration</div>
      </div>
      <div class="sub-panel">
        <div>${swiperConfig.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }))}</div>
      </div>
      <div class="sub-content">
        ${swiperBooleanConfig.map((config) => this.generateItemPicker({ ...config, ...sharedConfig }), 'sub-content')}
      </div>
    </div>`;
  }

  private generateItemPicker(config: any, wrapperClass = 'item-content'): TemplateResult {
    return html`
      <div class="${wrapperClass}">
        ${Picker({
          ...config,
        })}
      </div>
    `;
  }

  private _imageInputChanged(ev: any, idx: number): void {
    ev.stopPropagation();
    const input = ev.target as HTMLInputElement;
    const url = input.value;

    if (!url || !this.config?.images) return;

    if (idx !== undefined) {
      const imagesList = [...this.config.images];
      imagesList[idx] = { url, title: url };
      this.config = { ...this.config, images: imagesList };
      this._debouncedConfigChanged();
    }
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

  private toggleAction(action: IMAGE_CONFIG_ACTIONS, idx?: number): () => void {
    return () => {
      const updateChanged = (update: any) => {
        this.config = {
          ...this.config,
          images: update,
        };
        this._debouncedConfigChanged();
      };

      const toggleDeleteIcons = () => {
        const items = this.shadowRoot?.querySelectorAll('.item-actions');
        const isHidden = items?.[0].classList.contains('hidden');

        const deleteBtn = this.shadowRoot?.querySelector('.showdelete');
        if (deleteBtn) {
          deleteBtn.innerHTML = isHidden ? 'Cancel' : 'Delete';
          items?.forEach((item) => item.classList.toggle('hidden'));
        }
      };

      const showDropArea = () => {
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
      };

      const handleImageAction = () => {
        switch (action) {
          case 'showDelete':
            toggleDeleteIcons();
            break;

          case 'delete':
            if (idx !== undefined) {
              const imagesList = [...(this.config?.images || [])];
              imagesList.splice(idx, 1);
              updateChanged(imagesList);
              this._validateAndReindexImages();
            }
            break;

          case 'upload':
            showDropArea();
            break;

          case 'add-new-url':
            if (!this._newImage) return;
            const imageAlert = this.shadowRoot?.querySelector('.image-alert') as HTMLElement;
            const imagesList = [...(this.config?.images || [])];
            imagesList.push({ url: this._newImage, title: this._newImage });
            updateChanged(imagesList);
            this._newImage = '';
            if (imageAlert) {
              imageAlert.classList.remove('hidden');
              setTimeout(() => {
                imageAlert.classList.add('hidden');
              }, 3000);
            }
            break;
          case 'show-image':
            this.editor?._dispatchEvent('show-image', { index: idx });
            break;
        }
      };
      handleImageAction();
    };
  }

  private _handleTabChange(index: number): void {
    this._activeTabIndex = index;
    this.requestUpdate();
  }

  private _handlerAlert(ev: CustomEvent): void {
    const alert = ev.target as HTMLElement;
    alert.style.display = 'none';
    this._helpDismissed = true;
  }

  private _handleSort(evt: any) {
    evt.preventDefault();
    const oldIndex = evt.oldIndex;
    const newIndex = evt.newIndex;

    if (oldIndex !== newIndex) {
      this._reorderImages(oldIndex, newIndex);
    }
  }

  private _reorderImages(oldIndex: number, newIndex: number) {
    const imagesList = this._images.concat();
    const movedItem = imagesList.splice(oldIndex, 1)[0];
    imagesList.splice(newIndex, 0, movedItem);
    this.config = { ...this.config, images: imagesList };
    this._debouncedConfigChanged();
  }

  private configChanged(): void {
    fireEvent(this, 'config-changed', { config: this.config });
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
        const imageAlert = this.shadowRoot?.querySelector('.image-alert') as HTMLElement;
        if (imageAlert) {
          imageAlert.classList.remove('hidden');
          setTimeout(() => {
            imageAlert.classList.add('hidden');
          }, 3000);
        }

        fireEvent(this, 'config-changed', { config: { ...this.config, images: imagesList } });
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  }

  private _validateAndReindexImages(): void {
    setTimeout(() => {
      const imageListId = this.shadowRoot?.getElementById('images-list') as HTMLElement;
      const imagesList = imageListId.querySelectorAll('.item-config-row').length || 0;

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

  _valueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this.config) return;

    const target = ev.target;
    const configType = target.configType;
    const configIndex = target.configIndex;
    const configValue = target.configValue;

    let newValue: any = target.value;

    if (CONFIG_VALUES.includes(configValue)) {
      newValue = ev.detail.value;
    } else {
      newValue = target.value;
    }
    console.log('Value changed:', configType, configIndex, configValue, newValue);
    const updates: Partial<VehicleStatusCardConfig> = {};

    if (configType === 'layout_config') {
      const layoutConfig = { ...(this.config.layout_config || {}) };
      const imagesSwipe = { ...(layoutConfig.images_swipe || {}) };
      imagesSwipe[configValue] = newValue;
      layoutConfig.images_swipe = imagesSwipe;
      updates.layout_config = layoutConfig;
    }

    this.config = { ...this.config, ...updates };
    this._debouncedConfigChanged();
  }
}
