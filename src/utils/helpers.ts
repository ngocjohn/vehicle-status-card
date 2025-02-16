import tinycolor from 'tinycolor2';

export function isEmpty(input: any): boolean {
  if (Array.isArray(input)) {
    // Check if array is empty
    return input.length === 0;
  } else if (input && typeof input === 'object') {
    // Check if object is empty
    return Object.keys(input).length === 0;
  } else {
    // For other types (null, undefined, etc.), treat as not empty
    return true;
  }
}

export const isDarkColor = (color: string): boolean => {
  const colorObj = tinycolor(color);
  // console.log('colorObj', colorObj);
  return colorObj.isLight();
};

const isTemplateRegex = /{%|{{/;

export const isTemplate = (value: string): boolean => isTemplateRegex.test(value);

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

export const strStartsWith = (value: string, search: string) => value.substring(0, search.length) === search;
