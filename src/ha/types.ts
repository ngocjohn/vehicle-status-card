import {
  Auth,
  Connection,
  HassConfig,
  HassEntities,
  HassEntity,
  HassServices,
  HassServiceTarget,
  MessageBase,
} from 'home-assistant-js-websocket';

import type { LocalizeFunc } from './common/translations/localize';
import type { DeviceRegistryEntry } from './data/device_registry';
import type { EntityRegistryDisplayEntry } from './data/entity_registry';
import type { FrontendLocaleData, TranslationCategory } from './data/translation';
import type { Themes, ThemeSettings } from './data/ws-themes';

export interface PanelInfo<T = Record<string, any> | null> {
  component_name: string;
  config: T;
  icon: string | null;
  title: string | null;
  url_path: string;
}

export interface Panels {
  [name: string]: PanelInfo;
}

interface Resources {
  [language: string]: Record<string, string>;
}

export interface Translation {
  nativeName: string;
  isRTL: boolean;
  hash: string;
}

export interface TranslationMetadata {
  fragments: string[];
  translations: {
    [lang: string]: Translation;
  };
}

export interface Credential {
  auth_provider_type: string;
  auth_provider_id: string;
}

export interface MFAModule {
  id: string;
  name: string;
  enabled: boolean;
}

export interface CurrentUser {
  id: string;
  is_owner: boolean;
  is_admin: boolean;
  name: string;
  credentials: Credential[];
  mfa_modules: MFAModule[];
}

interface Context {
  id: string;
  parent_id?: string;
  user_id?: string | null;
}

interface ServiceCallResponse {
  context: Context;
  response?: any;
}

interface ServiceCallRequest {
  domain: string;
  service: string;
  serviceData?: Record<string, any>;
  target?: HassServiceTarget;
}

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  picture: string | null;
}

export type EntityNameType = 'entity' | 'device' | 'area' | 'floor';

export interface HomeAssistant {
  auth: Auth & { external?: any };
  connection: Connection;
  connected: boolean;
  states: HassEntities;
  entities: { [id: string]: EntityRegistryDisplayEntry };
  devices: { [id: string]: DeviceRegistryEntry };
  areas: { [id: string]: AreaRegistryEntry };
  services: HassServices;
  config: HassConfig;
  themes: Themes;
  selectedTheme: ThemeSettings | null;
  panels: Panels;
  panelUrl: string;
  // i18n
  // current effective language in that order:
  //   - backend saved user selected language
  //   - language in local app storage
  //   - browser language
  //   - english (en)
  language: string;
  // local stored language, keep that name for backward compatibility
  selectedLanguage: string | null;
  locale: FrontendLocaleData;
  resources: Resources;
  localize: LocalizeFunc;
  translationMetadata: TranslationMetadata;
  suspendWhenHidden: boolean;
  enableShortcuts: boolean;
  vibrate: boolean;
  debugConnection: boolean;
  dockedSidebar: 'docked' | 'always_hidden' | 'auto';
  defaultPanel: string;
  moreInfoEntityId: string | null;
  user?: CurrentUser;
  userData?: any; // CoreFrontendUserData | null;
  hassUrl(path?): string;
  callService(
    domain: ServiceCallRequest['domain'],
    service: ServiceCallRequest['service'],
    serviceData?: ServiceCallRequest['serviceData'],
    target?: ServiceCallRequest['target']
  ): Promise<ServiceCallResponse>;
  callApi<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T>;
  fetchWithAuth(path: string, init?: Record<string, any>): Promise<Response>;
  sendWS(msg: MessageBase): void;
  callWS<T>(msg: MessageBase): Promise<T>;
  loadBackendTranslation(
    category: TranslationCategory,
    integration?: string | string[],
    configFlow?: boolean
  ): Promise<LocalizeFunc>;
  // loadFragmentTranslation(fragment: string): Promise<LocalizeFunc | undefined>;
  formatEntityState(stateObj: HassEntity, state?: string): string;
  formatEntityAttributeValue(stateObj: HassEntity, attribute: string, value?: any): string;
  formatEntityAttributeName(stateObj: HassEntity, attribute: string): string;
  formatEntityName(stateObj: HassEntity, type: EntityNameType | EntityNameType[], separator?: string): string;
}

export type Constructor<T = any> = new (...args: any[]) => T;
