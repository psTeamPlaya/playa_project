const favoritesLabel = document.getElementById("favoritesLabel");
const preferencesPanel = document.getElementById("preferencesPanel");
const resultsContainer = document.getElementById("resultsContainer");

let isFavoritesMode = false;
let preferencesCloseTimeout;

favoritesLabel.addEventListener("click", (e) => {
    // prevent default
    e.preventDefault(); 
    console.log("Favorites label clicked");  // TODO for debug
    console.log("isFavoritesMode before toggle:", isFavoritesMode);  // TODO for debug
    isFavoritesMode = !isFavoritesMode;  // toggle the mode

    toggleSearchUI(!isFavoritesMode);  // toggle search UI based on current visibility
    if (isFavoritesMode) {
        loadFavoriteBeaches();
    }

    closePreferencePanel();
 
});

const searchUIIds = [
    "activitySection", 
    "dateSection", 
    "locationSection", 
    "searchSection",
    "quantitySlider",
    "filtersSidebar"
];


/**
 * Helper to toggle visibility for all search-related elements
 * @param {boolean} show - true to show search UI, false to hide it
 */
function toggleSearchUI(show) {
    searchUIIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // use .hidden for the sidebar because CSS depends on it
            el.hidden = !show; 
            // use .hidden class for the others
            show ? el.classList.remove("hidden") : el.classList.add("hidden");
        }
    });

    // Add/Remove body class to trigger the layout fix
    document.body.classList.toggle("showing-favorites", !show);
    const beachesLabel = document.getElementById("beachesLabel");
    if (show) {
        beachesLabel.textContent = "Playas recomendadas";
    } else {
        beachesLabel.textContent = "Mis playas favoritas";
        resultsContainer.innerHTML = `
            <div class="empty-state">
                Por ahora no hay ninguna recomendacion de playas.
            </div>
        `;  // put back when exiting favorites mode

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

function closePreferencePanel() {
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
    const { fecha, hora } = getNextHourFormatted();
    const response = await authFetch(`/api/favorites?fecha=${fecha}&hora=${hora}`);
    console.log(`Fetching favorites for: ${fecha} at ${hora}`);  // TODO for debug
    if (!response.ok) {
        throw new Error("No se pudieron obtener las recomendaciones.");
    }

    const data = await response.json();
    console.log("DATA COMPLETA DEL BACKEND:", data);    // TODO for debug

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
