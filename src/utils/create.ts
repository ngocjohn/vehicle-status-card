/* eslint-disable @typescript-eslint/no-explicit-any */
import { html, TemplateResult } from 'lit';

import { HA as HomeAssistant } from '../types';

interface PickerOptions {
  cardIndex?: number;
  component: any;
  configIndex: number | string;
  configType: string;
  configValue?: string;
  itemIndex?: number;
  items?: { label: string; value: boolean | string }[]; // Only for AttributePicker
  label?: string;
  options?: {
    [key: string]: any;
  };
  pickerType:
    | 'action'
    | 'attribute'
    | 'boolean'
    | 'entity'
    | 'icon'
    | 'number'
    | 'selectorBoolean'
    | 'template'
    | 'textfield'
    | 'theme'
    | 'new_template';
  value: boolean | number | string;
}

export const Picker = ({
  cardIndex, // Card index in config
  component, // The component instance
  configIndex, // Item index in config
  configType, // Configuration type
  configValue, // Configuration value
  itemIndex, // Item index in config
  items, // Items for the attribute picker
  label, // Picker label
  options, // Options for template editor
  pickerType, // Picker type
  value, // Value to be passed to the picker
}: PickerOptions): TemplateResult => {
  const hass = component.hass ?? (component._hass as HomeAssistant);

  const handleValueChange = (ev: any) => component._valueChanged(ev);

  const pickers = {
    action: html`
      <ha-combo-box
        .item-value-path=${'value'}
        .item-label-path=${'label'}
        .hass=${hass}
        .label=${label}
        .value=${value}
        .configValue=${configValue}
        .configType=${configType}
        .configIndex=${configIndex}
        @value-changed=${handleValueChange}
        .items=${options?.actions}
      ></ha-combo-box>
    `,
    attribute: html`
      <ha-combo-box
        .item-value-path=${'value'}
        .item-label-path=${'label'}
        .label=${label ?? 'Attribute'}
        .hass=${hass}
        .value=${value}
        .configValue=${configValue || 'attribute'}
        .configType=${configType}
        .configIndex=${configIndex}
        .index=${configIndex}
        .items=${items}
        .disabled=${options?.disabled}
        @value-changed=${handleValueChange}
      ></ha-combo-box>
    `,
    boolean: html`
      <ha-formfield label=${label}>
        <ha-switch
          .label=${label}
          .checked=${value as boolean}
          .configValue=${configValue}
          .configType=${configType}
          .configIndex=${configIndex}
          .cardIndex=${cardIndex}
          @change=${handleValueChange}
        ></ha-switch>
      </ha-formfield>
    `,
    entity: html`
      <ha-entity-picker
        id="entity-picker-form"
        .hass=${hass}
        .value=${value}
        .configValue=${configValue || 'entity'}
        .configType=${configType}
        .configIndex=${configIndex}
        .index=${configIndex}
        .itemIndex=${itemIndex}
        .cardIndex=${cardIndex}
        .label=${label ?? 'Entity'}
        @change=${handleValueChange}
        .allowCustomIcons=${true}
        .includeDomains=${options?.includeDomains}
      ></ha-entity-picker>
    `,
    icon: html`
      <ha-icon-picker
        .hass=${hass}
        .value=${value}
        .configValue=${'icon'}
        .configType=${configType}
        .configIndex=${configIndex}
        .index=${configIndex}
        .label=${label ?? 'Icon'}
        @value-changed=${handleValueChange}
      ></ha-icon-picker>
    `,
    number: html`
      <ha-selector
        .hass=${hass}
        .value=${value}
        .configValue=${configValue}
        .configType=${configType}
        .configIndex=${configIndex}
        .label=${label}
        .selector=${options?.selector}
        @value-changed=${handleValueChange}
        .required=${false}
      ></ha-selector>
    `,
    selectorBoolean: html`
      <ha-selector
        id="vic-boolean-selector"
        .hass=${hass}
        .value=${value}
        .configValue=${configValue}
        .configType=${configType}
        .configIndex=${configIndex}
        .cardIndex=${cardIndex}
        .label=${label}
        .selector="${options?.selector || {
          boolean: [
            { label: 'True', value: true },
            { label: 'False', value: false },
          ],
        }}"
        @value-changed=${handleValueChange}
        .required=${false}
      ></ha-selector>
    `,
    new_template: html`
      <div class="template-ui">
        <p>${options?.label}</p>
        <ha-code-editor
          .hass=${hass}
          .mode=${'jinja2'}
          .dir=${'ltr'}
          .value=${value}
          .configValue=${configValue}
          .configType=${configType}
          .configIndex=${configIndex}
          .index=${configIndex}
          @value-changed=${handleValueChange}
          .linewrap=${false}
          .autofocus=${true}
          .autocompleteEntities=${true}
          .autocompleteIcons=${true}
        ></ha-code-editor>
        <ha-input-helper-text>${options?.helperText}</ha-input-helper-text>
      </div>
    `,
    template: html`
      <ha-selector
        .hass=${hass}
        .value=${value}
        .configValue=${configValue}
        .configType=${configType}
        .configIndex=${configIndex}
        .label=${options?.label || 'template'}
        .helper=${options?.helperText}
        .selector=${{ template: {} }}
        .index=${configIndex}
        @value-changed=${handleValueChange}
        .required=${false}
      >
      </ha-selector>
    `,

    textfield: html`
      <ha-textfield
        class="form-text"
        .label=${label}
        .placeholder=${label}
        .configValue=${configValue}
        .value="${value}"
        .configType=${configType}
        @change=${handleValueChange}
        .configIndex=${configIndex}
        .cardIndex=${cardIndex}
        .index=${configIndex}
      ></ha-textfield>
    `,
    theme: html`
      <ha-theme-picker
        .hass=${hass}
        .value=${value}
        .configValue=${'theme'}
        .configType=${configType}
        .configIndex=${configIndex}
        .index=${configIndex}
        .includeDefault=${true}
        .required=${true}
        @selected=${handleValueChange}
        @closed="${(ev: Event) => ev.stopPropagation()}"
      >
      </ha-theme-picker>
    `,
  };

  return pickers[pickerType];
};

