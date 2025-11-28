// Socket.IO connection
let socket = null;
let currentRoom = null;
let selectedRating = 0;

// Auto-initialize Socket.IO if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    initializeStarRating();

    // Wait a bit for state to be loaded
    setTimeout(() => {
        const authState = window.getAuthState ? window.getAuthState() : null;
        if (authState && authState.token && !socket) {
            initializeSocket();
        }
    }, 500);
});

// Initialize Socket.IO when user logs in
function initializeSocket() {
    const authState = window.getAuthState ? window.getAuthState() : null;
    if (!authState || !authState.token) return;

    socket = io('https://backend-nearby-86jj.onrender.com', {
        auth: {
            token: authState.token
        }
    });

    socket.on('connect', () => {
        console.log('Connected to chat server');
    });

    socket.on('new_message', (messageData) => {
        if (currentRoom && messageData.room_id === currentRoom.id) {
            appendMessage(messageData);
        } else {
            // Show notification if not in current room
            if (typeof showNotification === 'function') {
                showNotification('Nuevo mensaje recibido', 'info');
            }
        }
    });

    socket.on('user_typing', (data) => {
        const authState = window.getAuthState ? window.getAuthState() : null;
        if (currentRoom && authState && data.userId !== authState.user.id) {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) {
                indicator.classList.remove('hidden');
                setTimeout(() => {
                    indicator.classList.add('hidden');
                }, 2000);
            }
        }
    });

    socket.on('error', (error) => {
        if (typeof showNotification === 'function') {
            showNotification(error.message, 'error');
        }
    });
}

// Initialize star rating system
function initializeStarRating() {
    const stars = document.querySelectorAll('.star');
    if (stars.length === 0) return;

    stars.forEach(star => {
        star.addEventListener('click', function () {
            selectedRating = parseInt(this.dataset.rating);
            const ratingInput = document.getElementById('ratingValue');
            if (ratingInput) {
                ratingInput.value = selectedRating;
            }
            updateStarDisplay(stars, selectedRating);
        });

        star.addEventListener('mouseenter', function () {
            const rating = parseInt(this.dataset.rating);
            updateStarDisplay(stars, rating, '#FFD700');
        });
    });

    const starRating = document.getElementById('starRating');
    if (starRating) {
        starRating.addEventListener('mouseleave', () => {
            updateStarDisplay(stars, selectedRating);
        });
    }
}

// Helper function to update star display
function updateStarDisplay(stars, rating, color = null) {
    stars.forEach((s, index) => {
        if (index < rating) {
            s.style.color = color || '#FFD700';
            s.classList.add('active');
        } else {
            s.style.color = color || 'var(--text-muted)';
            s.classList.remove('active');
        }
    });
}

// Chat Functions
async function loadChatRooms() {
    const authState = window.getAuthState ? window.getAuthState() : null;
    try {
        const response = await window.apiCall('/chat/rooms');
        const roomsList = document.getElementById('chatRoomsList');

        if (response.rooms.length === 0) {
            roomsList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No hay conversaciones</p>';
            return;
        }

        roomsList.innerHTML = response.rooms.map(room => `
      <div class="chat-room-item" onclick="openChatRoom(${room.id}, '${room.property_title}', '${authState.user.user_type === 'student' ? room.owner_name : room.student_name}')">
        <h5>${room.property_title}</h5>
        <p><strong>${authState.user.user_type === 'student' ? room.owner_name : room.student_name}</strong></p>
        <p>${room.last_message || 'Sin mensajes'}</p>
      </div>
    `).join('');
    } catch (error) {
        console.error('Error loading chat rooms:', error);
    }
}

async function openChatRoom(roomId, propertyTitle, otherUserName) {
    currentRoom = { id: roomId, title: propertyTitle, otherUser: otherUserName };

    // Update header
    document.getElementById('chatHeader').innerHTML = `
    <h4>${propertyTitle}</h4>
    <p style="color: var(--text-muted); margin: 0;">Chat con ${otherUserName}</p>
  `;

    // Show input
    document.getElementById('chatInput').classList.remove('hidden');

    // Join room via Socket.IO
    if (socket) {
        socket.emit('join_room', roomId);
    }

    // Load messages
    try {
        const response = await window.apiCall(`/chat/rooms/${roomId}/messages`);
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';

        response.messages.forEach(msg => appendMessage(msg));

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
    }

    // Mark room as active
    document.querySelectorAll('.chat-room-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.chat-room-item')?.classList.add('active');
}

