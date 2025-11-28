// Track loaded components to avoid reloading
const loadedComponents = new Set();

// Load a single component on demand
async function loadComponent(id, file) {
    if (loadedComponents.has(id)) {
        return true; // Already loaded
    }

    try {
        const response = await fetch(file);
        const html = await response.text();
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = html;
            loadedComponents.add(id);

            return true;
        }
    } catch (error) {
        // Removed console.error to avoid leaking logs
        // Optionally notify the user if the UI should show a failure
        if (typeof showNotification === 'function') {
            showNotification(`Error cargando componente: ${file}`, 'error');
        }
        return false;
    }
}

// Load only essential components initially
export async function loadInitialComponents() {
    // Load header dependencies
    ['assets/css/components/navbar.css', 'assets/css/components/buttons.css'].forEach(css => loadCSS(css));
    ['assets/css/components/footer.css'].forEach(css => loadCSS(css));

    // Only load header at startup (critical for navigation)
    await loadComponent('header', 'components/header.html');
    await loadComponent('footer', 'components/footer.html');
}

// Helper to load CSS dynamically
function loadCSS(href) {
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }
}

// CSS Dependencies Map
const cssDependencies = {
    'header': ['assets/css/components/navbar.css', 'assets/css/components/buttons.css'],
    'hero': ['assets/css/components/buttons.css'],
    'properties': ['assets/css/components/cards.css', 'assets/css/components/filters.css', 'assets/css/components/buttons.css'],
    'loginModal': ['assets/css/components/forms.css', 'assets/css/components/buttons.css'],
    'registerModal': ['assets/css/components/forms.css', 'assets/css/components/buttons.css'],
    'createPropertyModal': ['assets/css/components/forms.css', 'assets/css/components/buttons.css'],
    'propertyDetailModal': ['assets/css/components/carousel.css', 'assets/css/components/buttons.css', 'assets/css/components/cards.css'],
    'reviewModal': ['assets/css/components/reviews.css', 'assets/css/components/forms.css', 'assets/css/components/buttons.css'],
    'chat': ['assets/css/components/chat.css', 'assets/css/components/cards.css'],
};

// Ensure a specific component is loaded
export async function ensureComponentLoaded(componentName) {
    const componentMap = {
        'hero': {
            id: 'hero',
            file: './components/hero.html',
        },
        'properties': {
            id: 'properties-container',
            file: './components/properties.html',
        },
        'chat': {
            id: 'chat-container',
            file: './components/chat.html', 
        },
        'loginModal': {
            id: 'modals-container',
            file: './components/modals/login.html',
            append: true
        },
        'registerModal': {
            id: 'modals-container',
            file: './components/modals/register.html',
            append: true
        },
        'createPropertyModal': {
            id: 'modals-container',
            file: './components/modals/create-property.html',
            append: true
        },
        'propertyDetailModal': {
            id: 'modals-container',
            file: './components/modals/property-detail.html',
            append: true
        },
        'reviewModal': {
            id: 'modals-container',
            file: './components/modals/review.html',
            append: true
        },
        'footer': {
            id: 'footer',
            file: './components/footer.html'
        },    
    };


    
    // Load shared CSS dependencies first
    if (cssDependencies[componentName]) {
        cssDependencies[componentName].forEach(css => loadCSS(css));
    }

    const component = componentMap[componentName];
    if (component) {
        if (component.append) {
            // CORRECCIÓN: Verificar si el modal ya existe en el DOM, no en el container
            if (document.getElementById(componentName)) {
                return true;
            }

            // Load and append
            try {
                const response = await fetch(component.file);
                const html = await response.text();
                let container = document.getElementById(component.id);

                // Crear el contenedor de modals si no existe
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'modals-container';
                    document.body.appendChild(container);
                }

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const modalElement = tempDiv.firstElementChild;

                if (modalElement) {
                    container.appendChild(modalElement);
                    loadedComponents.add(componentName);
                    // Removed debug log
                    return true;
                }
            } catch (error) {
                // Removed console.error; show notification for user-facing feedback
                if (typeof showNotification === 'function') {
                    showNotification(`Error cargando modal: ${component.file}`, 'error');
                }
                return false;
            }
        } else {
            return await loadComponent(component.id, component.file);
        }
    }

    // Removed console.warn; optional user notification
    return false;
}

// Section Navigation with lazy loading
export async function showSection(section) {
    // Removed debug console.log

    // Lazy load components based on section
    if (section === 'home') {
        await ensureComponentLoaded('hero');
    } else if (['properties', 'favorites', 'my-properties'].includes(section)) {
        await ensureComponentLoaded('properties');
    } else if (section === 'chat') {
        await ensureComponentLoaded('chat');  // Cargar componente chat específico
    }

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
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
            sectionElement.classList.remove('hidden');

            // Trigger section-specific loading
            if (typeof window.onSectionChange === 'function') {
                await window.onSectionChange(section);
            }

            // Cargar contenido específico de cada sección
            await loadSectionContent(section);
        }
    }
}

// Función para cargar contenido específico de cada sección
async function loadSectionContent(section) {
    console.log(`Loading content for section: ${section}`);
    
    switch (section) {
        case 'properties':
            if (typeof window.loadProperties === 'function') {
                await window.loadProperties();
            }
            break;
            
        case 'favorites':
            if (typeof window.loadFavorites === 'function') {
                await window.loadFavorites();
            }
            break;
            
        case 'my-properties':
            if (typeof window.loadMyProperties === 'function') {
                await window.loadMyProperties();
            }
            break;
            
        case 'chat':
            // Pequeño delay para asegurar que el DOM esté listo
            setTimeout(async () => {
                console.log('Initializing chat section...');
                
                // Verificar que los elementos del chat existan
                const roomsList = document.getElementById('chatRoomsList');
                const chatMessages = document.getElementById('chatMessages');
                
                console.log('Chat elements:', {
                    roomsList: !!roomsList,
                    chatMessages: !!chatMessages
                });
                
                if (typeof window.loadChatRooms === 'function') {
                    console.log('loadChatRooms function found, calling...');
                    await window.loadChatRooms();
                } else {
                    console.error('loadChatRooms function not found');
                    // Mostrar error en la interfaz
                    if (roomsList) {
                        roomsList.innerHTML = `
                            <div style="text-align: center; color: var(--error); padding: 2rem;">
                                <p>Error: Función de chat no disponible</p>
                                <button class="btn btn-outline" onclick="location.reload()">Recargar</button>
                            </div>
                        `;
                    }
                }
            }, 200);
            break;
    }
}

// Modal Management with lazy loading
export async function openModal(modalId) {
    // Ensure specific modal is loaded
    await ensureComponentLoaded(modalId);

    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

export function closeModal(modalId) {
    // Removed debug console.log
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    } else {
        // Removed console.error; notify user visually if needed
        if (typeof showNotification === 'function') {
            showNotification('Modal no encontrado', 'warning');
        }
    }
}

// Close modal when clicking outside
function setupModalCloseOnOutsideClick() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Notifications
export function showNotification(message, type = 'info') {
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

// Setup navbar scroll effect
export function setupNavbarScroll() {
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

// Initialize UI
export function initializeUI() {
    setupModalCloseOnOutsideClick();
    setupNavbarScroll();
}

// Make functions globally accessible for inline event handlers
window.showSection = showSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.showNotification = showNotification;
window.ensureComponentLoaded = ensureComponentLoaded;
