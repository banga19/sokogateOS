import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
})

// Request interceptor - attach auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sokogate_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => Promise.reject(error))

// Response interceptor - handle auth errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sokogate_token')
      localStorage.removeItem('sokogate_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ============ AUTH API ============
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword })
}

// ============ SOURCING API ============
export const sourcingAPI = {
  createRequest: (data) => api.post('/v1/sourcing/request', data),
  getRequest: (id) => api.get(`/v1/sourcing/request/${id}`),
  getCompanyRequests: (companyId, params) => api.get(`/v1/sourcing/company/${companyId}`, { params }),
  updateStatus: (id, status) => api.put(`/v1/sourcing/request/${id}/status`, { status })
}

// ============ CUSTOMIZATION API ============
export const customizationAPI = {
  createRequest: (data) => api.post('/v1/customization/request', data),
  getRequest: (id) => api.get(`/v1/customization/request/${id}`),
  getCompanyRequests: (companyId, params) => api.get(`/v1/customization/company/${companyId}`, { params }),
  updateStatus: (id, status) => api.put(`/v1/customization/request/${id}/status`, { status })
}

// ============ LOGISTICS API ============
export const logisticsAPI = {
  createShipment: (data) => api.post('/v1/logistics/shipment', data),
  getShipment: (id) => api.get(`/v1/logistics/shipment/${id}`),
  getCompanyShipments: (companyId, params) => api.get(`/v1/logistics/company/${companyId}`, { params }),
  updateStatus: (id, status) => api.put(`/v1/logistics/shipment/${id}/status`, { status }),
  trackShipment: (id) => api.get(`/v1/logistics/track/${id}`)
}

// ============ QME API ============
export const qmeAPI = {
  runTask: (taskName, data) => api.post(`/v1/qme/run/${taskName}`, data),
  listTasks: (params) => api.get('/v1/qme/tasks', { params }),
  getTask: (id) => api.get(`/v1/qme/task/${id}`),
  getStatus: () => api.get('/qme/status')
}

// ============ FEEDBACK API ============
export const feedbackAPI = {
  submit: (data) => api.post('/v1/feedback', data),
  getAnalytics: (params) => api.get('/v1/feedback/analytics', { params })
}

// ============ COMPANY API ============
export const companyAPI = {
  getLegibility: (id) => api.get(`/v1/company/${id}/legibility`)
}

// ============ WHATSAPP API (Phase 1) ============
export const whatsappAPI = {
  sendMessage: (to, body, mediaUrl) => api.post('/whatsapp/send', { to, body, mediaUrl }),
  getConversations: (params = {}) => api.get('/whatsapp/conversations', { params }),
  getStatus: () => api.get('/whatsapp/status'),
  parseNLP: (text) => api.post('/whatsapp/parse', { text }),
  getTrainingData: (params) => api.get('/whatsapp/training-data', { params })
}

// ============ SUPPLIER TRUST API (Phase 1) ============
export const supplierTrustAPI = {
  searchSuppliers: (params) => api.get('/trust/search', { params }),
  getTopSuppliers: (limit = 6) => api.get('/trust/top', { params: { limit } }),
  getSupplier: (supplierId) => api.get(`/trust/supplier/${supplierId}`),
  getReviews: (supplierId, params) => api.get(`/trust/supplier/${supplierId}/reviews`, { params }),
  addReview: (supplierId, data) => api.post(`/trust/supplier/${supplierId}/review`, data),
  requestVerification: (supplierId, documents) => api.post(`/trust/supplier/${supplierId}/verify`, { documents }),
  approveVerification: (supplierId) => api.post(`/trust/supplier/${supplierId}/approve`),
  recalculateScore: (supplierId) => api.post(`/trust/supplier/${supplierId}/recalculate-score`),
  createEscrow: (supplierId, amount, currency, reference) => api.post('/trust/escrow/create', { supplierId, amount, currency, reference }),
  releaseEscrow: (escrowId, confirmation) => api.post(`/trust/escrow/${escrowId}/release`, { confirmation }),
  updateSubscription: (supplierId, tier, autoRenew) => api.put(`/trust/supplier/${supplierId}/subscription`, { tier, autoRenew }),
  getStatus: () => api.get('/trust/status')
}

// ============ M-PESA API (Phase 1) ============
export const mpesaAPI = {
  initiatePayment: (data) => api.post('/whatsapp/mpesa-pay', data),
  queryStatus: (checkoutRequestId) => api.get('/whatsapp/mpesa-status', { params: { checkoutRequestId } }),
  generateQR: (amount, reference) => api.post('/whatsapp/mpesa-qr', { amount, reference })
}

// ============ CUSTOMS ENGINE API (Phase 2) ============
export const customsAPI = {
  // HS Code Classifier — POST /customs/classify
  classify: (description, category) => api.post('/customs/classify', { description, category }),
  // HS Code Browser — GET /customs/hs-codes?query=&category=
  searchHSCodes: (query, category) => api.get('/customs/hs-codes', { params: { query, category } }),
  getHSDetails: (hsCode) => api.get(`/customs/hs-codes/${hsCode}`),
  getCategories: () => api.get('/customs/categories'),

  // Duty Calculator — POST /customs/calculate-duty
  calculateDuty: (data) => api.post('/customs/calculate-duty', data),

  // Document Generator — POST /customs/shipments/:id/documents/generate, GET /customs/document-templates
  generateDocument: (shipmentId, documentType) =>
    api.post(`/customs/shipments/${shipmentId}/documents/generate`, { documentType }),
  getDocumentTemplates: (country) => api.get('/customs/document-templates', { params: { country } }),

  // Compliance Checker — GET /customs/compliance?hsCode=&country=
  checkCompliance: (hsCode, country) => api.get('/customs/compliance', { params: { hsCode, country } }),

  // Trade Agreement Optimizer — GET /customs/trade-agreement?hsCode=&originCountry=&destinationCountry=
  optimizeTradeAgreement: (hsCode, originCountry, destinationCountry) =>
    api.get('/customs/trade-agreement', { params: { hsCode, originCountry, destinationCountry } }),
  getTradeAgreements: () => api.get('/customs/trade-agreements'),

  // Customs Routes — GET /customs/routes?origin=&destination=
  getCustomsRoutes: (origin, destination) => api.get('/customs/routes', { params: { origin, destination } }),

  // Shipments — CRUD
  getShipments: (params) => api.get('/customs/shipments', { params }),
  createShipment: (data) => api.post('/customs/shipments', data),

  // Status — GET /customs/status
  getStatus: () => api.get('/customs/status')
}

// ============ HEALTH ============
export const healthAPI = {
  check: () => api.get('/health')
}

export default api
