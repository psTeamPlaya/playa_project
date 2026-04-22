const activityCards = document.querySelectorAll(".activity-card");
const fechaInput = document.getElementById("fecha");

const fechaShell = document.getElementById("fechaShell");
const fechaDisplay = document.getElementById("fechaDisplay");

const buscarBtn = document.getElementById("buscarBtn");
const statusEl = document.getElementById("status");
const resultsContainer = document.getElementById("resultsContainer");
const hourWheel = document.getElementById("hourWheel");
const sunAlertEl = document.getElementById("sunAlert");
const loginModalEl = document.getElementById("loginModal");
const authActionBtn = document.getElementById("authActionBtn");
const authActionIcon = document.getElementById("authActionIcon");
const authActionText = document.getElementById("authActionText");
const closeLoginModalBtn = document.getElementById("closeLoginModal");
const loginModalForm = document.getElementById("loginModalForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginErrorMessageEl = document.getElementById("loginErrorMessage");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authModeHint = document.getElementById("authModeHint");
const toggleAuthModeBtn = document.getElementById("toggleAuthModeBtn");

let hourOptions = [];
let actividadSeleccionada = "";
let horaSeleccionada = "";
let authMode = "login";

function limpiarResultadosPorCambioDeFiltros() {
    resultsContainer.innerHTML = "";
    statusEl.textContent = "";
    ocultarAvisoSolar();
}

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

function mostrarAvisoSolar(mensaje) {
    if (!sunAlertEl) {
        return;
    }

    sunAlertEl.textContent = mensaje;
    sunAlertEl.hidden = false;
}

function ocultarAvisoSolar() {
    if (!sunAlertEl) {
        return;
    }

    sunAlertEl.textContent = "";
    sunAlertEl.hidden = true;
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
            const horaAnterior = horaSeleccionada;

            option.scrollIntoView({
                block: "center",
                behavior: "smooth"
            });

            horaSeleccionada = option.dataset.hour;
            if (horaSeleccionada !== horaAnterior) {
                limpiarResultadosPorCambioDeFiltros();
            } else {
                statusEl.textContent = "";
            }
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
        const horaAnterior = horaSeleccionada;
        horaSeleccionada = opcionMasCercana.dataset.hour;

        if (horaSeleccionada !== horaAnterior) {
            limpiarResultadosPorCambioDeFiltros();
        } else {
            statusEl.textContent = "";
        }
    }
}

let scrollTimeout;
hourWheel.addEventListener("scroll", () => {
    actualizarHoraActiva();

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const activa = [...hourOptions].find(option => option.classList.contains("active"));

        if (activa) {
            const horaAnterior = horaSeleccionada;

            activa.scrollIntoView({
                block: "center",
                behavior: "smooth"
            });
            horaSeleccionada = activa.dataset.hour;

            if (horaSeleccionada !== horaAnterior) {
                limpiarResultadosPorCambioDeFiltros();
            } else {
                statusEl.textContent = "";
            }
        } else {
            asegurarHoraValidaSeleccionada();
        }
    }, 120);
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
        const actividadAnterior = actividadSeleccionada;

        activityCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        actividadSeleccionada = card.dataset.activity;

        if (actividadSeleccionada !== actividadAnterior) {
            limpiarResultadosPorCambioDeFiltros();
        } else {
            statusEl.textContent = "";
        }
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
    limpiarResultadosPorCambioDeFiltros();
});

// =========================================================
// BÚSQUEDA
// =========================================================

