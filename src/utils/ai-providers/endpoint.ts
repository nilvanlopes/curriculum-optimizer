export function safeEndpoint(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.replace(/\/[^/]*@/, '//[redacted]@').split(/[?#]/, 1)[0] || '[invalid-endpoint]';
  }
}
