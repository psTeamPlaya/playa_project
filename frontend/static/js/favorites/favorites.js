const favoritesLabel = document.getElementById("favoritesLabel");
const showFavoritesBtn = document.getElementById("showFavoritesBtn");
const preferencesPanel = document.getElementById("preferencesPanel");
const favoritesModal = document.getElementById("favoritesModal");
const closeFavoritesModalBtn = document.getElementById("closeFavoritesModal");
const favoritesResultsContainer = document.getElementById("favoritesResultsContainer");

let preferencesCloseTimeout;

function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });
}

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

    favoritesResultsContainer.innerHTML = resultados.map((playa, index) => {
        const servicios = formatServices(playa.servicios);
        const condiciones = playa.condiciones || {};

        return `
            <details class="beach-card desplegable">
                <summary class="beach-summary">
                    <div class="beach-summary-left">
                        <div class="ranking-badge">#${index + 1}</div>
                        <div>
                            <h3 class="beach-title">${playa.nombre}</h3>
                            <div class="beach-location">${playa.ubicacion}</div>
                            <div class="beach-short-motivo"></div>
                        </div>
                    </div>

                    <div class="beach-summary-right">
                        <button class="favorite-btn" data-id="${playa.beach_id}" aria-label="Quitar de favoritas">
                            ❤️
                        </button>
                        <span class="expand-hint" aria-hidden="true">+</span>
                    </div>
                </summary>

                <div class="beach-detail">
                    <p class="beach-desc">${playa.descripcion}</p>

                    <div class="meta-list">
                        <span class="chip">🏖️ Tipo: ${playa.tipo}</span>
                        <span class="chip">🌡️ Temp. aire: ${condiciones.air_temp ?? "N/A"} ºC</span>
                        <span class="chip">🌊 Oleaje: ${condiciones.wave_height ?? "N/A"} m</span>
                        <span class="chip">💨 Viento: ${condiciones.wind_speed ?? "N/A"} km/h</span>
                        <span class="chip">🌡️ Agua: ${condiciones.water_temp ?? "N/A"} ºC</span>
                        <span class="chip">🌤️ Nubosidad: ${condiciones.cloud_cover ?? "N/A"}%</span>
                        <span class="chip">🌧️ Lluvia: ${condiciones.rain_probability ?? "N/A"}%</span>
                        <span class="chip">🌙 Marea: ${formatTide(condiciones)}</span>
                    </div>

                    <div class="services-list">
                        ${servicios}
                    </div>
                </div>
            </details>
        `;
    }).join("");

    configureDetailsAnimation();
}

function configureDetailsAnimation() {
    const beachCards = favoritesResultsContainer?.querySelectorAll(".beach-card") || [];

    beachCards.forEach((card) => {
        card.addEventListener("toggle", () => {
            if (!card.open) {
                card.classList.remove("is-revealing");
                return;
            }

            card.classList.remove("is-revealing");
            void card.offsetWidth;
            card.classList.add("is-revealing");
        });
    });
}

function formatServices(servicios = {}) {
    const icons = {
        restaurantes: "🍽️ Restaurantes",
        comida_para_llevar: "🥡 Comida para llevar",
        balnearios: "🚿 Balneario",
        balneario: "🚿 Balneario",
        zona_deportiva: "🏐 Zona deportiva",
        escuela_surf: "🏄 Escuela de surf",
        escuela_windsurf: "🌬️ Escuela de windsurf"
    };

    return Object.entries(servicios)
        .filter(([_, disponible]) => disponible)
        .map(([clave]) => `<span class="chip">${icons[clave] || clave}</span>`)
        .join("");
}

function formatTide(condiciones = {}) {
    if (typeof condiciones.marea === "string" && condiciones.marea.trim()) {
        return condiciones.marea;
    }

    const tideValue = Number(condiciones.tide);
    if (Number.isNaN(tideValue)) {
        return "N/A";
    }
    if (tideValue <= -0.10) {
        return "baja";
    }
    if (tideValue >= 0.10) {
        return "alta";
    }
    return "media";
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
