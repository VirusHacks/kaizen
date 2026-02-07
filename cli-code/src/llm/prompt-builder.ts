export interface TemplateData {
  [key: string]: any;
}

export function renderTemplate(template: string, data: TemplateData): string {
  let result = template;

  // Process {{#each items}} blocks
  result = processEachBlocks(result, data);

  // Process {{#if condition}} blocks
  result = processIfBlocks(result, data);

  // Replace {{variable}} placeholders
  result = replaceVariables(result, data);

  return result;
}

function processEachBlocks(template: string, data: TemplateData): string {
  const eachRegex = /\{\{#each\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return template.replace(eachRegex, (_, keyPath, body) => {
    const items = resolveKeyPath(data, keyPath);
    if (!Array.isArray(items)) return '';

    return items
      .map((item, index) => {
        const itemData = {
          ...data,
          this: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === items.length - 1,
        };

        // If item is an object, spread its properties
        if (typeof item === 'object' && item !== null) {
          Object.assign(itemData, item);
        }

        let rendered = body;
        rendered = processIfBlocks(rendered, itemData);
        rendered = replaceVariables(rendered, itemData);
        return rendered;
      })
      .join('');
  });
}

function processIfBlocks(template: string, data: TemplateData): string {
  const ifRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

  return template.replace(ifRegex, (_, keyPath, ifBody, elseBody = '') => {
    const value = resolveKeyPath(data, keyPath);
    const isTruthy =
      value !== undefined &&
      value !== null &&
      value !== false &&
      value !== '' &&
      value !== 0 &&
      !(Array.isArray(value) && value.length === 0);

    const body = isTruthy ? ifBody : elseBody;
    let rendered = body;
    rendered = processIfBlocks(rendered, data);
    rendered = replaceVariables(rendered, data);
    return rendered;
  });
}

function replaceVariables(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, keyPath) => {
    const value = resolveKeyPath(data, keyPath);
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

function resolveKeyPath(data: TemplateData, keyPath: string): any {
  const keys = keyPath.split('.');
  let current: any = data;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }

  return current;
}
