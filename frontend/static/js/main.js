import { authFetch } from "./api/auth-fetch.js";
import { initAdminUI } from "./admin/admin-ui.js";
import { fetchRecommendations } from "./api/recommendations-api.js";
import { initAuthModal } from "./auth/auth-modal.js";
import { initSessionUI } from "./auth/session-ui.js";
import {
    createDynamicFilters,
    iluminarChipFiltro,
    initDynamicFilters,
    obtenerFiltrosDinamicosSeleccionados
} from "./filters/dynamic-filters.js";
import {
    initStaticFilters,
    obtenerFiltrosSeleccionados
} from "./filters/static-filters.js";
import { selectedCoords } from "./localization.js";
import { initPreferencesUI } from "./preferences/preferences-ui.js";
import {
    obtenerActividadInicial as getInitialActivity,
    obtenerHorarioInicial as getInitialSchedule,
    guardarActividadRecordada as saveRememberedActivity,
    guardarHorarioRecordado as saveRememberedSchedule
} from "./preferences/storage.js";
import { pintarResultados as renderizarResultados } from "./results/render-results.js";
import {
    esHoraPasadaParaFecha,
    formatearFechaLocal,
    initDateTime
} from "./search/date-time.js";
import { initQuantity } from "./search/quantity.js";
import { initResultsMap } from "./results/results-map.js";

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
const adminPreferencesGroup = document.getElementById("adminPreferencesGroup");
const openUserManagementBtn = document.getElementById("openUserManagementBtn");
const openBeachManagementBtn = document.getElementById("openBeachManagementBtn");
const openReviewManagementBtn = document.getElementById("openReviewManagementBtn");
const rememberActivityPreference = document.getElementById("rememberActivityPreference");
const rememberSchedulePreference = document.getElementById("rememberSchedulePreference");
const expandResultsPreference = document.getElementById("expandResultsPreference");
const appHeader = document.getElementById("appHeader");
const filtersSidebar = document.getElementById("filtersSidebar");
const disableStaticFilters = document.getElementById("disableStaticFilters");
const disableDynamicFilters = document.getElementById("disableDynamicFilters");
const filterSandBeach = document.getElementById("filterSandBeach");
const filterStoneBeach = document.getElementById("filterStoneBeach");
const filterNaturalPoolBeach = document.getElementById("filterNaturalPoolBeach");

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
const userManagementModal = document.getElementById("userManagementModal");
const closeUserManagementModal = document.getElementById("closeUserManagementModal");
const userManagementList = document.getElementById("userManagementList");
const userManagementFeedback = document.getElementById("userManagementFeedback");
const beachManagementModal = document.getElementById("beachManagementModal");
const closeBeachManagementModal = document.getElementById("closeBeachManagementModal");
const beachManagementList = document.getElementById("beachManagementList");
const beachManagementFeedback = document.getElementById("beachManagementFeedback");
const beachManagementForm = document.getElementById("beachManagementForm");
const newBeachBtn = document.getElementById("newBeachBtn");
const resetBeachFormBtn = document.getElementById("resetBeachFormBtn");
const beachIdInput = document.getElementById("beachId");
const beachNameInput = document.getElementById("beachName");
const beachLocationInput = document.getElementById("beachLocation");
const beachTypeInput = document.getElementById("beachType");
const beachAccessibilityInput = document.getElementById("beachAccessibility");
const beachLatitudeInput = document.getElementById("beachLatitude");
const beachLongitudeInput = document.getElementById("beachLongitude");
const beachPickOnMapBtn = document.getElementById("beachPickOnMapBtn");
const beachMapElement = document.getElementById("beachMap");
const beachImageInput = document.getElementById("beachImage");
const beachDescriptionInput = document.getElementById("beachDescription");
const beachServicesOptions = document.getElementById("beachServicesOptions");
const beachActivitiesOptions = document.getElementById("beachActivitiesOptions");

let actividadSeleccionada = "";
let dateTimeController;
let quantityController;
let dynamicFiltersController;
let preferencesUIController;
let authModalController;
let sessionUIController;
let adminUIController;
let resultsMapController;
let lastRecommendationContext = null;

const DEFAULT_ACTIVITY = "tomar_sol";
const DEFAULT_QUANTITY = "3";

const staticFilterElements = {
    filterSandBeach,
    filterStoneBeach,
    filterNaturalPoolBeach,
    filterRestaurant,
    filterTakeAwayFood,
    filterBalneario,
    filterSportZone,
    filterPetFriendly
};

const staticFilterInputs = [
    filterSandBeach,
    filterStoneBeach,
    filterNaturalPoolBeach,
    filterRestaurant,
    filterTakeAwayFood,
    filterBalneario,
    filterSportZone,
    filterPetFriendly
];

