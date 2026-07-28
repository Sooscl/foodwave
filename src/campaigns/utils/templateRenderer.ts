const TOKEN_PATTERN = /{{\s*([a-zA-Z0-9_\.]+)\s*}}/g;

const resolvePath = (model: Record<string, unknown>, path: string): unknown => {
  const segments = path.split('.').filter((segment) => segment.length > 0);
  let current: unknown = model;

  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return '';
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

export const renderTemplate = (template: string, model: Record<string, unknown>): string => {
  return template.replace(TOKEN_PATTERN, (_match, tokenPath: string) => {
    const resolved = resolvePath(model, tokenPath);

    if (resolved === null || resolved === undefined) {
      return '';
    }

    return String(resolved);
  });
};
