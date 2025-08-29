import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { HassEntity } from 'home-assistant-js-websocket';
import { html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import memoizeOne from 'memoize-one';

import { HomeAssistant } from '../ha';
import { computeCssColor } from '../ha/common/color/compute-color';
import { computeDomain } from '../ha/common/entity/compute_domain';
import { computeStateDomain } from '../ha/common/entity/compute_state_domain';
import { stateActive } from '../ha/common/entity/state_active';
import { stateColorCss } from '../ha/common/entity/state_color';
import { isGroupEntity } from '../ha/data/group';
import { RenderTemplateResult, hasTemplate, subscribeRenderTemplate } from '../ha/data/ws-templates';
import { hasItemAction } from '../types/config/actions-config';
import {
  IndicatorRowItem,
  IndicatorEntityConfig,
  IndicatorRowGroupConfig,
  IndicatorBaseItemConfig,
} from '../types/config/card/row-indicators';
import '../components/shared/vsc-state-display';
import { toCommon, isEntity } from '../types/config/card/row-indicators';
import { rgb2hex, rgb2hsv, hsv2rgb } from '../utils/colors';
import { BaseElement } from './base-element';

const cameraUrlWithWidthHeight = (base_url: string, width: number, height: number) =>
  `${base_url}&width=${width}&height=${height}`;

const TEMPLATE_KEYS = ['state_template', 'visibility'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const DEFAULT_SHOW_CONFIG = {
  show_name: false,
  show_state: true,
  show_icon: true,
  show_entity_picture: false,
  include_state_template: false,
};

export class VscIndicatorItemBase<T extends IndicatorRowItem> extends BaseElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) protected _config!: T;

  @state() protected _singleTemplateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() protected _unsubSingleRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private async _tryConnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (this._unsubSingleRenderTemplates.get(key) !== undefined || !this.hass || !hasTemplate(this._config[key])) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._singleTemplateResults = { ...this._singleTemplateResults, [key]: result };
        },
        {
          template: this._config[key] ?? '',
          variables: {
            user: this.hass.user!.name,
            config: this._config,
          },
          strict: true,
        }
      );
      this._unsubSingleRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
      const result = {
        result: this._config[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._singleTemplateResults = { ...this._singleTemplateResults, [key]: result };
      this._unsubSingleRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubSingleRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubSingleRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  protected get type(): T['type'] {
    return this._config.type;
  }

  protected get _stateObj(): HassEntity | undefined {
    const config = toCommon(this._config);
    if (!config || !this.hass || !config.entity) {
      return undefined;
    }
    const entityId = config.entity;
    return this.hass.states[entityId];
  }

  protected get _groupItems(): (IndicatorEntityConfig | IndicatorBaseItemConfig)[] {
    const groupConfig = this._config as IndicatorRowGroupConfig;
    return groupConfig.items || [];
  }

  protected get _showConfig() {
    const { show_name, show_icon, show_state, show_entity_picture, include_state_template } = this._config;
    return {
      show_name,
      show_icon,
      show_state,
      show_entity_picture,
      include_state_template,
    };
  }

  protected get _isGroupEntity(): boolean {
    const config = this._config as IndicatorRowGroupConfig;
    const entity = config?.entity;
    if (!entity) return false;
    const stateObj = this.hass.states[entity];
    if (!stateObj) return false;
    return isGroupEntity(stateObj);
  }

  protected get _hasAction(): boolean {
    if (!isEntity(this._config)) {
      return true; // For groups, we assume they have actions
    }
    return hasItemAction(this._itemActionsConfig);
  }

  protected get _itemActionsConfig(): Pick<
    IndicatorEntityConfig,
    'entity' | 'tap_action' | 'hold_action' | 'double_tap_action'
  > {
    const config = this._config as IndicatorEntityConfig;
    return {
      entity: config.entity,
      tap_action: config.tap_action,
      hold_action: config.hold_action,
      double_tap_action: config.double_tap_action,
    };
  }

  protected _getTemplateResult(key: TemplateKey): string | undefined {
    return this._singleTemplateResults?.[key]?.result;
  }

  protected _getImageUrl(stateObj: HassEntity): string | undefined {
    const entityPicture = stateObj.attributes.entity_picture_local || stateObj.attributes.entity_picture;

    if (!entityPicture) return undefined;

    let imageUrl = this.hass!.hassUrl(entityPicture);
    if (computeStateDomain(stateObj) === 'camera') {
      imageUrl = cameraUrlWithWidthHeight(imageUrl, 32, 32);
    }

    return imageUrl;
  }

  protected _computeStateColor = memoizeOne((stateObj: HassEntity, color?: string) => {
    // Use custom color if active
    if (color) {
      return stateActive(stateObj) ? computeCssColor(color) : undefined;
    }

    // Use light color if the light support rgb
    if (computeDomain(stateObj.entity_id) === 'light' && stateObj.attributes.rgb_color) {
      const hsvColor = rgb2hsv(stateObj.attributes.rgb_color);

      // Modify the real rgb color for better contrast
      if (hsvColor[1] < 0.4) {
        // Special case for very light color (e.g: white)
        if (hsvColor[1] < 0.1) {
          hsvColor[2] = 225;
        } else {
          hsvColor[1] = 0.4;
        }
      }
      return rgb2hex(hsv2rgb(hsvColor));
    }

    // Fallback to state color
    return stateColorCss(stateObj);
  });

  protected _renderIcon(stateObj: HassEntity, icon?: string): TemplateResult {
    return html`
      <ha-state-icon
        slot="icon"
        .hass=${this.hass}
        .stateObj=${stateObj}
        .icon=${icon || this._config.icon}
      ></ha-state-icon>
    `;
  }

  protected _renderStateDisplay(): TemplateResult {
    const stateObj = this._stateObj;
    if (!stateObj) {
      return html`<span class="error">State object not found</span>`;
    }

    const stateTemplate = this._getTemplateResult('state_template') ?? undefined;

    return html`
      <vsc-state-display
        .stateObj=${stateObj}
        .hass=${this.hass}
        .content=${this._config.state_content || ['state']}
        .name=${this._config.name}
        .template=${stateTemplate}
      ></vsc-state-display>
    `;
  }
}
