import { pintarResultados } from "../results/render-results.js";
import { authFetch } from "../api/auth-fetch.js";

const favoritesLabel = document.getElementById("favoritesLabel");
const showFavoritesBtn = document.getElementById("showFavoritesBtn");
const preferencesPanel = document.getElementById("preferencesPanel");
const favoritesModal = document.getElementById("favoritesModal");
const closeFavoritesModalBtn = document.getElementById("closeFavoritesModal");
const favoritesResultsContainer = document.getElementById("favoritesResultsContainer");

let preferencesCloseTimeout;

function closePreferencePanel() {
    if (preferencesPanel) {
        preferencesPanel.classList.remove("is-open");
        clearTimeout(preferencesCloseTimeout);
        preferencesCloseTimeout = setTimeout(() => {
            preferencesPanel.hidden = true;
        }, 220);
    }
}

function renderEmptyState(message) {
    if (!favoritesResultsContainer) {
        return;
    }

    favoritesResultsContainer.innerHTML = `
        <div class="empty-state">
            ${message}
        </div>
    `;
}

function openFavoritesModal() {
    if (!favoritesModal) {
        return;
    }

    favoritesModal.hidden = false;
    document.body.classList.add("favorites-modal-open");
    renderEmptyState("Cargando playas favoritas...");
    closePreferencePanel();
    loadFavoriteBeaches();
}

function closeFavoritesModal() {
    if (!favoritesModal) {
        return;
    }

    favoritesModal.hidden = true;
    document.body.classList.remove("favorites-modal-open");
}

function getNextHourFormatted() {
    const now = new Date();
    const nextHourDate = new Date(now);

    nextHourDate.setHours(now.getHours() + 1);
    nextHourDate.setMinutes(0);
    nextHourDate.setSeconds(0);

    const year = nextHourDate.getFullYear();
    const month = String(nextHourDate.getMonth() + 1).padStart(2, "0");
    const day = String(nextHourDate.getDate()).padStart(2, "0");
    const fecha = `${year}-${month}-${day}`;
    const hora = `${String(nextHourDate.getHours()).padStart(2, "0")}:00`;

    return { fecha, hora };
}

async function loadFavoriteBeaches() {
    if (!favoritesResultsContainer) {
        return;
    }

    try {
        const { fecha, hora } = getNextHourFormatted();
        const response = await authFetch(`/api/favorites?fecha=${fecha}&hora=${hora}`);

        if (!response.ok) {
            throw new Error("No se pudieron obtener las favoritas.");
        }

        const data = await response.json();
        renderFavoriteResults(data.resultados || []);
    }
    catch (error) {
        console.error(error);
        renderEmptyState("No se pudieron cargar tus playas favoritas.");
    }
}

function renderFavoriteResults(resultados) {
    if (!favoritesResultsContainer) {
        return;
    }

    if (!resultados || resultados.length === 0) {
        renderEmptyState("Todavia no has guardado playas favoritas.");
        return;
    }

    pintarResultados(resultados, favoritesResultsContainer, {
        emptyMessage: "Todavia no has guardado playas favoritas.",
        showScore: false,
        showMotivo: false,
        favoriteButtonLabel: "\u2764\uFE0F",
        favoriteButtonAriaLabel: "Quitar de favoritas"
    });
}

async function removeFavorite(beachId) {
    await authFetch(`/api/favorites/${beachId}`, { method: "DELETE" });
    await loadFavoriteBeaches();
}

if (favoritesLabel) {
    favoritesLabel.addEventListener("click", (event) => {
        event.preventDefault();
    });
}

if (showFavoritesBtn) {
    showFavoritesBtn.addEventListener("click", (event) => {
        event.preventDefault();

        if (!localStorage.getItem("token")) {
            alert("Inicia sesion para ver tus playas favoritas.");
            closePreferencePanel();
            return;
        }

        openFavoritesModal();
    });
}

if (closeFavoritesModalBtn) {
    closeFavoritesModalBtn.addEventListener("click", closeFavoritesModal);
}

if (favoritesModal) {
    favoritesModal.addEventListener("click", (event) => {
        if (event.target === favoritesModal) {
            closeFavoritesModal();
        }
    });
}

if (favoritesResultsContainer) {
    favoritesResultsContainer.addEventListener("click", async (event) => {
        const btn = event.target.closest(".favorite-btn");
        if (!btn) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        try {
            await removeFavorite(Number(btn.dataset.id));
        }
        catch (error) {
            console.error(error);
            alert("No se pudo quitar la playa de favoritas.");
        }
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && favoritesModal && !favoritesModal.hidden) {
        closeFavoritesModal();
    }
});

window.toggleSearchUI = openFavoritesModal;