function limpiarResultadosPorCambioDeFiltros() {
    resultsContainer.innerHTML = "";
    statusEl.textContent = "";
    ocultarAvisoSolar();
}

function resetRecommendationContext() {
    lastRecommendationContext = null;
}

function getCurrentSearchSignature() {
    const radioSeleccionado = document.querySelector('input[name="rango"]:checked');

    return {
        actividad: actividadSeleccionada,
        fecha: fechaInput?.value || "",
        hora: dateTimeController?.getHoraSeleccionada() || "",
        rango: radioSeleccionado ? radioSeleccionado.value : "5",
        coords: selectedCoords ? [...selectedCoords] : null
    };
}

function hasSameCoords(coordsA, coordsB) {
    if (!coordsA && !coordsB) return true;
    if (!coordsA || !coordsB) return false;
    return coordsA.length === coordsB.length && coordsA.every((value, index) => value === coordsB[index]);
}

function canReuseRecommendationContext() {
    if (!lastRecommendationContext?.baseData) {
        return false;
    }

    const currentSignature = getCurrentSearchSignature();
    return (
        lastRecommendationContext.actividad === currentSignature.actividad
        && lastRecommendationContext.fecha === currentSignature.fecha
        && lastRecommendationContext.hora === currentSignature.hora
        && lastRecommendationContext.rango === currentSignature.rango
        && hasSameCoords(lastRecommendationContext.coords, currentSignature.coords)
    );
}

function actualizarAlturaHeader() {
    if (!appHeader) return;

    document.documentElement.style.setProperty(
        "--app-header-height",
        `${appHeader.offsetHeight}px`
    );
}

function guardarActividadRecordada() {
    saveRememberedActivity({
        rememberActivityPreference,
        actividadSeleccionada
    });
}

function guardarHorarioRecordado() {
    const fechaSeleccionada = dateTimeController?.getFecha() || fechaInput.value;
    const horaSeleccionada = dateTimeController?.getHoraSeleccionada() || "";
    saveRememberedSchedule({
        rememberSchedulePreference,
        fechaSeleccionada,
        horaSeleccionada
    });
}

function obtenerActividadInicial() {
    return getInitialActivity({
        rememberActivityPreference,
        defaultActivity: DEFAULT_ACTIVITY
    });
}

function obtenerHorarioInicial() {
    return getInitialSchedule({
        rememberSchedulePreference,
        formatearFechaLocal,
        esHoraPasadaParaFecha: dateTimeController?.esHoraPasadaParaFecha || esHoraPasadaParaFecha
    });
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
        resetRecommendationContext();
        limpiarResultadosPorCambioDeFiltros();
    } else {
        statusEl.textContent = "";
    }
}

function manejarCambioCantidad({ changed }) {
    if (changed) {
        if (reaplicarResultadosCacheados()) {
            return;
        }
        limpiarResultadosPorCambioDeFiltros();
    }
}

function obtenerFiltrosActivos() {
    if (!filtersSidebar || filtersSidebar.hidden) {
        return {};
    }

    return {
        ...obtenerFiltrosSeleccionados(staticFilterElements),
        ...obtenerFiltrosDinamicosSeleccionados(
            dynamicFiltersController?.dynamicFilters || [],
            () => Boolean(filtersSidebar && !filtersSidebar.hidden)
        )
    };
}

function cumpleFiltros(playa, filtros) {
    const condiciones = playa?.condiciones || {};
    const servicios = playa?.servicios || {};

    if (filtros.tipo_arena && playa.tipo !== "arena") return false;
    if (filtros.tipo_piedra && playa.tipo !== "piedra") return false;
    if (filtros.tipo_piscina_natural && playa.tipo !== "piscina_natural") return false;
    if (filtros.restaurantes && !servicios.restaurantes) return false;
    if (filtros.comida_para_llevar && !servicios.comida_para_llevar) return false;
    if (filtros.balnearios && !servicios.balnearios) return false;
    if (filtros.zona_deportiva && !servicios.zona_deportiva) return false;
    if (filtros.pet_friendly && !servicios.pet_friendly) return false;

    if ("min_velocidad_viento" in filtros && Number(condiciones.wind_speed ?? 0) < filtros.min_velocidad_viento) return false;
    if ("max_velocidad_viento" in filtros && Number(condiciones.wind_speed ?? 0) > filtros.max_velocidad_viento) return false;
    if ("min_temperatura_ambiente" in filtros && Number(condiciones.air_temp ?? 0) < filtros.min_temperatura_ambiente) return false;
    if ("max_temperatura_ambiente" in filtros && Number(condiciones.air_temp ?? 0) > filtros.max_temperatura_ambiente) return false;
    if ("min_nubosidad" in filtros && Number(condiciones.cloud_cover ?? 0) < filtros.min_nubosidad) return false;
    if ("max_nubosidad" in filtros && Number(condiciones.cloud_cover ?? 0) > filtros.max_nubosidad) return false;
    if ("min_altura_oleaje" in filtros && Number(condiciones.wave_height ?? 0) < filtros.min_altura_oleaje) return false;
    if ("max_altura_oleaje" in filtros && Number(condiciones.wave_height ?? 0) > filtros.max_altura_oleaje) return false;

    return true;
}

