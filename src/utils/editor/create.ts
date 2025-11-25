import { mdiClose } from '@mdi/js';
import { html, nothing, TemplateResult } from 'lit';

import './vic-tab';
import './vic-tab-bar';
import { ifDefined } from 'lit/directives/if-defined.js';

import { HomeAssistant } from '../../ha/types';
import { ICON } from '../mdi-icons';

export interface ExpansionPanelParams {
  content: TemplateResult[] | TemplateResult;
  options: {
    expanded?: boolean;
    header: string;
    icon?: string;
    secondary?: string;
    outlined?: boolean;
    noCollapse?: boolean;
    leftChevron?: boolean;
    elId?: string;
  };
  slotIcons?: TemplateResult | TemplateResult[];
  expandedWillChange?: (ev) => void;
  expandedChangedCallback?: (ev?: any) => void;
}
export const ExpansionPanel = ({
  content,
  options,
  slotIcons,
  expandedWillChange,
  expandedChangedCallback,
}: ExpansionPanelParams): TemplateResult => {
  return html`
    <ha-expansion-panel
      id=${ifDefined(options?.elId)}
      .outlined=${options?.outlined || true}
      .expanded=${options?.expanded || false}
      .noCollapse=${options?.noCollapse || false}
      .header=${options.header}
      .secondary=${options?.secondary || ''}
      .leftChevron=${options?.leftChevron || false}
      @expanded-will-change=${expandedWillChange}
      @expanded-changed=${expandedChangedCallback}
      style="border-radius: 6px"
    >
      ${options.icon ? html`<ha-icon slot="leading-icon" .icon=${options.icon}></ha-icon>` : nothing}
      ${slotIcons ? slotIcons : nothing}
      <div class="card-config" style="margin-block: var(--vic-gutter-gap, 8px);">${content}</div>
    </ha-expansion-panel>
  `;
};

interface HaAlertOptions {
  message: string | TemplateResult;
  type?: 'info' | 'success' | 'warning' | 'error';
  dismissable?: boolean;
  options?: {
    title?: string;
    icon?: string;
    action?: {
      callback: () => void;
      label?: string;
      variant?: string;
    }[];
  };
}

export const HaAlert = ({ message, type, dismissable, options }: HaAlertOptions): TemplateResult => {
  const dismisHandler = (ev: CustomEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    // Remove the alert element from the DOM
    const alert = ev.target as HTMLElement;
    alert.remove();
  };

  return html`
    <ha-alert
      .alertType=${type || 'info'}
      .dismissable=${dismissable || true}
      @alert-dismissed-clicked=${dismisHandler}
      .title=${options?.title || ''}
      style="margin-block: 0.5rem;"
    >
      ${message}
      ${options?.action?.map(
        (action) =>
          html`
            <ha-button
              slot="action"
              size="small"
              appearance="outlined"
              variant=${action.variant ?? 'brand'}
              @click=${action.callback}
              >${action.label?.toLocaleUpperCase() || 'MORE'}
            </ha-button>
          `
      )}
    </ha-alert>
  `;
};

export const VicTab = ({
  activeTabIndex,
  onTabChange,
  tabs,
}: {
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  tabs: { content: TemplateResult; key: string; label: string; icon?: string }[];
}): TemplateResult => {
  return html`
    <vic-tab-bar>
      ${tabs.map(
        (tab, index) => html`
          <vic-tab .active=${index === activeTabIndex} .name=${tab.label} @click=${() => onTabChange(index)}>
            ${tab.icon ? html`<ha-icon .icon=${tab.icon}></ha-icon>` : ''}
          </vic-tab>
        `
      )}
    </vic-tab-bar>

    <div class="vic-tab-content">${tabs[activeTabIndex]?.content || html`<div>No content available</div>`}</div>
  `;
};

export const SectionPanel = (
  sections: {
    title: string;
    content: TemplateResult;
    expansion?: boolean;
    headerToggle?: string | TemplateResult;
  }[]
): TemplateResult => {
  return html`
    ${sections.map(({ title, content, expansion, headerToggle }) => {
      if (expansion) {
        return ExpansionPanel({
          content,
          options: {
            header: title,
            expanded: false,
          },
        });
      } else {
        return html`
          <div class="sub-panel-config button-card">
            <div class="sub-header">
              ${title !== '' ? title : nothing} ${headerToggle ? html`<div>${headerToggle}</div>` : nothing}
            </div>
            <div class="sub-panel">${content}</div>
          </div>
        `;
      }
    })}
  `;
};

export const HaButton = ({
  label,
  onClick,
  option,
}: {
  label: string;
  onClick: (ev?: Event) => void;
  option?: any;
}): TemplateResult => {
  if (option?.hidden) {
    return html``;
  }
  if (option?.type === 'add') {
    option = { ...option, appearance: 'accent', variant: 'success' };
  }
  const style = option?.style || '';
  return html`
    <ha-button
      size=${option?.size || 'small'}
      appearance=${option?.appearance || 'filled'}
      variant=${option?.variant || 'brand'}
      .disabled=${option?.disabled || false}
      @click=${onClick}
      style=${style}
    >
      ${option?.type === 'add' ? html`<ha-svg-icon slot="start" .path=${ICON.PLUS}></ha-svg-icon>` : ''} ${label}
    </ha-button>
  `;
};

export const createCloseHeading = (hass: HomeAssistant | undefined, title: string | TemplateResult) => html`
  <div class="header_title">
    <ha-icon-button
      .label=${hass?.localize('ui.common.close') ?? 'Close'}
      .path=${mdiClose}
      dialogAction="close"
      class="header_button"
    ></ha-icon-button>
    <span>${title}</span>
  </div>
`;
