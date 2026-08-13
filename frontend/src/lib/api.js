/**
 * api.js
 * 
 * Thin fetch wrapper for the LogHunt AI backend.
 * Base URL: http://localhost:8000
 */

const BASE_URL = 'http://localhost:8000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

/** GET /dashboard */
export function getDashboard() {
  return request('/dashboard');
}

/**
 * GET /logs
 * @param {Object} params - { skip?, limit?, project_id? }
 */
export function getLogs(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return request(`/logs${qs ? '?' + qs : ''}`);
}

/**
 * GET /alerts
 * @param {Object} params - { skip?, limit?, project_id?, alert_type?, severity? }
 */
export function getAlerts(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return request(`/alerts${qs ? '?' + qs : ''}`);
}

/**
 * POST /upload
 * @param {File} file
 * @param {number|null} projectId
 */
export async function uploadFile(file, projectId = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (projectId != null) formData.append('project_id', String(projectId));

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * POST /query
 * @param {string} question 
 */
export function runQuery(question) {
  return request('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
}

/**
 * GET /alerts/{alert_id}/explain
 * @param {number} alertId 
 */
export function explainAlert(alertId) {
  return request(`/alerts/${alertId}/explain`);
}
