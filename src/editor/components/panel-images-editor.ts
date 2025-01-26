import { debounce } from 'es-toolkit';
import { LitElement, html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import Sortable from 'sortablejs';

import './sub-panel-yaml';
import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import { VehicleStatusCardConfig, ImageConfig, HomeAssistant, fireEvent } from '../../types';
import { TabBar, Picker } from '../../utils/create';
import { uploadImage } from '../../utils/ha-helper';
import { IMAGE_CONFIG_ACTIONS, CONFIG_VALUES, IMAGE_ACTIONS } from '../editor-const';

@customElement('panel-images-editor')
export class PanelImagesEditor extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ type: Object }) public editor?: any;
  @property({ type: Object }) public config!: VehicleStatusCardConfig;
  @property({ type: Array }) _images: ImageConfig[] = [];
  @property({ type: Boolean }) isDragging = false;

  @state() _yamlEditorActive = false;
  @state() _newImage: string = '';
  @state() _sortable: Sortable | null = null;
  @state() _reindexImages: boolean = false;
  @state() private _activeTabIndex: number = 0;
  @state() _newItemName: Map<string, string> = new Map();
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

        .drop-area[dragging] {
          background-color: rgba(var(--rgb-primary-text-color), 0.05);
        }

        input[type='file'] {
          display: none;
        }

        .new-image-url {
          display: inline-flex;
          align-items: center;
          gap: 8px;
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
    if (_changedProperties.has('config') && this.config.images && this.config.images.length > 0) {
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
      return html`<div class="card-config">Loading...</div>`;
    }
    const imagesList = this._renderImageList();
    const layoutConfig = this._renderImageLayoutConfig();
    const imageEntity = this._renderImageEntity();

    const tabsconfig = [
      { key: 'image_list', label: 'Images', content: imagesList },
      { key: 'image_entity', label: 'Image Entities', content: imageEntity },
      { key: 'layout_config', label: 'Slide config', content: layoutConfig },
    ];

    return html`
      <div class="card-config">
        ${TabBar({ tabs: tabsconfig, activeTabIndex: this._activeTabIndex, onTabChange: this._handleTabChange })}
      </div>
    `;
  }

  private _renderImageEntity(): TemplateResult {
    const imageEntities = this.config?.image_entities || [];
    const emptyEntityPicker = html`<div class="item-config-row">
      <div class="item-content">
        <ha-entity-picker
          .hass=${this._hass}
          .value=${this._newItemName.get('entity')}
          .label=${'Image Entity'}
          .configType=${'image_entities'}
          @value-changed=${this._handleNewImageEntity}
          .allowCustomEntity=${false}
          .includeDomains=${'image'}
        ></ha-entity-picker>
      </div>
    </div>`;
    return html` <div class="sub-panel-config button-card">
      <div class="sub-header">
        <div>Image Entities Configuration</div>
      </div>
      <div class="default-card-list">
        ${repeat(
          imageEntities,
          (entity) => entity,
          (entity, idx) => html`
            <div class="item-config-row">
              <div class="item-content">
                <ha-entity-picker
                  .hass=${this._hass}
                  .value=${entity}
                  .label=${'Image Entity'}
                  .configType=${'image_entities'}
                  .configIndex=${idx}
                  @value-changed=${this._handleImageEntityChange}
                  .allowCustomEntity=${false}
                  .includeDomains=${'image'}
                ></ha-entity-picker>
              </div>
              <div class="item-actions">
                <ha-icon-button
                  class="action-icon"
                  .path=${ICON.DELETE}
                  @click=${this._deleteImageEntity(idx)}
                ></ha-icon-button>
              </div>
            </div>
          `
        )}
        ${emptyEntityPicker}
      </div>
    </div>`;
  }

  private _handleNewImageEntity(ev: any): void {
    ev.stopPropagation();
    const value = ev.target.value;
    const newEntity = new Map(this._newItemName);
    newEntity.set('entity', value);

    this._newItemName = newEntity;

    this.requestUpdate();
    this._handleAddNewImageEntity();
  }

  private _handleAddNewImageEntity(): void {
    const resetNewEntity = () => {
      this._newItemName.clear();
    };

    this.updateComplete.then(() => {
      const newEntity = this._newItemName.get('entity');
      if (!newEntity) return;

      const imageEntities = [...(this.config.image_entities || [])];
      imageEntities.push(newEntity);
      this.config = { ...this.config, image_entities: imageEntities };
      this._debouncedConfigChanged();
      resetNewEntity();
    });
  }

  private _handleImageEntityChange(ev: any): void {
    const entity = ev.target.value;
    const idx = ev.target.configIndex;
    if (idx === undefined) return;
    if (!entity || entity === '') {
      this._deleteImageEntity(idx)();
      return;
    }
    const imageEntities = [...(this.config.image_entities || [])];
    imageEntities[idx] = entity;
    this.config = { ...this.config, image_entities: imageEntities };
    this._debouncedConfigChanged();
  }

  private _deleteImageEntity(idx: number): () => void {
    return () => {
      if (idx === undefined) return;
      const imageEntities = [...(this.config.image_entities || [])];
      imageEntities.splice(idx, 1);
      this.config = { ...this.config, image_entities: imageEntities };
      this._debouncedConfigChanged();
    };
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
    const yamlEditor = this._renderYamlEditor();
    const actionMap = [
      { title: 'Show Image', icon: 'mdi:eye', action: IMAGE_ACTIONS.SHOW_IMAGE },
      { title: 'Delete Image', icon: 'mdi:delete', action: IMAGE_ACTIONS.DELETE },
    ];
    const images = this.config?.images || [];
    const imageList =
      this._reindexImages || !images.length
        ? html`<div></div>`
        : html` <div class="images-list" id="images-list">
            ${repeat(
              images,
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
                  <div class="item-actions">
                    <ha-button-menu
                      .corner=${'BOTTOM_START'}
                      .fixed=${true}
                      .menuCorner=${'START'}
                      .activatable=${true}
                      .naturalMenuWidth=${true}
                      @closed=${(ev: Event) => ev.stopPropagation()}
                    >
                      <ha-icon-button class="action-icon" slot="trigger" .path=${ICON.DOTS_VERTICAL}></ha-icon-button>
                      ${actionMap.map(
                        (action) => html`
                          <mwc-list-item @click=${this.toggleAction(action.action, idx)} .graphic=${'icon'}>
                            <ha-icon slot="graphic" .icon=${action.icon}></ha-icon>
                            ${action.title}
                          </mwc-list-item>
                        `
                      )}
                    </ha-button-menu>
                  </div>
                </div>
              `
            )}
          </div>`;

    const actionFooter = html`<div class="action-footer">
      <ha-button id="upload-btn" @click=${this.toggleAction('upload')}>Add Image</ha-button>
      <ha-button id="yaml-btn" @click=${this.toggleAction('yaml-editor')} class=${!images.length ? 'hidden' : ''}
        >Edit YAML</ha-button
      >
    </div> `;
    return html` ${infoText} ${dropArea} ${imageList} ${yamlEditor} ${actionFooter} `;
  }

  private _renderYamlEditor(): TemplateResult {
    return html`
      <div id="yaml-editor" style="display: none;">
        <vsc-sub-panel-yaml
          .hass=${this._hass}
          .config=${this.config}
          .configDefault=${this.config.images}
          @yaml-config-changed=${this._yamlChanged}
        ></vsc-sub-panel-yaml>
      </div>
    `;
  }

  private _yamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value } = ev.detail;
    if (!isValid || !this.config) return;
    this.config = { ...this.config, images: value };
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _renderDropArea(): TemplateResult {
    return html`
      <div id="drop-area" style="display: none;">
        <div
          class="drop-area" ?dragging=${this.isDragging}
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
        <ha-alert id="image-alert" class="hidden" alert-type="success">New image added successfully!</ha-alert>
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
        value: image.loop || false,
        configValue: 'loop',
        label: 'Loop',
        pickerType: 'selectorBoolean' as 'selectorBoolean',
      },
    ];

    return html` <div class="sub-panel-config button-card">
      <div class="sub-header">
        <div>Slide layout configuration</div>
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
      <div class=${wrapperClass}>
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

      const showDropArea = () => {
        const dropArea = this.shadowRoot?.getElementById('drop-area') as HTMLElement;
        const imageList = this.shadowRoot?.getElementById('images-list') as HTMLElement;
        const addImageBtn = this.shadowRoot?.getElementById('upload-btn') as HTMLElement;
        const isHidden = dropArea?.style.display === 'none';
        if (isHidden) {
          dropArea.style.display = 'block';
          if (imageList) {
            imageList.style.display = 'none';
          }
          addImageBtn.innerHTML = 'Cancel';
        } else {
          dropArea.style.display = 'none';
          if (imageList) {
            imageList.style.display = 'block';
          }
          addImageBtn.innerHTML = 'Add Image';
          this.initSortable();
        }
      };

      const showYamlEditor = () => {
        const yamlEditor = this.shadowRoot?.getElementById('yaml-editor') as HTMLElement;
        const imageList = this.shadowRoot?.getElementById('images-list') as HTMLElement;
        const addImageBtn = this.shadowRoot?.getElementById('upload-btn') as HTMLElement;
        const yamlBtn = this.shadowRoot?.getElementById('yaml-btn') as HTMLElement;
        const yamlEditorActive = yamlEditor?.style.display === 'block';
        if (!yamlEditorActive) {
          yamlEditor.style.display = 'block';
          imageList.style.display = 'none';
          addImageBtn.style.display = 'none';
          yamlBtn.innerHTML = 'Close YAML Editor';
        } else {
          yamlEditor.style.display = 'none';
          imageList.style.display = 'block';
          addImageBtn.style.display = 'block';
          yamlBtn.innerHTML = 'Edit YAML';
        }
      };

      const handleImageAction = () => {
        switch (action) {
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
            const imageAlert = this.shadowRoot?.getElementById('image-alert') as HTMLElement;
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
          case 'yaml-editor':
            showYamlEditor();
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