function appendMessage(messageData) {
    const authState = window.getAuthState ? window.getAuthState() : null;
    const messagesContainer = document.getElementById('chatMessages');
    const isSent = messageData.sender_id === authState.user.id;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isSent ? 'sent' : 'received'}`;
    messageDiv.innerHTML = `
    ${!isSent ? `<div class="sender">${messageData.sender_name}</div>` : ''}
    <div class="message-text">${messageData.message}</div>
    <div class="timestamp">${new Date(messageData.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
  `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || !currentRoom) return;

    if (socket && socket.connected) {
        socket.emit('send_message', {
            room_id: currentRoom.id,
            message: message
        });
        input.value = '';
    } else {
        if (typeof showNotification === 'function') {
            showNotification('No estás conectado al chat', 'error');
        }
    }
}

function handleMessageKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    } else {
        // Send typing indicator
        if (socket && currentRoom) {
            socket.emit('typing', {
                room_id: currentRoom.id,
                isTyping: true
            });
        }
    }
}

async function startChatWithOwner(propertyId, ownerId) {
    const authState = window.getAuthState ? window.getAuthState() : null;

    if (!authState || !authState.user) {
        if (typeof showNotification === 'function') {
            showNotification('Debes iniciar sesión para chatear', 'warning');
        }
        if (typeof openModal === 'function') {
            openModal('loginModal');
        }
        return;
    }

    try {
        const response = await window.apiCall('/chat/rooms', 'POST', { property_id: propertyId });

        if (typeof showSection === 'function') {
            showSection('chat');
        }

        loadChatRooms();

        setTimeout(() => {
            openChatRoom(response.room.id, 'Propiedad', 'Propietario');
        }, 500);
    } catch (error) {
        console.error('Error starting chat:', error);
    }
}

// Reviews Functions
function openReviewModal(propertyId) {
    const authState = window.getAuthState ? window.getAuthState() : null;

    if (!authState || !authState.user) {
        if (typeof showNotification === 'function') {
            showNotification('Debes iniciar sesión para dejar una reseña', 'warning');
        }
        if (typeof openModal === 'function') {
            openModal('loginModal');
        }
        return;
    }

    const propertyIdInput = document.getElementById('reviewPropertyId');
    const ratingInput = document.getElementById('ratingValue');

    if (propertyIdInput) {
        propertyIdInput.value = propertyId;
    }

    selectedRating = 0;

    if (ratingInput) {
        ratingInput.value = '';
    }

    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));

    if (typeof openModal === 'function') {
        openModal('reviewModal');
    }
}

async function handleSubmitReview(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        property_id: parseInt(formData.get('property_id')),
        rating: parseInt(formData.get('rating')),
        comment: formData.get('comment')
    };

    if (!data.rating) {
        if (typeof showNotification === 'function') {
            showNotification('Por favor selecciona una calificación', 'warning');
        }
        return;
    }

    try {
        await window.apiCall('/reviews', 'POST', data);

        if (typeof showNotification === 'function') {
            showNotification('Reseña publicada exitosamente', 'success');
        }

        if (typeof closeModal === 'function') {
            closeModal('reviewModal');
        }

        event.target.reset();
        selectedRating = 0;

        // Reload property details if open
        const modal = document.getElementById('propertyDetailModal');
        if (modal && modal.classList.contains('active')) {
            const propertyId = data.property_id;
            // Reload reviews
            if (typeof loadPropertyReviews === 'function') {
                loadPropertyReviews(propertyId).then(reviewsHTML => {
                    const reviewsSection = document.getElementById('reviewsSection');
                    if (reviewsSection) {
                        reviewsSection.innerHTML = reviewsHTML;
                    }
                });
            }
        }
    } catch (error) {
        // Error handled in apiCall
    }
}

async function loadPropertyReviews(propertyId) {
    try {
        const response = await window.apiCall(`/reviews/property/${propertyId}`);

        if (response.reviews.length === 0) {
            return '<p style="color: var(--text-muted);">No hay reseñas aún</p>';
        }

        const avgRating = response.average_rating || 0;
        const stars = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));

        let html = `
      <div style="background: var(--bg-card); padding: var(--spacing-md); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);">
        <h4>Calificación Promedio</h4>
        <div style="font-size: 2rem; color: #FFD700;">${stars}</div>
        <p style="color: var(--text-secondary);">${avgRating.toFixed(1)} de 5 (${response.total_reviews} reseñas)</p>
      </div>
      <h4>Reseñas</h4>
    `;

        response.reviews.forEach(review => {
            const reviewStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            html += `
        <div class="review-card">
          <div class="review-header">
            <div>
              <div class="review-author">${review.user_name}</div>
              <div class="review-rating">${reviewStars}</div>
            </div>
            <div class="review-date">${new Date(review.created_at).toLocaleDateString('es-CO')}</div>
          </div>
          ${review.comment ? `<div class="review-comment">${review.comment}</div>` : ''}
        </div>
      `;
        });

        return html;
    } catch (error) {
        return '<p style="color: var(--text-muted);">Error al cargar reseñas</p>';
    }
}

// Export functions to global scope
window.initializeSocket = initializeSocket;
window.loadChatRooms = loadChatRooms;
window.openChatRoom = openChatRoom;
window.sendChatMessage = sendChatMessage;
window.handleMessageKeyPress = handleMessageKeyPress;
window.startChatWithOwner = startChatWithOwner;
window.openReviewModal = openReviewModal;
window.handleSubmitReview = handleSubmitReview;
window.loadPropertyReviews = loadPropertyReviews;
