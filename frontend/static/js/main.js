const activityCards = document.querySelectorAll(".activity-card");
const fechaInput = document.getElementById("fecha");

const fechaShell = document.getElementById("fechaShell");
const fechaDisplay = document.getElementById("fechaDisplay");

const buscarBtn = document.getElementById("buscarBtn");
const statusEl = document.getElementById("status");
const resultsContainer = document.getElementById("resultsContainer");
const hourWheel = document.getElementById("hourWheel");

let hourOptions = [];
let actividadSeleccionada = "";
let horaSeleccionada = "";

// =========================================================
// UTILIDADES DE FECHA Y HORA
// =========================================================

function formatearFechaLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function obtenerAbreviaturaDia(fechaTexto) {
    if (!fechaTexto) return "---";

    const [year, month, day] = fechaTexto.split("-").map(Number);
    const fecha = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat("es-ES", { weekday: "short" })
        .format(fecha)
        .replace(".", "")
        .toLowerCase();
}

function formatearFechaVisual(fechaTexto) {
    if (!fechaTexto) return "---";

    const [year, month, day] = fechaTexto.split("-");
    const diaSemana = obtenerAbreviaturaDia(fechaTexto);

    return `${diaSemana} · ${day}/${month}/${year}`;
}

function actualizarTextoFecha() {
    fechaDisplay.textContent = formatearFechaVisual(fechaInput.value);
}

function obtenerHoraMinimaPermitida() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();

    if (minutos === 0) {
        return hora;
    }

    return hora + 1;
}

function obtenerHoraTexto(hourNumber) {
    const horaNormalizada = Math.min(hourNumber, 23);
    return `${String(horaNormalizada).padStart(2, "0")}:00`;
}

function obtenerHorasDisponiblesParaFecha(fechaTexto) {
    const horas = [];
    const hoy = formatearFechaLocal(new Date());

    let horaInicio = 0;

    if (fechaTexto === hoy) {
        horaInicio = obtenerHoraMinimaPermitida();
    }

    for (let hora = horaInicio; hora <= 23; hora++) {
        horas.push(obtenerHoraTexto(hora));
    }

    return horas;
}

function renderizarWheelHoras(fechaTexto) {
    const horasDisponibles = obtenerHorasDisponiblesParaFecha(fechaTexto);

    hourWheel.innerHTML = horasDisponibles
        .map(hora => `<div class="hour-option" data-hour="${hora}">${hora}</div>`)
        .join("");

    hourOptions = [...document.querySelectorAll(".hour-option")];

    hourOptions.forEach(option => {
        option.addEventListener("click", () => {
            option.scrollIntoView({
                block: "center",
                behavior: "smooth"
            });

            horaSeleccionada = option.dataset.hour;
            statusEl.textContent = "";
            setTimeout(actualizarHoraActiva, 180);
        });
    });

    if (!horasDisponibles.includes(horaSeleccionada)) {
        horaSeleccionada = horasDisponibles[0] || "";
    }

    if (horaSeleccionada) {
        fijarHoraInicial(horaSeleccionada);
    }
}

function esFechaHoy(fechaTexto) {
    return fechaTexto === formatearFechaLocal(new Date());
}

function esHoraPasadaParaHoy(horaTexto) {
    if (!esFechaHoy(fechaInput.value)) {
        return false;
    }

    const horaNumero = Number(horaTexto.split(":")[0]);
    const horaMinima = obtenerHoraMinimaPermitida();

    return horaNumero < horaMinima;
}

// ============================================================
// CONFIGURACIÓN INICIAL POR DEFECTO: actividad, fecha y hora
// ============================================================

function seleccionarActividadPorDefecto() {
    const cardTomarSol = document.querySelector('.activity-card[data-activity="tomar_sol"]');

    if (cardTomarSol) {
        activityCards.forEach(c => c.classList.remove("selected"));
        cardTomarSol.classList.add("selected");
        actividadSeleccionada = "tomar_sol";
    }
}

function configurarFechaPorDefecto() {
    const hoy = new Date();
    const fechaHoy = formatearFechaLocal(hoy);

    fechaInput.value = fechaHoy;
    fechaInput.min = fechaHoy;
    actualizarTextoFecha();
}

function configurarHoraPorDefecto() {
    const horaMinima = obtenerHoraMinimaPermitida();

    if (horaMinima > 23) {
        // Si ya no quedan horas disponibles hoy, saltamos a mañana a las 00:00
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);

        fechaInput.value = formatearFechaLocal(manana);
        fijarHoraInicial("00:00");
        return;
    }

    fijarHoraInicial(obtenerHoraTexto(horaMinima));
}

// =========================================================
// DISPONIBILIDAD DE HORAS
// =========================================================

function actualizarHorasDisponibles() {
    renderizarWheelHoras(fechaInput.value);
}

function obtenerPrimeraHoraDisponible() {
    const primeraDisponible = [...hourOptions].find(
        option => !option.classList.contains("disabled-hour")
    );

    return primeraDisponible ? primeraDisponible.dataset.hour : null;
}

