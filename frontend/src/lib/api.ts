/**
 * In dev, Vite proxies `/api` → FastAPI (see vite.config.ts) so the browser
 * stays same-origin and avoids flaky CORS / mixed host issues (localhost vs 127.0.0.1).
 */
const getProductionBase = () => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
  }
  return 'https://devclash-vanarsena-1.onrender.com';
};

const remoteBase = (import.meta.env.VITE_API_URL || getProductionBase()).replace(
  /\/$/,
  '',
);

export const API_BASE = import.meta.env.DEV
  ? '/api/v1'
  : `${remoteBase}/api/v1`;
