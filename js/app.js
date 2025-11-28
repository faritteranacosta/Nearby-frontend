// Configuration
const API_URL = 'https://backend-nearby-86jj.onrender.com/api';

// State management
let state = {
    user: null,
    token: null,
    properties: [],
    favorites: [],
    currentSection: 'home'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadUserFromStorage();
    updateUI();

    // Add scroll effect to navbar
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
});

// Load user from localStorage
function loadUserFromStorage() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        state.token = token;
        state.user = JSON.parse(user);
    }
}

// Save user to localStorage
function saveUserToStorage() {
    if (state.token && state.user) {
        localStorage.setItem('token', state.token);
        localStorage.setItem('user', JSON.stringify(state.user));
    }
}

// Clear user from storage
function clearUserFromStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Update UI based on auth state
function updateUI() {
    const guestElements = document.querySelectorAll('.guest-only');
    const authElements = document.querySelectorAll('.auth-only');
    const ownerElements = document.querySelectorAll('.owner-only');

    if (state.user) {
        guestElements.forEach(el => el.classList.add('hidden'));
        authElements.forEach(el => el.classList.remove('hidden'));

        if (state.user.user_type === 'owner') {
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

// API Helper
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};

    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
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
        console.error('API Error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Authentication
async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await apiCall('/auth/login', 'POST', data);
        state.token = response.token;
        state.user = response.user;
        saveUserToStorage();
        updateUI();
        // Initialize Socket.IO for chat
        if (typeof initializeSocket === 'function') {
            initializeSocket();
        }
        closeModal('loginModal');
        showNotification('¡Bienvenido de nuevo!', 'success');
        showSection('properties');
    } catch (error) {
        // Error already handled in apiCall
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await apiCall('/auth/register', 'POST', data);
        state.token = response.token;
        state.user = response.user;
        saveUserToStorage();
        updateUI();
        // Initialize Socket.IO for chat
        if (typeof initializeSocket === 'function') {
            initializeSocket();
        }
        closeModal('registerModal');
        showNotification('¡Cuenta creada exitosamente!', 'success');
        showSection('properties');
    } catch (error) {
        // Error already handled in apiCall
    }
}

function logout() {
    state.user = null;
    state.token = null;
    clearUserFromStorage();
    updateUI();
    showSection('home');
    showNotification('Sesión cerrada', 'info');
}

// Section Navigation
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));

    // Show selected section
    const sectionMap = {
        'home': 'homeSection',
        'properties': 'propertiesSection',
        'favorites': 'favoritesSection',
        'my-properties': 'myPropertiesSection',
        'chat': 'chatSection'
    };

    const sectionId = sectionMap[section];
    if (sectionId) {
        document.getElementById(sectionId).classList.remove('hidden');
        state.currentSection = section;

        // Load data for section
        if (section === 'properties') {
            loadProperties();
        } else if (section === 'favorites') {
            loadFavorites();
        } else if (section === 'my-properties') {
            loadMyProperties();
        } else if (section === 'chat') {
            if (typeof loadChatRooms === 'function') {
                loadChatRooms();
            }
        }
    }
}

// Properties
async function loadProperties(filters = {}) {
    const grid = document.getElementById('propertiesGrid');
    grid.innerHTML = '<div class="spinner"></div>';

    try {
        // Build query string
        const queryParams = new URLSearchParams(filters).toString();
        const response = await apiCall(`/properties?${queryParams}`);
        state.properties = response.properties;
        renderProperties(state.properties, grid);
    } catch (error) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error al cargar propiedades</p>';
    }
}

function renderProperties(properties, container) {
    if (properties.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No se encontraron propiedades</p>';
        return;
    }

    container.innerHTML = properties.map(property => createPropertyCard(property)).join('');
}

