import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export default api;

// Ollama
export const getOllamaStatus = () => api.get('/system/ollama-status');

// Dashboard
export const getDashboard = () => api.get('/dashboard/summary');

// Clients
export const getClients = () => api.get('/clients');
export const getClient = (id: number) => api.get(`/clients/${id}`);
export const createClient = (data: object) => api.post('/clients', data);
export const updateClient = (id: number, data: object) => api.put(`/clients/${id}`, data);

// TDS
export const getTDSReturns = (clientId: number) => api.get(`/tds/${clientId}/returns`);
export const uploadTDSExcel = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/tds/upload-excel', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const validateTDS = (rows: object[]) => api.post('/tds/validate', { rows });
export const generateTDSJson = (rows: object[], meta: object) => api.post('/tds/generate-json', { rows, meta });
export const suggestTDSSection = (payment_description: string) =>
  api.post('/tds/suggest-section', { payment_description });

// GST
export const getGSTPeriod = (clientId: number, period: string) =>
  api.get(`/gst/${clientId}/${period}`);
export const getGSTR3B = (clientId: number, period: string) =>
  api.get(`/gst/${clientId}/${period}/3b`);
export const reconcileGST = (data: object) => api.post('/gst/reconcile', data);
export const reconAction = (data: object) => api.post('/gst/recon/action', data);

// ITR
export const getITR = (clientId: number, fy: string) => api.get(`/itr/${clientId}/${fy}`);
export const saveITR = (data: object) => api.post('/itr/save', data);
export const computeTax = (itrId: number, data: object) => api.post(`/itr/${itrId}/compute-tax`, data);
export const gstCrosscheck = (itrId: number) => api.post(`/itr/${itrId}/gst-crosscheck`);
export const aiReviewITR = (itrId: number) => api.post(`/itr/${itrId}/ai-review`);

// Accounting
export const mapColumns = (data: object) => api.post('/accounting/map-columns', data);
export const categoriseTransactions = (narrations: object[]) =>
  api.post('/accounting/categorise-transactions', { narrations });
export const getDepreciationAssets = (clientId: number) =>
  api.get(`/accounting/depreciation/${clientId}`);
export const computeDepreciation = (data: object) =>
  api.post('/accounting/depreciation/compute', data);

// Litigation
export const getLitigationCases = () => api.get('/litigation/cases');
export const createLitigationCase = (data: object) => api.post('/litigation/cases', data);
export const updateLitigationCase = (id: number, data: object) =>
  api.put(`/litigation/cases/${id}`, data);
export const draftAllSections = (id: number) => api.post(`/litigation/cases/${id}/draft`);
export const draftSection = (id: number, section: string) =>
  api.post(`/litigation/cases/${id}/draft/${section}`);
export const getDraftHistory = (id: number) => api.get(`/litigation/cases/${id}/history`);