function asegurarHoraValidaSeleccionada() {
    const horasDisponibles = obtenerHorasDisponiblesParaFecha(fechaInput.value);

    if (!horaSeleccionada || !horasDisponibles.includes(horaSeleccionada)) {
        const nuevaHoraValida = horasDisponibles[0] || null;

        if (nuevaHoraValida) {
            fijarHoraInicial(nuevaHoraValida);
        } else {
            horaSeleccionada = "";
        }
    }
}

// =========================================================
// RUEDA DE HORAS
// =========================================================

function actualizarHoraActiva() {
    const wheelRect = hourWheel.getBoundingClientRect();
    const wheelCenter = wheelRect.top + wheelRect.height / 2;

    let opcionMasCercana = null;
    let distanciaMinima = Infinity;

    hourOptions.forEach(option => {
        const rect = option.getBoundingClientRect();
        const optionCenter = rect.top + rect.height / 2;
        const distancia = Math.abs(wheelCenter - optionCenter);

        option.classList.remove("active", "near");

        if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            opcionMasCercana = option;
        }
    });

    hourOptions.forEach(option => {
        const rect = option.getBoundingClientRect();
        const optionCenter = rect.top + rect.height / 2;
        const distancia = Math.abs(wheelCenter - optionCenter);

        if (distancia < 18) {
            option.classList.add("active");
        } else if (distancia < 54) {
            option.classList.add("near");
        }
    });

    if (opcionMasCercana) {
        horaSeleccionada = opcionMasCercana.dataset.hour;
        statusEl.textContent = "";
    }
}

let scrollTimeout;
hourWheel.addEventListener("scroll", () => {
    actualizarHoraActiva();

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const activa = [...hourOptions].find(option => option.classList.contains("active"));

        if (activa) {
            activa.scrollIntoView({
                block: "center",
                behavior: "smooth"
            });
            horaSeleccionada = activa.dataset.hour;
            statusEl.textContent = "";
        } else {
            asegurarHoraValidaSeleccionada();
        }
    }, 120);
});

hourOptions.forEach(option => {
    option.addEventListener("click", () => {


        option.scrollIntoView({
            block: "center",
            behavior: "smooth"
        });

        horaSeleccionada = option.dataset.hour;
        statusEl.textContent = "";
        setTimeout(actualizarHoraActiva, 180);
    });
});

function fijarHoraInicial(valor = "12:00") {
    const option = document.querySelector(`.hour-option[data-hour="${valor}"]`);

    if (option) {
        option.scrollIntoView({
            block: "center",
            behavior: "auto"
        });

        horaSeleccionada = valor;
        setTimeout(actualizarHoraActiva, 50);
    }
}

// =========================================================
// EVENTOS DE ACTIVIDAD Y FECHA
// =========================================================

activityCards.forEach(card => {
    card.addEventListener("click", () => {
        activityCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        actividadSeleccionada = card.dataset.activity;
        statusEl.textContent = "";
    });
});

fechaShell.addEventListener("click", () => {
    if (typeof fechaInput.showPicker === "function") {
        fechaInput.showPicker();
    } else {
        fechaInput.focus();
        fechaInput.click();
    }
});

fechaInput.addEventListener("change", () => {
    const hoy = formatearFechaLocal(new Date());

    if (fechaInput.value < hoy) {
        fechaInput.value = hoy;
    }

    actualizarTextoFecha();
    actualizarHorasDisponibles();
    asegurarHoraValidaSeleccionada();
    statusEl.textContent = "";
});

// =========================================================
// BÚSQUEDA
// =========================================================

