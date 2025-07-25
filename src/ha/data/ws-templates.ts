import { Connection, UnsubscribeFunc } from 'home-assistant-js-websocket';

export interface RenderTemplateResult {
  result: string;
  listeners: TemplateListeners;
}

interface TemplateListeners {
  all: boolean;
  domains: string[];
  entities: string[];
  time: boolean;
}

export const subscribeRenderTemplate = (
  conn: Connection,
  onChange: (result: RenderTemplateResult) => void,
  params: {
    template: string;
    entity_ids?: string | string[];
    variables?: Record<string, unknown>;
    timeout?: number;
    strict?: boolean;
  }
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage((msg: RenderTemplateResult) => onChange(msg), {
    type: 'render_template',
    ...params,
  });

const isTemplateRegex = /{%|{{/;

const isTemplate = (value: string): boolean => isTemplateRegex.test(value);

export const hasTemplate = (value: unknown): boolean => {
  if (!value) {
    return false;
  }
  if (typeof value === 'string') {
    return isTemplate(value);
  }
  if (typeof value === 'object') {
    const values = Array.isArray(value) ? value : Object.values(value!);
    return values.some((val) => val && hasTemplate(val));
  }
  return false;
};