function renderRecommendationResults(data, { shouldScroll = false } = {}) {
    pintarResultados(data.resultados);
    resultsMapController?.setResults(data.resultados);
    if (shouldScroll) {
        desplazarAPlayasRecomendadas();
    }

    if (data.aviso_sol?.mensaje) {
        mostrarAvisoSolar(data.aviso_sol.mensaje);
        statusEl.textContent = "";
        return;
    }

    ocultarAvisoSolar();
    statusEl.textContent = `Se han encontrado ${data.resultados.length} recomendaciones para ${actividadSeleccionada.replace("_", " ")}.`;
}

function reaplicarResultadosCacheados() {
    if (!canReuseRecommendationContext()) {
        return false;
    }

    const cantidad = Math.max(0, Number(quantityController?.getCantidadSeleccionada() || 0));
    const filtros = obtenerFiltrosActivos();
    const resultados = lastRecommendationContext.baseData.resultados
        .filter((playa) => cumpleFiltros(playa, filtros))
        .slice(0, cantidad);

    renderRecommendationResults({
        ...lastRecommendationContext.baseData,
        resultados
    });

    return true;
}

function initControllers() {
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
        onFiltersChange: () => {
            if (!reaplicarResultadosCacheados()) {
                limpiarResultadosPorCambioDeFiltros();
            }
        }
    });

    initStaticFilters({
        staticFilterInputs,
        disableStaticFilters,
        onFiltersChange: () => {
            if (!reaplicarResultadosCacheados()) {
                limpiarResultadosPorCambioDeFiltros();
            }
        },
        iluminarChipFiltro
    });

    preferencesUIController = initPreferencesUI({
        preferencesPanel,
        authActionBtn,
        rememberActivityPreference,
        rememberSchedulePreference,
        expandResultsPreference,
        onRememberActivityChange: guardarActividadRecordada,
        onRememberScheduleChange: guardarHorarioRecordado
    });

    authModalController = initAuthModal({
        loginModalEl,
        closeLoginModalBtn,
        loginModalForm,
        loginEmailInput,
        loginPasswordInput,
        confirmPasswordInput,
        confirmPasswordGroup,
        loginErrorMessageEl,
        authSubmitBtn,
        authModeHint,
        toggleAuthModeBtn
    });

    sessionUIController = initSessionUI({
        preferencesUserInfo,
        preferencesPanel,
        authActionBtn,
        authActionIcon,
        filtersSidebar,
        preferencesLogoutBtn,
        onOpenPreferences: () => preferencesUIController?.abrirPanelPreferencias(),
        onClosePreferences: () => preferencesUIController?.cerrarPanelPreferencias(),
        onOpenLogin: () => authModalController?.abrirModalLogin(),
        onSessionChange: (estaLogueado, currentUser) => {
            if (estaLogueado) {
                quantityController?.configurarSlider();
            } else {
                quantityController?.restablecerCantidadPorDefecto();
            }
            adminUIController?.updateAdminVisibility(currentUser);
        },
        onLogout: () => {
            document.querySelectorAll(".favorite-btn").forEach(btn => {
                btn.innerText = "\u{1F90D}";
            });
            adminUIController?.updateAdminVisibility(null);
            adminUIController?.closeModals();
        }
    });

    adminUIController = initAdminUI({
        adminPreferencesGroup,
        openUserManagementBtn,
        openBeachManagementBtn,
        openReviewManagementBtn,
        userManagementModal,
        closeUserManagementModal,
        userManagementList,
        userManagementFeedback,
        beachManagementModal,
        closeBeachManagementModal,
        beachManagementList,
        beachManagementFeedback,
        beachManagementForm,
        newBeachBtn,
        resetBeachFormBtn,
        beachIdInput,
        beachNameInput,
        beachLocationInput,
        beachTypeInput,
        beachAccessibilityInput,
        beachLatitudeInput,
        beachLongitudeInput,
        beachPickOnMapBtn,
        beachMapElement,
        beachImageInput,
        beachDescriptionInput,
        beachServicesOptions,
        beachActivitiesOptions,
        getCurrentUser: () => sessionUIController?.getCurrentUser?.(),
        onClosePreferences: () => preferencesUIController?.cerrarPanelPreferencias(),
    });

    resultsMapController = initResultsMap();
}

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
        resetRecommendationContext();
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