buscarBtn.addEventListener("click", async () => {
    const fecha = fechaInput.value;
    const hora = horaSeleccionada;

    if (!actividadSeleccionada) {
        statusEl.textContent = "Debes seleccionar una actividad.";
        return;
    }

    if (!fecha) {
        statusEl.textContent = "Debes seleccionar una fecha.";
        return;
    }

    if (!hora) {
        statusEl.textContent = "Debes seleccionar una hora.";
        return;
    }

    if (fecha < formatearFechaLocal(new Date())) {
        statusEl.textContent = "No puedes seleccionar una fecha pasada.";
        return;
    }

    if (esFechaHoy(fecha) && esHoraPasadaParaHoy(hora)) {
        statusEl.textContent = "No puedes seleccionar una hora pasada para el día de hoy.";
        asegurarHoraValidaSeleccionada();
        return;
    }

    statusEl.textContent = "Buscando recomendaciones...";

    try {
        const url = `/recomendaciones?actividad=${actividadSeleccionada}&fecha=${fecha}&hora=${hora}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("No se pudieron obtener las recomendaciones.");
        }

        const data = await response.json();
        const favorites = await getFavoriteBeachIds();
        console.log("favs: ", favorites);  // TODO for debug

        const favoriteIds = favorites.map(f => f.beach_id);
        console.log("fav ids:", favoriteIds);  // TODO for debug

        data.resultados.forEach(playa => {
            playa.isFavorite = favoriteIds.includes(playa.playa_id);
        });
        console.log("Resultados obtenidos:", data.resultados);  // TODO for debug

        pintarResultados(data.resultados);
        statusEl.textContent = `Se han encontrado ${data.resultados.length} recomendaciones para ${actividadSeleccionada.replace("_", " ")}.`;
    } catch (error) {
        console.error(error);
        statusEl.textContent = "Ha ocurrido un error al consultar la API.";
        resultsContainer.innerHTML = `
          <div class="empty-state">
            No se pudieron cargar los resultados.
          </div>
        `;
    }
});

resultsContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".favorite-btn");

    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    console.log("btn pressed:", btn);

    const beachId = Number(btn.dataset.id);

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please log in");
        return;
    }

    const isFavorite = btn.innerText === "❤️";
    const method = isFavorite ? "DELETE" : "POST";

    await authFetch(`/api/favorites/${beachId}`, {
        method
    });

    btn.innerText = isFavorite ? "🤍" : "❤️";   // backward order because we changed it
});


// =========================================================
// RESULTADOS
// =========================================================


async function getFavoriteBeachIds() {
    const token = localStorage.getItem("token");
    if (!token) {   // user not logged in
        return [];
    }

    try {
        const response = await authFetch("/api/favorites");
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Failed to load favorites");
        return [];
    }
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
                    <button class="favorite-btn" data-id="${playa.playa_id}">
                        ${playa.isFavorite ? '❤️' : '🤍'}
                    </button>
                    <div class="score-badge">Score: ${Number(playa.score).toFixed(1)}</div>
                    <div class="expand-hint">Ver detalle</div>
                </div>
            </summary>

            <div class="beach-detail">
                <p class="beach-desc">${playa.descripcion}</p>

                <div class="meta-list">
                <span class="chip">🏖️ Tipo: ${playa.tipo}</span>
                <span class="chip">🌡️ Temp. aire: ${condiciones.temperatura_ambiente} ºC</span>
                <span class="chip">🌊 Oleaje: ${condiciones.altura_oleaje} m</span>
                <span class="chip">💨 Viento: ${condiciones.velocidad_viento} km/h</span>
                <span class="chip">🌡️ Agua: ${condiciones.temperatura_agua} ºC</span>
                <span class="chip">🌤️ Nubosidad: ${condiciones.nubosidad}%</span>
                <span class="chip">🌧️ Lluvia: ${condiciones.probabilidad_lluvia}%</span>
                <span class="chip">🌙 Marea: ${condiciones.marea}</span>
                </div>

                <div class="motivo detalle-box">
                <strong>Explicación de la recomendación:</strong> ${playa.motivo}
                </div>

                <div class="services-list">
                ${servicios}
                </div>
            </div>
            </details>
        `;
    }).join("");
}

function formatearServicios(servicios) {
    const iconos = {
        restaurantes: "🍽️ Restaurantes",
        comida_para_llevar: "🥡 Comida para llevar",
        balneario: "🚿 Balneario",
        zona_deportiva: "🏐 Zona deportiva"
    };

    return Object.entries(servicios)
        .filter(([_, disponible]) => disponible)
        .map(([clave]) => `<span class="chip">${iconos[clave] || clave}</span>`)
        .join("");
}

// =========================================================
// Login
// =========================================================

async function login(email, password) {
    const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        throw new Error("Login failed");
    }

    return response.json();
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

async function loadCurrentUser() {
    const token = localStorage.getItem("token");

    if (!token) {
        document.getElementById("userInfo").textContent = `No user logged in.`;
        return;
    }

    try {
        const response = await fetch("/auth/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) return;

        const data = await response.json();

        document.getElementById("userInfo").textContent = `Logged in as: ${data.email}`;

    } catch (e) {
        console.error("Failed to load user");
    }
}

function logout() {
    localStorage.removeItem("token");

    loadCurrentUser();
    document.querySelectorAll(".loggedIn").forEach(el => {
        el.classList.add("hidden");
    });
    document.querySelectorAll(".loggedOut").forEach(el => {
        el.classList.remove("hidden");
    });
    document.querySelectorAll(".favorite-btn").forEach(btn => {
        btn.innerText = "🤍";
    });
    console.log("favorites reset after logout");  // TODO for debug

    alert("Logged out");
}

function actualizarBotonesSesion() {
    const token = localStorage.getItem("token");

    const loginDiv = document.querySelector(".login");
    const logoutDiv = document.querySelector(".logout");

    if (token) {
        if (loginDiv) loginDiv.style.display = "none";
        if (logoutDiv) logoutDiv.style.display = "flex";
    } else {
        if (loginDiv) loginDiv.style.display = "flex";
        if (logoutDiv) logoutDiv.style.display = "none";
    }
}

// =========================================================
// ARRANQUE
// =========================================================

if (document.getElementById("fecha")) {
    seleccionarActividadPorDefecto();
    configurarFechaPorDefecto();
    actualizarHorasDisponibles();
    configurarHoraPorDefecto();
}
loadCurrentUser();
actualizarBotonesSesion();
