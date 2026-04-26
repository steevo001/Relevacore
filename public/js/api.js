/* ═══════════════════════════════════════════════════════
   RelevaCore — Shared API Client
   ═══════════════════════════════════════════════════════ */

const API = {
  baseUrl: '',

  getToken() {
    return localStorage.getItem('rc_admin_token');
  },

  setToken(token) {
    localStorage.setItem('rc_admin_token', token);
  },

  clearToken() {
    localStorage.removeItem('rc_admin_token');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...options.headers
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, ...data };
      }

      return data;
    } catch (err) {
      if (err.status === 401 && !endpoint.includes('/auth/login')) {
        this.clearToken();
        if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/admin/index')) {
          window.location.href = '/admin';
        }
      }
      throw err;
    }
  },

  // Auth
  login: (email, password) => API.request('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  }),

  getMe: () => API.request('/api/auth/me'),

  changePassword: (currentPassword, newPassword) => API.request('/api/auth/change-password', {
    method: 'POST', body: JSON.stringify({ currentPassword, newPassword })
  }),

  // Leads
  submitLead: (data) => API.request('/api/leads', {
    method: 'POST', body: JSON.stringify(data)
  }),

  getLeads: (params = '') => API.request(`/api/leads?${params}`),

  updateLeadStatus: (id, status) => API.request(`/api/leads/${id}`, {
    method: 'PATCH', body: JSON.stringify({ status })
  }),

  deleteLead: (id) => API.request(`/api/leads/${id}`, { method: 'DELETE' }),

  // Consultations
  bookConsultation: (data) => API.request('/api/consultations', {
    method: 'POST', body: JSON.stringify(data)
  }),

  getConsultations: (params = '') => API.request(`/api/consultations?${params}`),

  updateConsultationStatus: (id, status) => API.request(`/api/consultations/${id}`, {
    method: 'PATCH', body: JSON.stringify({ status })
  }),

  deleteConsultation: (id) => API.request(`/api/consultations/${id}`, { method: 'DELETE' }),

  // Newsletter
  subscribe: (email, name) => API.request('/api/newsletter/subscribe', {
    method: 'POST', body: JSON.stringify({ email, name })
  }),

  getSubscribers: (params = '') => API.request(`/api/newsletter/subscribers?${params}`),

  unsubscribe: (id) => API.request(`/api/newsletter/subscribers/${id}`, { method: 'DELETE' }),

  // Blog
  getPosts: (params = '') => API.request(`/api/blog?${params}`),

  getPost: (slug) => API.request(`/api/blog/${slug}`),

  getAllPosts: (params = '') => API.request(`/api/blog/all?${params}`),

  createPost: (data) => API.request('/api/blog', {
    method: 'POST', body: JSON.stringify(data)
  }),

  updatePost: (id, data) => API.request(`/api/blog/${id}`, {
    method: 'PUT', body: JSON.stringify(data)
  }),

  deletePost: (id) => API.request(`/api/blog/${id}`, { method: 'DELETE' }),

  // Portfolio
  getPortfolio: (params = '') => API.request(`/api/portfolio?${params}`),

  getPortfolioItem: (id) => API.request(`/api/portfolio/${id}`),

  getAllPortfolio: () => API.request('/api/portfolio/all'),

  createPortfolioItem: (data) => API.request('/api/portfolio', {
    method: 'POST', body: JSON.stringify(data)
  }),

  updatePortfolioItem: (id, data) => API.request(`/api/portfolio/${id}`, {
    method: 'PUT', body: JSON.stringify(data)
  }),

  deletePortfolioItem: (id) => API.request(`/api/portfolio/${id}`, { method: 'DELETE' }),

  // Pricing
  submitPricingInquiry: (data) => API.request('/api/pricing/inquiry', {
    method: 'POST', body: JSON.stringify(data)
  }),

  getPricingInquiries: (params = '') => API.request(`/api/pricing/inquiries?${params}`),

  updatePricingInquiryStatus: (id, status) => API.request(`/api/pricing/inquiries/${id}`, {
    method: 'PATCH', body: JSON.stringify({ status })
  }),

  // Dashboard
  getDashboardStats: () => API.request('/api/dashboard/stats'),

  getRecentActivity: () => API.request('/api/dashboard/recent-activity')
};

/* ═══════════════════════════════════════════════════════
   Toast Notification System
   ═══════════════════════════════════════════════════════ */

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ═══════════════════════════════════════════════════════
   Modal System
   ═══════════════════════════════════════════════════════ */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});