function createPropertyCard(property) {
    const images = Array.isArray(property.images) ? property.images : JSON.parse(property.images || '[]');
    const amenities = Array.isArray(property.amenities) ? property.amenities : JSON.parse(property.amenities || '[]');
    const imageUrl = images.length > 0 ? `${API_URL.replace('/api', '')}${images[0]}` : 'images/property1.png';

    const propertyTypes = {
        'apartment': 'Apartamento',
        'house': 'Casa',
        'room': 'Habitación',
        'studio': 'Estudio'
    };

    return `
        <div class="property-card" onclick="showPropertyDetail(${property.id})">
            <img src="${imageUrl}" alt="${property.title}" class="property-image" onerror="this.src='images/property1.png'">
            <div class="property-info">
                <h3 class="property-title">${property.title}</h3>
                <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${property.neighborhood || property.address}</p>
                <div class="property-features">
                    <span class="feature-badge"><i class="fas fa-home"></i> ${propertyTypes[property.property_type] || property.property_type}</span>
                    ${property.bedrooms ? `<span class="feature-badge"><i class="fas fa-bed"></i> ${property.bedrooms}</span>` : ''}
                    ${property.bathrooms ? `<span class="feature-badge"><i class="fas fa-bath"></i> ${property.bathrooms}</span>` : ''}
                    ${property.area_sqm ? `<span class="feature-badge"><i class="fas fa-ruler-combined"></i> ${property.area_sqm}m²</span>` : ''}
                </div>
                <p class="property-price"><i class="fas fa-tag"></i> $${Number(property.price).toLocaleString('es-CO')}/mes</p>
            </div>
        </div>
    `;
}

