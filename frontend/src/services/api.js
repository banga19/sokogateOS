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
  changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword })
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

// ============ HEALTH ============
export const healthAPI = {
  check: () => api.get('/health')
}

export default api
