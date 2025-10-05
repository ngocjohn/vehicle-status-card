import { pick } from 'es-toolkit/compat';
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { HassEntity } from 'home-assistant-js-websocket';
import { html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import memoizeOne from 'memoize-one';
import tinycolor from 'tinycolor2';

import { computeDomain, computeEntityName, computeStateDomain, computeStateName, isActive } from '../ha';
import { computeRgbColor } from '../ha/common/color/compute-color';
import '../components/shared/button/vsc-btn-state-info';
import '../components/shared/button/vsc-btn-shape-icon';
import { stateColorCss } from '../ha/common/entity/state_color';
import * as HA_STATE_COLOR from '../ha/common/entity/state_color';
import { RenderTemplateResult, hasTemplate, subscribeRenderTemplate } from '../ha/data/ws-templates';
import { hasAction, hasItemAction } from '../types/config';
import {
  BaseButtonCardItemConfig,
  BUTTON_CARD_TEMPLATE_KEYS,
  BUTTON_SHOW_CONFIG_KEYS,
  ButtonCardTemplateKey,
  ButtonShowConfig,
} from '../types/config/card/button-card';
import { BaseElement } from './base-element';
import { hsv2rgb, rgb2hex, rgb2hsv } from './colors';

const cameraUrlWithWidthHeight = (base_url: string, width: number, height: number) =>
  `${base_url}&width=${width}&height=${height}`;

export class BaseButton extends BaseElement {
  @property({ attribute: false }) protected _btnConfig!: BaseButtonCardItemConfig;

  @state() protected _templateResults: Partial<Record<ButtonCardTemplateKey, RenderTemplateResult | undefined>> = {};
  @state() protected _unsubRenderTemplates: Map<ButtonCardTemplateKey, Promise<UnsubscribeFunc>> = new Map();

  @property({ attribute: false }) _haStateColor = HA_STATE_COLOR;
  @property({ attribute: false }) _tinycolor = tinycolor;

  connectedCallback() {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private async _tryConnect(): Promise<void> {
    BUTTON_CARD_TEMPLATE_KEYS.forEach((key) => {
      this._subscribeTemplate(key);
    });
  }

  private async _subscribeTemplate(key: ButtonCardTemplateKey): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this._hass || !hasTemplate(this._btnConfig[key])) {
      return;
    }
    try {
      const sub = subscribeRenderTemplate(
        this._hass.connection,
        (result) => {
          this._templateResults = { ...this._templateResults, [key]: result };
        },
        {
          template: this._btnConfig[key] ?? '',
          variables: {
            user: this._hass.user!.name,
            config: this._btnConfig,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
      const result = {
        result: this._btnConfig[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = { ...this._templateResults, [key]: result };
      this._unsubRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    BUTTON_CARD_TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: ButtonCardTemplateKey): Promise<void> {
    const unsubPromise = this._unsubRenderTemplates.get(key);
    if (unsubPromise === undefined) {
      return;
    }
    try {
      const unsub = await unsubPromise;
      unsub();
    } catch (e: any) {
      if (e.code === 'not_connected' || e.code === 'template_error') {
        // Ignore these errors
      } else {
        throw e;
      }
    } finally {
      this._unsubRenderTemplates.delete(key);
    }
  }

  protected get _stateObj(): HassEntity | undefined {
    if (!this._btnConfig.entity || !this._hass) {
      return undefined;
    }
    const eId = this._btnConfig.entity;
    return this._hass.states[eId] as HassEntity | undefined;
  }

  protected get _btnShowConfig(): ButtonShowConfig {
    return pick(this._btnConfig, [...BUTTON_SHOW_CONFIG_KEYS]);
  }

  protected get _btnActionConfig(): Pick<
    BaseButtonCardItemConfig,
    'entity' | 'tap_action' | 'hold_action' | 'double_tap_action'
  > {
    const config = this._btnConfig;
    return {
      entity: config.entity,
      tap_action: config.tap_action,
      hold_action: config.hold_action,
      double_tap_action: config.double_tap_action,
    };
  }

  protected get _hasAction(): boolean {
    if (this._btnConfig?.button_type === 'default') {
      return true;
    }
    return hasItemAction(this._btnActionConfig);
  }

  protected get _hasIconAction(): boolean {
    return (
      hasAction(this._btnConfig?.icon_tap_action) ||
      hasAction(this._btnConfig?.icon_hold_action) ||
      hasAction(this._btnConfig?.icon_double_tap_action)
    );
  }

  protected get _iconActions() {
    return {
      entity: this._btnConfig?.entity,
      tap_action: this._btnConfig?.icon_tap_action,
      hold_action: this._btnConfig?.icon_hold_action,
      double_tap_action: this._btnConfig?.icon_double_tap_action,
    };
  }

  protected _getTemplateValue(key: ButtonCardTemplateKey): string | undefined {
    return this._templateResults[key]?.result;
  }

  protected _getImageUrl(): string | undefined {
    if (!this._stateObj) {
      return undefined;
    }
    const entityPic = this._stateObj.attributes.entity_picture_local || this._stateObj.attributes.entity_picture;
    if (!entityPic) {
      return undefined;
    }
    let imageUrl = this._hass!.hassUrl(entityPic);
    if (computeStateDomain(this._stateObj) === 'camera') {
      imageUrl = cameraUrlWithWidthHeight(imageUrl, 36, 36);
    }
    return imageUrl;
  }

  protected _renderPicture(imageUrl: string): TemplateResult {
    return html` <vsc-btn-shape-icon slot="icon" use-image> <img src=${imageUrl} /></vsc-btn-shape-icon> `;
  }

  protected _computeIconStyle(): Record<string, string> {
    const stateObj = this._stateObj as HassEntity | undefined;
    const active = isActive(stateObj!);
    const useStateColor = this._btnConfig.state_color === true;
    const iconStyle: Record<string, string> = {};

    let color: string | undefined;
    const colorConfig = this._btnConfig.color;
    if (colorConfig) {
      if (colorConfig === 'state') {
        color = this._computeStateColor(stateObj!);
      } else {
        const iconRgbColor = computeRgbColor(colorConfig);
        color = `rgb(${iconRgbColor})`;
      }
    }
    color = this._getTemplateValue('color_template') ?? color;
    if (color) {
      iconStyle['--icon-color'] = color;
      if (useStateColor && active) {
        iconStyle['--shape-color'] = color;
        // iconStyle['--shape-color'] = `rgb(from var(--icon-color) r g b / 0.2)`;
      }
    }
    return iconStyle;
  }
  protected _renderIcon(): TemplateResult {
    const icon = this._getTemplateValue('icon_template') ?? this._btnConfig.icon;
    const stateObj = this._stateObj as HassEntity | undefined;
    // const active = isActive(stateObj!);
    const useStateColor = this._btnConfig.state_color === true;
    const iconStyle: Record<string, string> = {};

    let color: string | undefined;
    const colorConfig = this._btnConfig.color;
    if (colorConfig) {
      if (colorConfig === 'state') {
        color = this._computeStateColor(stateObj!);
      } else {
        const iconRgbColor = computeRgbColor(colorConfig);
        color = `rgb(${iconRgbColor})`;
      }
    }
    color = this._getTemplateValue('color_template') ?? color;
    if (color) {
      iconStyle['--icon-color'] = color;
      if (useStateColor) {
        iconStyle['--shape-color'] = `rgb(from var(--icon-color) r g b / 0.2)`;
      }
    }
    return html`
      <vsc-btn-shape-icon slot="icon" style=${styleMap(iconStyle)}>
        <ha-state-icon .hass=${this._hass} .stateObj=${stateObj} .icon=${icon}> </ha-state-icon>
      </vsc-btn-shape-icon>
    `;
  }

  private _computeStateColor = memoizeOne((stateObj: HassEntity) => {
    if (!stateObj) {
      return undefined;
    }
    const entityId = stateObj.entity_id;
    // Use default color for person/device_tracker because color is on the badge
    if (computeDomain(entityId) === 'person' || computeDomain(entityId) === 'device_tracker') {
      return undefined;
    }

    // Use light color if the light support rgb
    if (computeDomain(entityId) === 'light' && stateObj.attributes.rgb_color) {
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
      const hexColor = rgb2hex(hsv2rgb(hsvColor));
      // console.debug('final hexColor:', hexColor);
      return hexColor;
    }
    // Fallback to state color
    const fallBackColor = stateColorCss(stateObj);
    // console.debug('fallback state color:', fallBackColor);
    return fallBackColor;
  });

  protected _getPrimaryInfo(): string {
    const stateObj = this._stateObj;
    const name = this._btnConfig?.name || '';
    if (!stateObj) {
      return name;
    }
    const showConfig = this._btnShowConfig;
    const primaryType = showConfig.primary_info;
    if (primaryType === 'state') {
      return this._hass.formatEntityState(stateObj);
    } else if (primaryType === 'primary-template') {
      return this._getTemplateValue('primary_template') || '';
    } else {
      return name || computeEntityName(stateObj!, this._hass) || computeStateName(stateObj!) || '';
    }
  }

  protected _computeSecondaryInfo(): TemplateResult {
    const stateObj = this._stateObj;

    const includeState = this._btnShowConfig.include_state_template;
    const secondaryTemplate = this._getTemplateValue('state_template');
    if (!stateObj) {
      if (includeState && secondaryTemplate) {
        return html`${secondaryTemplate}`;
      }
      return html``;
    }

    const stateContent = this._btnConfig.state_content;
    return html`
      <vsc-state-display
        .hass=${this._hass}
        .stateObj=${stateObj}
        .name=${this._btnConfig.name}
        .content=${stateContent}
        .template=${secondaryTemplate}
      ></vsc-state-display>
    `;
  }

  protected _renderStateInfo(): TemplateResult {
    const showConfig = this._btnShowConfig;

    const multiline_secondary = showConfig.secondary_multiline ?? false;
    const primary = showConfig.show_primary !== false ? this._getPrimaryInfo() : undefined;
    const secondary = showConfig.show_secondary !== false ? this._computeSecondaryInfo() : undefined;

    return html`
      <vsc-btn-state-info
        slot="info"
        .primary=${primary}
        .secondary=${secondary}
        .multiline_secondary=${multiline_secondary}
      ></vsc-btn-state-info>
    `;
  }
}
