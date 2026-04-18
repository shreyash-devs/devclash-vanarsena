/**
 * In dev, Vite proxies `/api` → FastAPI (see vite.config.ts) so the browser
 * stays same-origin and avoids flaky CORS / mixed host issues (localhost vs 127.0.0.1).
 */
const remoteBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(
  /\/$/,
  '',
);

export const API_BASE = import.meta.env.DEV
  ? '/api/v1'
  : `${remoteBase}/api/v1`;
