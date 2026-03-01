import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      localStorage.removeItem('learning_dashboard_token')
      localStorage.removeItem('learning_dashboard_user')
      window.location.href = '/login'
    }
    return Promise.reject(e)
  }
)
