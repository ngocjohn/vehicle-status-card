import { html, TemplateResult } from 'lit';

import '../editor/components/vic-tab';
import '../editor/components/vic-tab-bar';

export const ExpansionPanel = ({
  content,
  options,
}: {
  content: TemplateResult[] | TemplateResult;
  options: {
    expanded?: boolean;
    header: string;
    icon?: string;
    secondary?: string;
    outlined?: boolean;
    noCollapse?: boolean;
  };
}): TemplateResult => {
  return html`
    <ha-expansion-panel
      .outlined=${options?.outlined || true}
      .expanded=${options?.expanded || false}
      .noCollapse=${options?.noCollapse || false}
      .header=${options.header}
      .secondary=${options?.secondary || ''}
      .leftChevron=${false}
      style="border-radius: 6px;  --ha-card-border-radius: 6px;"
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
  options?: {
    title?: string;
    icon?: string;
    action?: {
      callback: () => void;
      label?: string;
    }[];
  };
}): TemplateResult => {
  const dismisHandler = (ev: CustomEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    // Remove the alert element from the DOM
    const alert = ev.target as HTMLElement;
    alert.remove();
  };

  return html`
    <ha-alert
      alert-type=${type || 'info'}
      ?dismissable=${dismissable || true}
      @alert-dismissed-clicked=${dismisHandler}
      title=${options?.title}
      style="margin-block: 0.5rem;"
    >
      ${message}
      ${options?.action?.map(
        (action) =>
          html` <mwc-button slot="action" @click=${action.callback} label=${action.label || 'More'}> </mwc-button>`
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
