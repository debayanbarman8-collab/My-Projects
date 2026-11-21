/**
 * RevPulse Client-side API Service
 */
const API = (() => {
  const BASE_URL = '/api';

  function getToken() {
    return localStorage.getItem('revpulse_token') || '';
  }

  function setToken(token) {
    if (token) localStorage.setItem('revpulse_token', token);
    else localStorage.removeItem('revpulse_token');
  }

  async function request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  async function downloadExport(entity) {
    const token = getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/enterprise/export/${entity}`, {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(err.message || 'Export download failed');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revpulse_${entity}_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  return {
    getToken,
    setToken,

    // Auth
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    getCurrentUser: () => request('/auth/me'),
    getReps: () => request('/auth/reps'),

    // Analytics
    getDashboardAnalytics: () => request('/analytics/dashboard'),

    // Kanban & Deals
    getKanban: () => request('/deals/kanban'),
    getDeals: (params = '') => request(`/deals${params ? '?' + params : ''}`),
    getDeal: (id) => request(`/deals/${id}`),
    createDeal: (dealData) => request('/deals', { method: 'POST', body: JSON.stringify(dealData) }),
    updateDealStage: (id, stage_id, notes = '') => request(`/deals/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage_id, notes }) }),
    addDealActivity: (id, activity) => request(`/deals/${id}/activities`, { method: 'POST', body: JSON.stringify(activity) }),

    // Leads & Scoring
    getLeads: (params = '') => request(`/leads${params ? '?' + params : ''}`),
    getLead: (id) => request(`/leads/${id}`),
    createLead: (leadData) => request('/leads', { method: 'POST', body: JSON.stringify(leadData) }),
    convertLead: (id, dealData) => request(`/leads/${id}/convert`, { method: 'POST', body: JSON.stringify(dealData) }),

    // Quotas & Commissions
    getQuotas: () => request('/quotas'),
    getCommissions: (params = '') => request(`/commissions${params ? '?' + params : ''}`),
    updateCommissionStatus: (id, payout_status) => request(`/commissions/${id}`, { method: 'PATCH', body: JSON.stringify({ payout_status }) }),

    // Territory & Routing
    getTerritories: () => request('/territories'),
    previewRouting: (leadData) => request('/territories/preview-routing', { method: 'POST', body: JSON.stringify(leadData) }),

    // ML Engine & Simulation
    scoreLeadPreview: (leadData) => request('/ml/score-lead', { method: 'POST', body: JSON.stringify(leadData) }),
    predictWinPreview: (dealData) => request('/ml/predict-win', { method: 'POST', body: JSON.stringify(dealData) }),
    simulateRevenue: (scenarioParams) => request('/ml/simulate-revenue', { method: 'POST', body: JSON.stringify(scenarioParams) }),
    retrainMLModel: () => request('/ml/retrain', { method: 'POST' }),
    getModelLogs: () => request('/ml/training-logs'),

    // Enterprise Additions
    search: (q) => request(`/enterprise/search?q=${encodeURIComponent(q)}`),
    getNotifications: (unreadOnly = false) => request(`/enterprise/notifications${unreadOnly ? '?unread_only=true' : ''}`),
    markNotificationRead: (id) => request(`/enterprise/notifications/${id}/read`, { method: 'PATCH' }),
    markAllNotificationsRead: () => request('/enterprise/notifications/mark-all-read', { method: 'POST' }),
    scanVelocityAlerts: () => request('/enterprise/alerts/scan', { method: 'POST' }),
    getAuditLogs: (params = '') => request(`/enterprise/audit-logs${params ? '?' + params : ''}`),
    bulkImportLeads: (leads) => request('/enterprise/leads/bulk-import', { method: 'POST', body: JSON.stringify({ leads }) }),
    downloadExport
  };
})();