function initActivityEvents() {
    activityCards.forEach(card => {
        card.addEventListener("click", () => {
            seleccionarActividad(card.dataset.activity, true);
        });
    });
}

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
        const recommendationResult = await fetchRecommendations({
            actividad: actividadSeleccionada,
            fecha,
            hora,
            rango,
            cantidad: 0,
            selectedCoords,
            applyFilters: null
        });

        if (!recommendationResult.ok && recommendationResult.reason === "missing-location") {
            statusEl.textContent = "Introduce informacion de localizacion.";
            return;
        }

        const { data } = recommendationResult;
        console.log("DATA COMPLETA DEL BACKEND:", data);

        lastRecommendationContext = {
            actividad: actividadSeleccionada,
            fecha,
            hora,
            rango,
            cantidad,
            coords: selectedCoords ? [...selectedCoords] : null,
            baseData: {
                ...data,
                resultados: Array.isArray(data.resultados) ? [...data.resultados] : []
            }
        };

        reaplicarResultadosCacheados();
        desplazarAPlayasRecomendadas();
    }
    catch (error) {
        console.error(error);
        resetRecommendationContext();
        statusEl.textContent = "Ha ocurrido un error al consultar la API.";
        resultsMapController?.setResults([]);
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

async function handleFavoriteToggle(event) {
    const btn = event.target.closest(".favorite-btn");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    console.log("btn pressed:", btn);

    const beachId = Number(btn.dataset.id);
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Inicia sesion para gestionar favoritas.");
        return;
    }
    const isFavorite = btn.innerText === "\u2764\uFE0F";
    const method = isFavorite ? "DELETE" : "POST";
    await authFetch(`/api/favorites/${beachId}`, {
        method
    });
    btn.innerText = isFavorite ? "\u{1F90D}" : "\u2764\uFE0F";   // backward order because we changed it
}

function initSearchEvents() {
    if (buscarBtn) {
        buscarBtn.addEventListener("click", buscarRecomendaciones);
    }
    if (floatingBuscarBtn) {
        floatingBuscarBtn.addEventListener("click", buscarRecomendaciones);
    }
    if (resultsContainer) {
        resultsContainer.addEventListener("click", handleFavoriteToggle);
    }

    document.querySelectorAll('input[name="rango"]').forEach((input) => {
        input.addEventListener("change", () => {
            resetRecommendationContext();
            limpiarResultadosPorCambioDeFiltros();
        });
    });
}

// =========================================================
// RESULTADOS
// =========================================================

function pintarResultados(resultados) {
    renderizarResultados(resultados, resultsContainer);
}

// =========================================================
// Login
// =========================================================

function initAuthEvents() {
    if (!loginModalForm) return;

    loginModalForm.addEventListener("submit", async (event) => {
        await authModalController?.handleSubmit(event, async () => {
            await sessionUIController?.loadCurrentUser();
            sessionUIController?.actualizarBotonesSesion();
        });
    });
}

function initLayoutEvents() {
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (loginModalEl && !loginModalEl.hidden) {
            authModalController?.cerrarModalLogin();
        }
        if (preferencesPanel && !preferencesPanel.hidden) {
            preferencesUIController?.cerrarPanelPreferencias();
        }
        adminUIController?.closeModals();
    });

    window.addEventListener("resize", actualizarAlturaHeader);

    if (appHeader && "ResizeObserver" in window) {
        const headerObserver = new ResizeObserver(actualizarAlturaHeader);
        headerObserver.observe(appHeader);
    }
}

async function initInitialState() {
    actualizarAlturaHeader();
    configurarBotonBusquedaFlotante();

    if (fechaInput) {
        seleccionarActividad(obtenerActividadInicial());
        configurarFechaYHoraIniciales();
    }

    await sessionUIController?.loadCurrentUser();
    sessionUIController?.actualizarBotonesSesion();
    adminUIController?.updateAdminVisibility(sessionUIController?.getCurrentUser?.());
}

async function initApp() {
    initControllers();
    initActivityEvents();
    initSearchEvents();
    initAuthEvents();
    initLayoutEvents();
    await initInitialState();
}

// =========================================================
// ARRANQUE
// =========================================================

initApp();
