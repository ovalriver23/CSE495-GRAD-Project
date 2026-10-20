import axios from 'axios';

// Base URL for the backend API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// API Service functions
const authService = {
    // Login function
    login: async (email, password) => {
        try {
            const response = await api.post('/login', { email, password });
            // Save token to localStorage if login successful
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Bağlantı hatası oluştu' };
        }
    },

    // Step 1: Request Password Reset Code
    forgotPassword: async (email) => {
        try {
            const response = await api.post('/forgot-password', { email });
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Bağlantı hatası oluştu' };
        }
    },

    // Step 2: Verify Code
    verifyResetCode: async (email, code) => {
        try {
            const response = await api.post('/verify-reset-code', { email, code });
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Bağlantı hatası oluştu' };
        }
    },

    // Step 3: Reset Password with Verified Code
    resetPasswordSecure: async (email, code, newPassword) => {
        try {
            const response = await api.post('/reset-password-secure', { email, code, newPassword });
            return response.data;
        } catch (error) {
            throw error.response?.data || { error: 'Bağlantı hatası oluştu' };
        }
    },

    // Legacy/Unused
    resetPassword: async (email, newPassword) => {
       // Deprecated
       return authService.resetPasswordSecure(email, '000000', newPassword);
    },

    // Logout function
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Get current user
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr);
        return null;
    },

    // Get authentication token
    getToken: () => {
        return localStorage.getItem('token');
    },

    // Check if user is logged in
    isAuthenticated: () => {
        return localStorage.getItem('token') !== null;
    }
};

export default authService;
