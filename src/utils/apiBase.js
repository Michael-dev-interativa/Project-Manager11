export function getApiBase() {
  const origin = typeof window !== 'undefined' ? window.location.origin || '' : '';
  const isLocal = /localhost:(3000|3002)/.test(origin);
  const fromEnv = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return isLocal ? 'http://localhost:3001/api' : origin.replace(/\/$/, '') + '/api';
}
