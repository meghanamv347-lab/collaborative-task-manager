const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
  return data;
}

export function login(credentials) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
}
export function register(credentials) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(credentials) });
}
export function getTasks(token) { return request('/tasks', { token }); }
export function getUsers(token) { return request('/users', { token }); }
export function createTask(token, values) {
  return request('/tasks', { token, method: 'POST', body: JSON.stringify(values) });
}
export function updateTask(token, id, values) {
  return request(`/tasks/${id}`, { token, method: 'PUT', body: JSON.stringify(values) });
}
export function deleteTask(token, id) {
  return request(`/tasks/${id}`, { token, method: 'DELETE' });
}
export function getActivity(token, id) { return request(`/tasks/${id}/activity`, { token }); }