buscarBtn.addEventListener("click", async () => {
    const fecha = fechaInput.value;
    const hora = horaSeleccionada;
    ocultarAvisoSolar();

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
        pintarResultados(data.resultados);
        if (data.aviso_sol?.mensaje) {
            mostrarAvisoSolar(data.aviso_sol.mensaje);
            statusEl.textContent = "";
            return;
        }

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

// =========================================================
// RESULTADOS
// =========================================================

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

async function registerUser(email, password) {
    const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Error al crear la cuenta.");
    }

    return data;
}

function aplicarModoAuth() {
    if (!authModeHint || !toggleAuthModeBtn || !authSubmitBtn) {
        return;
    }

    const titleEl = document.getElementById("loginModalTitle");

    if (authMode === "register") {
        if (titleEl) titleEl.textContent = "Registrarse";
        authSubmitBtn.textContent = "Crear cuenta";
        authModeHint.textContent = "Ya tienes cuenta?";
        toggleAuthModeBtn.textContent = "Iniciar sesion";
        return;
    }

    if (titleEl) titleEl.textContent = "Iniciar sesion";
    authSubmitBtn.textContent = "Entrar a mi cuenta";
    authModeHint.textContent = "Todavia no tienes cuenta?";
    toggleAuthModeBtn.textContent = "Registrarse";
}

function mostrarMensajeAuth(mensaje, tipo = "error") {
    if (!loginErrorMessageEl) {
        return;
    }

    loginErrorMessageEl.textContent = mensaje;
    loginErrorMessageEl.classList.remove("success", "error");
    loginErrorMessageEl.classList.add(tipo);
}

function abrirModalLogin() {
    if (!loginModalEl) {
        return;
    }

    authMode = "login";
    aplicarModoAuth();
    loginModalEl.hidden = false;
    mostrarMensajeAuth("", "error");
    loginModalForm.reset();
    setTimeout(() => loginEmailInput?.focus(), 0);
}

function cerrarModalLogin() {
    if (!loginModalEl) {
        return;
    }

    loginModalEl.hidden = true;
    mostrarMensajeAuth("", "error");
    loginModalForm.reset();
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
    const userInfoEl = document.getElementById("userInfo");

    if (!token) {
        if (userInfoEl) {
            userInfoEl.textContent = "";
        }
        return;
    }

    try {
        const response = await fetch("/auth/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            localStorage.removeItem("token");
            if (userInfoEl) {
                userInfoEl.textContent = "";
            }
            actualizarBotonesSesion();
            return;
        }

        const data = await response.json();

        if (userInfoEl) {
            userInfoEl.textContent = data.email;
        }

    } catch (e) {
        console.error("Failed to load user");
    }
}

function logout() {
    localStorage.removeItem("token");

    loadCurrentUser();
    actualizarBotonesSesion();
}

function actualizarBotonesSesion() {
    const token = localStorage.getItem("token");

    if (!authActionBtn || !authActionText || !authActionIcon) {
        return;
    }

    if (token) {
        authActionText.textContent = "Cerrar sesion";
        authActionIcon.textContent = "⎋";
        authActionBtn.setAttribute("aria-label", "Cerrar sesion");
        return;
    }

    authActionText.textContent = "Acceder";
    authActionIcon.textContent = "⇥";
    authActionBtn.setAttribute("aria-label", "Acceder");
}

if (authActionBtn) {
    authActionBtn.addEventListener("click", () => {
        if (localStorage.getItem("token")) {
            logout();
            return;
        }

        abrirModalLogin();
    });
}

if (closeLoginModalBtn) {
    closeLoginModalBtn.addEventListener("click", cerrarModalLogin);
}

if (loginModalEl) {
    loginModalEl.addEventListener("click", (event) => {
        if (event.target === loginModalEl) {
            cerrarModalLogin();
        }
    });
}

if (loginModalForm) {
    loginModalForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;

        if (!email || !password) {
            mostrarMensajeAuth("Debes indicar correo y contrasena.");
            return;
        }

        mostrarMensajeAuth(
            authMode === "register" ? "Creando cuenta..." : "Accediendo...",
            "success",
        );

        try {
            if (authMode === "register") {
                await registerUser(email, password);
                authMode = "login";
                aplicarModoAuth();
                mostrarMensajeAuth("Cuenta creada. Ya puedes iniciar sesion.", "success");
                loginPasswordInput.value = "";
                return;
            }

            const data = await login(email, password);
            localStorage.setItem("token", data.access_token);
            await loadCurrentUser();
            actualizarBotonesSesion();
            cerrarModalLogin();
        } catch (error) {
            console.error(error);
            mostrarMensajeAuth(error.message || "No se pudo completar la operacion.");
        }
    });
}

if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener("click", () => {
        authMode = authMode === "login" ? "register" : "login";
        aplicarModoAuth();
        mostrarMensajeAuth("", "error");
        loginPasswordInput.value = "";
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && loginModalEl && !loginModalEl.hidden) {
        cerrarModalLogin();
    }
});

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
