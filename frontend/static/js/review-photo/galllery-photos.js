import { authFetch } from "../api/auth-fetch.js";

const resultsContainer = document.getElementById("resultsContainer");
const favoritesResultsContainer = document.getElementById("favoritesResultsContainer");

// Register click listeners with explicit event object to ensure cross-browser compatibility
resultsContainer.addEventListener("click", (e) => openBeachPhotosModal(e));
favoritesResultsContainer.addEventListener("click", (e) => openBeachPhotosModal(e));

/**
 * Calculates human-readable relative time (e.g., "Hace 10 min") 
 * based on Unix timestamp in seconds.
 */
function formatRelativeTime(timestampInSeconds) {
    if (!timestampInSeconds) return "";
    
    const now = Math.floor(Date.now() / 1000);
    const diffInSeconds = now - Math.floor(timestampInSeconds);

    if (diffInSeconds < 0) return "Ahora mismo";
    if (diffInSeconds < 60) return "Ahora mismo";
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Ayer";
    return `Hace ${diffInDays} días`;
}

export async function openBeachPhotosModal(e) {
    const btn = e.target.closest(".photos-badge");
    if (!btn) return;

    const beachId = btn.dataset.id;

    // Prevent duplicate modals in DOM
    const existingModal = document.getElementById("beachPhotosModal");
    if (existingModal) existingModal.remove();

    // Create modal overlay container
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "beachPhotosModal";
    modalWrapper.className = "modal-overlay";

    // Inject modal HTML structure
    modalWrapper.innerHTML = `
    <div class="modal-backdrop" id="photosManagementModal">
        <div class="photos-client-modal auth-modal reviews-modal">
            <button class="modal-close" id="closePhotosManagementModal" type="button">&times;</button>
            <div class="photos-modal-layout">
                <div class="photos-modal-header">
                    <h3>📷 Galería de Fotos</h3>
                </div>
                <div id="photosModalContent" class="photos-grid-content">
                    <div class="loader">Cargando fotos...</div>
                </div>
            </div>
        </div>
    </div>`;

    document.body.appendChild(modalWrapper);

    const closeBtn = modalWrapper.querySelector("#closePhotosManagementModal");
    const contentContainer = modalWrapper.querySelector("#photosModalContent");

    /**
     * Renders the photo gallery grid.
     * Expects an array of photo objects with base64 data and unix timestamps.
     */
    function renderPhotosGrid(photos) {
        if (!photos || photos.length === 0) {
            contentContainer.innerHTML = `
                <div class="empty-state-photos">
                    <p class="empty">No hay fotos disponibles para esta playa todavía.</p>
                </div>`;
            return;
        }

        contentContainer.innerHTML = `
            <div class="client-photos-grid">
                ${photos.map(p => {
                    const base64Data = p.photo;
                    const src = base64Data.startsWith('data:') 
                        ? base64Data 
                        : `data:image/jpeg;base64,${base64Data}`;

                    // Convert Unix seconds to JS milliseconds for Date constructor
                    const timestampInMs = p.timestamp ? p.timestamp * 1000 : null;
                    const dateText = timestampInMs 
                        ? new Date(timestampInMs).toLocaleDateString() 
                        : "Foto de la playa";

                    const timeAgoText = formatRelativeTime(p.timestamp);

                    return `
                        <div class="photo-card-item" title="Subido el: ${dateText}">
                            <img src="${src}" alt="Foto del ${dateText}" loading="lazy" />
                            ${timeAgoText ? `<span class="photo-time-badge">${timeAgoText}</span>` : ""}
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    // Close modal when clicking outside the content box
    function modalClickEvents(ev) {
        if (ev.target === modalWrapper.querySelector("#photosManagementModal")) {
            modalWrapper.remove();
        }
    }

    closeBtn.addEventListener("click", () => modalWrapper.remove());
    modalWrapper.addEventListener("click", modalClickEvents);

    // Fetch and render data from the FastAPI backend
    try {
        const res = await fetch(`api/review-photo/get-photos/${beachId}`);
        if (!res.ok) throw new Error("Status " + res.status);
        const data = await res.json();

        renderPhotosGrid(data.photos);
    } catch (err) {
        console.error("Error loading beach photos: ", err);
        contentContainer.innerHTML = `<p class="error">Error al cargar las fotos. Inténtalo de nuevo más tarde.</p>`;
    }
}