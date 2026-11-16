const tokenKey = 'finance.token';
const nameKey = 'finance.name';
export const token = () => localStorage.getItem(tokenKey);
export const userName = () => localStorage.getItem(nameKey);
export function saveSession(data) {
  localStorage.setItem(tokenKey, data.token);
  localStorage.setItem(nameKey, data.usuario.nome);
}
export function logout() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(nameKey);
  location.replace('/login.html');
}
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token()) headers.Authorization = 'Bearer ' + token();
  const response = await fetch('/api' + path, { method, headers, body: JSON.stringify(body) });
  if (response.status === 204) return;
  const data = await response.json();
  if (response.status === 401 && !path.startsWith('/auth/')) logout();
  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a operação.');
  return data;
}