export const TabBar = ({
  activeTabIndex,
  onTabChange,
  tabs,
}: {
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  tabs: { content: TemplateResult; icon?: string; key: string; label: string; stacked?: boolean }[];
}): TemplateResult => {
  return html`
    <mwc-tab-bar class="vic-tabbar" @MDCTabBar:activated=${(e: Event) => onTabChange((e.target as any).activeIndex)}>
      ${tabs.map(
        (tab) => html`<mwc-tab label=${tab.label} icon=${tab.icon || ''} ?stacked=${tab.stacked || false}></mwc-tab>`
      )}
    </mwc-tab-bar>

    <div class="tab-content">${tabs[activeTabIndex]?.content || html`<div>No content available</div>`}</div>
  `;
};

export const ExpansionPanel = ({
  content,
  options,
}: {
  content: TemplateResult;
  options: { expanded?: boolean; header: string; icon?: string; secondary?: string };
}): TemplateResult => {
  return html`
    <ha-expansion-panel
      .outlined=${true}
      .expanded=${options?.expanded || false}
      .header=${options.header}
      .secondary=${options?.secondary || ''}
      .leftChevron=${true}
    >
      ${options.icon ? html`<div slot="icons"><ha-icon icon=${options.icon}></ha-icon></div>` : ''}
      <div class="card-config">${content}</div>
    </ha-expansion-panel>
  `;
};

export const HaAlert = ({
  message,
  type,
  dismissable,
  options,
}: {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  dismissable?: boolean;
  options?: { title?: string; icon?: string };
}): TemplateResult => {
  const dismisHandler = (ev: CustomEvent) => {
    const alert = ev.target as HTMLElement;
    alert.style.display = 'none';
  };

  return html`
    <ha-alert
      alert-type=${type || 'info'}
      ?dismissable=${dismissable || true}
      @alert-dismissed-clicked=${dismisHandler}
      title=${options?.title}
    >
      ${message}
    </ha-alert>
  `;
};
