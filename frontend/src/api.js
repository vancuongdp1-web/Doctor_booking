const KEY = 'mc_token';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = t => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));
export async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch('/api' + path, {
    method, body: body && JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || 'Có lỗi xảy ra');
  return d;
}
