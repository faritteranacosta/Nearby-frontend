import { showNotification } from './ui.js';

// Properties state
let propertiesState = {
  all: [],
  currentSection: 'home'
};



// Get API_URL from global scope
const API_URL = window.API_URL || CONFIG.API_URL;

// Load properties with filters
export async function loadProperties(filters = {}) {
  const grid = document.getElementById('propertiesGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await window.apiCall(`/properties?${queryParams}`);
    propertiesState.all = response.properties;
    renderProperties(response.properties, grid);
  } catch (error) {
    grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error al cargar propiedades</p>';
  }
}

// Render properties
function renderProperties(properties, container) {
  if (properties.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No se encontraron propiedades</p>';
    return;
  }

  container.innerHTML = properties.map(property => createPropertyCard(property)).join('');
}

// Create property card HTML
function createPropertyCard(property) {
  const images = Array.isArray(property.images) ? property.images : JSON.parse(property.images || '[]');
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

// Show property detail modal
export async function showPropertyDetail(propertyId) {

  // Ensure propertyDetailModal component is loaded first
  if (window.ensureComponentLoaded) {
    const loaded = await window.ensureComponentLoaded('propertyDetailModal');
  }

  try {
    const response = await window.apiCall(`/properties/${propertyId}`);
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

    const authState = window.getAuthState ? await window.getAuthState() : { user: null };

    const content = `
    <div class="property-modal-grid">
        <!-- Columna izquierda - Imágenes SIN scroll -->
        <div class="property-visuals">
            ${imageGallery}
        </div>
        
        <!-- Columna derecha - Detalles CON scroll -->
        <div class="property-details-column">
            <div class="property-details-content">
                <h3>${property.title}</h3>
                <p style="color: var(--text-muted); margin: 0;"><i class="fas fa-map-marker-alt"></i> ${property.address}</p>
                <h2><i class="fas fa-tag"></i> $${Number(property.price).toLocaleString('es-CO')}/mes</h2>
                
                <div class="features-grid">
                    <div class="glass-card">
                        <div style="font-size: 2rem;"><i class="fas fa-home"></i></div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Tipo</div>
                        <div style="font-weight: 600;">${propertyTypes[property.property_type]}</div>
                    </div>
                    ${property.bedrooms ? `
                    <div class="glass-card">
                        <div style="font-size: 2rem;"><i class="fas fa-bed"></i></div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Habitaciones</div>
                        <div style="font-weight: 600;">${property.bedrooms}</div>
                    </div>` : ''}
                    ${property.bathrooms ? `
                    <div class="glass-card">
                        <div style="font-size: 2rem;"><i class="fas fa-bath"></i></div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Baños</div>
                        <div style="font-weight: 600;">${property.bathrooms}</div>
                    </div>` : ''}
                    ${property.area_sqm ? `
                    <div class="glass-card">
                        <div style="font-size: 2rem;"><i class="fas fa-ruler-combined"></i></div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Área</div>
                        <div style="font-weight: 600;">${property.area_sqm}m²</div>
                    </div>` : ''}
                </div>
                
                <h4><i class="fas fa-align-left"></i> Descripción</h4>
                <p style="color: var(--text-secondary); margin: 0;">${property.description || 'Sin descripción'}</p>
                
                ${amenities.length > 0 ? `
                <h4><i class="fas fa-list-check"></i> Amenidades</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${amenities.map(a => `<span class="feature-badge"><i class="fas fa-check"></i> ${a}</span>`).join('')}
                </div>` : ''}
                
                <h4><i class="fas fa-address-book"></i> Contacto</h4>
                <div class="contact-info">
                    <p><i class="fas fa-user"></i> <strong>Propietario:</strong> ${property.owner_name}</p>
                    <p><i class="fas fa-phone"></i> <strong>Teléfono:</strong> ${property.owner_phone || 'No disponible'}</p>
                    <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${property.owner_email}</p>
                </div>
                
                ${authState.user && authState.user.user_type === 'student' ? `
                <div class="action-buttons">
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
                
                <div id="reviewsSection" style="margin-top: 1rem;">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    </div>
`;

    const detailTitle = document.getElementById('detailTitle');
    const detailContent = document.getElementById('propertyDetailContent');
    const modal = document.getElementById('propertyDetailModal');

    console.log('🔍 Modal elements check:', {
      modal: !!modal,
      detailTitle: !!detailTitle,
      detailContent: !!detailContent
    });

    if (modal && detailTitle && detailContent) {
      detailTitle.textContent = property.title;
      detailContent.innerHTML = content;

      console.log('Opening modal...');
      window.openModal('propertyDetailModal');

      // Load reviews
      if (typeof window.loadPropertyReviews === 'function') {
        window.loadPropertyReviews(propertyId).then(reviewsHTML => {
          const reviewsSection = document.getElementById('reviewsSection');
          if (reviewsSection) {
            reviewsSection.innerHTML = reviewsHTML;
          }
        });
      }
    } else {
      console.error('Modal elements not found after loading');
      showNotification('Error: No se pudo cargar el modal de detalles', 'error');
    }
  } catch (error) {
    console.error('Error loading property details:', error);
    showNotification('Error al cargar los detalles de la propiedad', 'error');
  }
}

// Toggle favorite
export async function toggleFavorite(propertyId) {
  const authState = window.getAuthState ? await window.getAuthState() : { user: null };

  if (!authState.user) {
    showNotification('Debes iniciar sesión para guardar favoritos', 'warning');
    return;
  }

  try {
    await window.apiCall('/users/favorites', 'POST', { property_id: propertyId });
    showNotification('Agregado a favoritos', 'success');
  } catch (error) {
    // Error handled in apiCall
  }
}

// Load favorites
export async function loadFavorites() {
  const grid = document.getElementById('favoritesGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const response = await window.apiCall('/users/favorites');
    renderProperties(response.favorites, grid);
  } catch (error) {
    grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error al cargar favoritos</p>';
  }
}

// Load owner's properties
export async function loadMyProperties() {
  const grid = document.getElementById('myPropertiesGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const response = await window.apiCall('/properties/owner/my-properties');
    renderProperties(response.properties, grid);
  } catch (error) {
    grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error al cargar propiedades</p>';
  }
}

// Create property
export async function handleCreateProperty(event) {
  event.preventDefault();

  const authState = window.getAuthState ? await window.getAuthState() : { user: null };

  // 🔍 DIAGNÓSTICO - Logging detallado
  console.log('🔍 === DIAGNÓSTICO DE CREACIÓN DE PROPIEDAD ===');
  console.log('1. window.getAuthState existe?', typeof window.getAuthState);
  console.log('2. authState completo:', authState);
  console.log('3. authState.user:', authState.user);
  console.log('4. authState.user?.user_type:', authState.user?.user_type);
  console.log('5. Tipo de user_type:', typeof authState.user?.user_type);
  console.log('6. Comparación estricta:', authState.user?.user_type === 'owner');
  console.log('7. localStorage user:', localStorage.getItem('user'));
  console.log('8. localStorage user parseado:', JSON.parse(localStorage.getItem('user') || 'null'));
  console.log('9. window.state:', window.state);
  console.log('===============================================');

  if (!authState.user || authState.user.user_type !== 'owner') {
    console.error('❌ VALIDACIÓN FALLIDA:', {
      tieneUsuario: !!authState.user,
      userType: authState.user?.user_type,
      esperado: 'owner',
      razon: !authState.user ? 'No hay usuario' : `user_type es "${authState.user.user_type}" en lugar de "owner"`
    });
    showNotification('Solo los propietarios pueden publicar propiedades', 'error');
    return;
  }

  console.log('✅ Validación exitosa, procediendo a crear propiedad...');

  const formData = new FormData(event.target);

  // Process amenities
  const amenitiesStr = formData.get('amenities');
  const amenities = amenitiesStr ? amenitiesStr.split(',').map(a => a.trim()) : [];
  formData.delete('amenities');
  formData.append('amenities', JSON.stringify(amenities));

  try {
    await window.apiCall('/properties', 'POST', formData, true);
    showNotification('Propiedad publicada exitosamente', 'success');
    window.closeModal('createPropertyModal');
    event.target.reset();
    window.showSection('my-properties');
  } catch (error) {
    // Error handled in apiCall
  }
}

// Filter properties
export function applyFilters() {
  const filters = {};

  const type = document.getElementById('filterType')?.value;
  if (type) filters.property_type = type;

  const bedrooms = document.getElementById('filterBedrooms')?.value;
  if (bedrooms) filters.bedrooms = bedrooms;

  const priceRange = document.getElementById('filterPrice')?.value;
  if (priceRange) {
    const [min, max] = priceRange.split('-');
    filters.min_price = min;
    filters.max_price = max;
  }

  const search = document.getElementById('filterSearch')?.value;
  if (search) filters.search = search;

  loadProperties(filters);
}

// Hero search handlers
export function handleHeroSearch(event) {
  if (event.key === 'Enter') {
    searchFromHero();
  }
}

export function searchFromHero() {
  const searchTerm = document.getElementById('heroSearch')?.value;
  window.showSection('properties');
  const filterSearch = document.getElementById('filterSearch');
  if (filterSearch) {
    filterSearch.value = searchTerm || '';
    applyFilters();
  }
}

// Carousel functions
export function moveCarousel(propertyId, direction) {
  const container = document.getElementById(`carousel-${propertyId}`);
  if (!container) return;

  const slides = container.children;
  const totalSlides = slides.length;

  let currentIndex = parseInt(container.getAttribute('data-current-index') || '0');
  let newIndex = currentIndex + direction;

  if (newIndex < 0) newIndex = totalSlides - 1;
  if (newIndex >= totalSlides) newIndex = 0;

  container.setAttribute('data-current-index', newIndex);
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
}

export function goToSlide(propertyId, index) {
  const container = document.getElementById(`carousel-${propertyId}`);
  if (!container) return;

  container.setAttribute('data-current-index', index);
  container.style.transform = `translateX(-${index * 100}%)`;

  const allIndicators = container.parentElement.querySelectorAll('.carousel-indicator');
  allIndicators.forEach((ind, i) => {
    if (i === index) {
      ind.classList.add('active');
    } else {
      ind.classList.remove('active');
    }
  });
}

// Make functions globally accessible
window.showPropertyDetail = showPropertyDetail;
window.toggleFavorite = toggleFavorite;
window.handleCreateProperty = handleCreateProperty;
window.applyFilters = applyFilters;
window.handleHeroSearch = handleHeroSearch;
window.searchFromHero = searchFromHero;
window.moveCarousel = moveCarousel;
window.goToSlide = goToSlide;
