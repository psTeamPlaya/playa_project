// import { authFetch, loadCurrentUser, getFavoriteBeachIds } from "../main.js";

const favoritesLabel = document.getElementById("favoritesLabel");
const preferencesPanel = document.getElementById("preferencesPanel");

let isFavoritesMode = false;
let preferencesCloseTimeout;

favoritesLabel.addEventListener("click", (e) => {
    // Prevent default if you find it double-triggering
    e.preventDefault(); 
    console.log("Favorites label clicked");  // TODO for debug    
    // cerrarPanelPreferencias(); 

    console.log("isFavoritesMode before toggle:", isFavoritesMode);  // TODO for debug
    isFavoritesMode = !isFavoritesMode;  // Toggle the mode

    toggleSearchUI(!isFavoritesMode);  // Toggle search UI based on current visibility
    if (isFavoritesMode) {
        loadFavoriteBeaches();
        cerrarPanelPreferencias();
    } else {
        resultsContainer.innerHTML = "";  // Clear results when exiting favorites mode
    }
});

const searchUIIds = [
    "activitySection", 
    "dateSection", 
    "locationSection", 
    "searchSection",
    "quantitySlider",
    // "filtersSidebar"
];


/**
 * Helper to toggle visibility for all search-related elements
 * @param {boolean} show - true to show search UI, false to hide it
 */
function toggleSearchUI(show) {
    searchUIIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (show) {
                el.classList.remove("hidden");
            } else {
                el.classList.add("hidden");
            }
        }
    });
    const beachesLabel = document.getElementById("beachesLabel");
    if (show) {
        beachesLabel.textContent = "Playas recomendadas";
    } else {
        beachesLabel.textContent = "Mis playas favoritas";
    }
}

function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            "Authorization": `Bearer ${token}`
        }
    });
}

function cerrarPanelPreferencias() {
    if (preferencesPanel) {
        preferencesPanel.classList.remove("is-open");
        clearTimeout(preferencesCloseTimeout);
        preferencesCloseTimeout = setTimeout(() => {
            preferencesPanel.hidden = true;
        }, 220);
    }
}

function getNextHourFormatted() {
    const now = new Date();
    
    // Create a new date object for the "next hour"
    const nextHourDate = new Date(now);
    nextHourDate.setHours(now.getHours() + 1);
    nextHourDate.setMinutes(0);
    nextHourDate.setSeconds(0);

    // Format Date: YYYY-MM-DD
    const year = nextHourDate.getFullYear();
    const month = String(nextHourDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextHourDate.getDate()).padStart(2, '0');
    const fecha = `${year}-${month}-${day}`;

    // Format Time: HH:mm
    const hora = String(nextHourDate.getHours()).padStart(2, '0') + ":00";

    return { fecha, hora };
}

async function loadFavoriteBeaches() {
    console.log("Loading favorite beaches...");  // TODO for debug
    // const response = await fetch(`/api/favorites?${params.toString()}`);
    // const response = await authFetch(`/api/favorites?fecha=2026-05-05&hora=08:00`);  // TODO hardcoded for debug
    const { fecha, hora } = getNextHourFormatted();
    const response = await authFetch(`/api/favorites?fecha=${fecha}&hora=${hora}`);
    console.log(`Fetching favorites for: ${fecha} at ${hora}`);  // TODO for debug
    if (!response.ok) {
        throw new Error("No se pudieron obtener las recomendaciones.");
    }

    const data = await response.json();
    console.log("DATA COMPLETA DEL BACKEND:", data);

    pintarResultados(data.resultados);
    
}


function pintarResultados(resultados) {
    if (!resultados || resultados.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
            No hay resultados para esa búsqueda.
            </div>
        `;
        return;
    }
    resultsContainer.innerHTML = resultados.map((playa, index) => {
        const servicios = formatearServicios(playa.servicios);
        const condiciones = playa.condiciones;

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
                <button class="favorite-btn" data-id="${playa.beach_id}">
                    ${playa.isFavorite ? '❤️' : '🤍'}
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
                <span class="chip">🌙 Marea: ${condiciones.tide ?? "N/A"}</span>
                </div>

                <div class="services-list">
                ${servicios}
                </div>
            </div>
            </details>
        `;
    }).join("");

    configurarAnimacionDetalles();
}

function configurarAnimacionDetalles() {
    const beachCards = resultsContainer.querySelectorAll(".beach-card");

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

function formatearServicios(servicios) {
    const iconos = {
        restaurantes: "🍽️ Restaurantes",
        comida_para_llevar: "🥡 Comida para llevar",
        balneario: "🚿 Balneario",
        zona_deportiva: "🏐 Zona deportiva",
        escuela_surf: "🏄 Escuela de surf",
        escuela_windsurf: "🌬️ Escuela de windsurf"
    };
    return Object.entries(servicios)
        .filter(([_, disponible]) => disponible)
        .map(([clave]) => `<span class="chip">${iconos[clave] || clave}</span>`)
        .join("");
}


/* export async function loadFavoritesPage() {
    console.log("Loading favorites page...");  // TODO for debug
    const user = await loadCurrentUser();
    if (!user) {
        alert("Please log in to view your favorites.");
        window.location.href = "/login";
        return;
    }

    const favoriteBeachIds = await getFavoriteBeachIds();
    const favoritesContainer = document.getElementById("favoritesContainer");
    favoritesContainer.innerHTML = "";  // Clear previous content

    if (favoriteBeachIds.length === 0) {
        favoritesContainer.innerHTML = "<p>You have no favorite beaches yet.</p>";
        return;
    }

    for (const beachId of favoriteBeachIds) {
        try {
            const response = await authFetch(`/api/beaches/${beachId}`);
            if (!response.ok) {
                console.error(`Failed to fetch beach with ID ${beachId}`);
                continue;
            }
            const beachData = await response.json();
            const beachItem = document.createElement("div");
            beachItem.className = "favorite-beach-item";
            beachItem.innerHTML = `
                <h3>${beachData.name}</h3>
                <p>${beachData.description}</p>
                <button onclick="removeFromFavorites(${beachId})">Remove from Favorites</button>
            `;
            favoritesContainer.appendChild(beachItem);
        } catch (error) {
            console.error(`Error fetching beach with ID ${beachId}:`, error);
        }
    }
}

export async function removeFromFavorites(beachId) {
    try {
        const response = await authFetch(`/api/favorites/${beachId}`, {
            method: "DELETE"
        });
        if (!response.ok) {
            alert("Failed to remove beach from favorites.");
            return;
        }
        alert("Beach removed from favorites.");
        loadFavoritesPage();  // Refresh the list
    } catch (error) {
        console.error(`Error removing beach with ID ${beachId} from favorites:`, error);
        alert("An error occurred while trying to remove the beach from favorites.");
    }
}

loadFavoritesPage(); */