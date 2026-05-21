import { authFetch } from "../api/auth-fetch.js";
import { t } from "../languages/i18n.js";
import { cerrarPanelPreferencias } from "../preferences/preferences-ui.js";
import { pintarResultados } from "../results/render-results.js";
import { formatearFechaLocal, obtenerHoraTexto } from "../search/date-time.js";

const favoritesLabel = document.getElementById("favoritesLabel");
const showFavoritesBtn = document.getElementById("showFavoritesBtn");
const preferencesPanel = document.getElementById("preferencesPanel");
const favoritesModal = document.getElementById("favoritesModal");
const closeFavoritesModalBtn = document.getElementById("closeFavoritesModal");
const favoritesResultsContainer = document.getElementById("favoritesResultsContainer");

const preferencesCloseTimeoutRef = { current: null };

function closePreferencePanel() {
    cerrarPanelPreferencias(preferencesPanel, preferencesCloseTimeoutRef);
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
    renderEmptyState(t("favorites.loading"));
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

    return {
        fecha: formatearFechaLocal(nextHourDate),
        hora: obtenerHoraTexto(nextHourDate.getHours())
    };
}

async function loadFavoriteBeaches() {
    if (!favoritesResultsContainer) {
        return;
    }

    try {
        const { fecha, hora } = getNextHourFormatted();
        const response = await authFetch(`/api/favorites?fecha=${fecha}&hora=${hora}`);

        if (!response.ok) {
            throw new Error(t("favorites.fetch_error"));
        }

        const data = await response.json();
        renderFavoriteResults(data.resultados || []);
    }
    catch (error) {
        console.error(error);
        renderEmptyState(t("favorites.load_error"));
    }
}

function renderFavoriteResults(resultados) {
    if (!favoritesResultsContainer) {
        return;
    }

    if (!resultados || resultados.length === 0) {
        renderEmptyState(t("favorites.empty"));
        return;
    }

    pintarResultados(resultados, favoritesResultsContainer, {
        emptyMessage: t("favorites.empty"),
        showScore: false,
        showMotivo: false,
        favoriteButtonLabel: "\u2764\uFE0F",
        favoriteButtonAriaLabel: t("favorites.remove")
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

        if (!sessionStorage.getItem("token")) {
            alert(t("favorites.login_required"));
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
            alert(t("favorites.remove_error"));
        }
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && favoritesModal && !favoritesModal.hidden) {
        closeFavoritesModal();
    }
});

window.toggleSearchUI = openFavoritesModal;
