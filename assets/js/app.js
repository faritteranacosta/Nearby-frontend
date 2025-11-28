import { loadInitialComponents, initializeUI } from './ui.js';

// Module cache for dynamic imports
let authModule = null;
let propertiesModule = null;

// Configuration
const API_URL = 'http://localhost:3000/api';

// Make API_URL globally accessible
window.API_URL = API_URL;

// Dynamic import helpers for code splitting
async function getAuthModule() {
    if (!authModule) {
        authModule = await import('./auth.js');
    }
    return authModule;
}

async function getPropertiesModule() {
    if (!propertiesModule) {
        propertiesModule = await import('./properties.js');
    }
    return propertiesModule;
}

// Get auth state (loads module if needed)
async function getAuthState() {
    const auth = await getAuthModule();
    return auth.getAuthState();
}

// API Helper Function
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    const authState = await getAuthState();
    const headers = {};

    if (authState.token) {
        headers['Authorization'] = `Bearer ${authState.token}`;
    }

    if (!isFormData && body) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(error.message, 'error');
        }
        throw error;
    }
}

// Make apiCall globally accessible
window.apiCall = apiCall;

// Section change handler with code splitting
async function onSectionChange(section) {
    const authState = await getAuthState();

    if (section === 'properties' || section === 'favorites' || section === 'my-properties') {
        // Dynamically load properties module
        const { loadProperties, loadFavorites, loadMyProperties } = await getPropertiesModule();

        if (section === 'properties') {
            loadProperties();
        } else if (section === 'favorites' && authState.user) {
            loadFavorites();
        } else if (section === 'my-properties' && authState.user) {
            loadMyProperties();
        }
    } else if (section === 'chat' && authState.user) {
        // Chat module is loaded separately (not ES6 module)
        if (typeof window.loadChatRooms === 'function') {
            window.loadChatRooms();
        }
    }
}

// Initialize application with lazy loading and code splitting
async function initApp() {
    try {
        // Load only essential components (header)
        await loadInitialComponents();

        // Dynamically load auth module
        const { loadUserFromStorage, updateUI } = await getAuthModule();

        // Load user from storage
        loadUserFromStorage();

        // Initialize UI systems
        initializeUI();

        // Update UI based on auth state
        updateUI();

        // Show home section by default after initialization
        if (typeof window.showSection === 'function') {
            await window.showSection('home');
        }

    } catch (error) {
        // Removed console.error; show a lightweight user notification
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error inicializando la aplicación', 'error');
        }
    }
}


// Make onSectionChange globally accessible
window.onSectionChange = onSectionChange;
// Expose getAuthState globally
window.getAuthState = getAuthState;

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
