// ============================================
// AUTH.JS - Authentication Module
// ============================================

import { showNotification } from './ui.js';
import { showSection } from './ui.js';

// Authentication state
let authState = {
    user: null,
    token: null
};

// Export state getter
export function getAuthState() {
    return authState;
}

// Load user from localStorage
export function loadUserFromStorage() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        authState.token = token;
        authState.user = JSON.parse(user);
    }

    return authState;
}

// Save user to localStorage
function saveUserToStorage() {
    if (authState.token && authState.user) {
        localStorage.setItem('token', authState.token);
        localStorage.setItem('user', JSON.stringify(authState.user));
    }
}

// Clear user from storage
function clearUserFromStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Update UI based on auth state
export function updateUI() {
    const guestElements = document.querySelectorAll('.guest-only');
    const authElements = document.querySelectorAll('.auth-only');
    const ownerElements = document.querySelectorAll('.owner-only');

    if (authState.user) {
        guestElements.forEach(el => el.classList.add('hidden'));
        authElements.forEach(el => el.classList.remove('hidden'));

        if (authState.user.user_type === 'owner') {
            ownerElements.forEach(el => el.classList.remove('hidden'));
        } else {
            ownerElements.forEach(el => el.classList.add('hidden'));
        }
    } else {
        guestElements.forEach(el => el.classList.remove('hidden'));
        authElements.forEach(el => el.classList.add('hidden'));
        ownerElements.forEach(el => el.classList.add('hidden'));
    }
}

// Handle login
export async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await window.apiCall('/auth/login', 'POST', data);
        authState.token = response.token;
        authState.user = response.user;
        saveUserToStorage();
        updateUI();

        // Initialize Socket.IO for chat
        if (typeof window.initializeSocket === 'function') {
            window.initializeSocket();
        }

        window.closeModal('loginModal');
        showNotification('¡Bienvenido de nuevo!', 'success');
        showSection('properties');
    } catch (error) {
        // Error already handled in apiCall
    }
}

// Handle register
export async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await window.apiCall('/auth/register', 'POST', data);
        authState.token = response.token;
        authState.user = response.user;
        saveUserToStorage();
        updateUI();

        // Initialize Socket.IO for chat
        if (typeof window.initializeSocket === 'function') {
            window.initializeSocket();
        }

        window.closeModal('registerModal');
        showNotification('¡Cuenta creada exitosamente!', 'success');
        showSection('properties');
    } catch (error) {
        // Error already handled in apiCall
    }
}

// Logout
export function logout() {
    authState.user = null;
    authState.token = null;
    clearUserFromStorage();
    updateUI();
    showSection('home');
    showNotification('Sesión cerrada', 'info');
}

// Toggle student ID field
export function toggleStudentId(userType) {
    const studentIdGroup = document.getElementById('studentIdGroup');
    if (studentIdGroup) {
        if (userType === 'student') {
            studentIdGroup.classList.remove('hidden');
        } else {
            studentIdGroup.classList.add('hidden');
        }
    }
}

// Make functions globally accessible
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.toggleStudentId = toggleStudentId;
