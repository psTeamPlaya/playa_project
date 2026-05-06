import { login } from "./auth/login.js";
import { registerUser } from "./auth/register.js";
import { selectedCoords } from "./localization.js";
import { pintarResultados as renderizarResultados } from "./results/render-results.js";
import {
    esHoraPasadaParaFecha,
    formatearFechaLocal,
    initDateTime
} from "./search/date-time.js";
import { initQuantity } from "./search/quantity.js";
import {
    createDynamicFilters,
    iluminarChipFiltro,
    initDynamicFilters
} from "./filters/dynamic-filters.js";
import {
    aplicarFiltrosAParametros as buildFilterParams,
    initStaticFilters
} from "./filters/static-filters.js";

const activityCards = document.querySelectorAll(".activity-card");
const fechaInput = document.getElementById("fecha");

const fechaShell = document.getElementById("fechaShell");
const fechaDisplay = document.getElementById("fechaDisplay");

const buscarBtn = document.getElementById("buscarBtn");
const floatingBuscarBtn = document.getElementById("floatingBuscarBtn");
const statusEl = document.getElementById("status");
const resultsContainer = document.getElementById("resultsContainer");
const recommendedBeachesSection = document.getElementById("recommendedBeachesSection");
const hourWheel = document.getElementById("hourWheel");
const sunAlertEl = document.getElementById("sunAlert");
const loginModalEl = document.getElementById("loginModal");
const authActionBtn = document.getElementById("authActionBtn");
const authActionIcon = document.getElementById("authActionIcon");
const closeLoginModalBtn = document.getElementById("closeLoginModal");
const loginModalForm = document.getElementById("loginModalForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
const loginErrorMessageEl = document.getElementById("loginErrorMessage");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authModeHint = document.getElementById("authModeHint");
const toggleAuthModeBtn = document.getElementById("toggleAuthModeBtn");
const preferencesPanel = document.getElementById("preferencesPanel");
const preferencesUserInfo = document.getElementById("preferencesUserInfo");
const preferencesLogoutBtn = document.getElementById("preferencesLogoutBtn");
const rememberActivityPreference = document.getElementById("rememberActivityPreference");
const rememberSchedulePreference = document.getElementById("rememberSchedulePreference");
const expandResultsPreference = document.getElementById("expandResultsPreference");
const appHeader = document.getElementById("appHeader");
const filtersSidebar = document.getElementById("filtersSidebar");
const disableStaticFilters = document.getElementById("disableStaticFilters");
const disableDynamicFilters = document.getElementById("disableDynamicFilters");
const filterSandBeach = document.getElementById("filterSandBeach");
const filterStoneBeach = document.getElementById("filterStoneBeach");

const filterRestaurant = document.getElementById("filterRestaurant");
const filterTakeAwayFood = document.getElementById("filterTakeAwayFood");
const filterBalneario = document.getElementById("filterBalneario");
const filterSportZone = document.getElementById("filterSportZone");
const filterPetFriendly = document.getElementById("filterPetFriendly");

const filterWindMin = document.getElementById("filterWindMin");
const filterWindMax = document.getElementById("filterWindMax");
const filterWindReset = document.getElementById("filterWindReset");
const filterWindDisabled = document.getElementById("filterWindDisabled");
const windRangeTrack = document.getElementById("windRangeTrack");
const windMinValue = document.getElementById("windMinValue");
const windMaxValue = document.getElementById("windMaxValue");
const filterCloudMin = document.getElementById("filterCloudMin");
const filterCloudMax = document.getElementById("filterCloudMax");
const filterCloudReset = document.getElementById("filterCloudReset");
const filterCloudDisabled = document.getElementById("filterCloudDisabled");
const cloudRangeTrack = document.getElementById("cloudRangeTrack");
const cloudMinValue = document.getElementById("cloudMinValue");
const cloudMaxValue = document.getElementById("cloudMaxValue");
const filterTemperatureMin = document.getElementById("filterTemperatureMin");
const filterTemperatureMax = document.getElementById("filterTemperatureMax");
const filterTemperatureReset = document.getElementById("filterTemperatureReset");
const filterTemperatureDisabled = document.getElementById("filterTemperatureDisabled");
const temperatureRangeTrack = document.getElementById("temperatureRangeTrack");
const temperatureMinValue = document.getElementById("temperatureMinValue");
const temperatureMaxValue = document.getElementById("temperatureMaxValue");
const filterWaveMin = document.getElementById("filterWaveMin");
const filterWaveMax = document.getElementById("filterWaveMax");
const filterWaveReset = document.getElementById("filterWaveReset");
const filterWaveDisabled = document.getElementById("filterWaveDisabled");
const waveRangeTrack = document.getElementById("waveRangeTrack");
const waveMinValue = document.getElementById("waveMinValue");
const waveMaxValue = document.getElementById("waveMaxValue");

let actividadSeleccionada = "";
let authMode = "login";
let preferencesCloseTimeout;
let dateTimeController;
let quantityController;
let dynamicFiltersController;
let staticFiltersController;

const DEFAULT_ACTIVITY = "tomar_sol";
const DEFAULT_QUANTITY = "3";

const staticFilterElements = {
    filterSandBeach,
    filterStoneBeach,
    filterRestaurant,
    filterTakeAwayFood,
    filterBalneario,
    filterSportZone,
    filterPetFriendly
};

const staticFilterInputs = [
    filterSandBeach,
    filterStoneBeach,
    filterRestaurant,
    filterTakeAwayFood,
    filterBalneario,
    filterSportZone,
    filterPetFriendly
];

const dynamicFilters = createDynamicFilters({
    filterWindMin,
    filterWindMax,
    filterWindReset,
    filterWindDisabled,
    windRangeTrack,
    windMinValue,
    windMaxValue,
    filterCloudMin,
    filterCloudMax,
    filterCloudReset,
    filterCloudDisabled,
    cloudRangeTrack,
    cloudMinValue,
    cloudMaxValue,
    filterTemperatureMin,
    filterTemperatureMax,
    filterTemperatureReset,
    filterTemperatureDisabled,
    temperatureRangeTrack,
    temperatureMinValue,
    temperatureMaxValue,
    filterWaveMin,
    filterWaveMax,
    filterWaveReset,
    filterWaveDisabled,
    waveRangeTrack,
    waveMinValue,
    waveMaxValue
});

const STORAGE_KEYS = {
    rememberActivity: "preferences.rememberActivity",
    rememberSchedule: "preferences.rememberSchedule",
    expandResults: "preferences.expandResults",
    savedActivity: "preferences.savedActivity",
    savedDate: "preferences.savedDate",
    savedHour: "preferences.savedHour"
};

function limpiarResultadosPorCambioDeFiltros() {
    resultsContainer.innerHTML = "";
    statusEl.textContent = "";
    ocultarAvisoSolar();
}

function leerPreferencia(clave) {
    return localStorage.getItem(clave) === "true";
}

function guardarPreferencia(clave, valor) {
    localStorage.setItem(clave, valor ? "true" : "false");
}

function actualizarAlturaHeader() {
    if (!appHeader) return;

    document.documentElement.style.setProperty(
        "--app-header-height",
        `${appHeader.offsetHeight}px`
    );
}

function cargarPreferenciasUI() {
    if (rememberActivityPreference) {
        rememberActivityPreference.checked = leerPreferencia(STORAGE_KEYS.rememberActivity);
    }
    if (rememberSchedulePreference) {
        rememberSchedulePreference.checked = leerPreferencia(STORAGE_KEYS.rememberSchedule);
    }
    if (expandResultsPreference) {
        expandResultsPreference.checked = leerPreferencia(STORAGE_KEYS.expandResults);
    }
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

function abrirPanelPreferencias() {
    if (!preferencesPanel) {return;}

    clearTimeout(preferencesCloseTimeout);
    preferencesPanel.hidden = false;
    requestAnimationFrame(() => {
        preferencesPanel.classList.add("is-open");
    });
}

function guardarActividadRecordada() {
    if (!rememberActivityPreference?.checked || !actividadSeleccionada) {
        localStorage.removeItem(STORAGE_KEYS.savedActivity);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.savedActivity, actividadSeleccionada);
}

function guardarHorarioRecordado() {
    const fechaSeleccionada = dateTimeController?.getFecha() || fechaInput.value;
    const horaSeleccionada = dateTimeController?.getHoraSeleccionada() || "";

    if (!rememberSchedulePreference?.checked || !fechaSeleccionada || !horaSeleccionada) {
        localStorage.removeItem(STORAGE_KEYS.savedDate);
        localStorage.removeItem(STORAGE_KEYS.savedHour);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.savedDate, fechaSeleccionada);
    localStorage.setItem(STORAGE_KEYS.savedHour, horaSeleccionada);
}

function obtenerActividadInicial() {
    const actividadGuardada = localStorage.getItem(STORAGE_KEYS.savedActivity);
    if (rememberActivityPreference?.checked && actividadGuardada) {
        return actividadGuardada;
    }
    return DEFAULT_ACTIVITY;
}

function obtenerHorarioInicial() {
    if (!rememberSchedulePreference?.checked) {return null;}

    const fechaGuardada = localStorage.getItem(STORAGE_KEYS.savedDate);
    const horaGuardada = localStorage.getItem(STORAGE_KEYS.savedHour);
    const hoy = formatearFechaLocal(new Date());

    if (!fechaGuardada || !horaGuardada || fechaGuardada < hoy) {return null;}
    if ((dateTimeController?.esHoraPasadaParaFecha || esHoraPasadaParaFecha)(fechaGuardada, horaGuardada)) {
        return null;
    }
    return {
        fecha: fechaGuardada,
        hora: horaGuardada
    };
}

const cantidadSlider = document.getElementById("cantidadSlider");
const cantidadSliderValue = document.getElementById("cantidadSliderValue");
const cantidadSliderMax = document.getElementById("cantidadSliderMax");

// =========================================================
// FECHA, HORA Y CANTIDAD
// =========================================================

function mostrarAvisoSolar(mensaje) {
    if (!sunAlertEl) return;
    sunAlertEl.textContent = mensaje;
    sunAlertEl.hidden = false;
}

function ocultarAvisoSolar() {
    if (!sunAlertEl) return;
    sunAlertEl.textContent = "";
    sunAlertEl.hidden = true;
}

function manejarCambioHorario({ changed }) {
    guardarHorarioRecordado();
    if (changed) {
        limpiarResultadosPorCambioDeFiltros();
    } else {
        statusEl.textContent = "";
    }
}

function manejarCambioCantidad({ changed }) {
    if (changed) {
        limpiarResultadosPorCambioDeFiltros();
    }
}

dateTimeController = initDateTime({
    fechaInput,
    fechaShell,
    fechaDisplay,
    hourWheel,
    onScheduleChange: manejarCambioHorario
});

quantityController = initQuantity({
    cantidadSlider,
    cantidadSliderValue,
    cantidadSliderMax,
    defaultQuantity: DEFAULT_QUANTITY,
    onChange: manejarCambioCantidad
});

dynamicFiltersController = initDynamicFilters({
    dynamicFilters,
    disableDynamicFilters,
    onFiltersChange: limpiarResultadosPorCambioDeFiltros
});

staticFiltersController = initStaticFilters({
    staticFilterInputs,
    disableStaticFilters,
    onFiltersChange: limpiarResultadosPorCambioDeFiltros,
    iluminarChipFiltro
});

// ============================================================
// CONFIGURACION INICIAL POR DEFECTO: actividad, fecha y hora
// ============================================================

function seleccionarActividad(actividad, limpiarResultados = false) {
    const card = document.querySelector(`.activity-card[data-activity="${actividad}"]`);
    if (!card) return;
    
    const actividadAnterior = actividadSeleccionada;
    activityCards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    actividadSeleccionada = actividad;
    guardarActividadRecordada();

    if (limpiarResultados && actividadSeleccionada !== actividadAnterior) {
        limpiarResultadosPorCambioDeFiltros();
    }
}

function configurarFechaYHoraIniciales() {
    dateTimeController?.configurarFechaYHoraIniciales(obtenerHorarioInicial());
    guardarHorarioRecordado();
}

// =========================================================
// EVENTOS DE ACTIVIDAD
// =========================================================

activityCards.forEach(card => {
    card.addEventListener("click", () => {
        seleccionarActividad(card.dataset.activity, true);
    });
});

// =========================================================
// BUSQUEDA
// =========================================================

async function buscarRecomendaciones() {
    const fecha = fechaInput.value;
    const hora = dateTimeController?.getHoraSeleccionada() || "";
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
    if (dateTimeController?.esFechaHoy(fecha) && dateTimeController?.esHoraPasadaParaHoy(hora)) {
        statusEl.textContent = "No puedes seleccionar una hora pasada para el d\u00eda de hoy.";
        dateTimeController?.asegurarHoraValidaSeleccionada({ silent: true });
        guardarHorarioRecordado();
        return;
    }
    statusEl.textContent = "Buscando recomendaciones...";
    try {
        const radioSeleccionado = document.querySelector('input[name="rango"]:checked');
        const rango = radioSeleccionado ? radioSeleccionado.value : "5";
        const cantidad = Math.max(0, Number(quantityController?.getCantidadSeleccionada() || 0));
        const params = new URLSearchParams({
            actividad: actividadSeleccionada,
            fecha,
            hora,
            radio_km: rango,
            top_n: String(cantidad)
        });

        if (selectedCoords) {
            const [lon, lat] = selectedCoords;
            params.set("lat", String(lat));
            params.set("lon", String(lon));
        }
        else {
            statusEl.textContent = "Introduce informacion de localizacion.";
            return;
        }
        buildFilterParams({
            params,
            filtersSidebar,
            staticElements: staticFilterElements,
            staticFilterInputs,
            dynamicController: dynamicFiltersController
        });
        const response = await fetch(`/recomendaciones?${params.toString()}`);
        if (!response.ok) {
            throw new Error("No se pudieron obtener las recomendaciones.");
        }

        const data = await response.json();
        console.log("DATA COMPLETA DEL BACKEND:", data);

        const favorites = await getFavoriteBeachIds();
        const favoriteIds = favorites.map(f => f.beach_id);
        console.log("favs: ", favorites);  // TODO for debug

        data.resultados.forEach(playa => {
            playa.isFavorite = favoriteIds.includes(playa.beach_id);
        });
        
        pintarResultados(data.resultados);
        desplazarAPlayasRecomendadas();
        if (data.aviso_sol?.mensaje) {
            mostrarAvisoSolar(data.aviso_sol.mensaje);
            statusEl.textContent = "";
            return;
        }
        statusEl.textContent = `Se han encontrado ${data.resultados.length} recomendaciones para ${actividadSeleccionada.replace("_", " ")}.`;
    } 
    catch (error) {
        console.error(error);
        statusEl.textContent = "Ha ocurrido un error al consultar la API.";
        resultsContainer.innerHTML = `
          <div class="empty-state">
            No se pudieron cargar los resultados.
          </div>
        `;
    }
}

function actualizarBotonBusquedaFlotante() {
    if (!floatingBuscarBtn) {
        return;
    }
    const rect = buscarBtn.getBoundingClientRect();
    const debeMostrarse = rect.bottom < 0;

    floatingBuscarBtn.style.setProperty("--floating-search-left", `${rect.left}px`);
    floatingBuscarBtn.style.setProperty("--floating-search-width", `${rect.width}px`);
    floatingBuscarBtn.classList.toggle("is-visible", debeMostrarse);
    floatingBuscarBtn.setAttribute("aria-hidden", debeMostrarse ? "false" : "true");
}

function configurarBotonBusquedaFlotante() {
    if (!buscarBtn || !floatingBuscarBtn) return;
    actualizarBotonBusquedaFlotante();
    window.addEventListener("scroll", actualizarBotonBusquedaFlotante, { passive: true });
    window.addEventListener("resize", actualizarBotonBusquedaFlotante);
}

function desplazarAPlayasRecomendadas() {
    if (!recommendedBeachesSection) return;
    recommendedBeachesSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

if (buscarBtn) {
    buscarBtn.addEventListener("click", buscarRecomendaciones);
}
if (floatingBuscarBtn) {
    floatingBuscarBtn.addEventListener("click", buscarRecomendaciones);
}

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
    const isFavorite = btn.innerText === "\u2764\uFE0F";
    const method = isFavorite ? "DELETE" : "POST";
    await authFetch(`/api/favorites/${beachId}`, {
        method
    });
    btn.innerText = isFavorite ? "\u{1F90D}" : "\u2764\uFE0F";   // backward order because we changed it
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
        const response = await authFetch("/api/favorites/ids");
        if (!response.ok) return [];
        return await response.json();
    } 
    catch (e) {
        console.error("Failed to load favorites");
        return [];
    }
}

function pintarResultados(resultados) {
    renderizarResultados(resultados, resultsContainer);
}

// =========================================================
// Login
// =========================================================

function aplicarModoAuth() {
    if (!authModeHint || !toggleAuthModeBtn || !authSubmitBtn) return;
    const titleEl = document.getElementById("loginModalTitle");

    if (authMode === "register") {
        if (titleEl) titleEl.textContent = "Registrarse";
        authSubmitBtn.textContent = "Crear cuenta";
        authModeHint.textContent = "\u00bfYa tienes cuenta?";
        toggleAuthModeBtn.textContent = "Iniciar sesion";
        if (confirmPasswordGroup) {
            confirmPasswordGroup.style.display = "block";
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.required = true;
        }
        return;
    }
    if (titleEl) titleEl.textContent = "Iniciar sesion";
    authSubmitBtn.textContent = "Entrar a mi cuenta";
    authModeHint.textContent = "\u00bfTodav\u00eda no tienes cuenta?";
    toggleAuthModeBtn.textContent = "Registrarse";
    if (confirmPasswordGroup) {
        confirmPasswordGroup.style.display = "none";
    }
    if (confirmPasswordInput) {
        confirmPasswordInput.required = false;
        confirmPasswordInput.value = "";
    }
}

function mostrarMensajeAuth(mensaje, tipo = "error") {
    if (!loginErrorMessageEl) return;
    loginErrorMessageEl.textContent = mensaje;
    loginErrorMessageEl.classList.remove("success", "error");
    loginErrorMessageEl.classList.add(tipo);
}

function abrirModalLogin() {
    if (!loginModalEl) return;
    authMode = "login";
    aplicarModoAuth();
    loginModalEl.hidden = false;
    mostrarMensajeAuth("", "error");
    loginModalForm.reset();
    setTimeout(() => loginEmailInput?.focus(), 0);
}

function cerrarModalLogin() {
    if (!loginModalEl) return;
    loginModalEl.hidden = true;
    mostrarMensajeAuth("", "error");
    loginModalForm.reset();
    if (confirmPasswordGroup) {
        confirmPasswordGroup.style.display = "none";
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

async function loadCurrentUser() {
    const token = localStorage.getItem("token");
    if (!token) {
        if (preferencesUserInfo) preferencesUserInfo.textContent = "";
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
            if (preferencesUserInfo) {
                preferencesUserInfo.textContent = "";
            }
            actualizarBotonesSesion();
            return;
        }
        const data = await response.json();
        if (preferencesUserInfo) {
            preferencesUserInfo.textContent = data.email;
        }
    } 
    catch (e) {
        console.error("Failed to load user");
    }
}

function logout() {
    localStorage.removeItem("token");
    loadCurrentUser();
    document.querySelectorAll(".favorite-btn").forEach(btn => {
        btn.innerText = "\u{1F90D}";
    });
    actualizarBotonesSesion();
    cerrarPanelPreferencias();
}

function actualizarBotonesSesion() {
    const token = localStorage.getItem("token");
    const estaLogueado = Boolean(token);

    document.body.classList.toggle("is-authenticated", estaLogueado);
    document.querySelectorAll(".loggedIn").forEach(element => {
        element.classList.toggle("hidden", !estaLogueado);
    });
    if (filtersSidebar) {
        filtersSidebar.hidden = !estaLogueado;
        filtersSidebar.classList.toggle("hidden", !estaLogueado);
    }
    if (estaLogueado) {
        quantityController?.configurarSlider();
    } else {
        quantityController?.restablecerCantidadPorDefecto();
    }
    if (!authActionBtn || !authActionIcon) return;
    if (estaLogueado) {
        authActionBtn.hidden = false;
        authActionBtn.setAttribute("aria-label", "Preferencias");
        authActionIcon.className = "bi bi-person-circle";
        return;
    }
    authActionIcon.className = "bi bi-box-arrow-in-right";
    authActionBtn.hidden = false;
    authActionBtn.setAttribute("aria-label", "Acceder");
    cerrarPanelPreferencias();
}

if (authActionBtn) {
    authActionBtn.addEventListener("click", () => {
        if (localStorage.getItem("token")) {
            if (!preferencesPanel) return;
            if (preferencesPanel.hidden) {
                abrirPanelPreferencias();
                return;
            }
            cerrarPanelPreferencias();
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

document.addEventListener("click", (event) => {
    if (!preferencesPanel || preferencesPanel.hidden) return;
    const clickDentroPanel = preferencesPanel.contains(event.target);
    const clickEnToggle = authActionBtn?.contains(event.target);
    if (!clickDentroPanel && !clickEnToggle) {
        cerrarPanelPreferencias();
    }
});

if (loginModalForm) {
    loginModalForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;

        if (!email || !password) {
            mostrarMensajeAuth("Debes indicar correo y contrase\u00f1a.");
            return;
        }
        if (authMode === "register") {
            const confirmPassword = confirmPasswordInput?.value ?? "";
            if (password !== confirmPassword) {
                mostrarMensajeAuth("Las contrase\u00f1as no coinciden.");
                return;
            }
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
                if (confirmPasswordInput) {
                    confirmPasswordInput.value = "";
                }
                return;
            }
            const data = await login(email, password);
            localStorage.setItem("token", data.access_token);
            await loadCurrentUser();
            actualizarBotonesSesion();
            cerrarModalLogin();
        } 
        catch (error) {
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

if (rememberActivityPreference) {
    rememberActivityPreference.addEventListener("change", () => {
        guardarPreferencia(STORAGE_KEYS.rememberActivity, rememberActivityPreference.checked);
        guardarActividadRecordada();
    });
}

if (rememberSchedulePreference) {
    rememberSchedulePreference.addEventListener("change", () => {
        guardarPreferencia(STORAGE_KEYS.rememberSchedule, rememberSchedulePreference.checked);
        guardarHorarioRecordado();
    });
}

if (expandResultsPreference) {
    expandResultsPreference.addEventListener("change", () => {
        guardarPreferencia(STORAGE_KEYS.expandResults, expandResultsPreference.checked);
    });
}

if (preferencesLogoutBtn) {
    preferencesLogoutBtn.addEventListener("click", () => {
        logout();
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (loginModalEl && !loginModalEl.hidden) cerrarModalLogin();
    if (preferencesPanel && !preferencesPanel.hidden) cerrarPanelPreferencias();
});

window.addEventListener("resize", () => {
    actualizarAlturaHeader();
});

if (appHeader && "ResizeObserver" in window) {
    const headerObserver = new ResizeObserver(actualizarAlturaHeader);
    headerObserver.observe(appHeader);
}

// =========================================================
// ARRANQUE
// =========================================================

actualizarAlturaHeader();
configurarBotonBusquedaFlotante();
cargarPreferenciasUI();

if (document.getElementById("fecha")) {
    seleccionarActividad(obtenerActividadInicial());
    configurarFechaYHoraIniciales();
}
loadCurrentUser();
actualizarBotonesSesion();

