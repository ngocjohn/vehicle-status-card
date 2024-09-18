import { TemplateResult, html } from 'lit';

import { HomeAssistantExtended as HomeAssistant } from '../types';

interface PickerOptions {
  component: any;
  value: string | number | boolean;
  configType: string;
  configIndex: number | string;
  itemIndex?: number;
  label?: string;
  configValue?: string;
  cardIndex?: number;
  items?: { value: string | boolean; label: string }[]; // Only for AttributePicker
  options?: {
    [key: string]: any;
  };
  pickerType:
    | 'icon'
    | 'entity'
    | 'attribute'
    | 'template'
    | 'textfield'
    | 'number'
    | 'boolean'
    | 'selectorBoolean'
    | 'theme';
}

export const Picker = ({
  component, // The component instance
  value, // Value to be passed to the picker
  configType, // Configuration type
  configValue, // Configuration value
  configIndex, // Item index in config
  itemIndex, // Item index in config
  cardIndex, // Card index in config
  label, // Picker label
  items, // Items for the attribute picker
  options, // Options for template editor
  pickerType, // Picker type
}: PickerOptions): TemplateResult => {
  const hass = component.hass ?? (component._hass as HomeAssistant);

  const handleValueChange = (ev: any) => component._valueChanged(ev);

  const pickers = {
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
        @value-changed=${handleValueChange}
      ></ha-combo-box>
    `,
    template: html`
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
            { value: true, label: 'True' },
            { value: false, label: 'False' },
          ],
        }}"
        @value-changed=${handleValueChange}
        .required=${false}
      ></ha-selector>
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
        @closed="$(ev:"
        Event)=""
      >
        ev.stopPropagation()} ></ha-theme-picker
      >
    `,
  };

  return pickers[pickerType];
};

export const TabBar = ({
  tabs,
  activeTabIndex,
  onTabChange,
}: {
  tabs: { key: string; label: string; content: TemplateResult; icon?: string; stacked?: boolean }[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
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
