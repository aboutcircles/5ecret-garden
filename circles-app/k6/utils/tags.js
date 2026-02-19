export function withTags(extraTags = {}, headers = {}) {
  return {
    tags: {
      app: 'secret-garden',
      ...extraTags,
    },
    headers,
  };
}

export function endpointTag(method, endpoint) {
  return `${String(method || 'GET').toUpperCase()} ${endpoint}`;
}
