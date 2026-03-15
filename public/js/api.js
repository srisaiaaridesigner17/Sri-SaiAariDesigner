// =========================================
// api.js – Centralized API functions
// =========================================

if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = ''; // Same origin
}

if (!window.api) {
    var api = {
    // --- Products ---
    getProducts: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_BASE_URL}/api/products${params ? '?' + params : ''}`);
        return await res.json();
    },

    getProductById: async (id) => {
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
        if (!res.ok) return null;
        return await res.json();
    },

    addProduct: async (formData) => {
        const res = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            body: formData
        });
        return await res.json();
    },

    updateProduct: async (id, formData) => {
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
            method: 'PUT',
            body: formData
        });
        return await res.json();
    },

    deleteProduct: async (id) => {
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    // --- Orders ---
    getOrders: async () => {
        const res = await fetch(`${API_BASE_URL}/api/orders`);
        return await res.json();
    },

    createOrder: async (orderData) => {
        const res = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        return await res.json();
    },

    getUserOrders: async (userId) => {
        const res = await fetch(`${API_BASE_URL}/api/orders/user/${userId}`);
        return await res.json();
    },

    syncUserData: async (userId, data) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/sync/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    updateOrderStatus: async (id, status) => {
        const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderStatus: status })
        });
        return await res.json();
    },

    deleteOrder: async (id) => {
        const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    // --- Sliders ---
    getSliders: async () => {
        const res = await fetch(`${API_BASE_URL}/api/sliders`);
        return await res.json();
    },

    addSlider: async (formData) => {
        const res = await fetch(`${API_BASE_URL}/api/sliders`, {
            method: 'POST',
            body: formData
        });
        return await res.json();
    },

    deleteSlider: async (id) => {
        const res = await fetch(`${API_BASE_URL}/api/sliders/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    // --- Courses ---
    getCourses: async () => {
        const res = await fetch(`${API_BASE_URL}/api/courses`);
        return await res.json();
    },

    addCourse: async (formData) => {
        const res = await fetch(`${API_BASE_URL}/api/courses`, {
            method: 'POST',
            body: formData
        });
        return await res.json();
    },

    deleteCourse: async (id) => {
        const res = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    // --- Auth ---
    login: async (credentials) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        return await res.json();
    },

    signup: async (userData) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return await res.json();
    },

    googleLogin: async (data) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    updateProfile: async (userId, data) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    getProfile: async (userId) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile/${userId}`);
        return await res.json();
    },

    forgotPassword: async (email) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return await res.json();
    },

    resetPassword: async (token, password) => {
        const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });
        return await res.json();
    }
    };

    window.api = api;
}