async function showPropertyDetail(propertyId) {
    try {
        const response = await apiCall(`/properties/${propertyId}`);
        const property = response.property;

        const images = Array.isArray(property.images) ? property.images : JSON.parse(property.images || '[]');
        const amenities = Array.isArray(property.amenities) ? property.amenities : JSON.parse(property.amenities || '[]');

        const propertyTypes = {
            'apartment': 'Apartamento',
            'house': 'Casa',
            'room': 'Habitación',
            'studio': 'Estudio'
        };

        const imageGallery = images.length > 1
            ? `
            <div class="image-carousel">
                <div class="carousel-container" id="carousel-${property.id}">
                    ${images.map(img => `
                        <div class="carousel-slide">
                            <img src="${API_URL.replace('/api', '')}${img}" onerror="this.src='images/property1.png'">
                        </div>
                    `).join('')}
                </div>
                <button class="carousel-btn prev" onclick="moveCarousel('${property.id}', -1)">❮</button>
                <button class="carousel-btn next" onclick="moveCarousel('${property.id}', 1)">❯</button>
                <div class="carousel-indicators">
                    ${images.map((_, i) => `
                        <div class="carousel-indicator ${i === 0 ? 'active' : ''}" 
                             id="indicator-${property.id}-${i}"
                             onclick="goToSlide('${property.id}', ${i})"></div>
                    `).join('')}
                </div>
            </div>`
            : `<img src="${images.length > 0 ? API_URL.replace('/api', '') + images[0] : 'images/property1.png'}" 
                   style="width: 100%; border-radius: var(--radius-md); margin-bottom: 1rem;" 
                   onerror="this.src='images/property1.png'">`;

        const content = `
            ${imageGallery}
            <div class="property-details-column">
                <h3>${property.title}</h3>
                <p style="color: var(--text-muted); margin-bottom: 1rem;"><i class="fas fa-map-marker-alt"></i> ${property.address}</p>
                <h2 style="color: var(--primary-purple-light); margin-bottom: 1rem;"><i class="fas fa-tag"></i> $${Number(property.price).toLocaleString('es-CO')}/mes</h2>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="glass-card" style="padding: 1rem; text-align: center;">
                        <div style="font-size: 2rem;"><i class="fas fa-home"></i></div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Tipo</div>
                        <div style="font-weight: 600;">${propertyTypes[property.property_type]}</div>
                    </div>
                    ${property.bedrooms ? `
                    <div class="glass-card" style="padding: 1rem; text-align: center;">
                        <div style="font-size: 2rem;"><i class="fas fa-bed"></i></div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Habitaciones</div>
                        <div style="font-weight: 600;">${property.bedrooms}</div>
                    </div>` : ''}
                    ${property.bathrooms ? `
                    <div class="glass-card" style="padding: 1rem; text-align: center;">
                        <div style="font-size: 2rem;"><i class="fas fa-bath"></i></div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Baños</div>
                        <div style="font-weight: 600;">${property.bathrooms}</div>
                    </div>` : ''}
                    ${property.area_sqm ? `
                    <div class="glass-card" style="padding: 1rem; text-align: center;">
                        <div style="font-size: 2rem;"><i class="fas fa-ruler-combined"></i></div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Área</div>
                        <div style="font-weight: 600;">${property.area_sqm}m²</div>
                    </div>` : ''}
                </div>
                
                <h4><i class="fas fa-align-left"></i> Descripción</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${property.description || 'Sin descripción'}</p>
                
                ${amenities.length > 0 ? `
                <h4><i class="fas fa-list-check"></i> Amenidades</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
                    ${amenities.map(a => `<span class="feature-badge"><i class="fas fa-check"></i> ${a}</span>`).join('')}
                </div>` : ''}
                
                <h4><i class="fas fa-address-book"></i> Contacto</h4>
                <div class="glass-card" style="padding: 1rem; margin-bottom: 1rem;">
                    <p><i class="fas fa-user"></i> <strong>Propietario:</strong> ${property.owner_name}</p>
                <p><i class="fas fa-phone"></i> <strong>Teléfono:</strong> ${property.owner_phone || 'No disponible'}</p>
                <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${property.owner_email}</p>
            </div>
            
            ${state.user && state.user.user_type === 'student' ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <button class="btn btn-primary" onclick="toggleFavorite(${property.id})">
                    <i class="fas fa-star"></i> Guardar
                </button>
                <button class="btn btn-secondary" onclick="startChatWithOwner(${property.id}, ${property.owner_id})">
                    <i class="fas fa-comments"></i> Chatear
                </button>
            </div>
            <button class="btn btn-outline" onclick="openReviewModal(${property.id})" style="width: 100%;">
                <i class="fas fa-star-half-alt"></i> Dejar Reseña
            </button>` : ''}
            
            <div id="reviewsSection" style="margin-top: 2rem;">
                <div class="spinner"></div>
            </div>
        `;

        document.getElementById('detailTitle').textContent = property.title;
        document.getElementById('propertyDetailContent').innerHTML = content;
        openModal('propertyDetailModal');

        // Load reviews
        if (typeof loadPropertyReviews === 'function') {
            loadPropertyReviews(propertyId).then(reviewsHTML => {
                const reviewsSection = document.getElementById('reviewsSection');
                if (reviewsSection) {
                    reviewsSection.innerHTML = reviewsHTML;
                }
            });
        }
    } catch (error) {
        // Error handled in apiCall
    }
}

// Favorites
async function toggleFavorite(propertyId) {
    if (!state.user) {
        showNotification('Debes iniciar sesión para guardar favoritos', 'warning');
        return;
    }

    try {
        await apiCall('/users/favorites', 'POST', { property_id: propertyId });
        showNotification('Agregado a favoritos', 'success');
    } catch (error) {
        // Error handled in apiCall
    }
}

async function loadFavorites() {
    const grid = document.getElementById('favoritesGrid');
    grid.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await apiCall('/users/favorites');
        renderProperties(response.favorites, grid);
    } catch (error) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error al cargar favoritos</p>';
    }
}

// My Properties (Owner)
async function loadMyProperties() {
    const grid = document.getElementById('myPropertiesGrid');
    grid.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await apiCall('/properties/owner/my-properties');
        renderProperties(response.properties, grid);
    } catch (error) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error al cargar propiedades</p>';
    }
}

async function handleCreateProperty(event) {
    event.preventDefault();

    if (!state.user || state.user.user_type !== 'owner') {
        showNotification('Solo los propietarios pueden publicar propiedades', 'error');
        return;
    }

    const formData = new FormData(event.target);

    // Process amenities
    const amenitiesStr = formData.get('amenities');
    const amenities = amenitiesStr ? amenitiesStr.split(',').map(a => a.trim()) : [];
    formData.delete('amenities');
    formData.append('amenities', JSON.stringify(amenities));

    try {
        await apiCall('/properties', 'POST', formData, true);
        showNotification('Propiedad publicada exitosamente', 'success');
        closeModal('createPropertyModal');
        event.target.reset();
        showSection('my-properties');
    } catch (error) {
        // Error handled in apiCall
    }
}

// Filters
function applyFilters() {
    const filters = {};

    const type = document.getElementById('filterType').value;
    if (type) filters.property_type = type;

    const bedrooms = document.getElementById('filterBedrooms').value;
    if (bedrooms) filters.bedrooms = bedrooms;

    const priceRange = document.getElementById('filterPrice').value;
    if (priceRange) {
        const [min, max] = priceRange.split('-');
        filters.min_price = min;
        filters.max_price = max;
    }

    const search = document.getElementById('filterSearch').value;
    if (search) filters.search = search;

    loadProperties(filters);
}

// Search
function handleHeroSearch(event) {
    if (event.key === 'Enter') {
        searchFromHero();
    }
}

function searchFromHero() {
    const searchTerm = document.getElementById('heroSearch').value;
    showSection('properties');
    document.getElementById('filterSearch').value = searchTerm;
    applyFilters();
}

// Modal Management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Toggle student ID field
function toggleStudentId(userType) {
    const studentIdGroup = document.getElementById('studentIdGroup');
    if (userType === 'student') {
        studentIdGroup.classList.remove('hidden');
    } else {
        studentIdGroup.classList.add('hidden');
    }
}

// Notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--bg-card);
        backdrop-filter: blur(20px);
        border: 2px solid ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : type === 'warning' ? 'var(--warning)' : 'var(--info)'};
        border-radius: var(--radius-md);
        padding: 1rem 1.5rem;
        color: var(--text-primary);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Carousel Functions
window.moveCarousel = function (propertyId, direction) {
    const container = document.getElementById(`carousel-${propertyId}`);
    if (!container) return;

    const slides = container.children;
    const totalSlides = slides.length;

    // Get current index from data attribute or default to 0
    let currentIndex = parseInt(container.getAttribute('data-current-index') || '0');

    // Calculate new index
    let newIndex = currentIndex + direction;

    // Loop around
    if (newIndex < 0) newIndex = totalSlides - 1;
    if (newIndex >= totalSlides) newIndex = 0;

    // Update state
    container.setAttribute('data-current-index', newIndex);

    // Move container
    container.style.transform = `translateX(-${newIndex * 100}%)`;

    // Update indicators
    const indicators = document.querySelectorAll(`#indicator-${propertyId}-${currentIndex}, #indicator-${propertyId}-${newIndex}`);
    indicators.forEach(ind => {
        if (ind.id.endsWith(`-${newIndex}`)) {
            ind.classList.add('active');
        } else {
            ind.classList.remove('active');
        }
    });
};

window.goToSlide = function (propertyId, index) {
    const container = document.getElementById(`carousel-${propertyId}`);
    if (!container) return;

    // Update state
    container.setAttribute('data-current-index', index);

    // Move container
    container.style.transform = `translateX(-${index * 100}%)`;

    // Update indicators
    const allIndicators = container.parentElement.querySelectorAll('.carousel-indicator');
    allIndicators.forEach((ind, i) => {
        if (i === index) {
            ind.classList.add('active');
        } else {
            ind.classList.remove('active');
        }
    });
};
