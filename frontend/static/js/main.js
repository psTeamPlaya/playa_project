import { authFetch } from "./api/auth-fetch.js";
import { initAdminUI } from "./admin/admin-ui.js?v=20260520-5";
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
import { initAlertsUI } from "./preferences/alerts-ui.js?v=20260520-5";
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

const activitiesGrid = document.getElementById("activitiesGrid");
const fechaInput = document.getElementById("fecha");

const fechaShell = document.getElementById("fechaShell");
const fechaDisplay = document.getElementById("fechaDisplay");

const buscarBtn = document.getElementById("buscarBtn");
const floatingBuscarBtn = document.getElementById("floatingBuscarBtn");
const statusEl = document.getElementById("status");
const resultsContainer = document.getElementById("resultsContainer");
const favoritesResultsContainer = document.getElementById("favoritesResultsContainer");
const recommendedBeachesSection = document.getElementById("recommendedBeachesSection");
const horaInicioSelect = document.getElementById("horaInicio");
const horaFinSelect = document.getElementById("horaFin");
const sunAlertEl = document.getElementById("sunAlert");
const loginModalEl = document.getElementById("loginModal");
const authActionBtn = document.getElementById("authActionBtn");
const authActionIcon = document.getElementById("authActionIcon");
const authActionLabel = document.getElementById("authActionLabel");
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
const openAlertsModalBtn = document.getElementById("openAlertsModalBtn");
const rememberActivityPreference = document.getElementById("rememberActivityPreference");
const rememberSchedulePreference = document.getElementById("rememberSchedulePreference");
const appHeader = document.getElementById("appHeader");
const heroBrand = document.getElementById("heroBrand");
const authContainer = document.getElementById("authContainer");
const appShell = document.querySelector(".app-shell");
const appMain = document.querySelector(".app-main");
const filtersSidebar = document.getElementById("filtersSidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenuBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileMenuDrawer = document.getElementById("mobileMenuDrawer");
const mobileMenuCloseBtn = document.getElementById("mobileMenuCloseBtn");
const mobileAuthMount = document.getElementById("mobileAuthMount");
const mobileFiltersMount = document.getElementById("mobileFiltersMount");
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
const userManagementHistory = document.getElementById("userManagementHistory");
const beachManagementModal = document.getElementById("beachManagementModal");
const closeBeachManagementModal = document.getElementById("closeBeachManagementModal");
const beachManagementList = document.getElementById("beachManagementList");
const beachManagementFeedback = document.getElementById("beachManagementFeedback");
const beachSearchInput = document.getElementById("beachSearchInput");
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
const activityCatalogForm = document.getElementById("activityCatalogForm");
const activityCatalogNameInput = document.getElementById("activityCatalogName");
const cancelActivityEditBtn = document.getElementById("cancelActivityEditBtn");
const activityWeightsPanel = document.getElementById("activityWeightsPanel");
const activityWeightsGrid = document.getElementById("activityWeightsGrid");
const activityCatalogFeedback = document.getElementById("activityCatalogFeedback");
const activityCatalogList = document.getElementById("activityCatalogList");
const serviceCatalogForm = document.getElementById("serviceCatalogForm");
const serviceCatalogNameInput = document.getElementById("serviceCatalogName");
const serviceCatalogFeedback = document.getElementById("serviceCatalogFeedback");
const serviceCatalogList = document.getElementById("serviceCatalogList");
const alertsModal = document.getElementById("alertsModal");
const closeAlertsModal = document.getElementById("closeAlertsModal");
const openAlertsEditorBtn = document.getElementById("openAlertsEditorBtn");
const closeAlertsEditorBtn = document.getElementById("closeAlertsEditorBtn");
const alertsEditorBackdrop = document.getElementById("alertsEditorBackdrop");
const alertsEditorTitle = document.getElementById("alertsEditorTitle");
const alertsEditorCopy = document.getElementById("alertsEditorCopy");
const alertsForm = document.getElementById("alertsForm");
const alertsEditingIdInput = document.getElementById("alertsEditingId");
const cancelAlertEditBtn = document.getElementById("cancelAlertEditBtn");
const saveCurrentAlertBtn = document.getElementById("saveCurrentAlertBtn");
const alertsActivitySelect = document.getElementById("alertsActivitySelect");
const alertsBeachSelect = document.getElementById("alertsBeachSelect");
const alertWeekdayCheckboxes = Array.from(document.querySelectorAll('input[name="alertWeekdays"]'));
const alertStartHourInput = document.getElementById("alertStartHour");
const alertEndHourInput = document.getElementById("alertEndHour");
const alertMinTemperatureInput = document.getElementById("alertMinTemperature");
const alertMaxTemperatureInput = document.getElementById("alertMaxTemperature");
const alertMinWindInput = document.getElementById("alertMinWind");
const alertMaxWindInput = document.getElementById("alertMaxWind");
const alertMinCloudInput = document.getElementById("alertMinCloud");
const alertMaxCloudInput = document.getElementById("alertMaxCloud");
const alertMinWaveInput = document.getElementById("alertMinWave");
const alertMaxWaveInput = document.getElementById("alertMaxWave");
const alertsFeedback = document.getElementById("alertsFeedback");
const alertsList = document.getElementById("alertsList");

let actividadSeleccionada = "";
let dateTimeController;
let quantityController;
let dynamicFiltersController;
let preferencesUIController;
let authModalController;
let sessionUIController;
let adminUIController;
let resultsMapController;
let alertsUIController;
let lastRecommendationContext = null;
const mobileMenuMediaQuery = window.matchMedia("(max-width: 800px)");
const mobileMenuCloseTimeoutRef = { current: null };

const DEFAULT_ACTIVITY = "tomar_sol";
const DEFAULT_QUANTITY = "3";
const ACTIVITY_ICON_MAP = {
    tomar_sol: "\u2600\uFE0F",
    nadar: "\u{1F3CA}",
    surf: "\u{1F3C4}",
    windsurf: "\u{1F32C}\uFE0F",
    bucear: "\u{1F93F}",
    caminar: "\u{1F6B6}",
    pescar: "\u{1F3A3}",
    kayak: "\u{1F6F6}",
    kitesurf: "\u{1FA81}",
    paddle_surf: "\u{1F6F6}",
};
const ACTIVITY_IMAGE_MAP = {
    bodyboard: "/static/img/bodyboard.png",
    kitesurf: "/static/img/kitesurf.png",
    paddle_surf: "/static/img/paddle-surf.png",
    voley_playa: "/static/img/voleyplaya.png",
    windsurf: "/static/img/windsurf.png",
};

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

function esVistaMovil() {
    return mobileMenuMediaQuery.matches;
}

function sincronizarUbicacionMenuMovil() {
    if (!authContainer || !filtersSidebar || !heroBrand || !appShell || !appMain) {
        return;
    }

    if (esVistaMovil()) {
        if (authContainer.parentElement !== mobileAuthMount) {
            mobileAuthMount?.appendChild(authContainer);
        }
        if (filtersSidebar.parentElement !== mobileFiltersMount) {
            mobileFiltersMount?.appendChild(filtersSidebar);
        }
        return;
    }

    if (authContainer.parentElement !== heroBrand) {
        heroBrand.appendChild(authContainer);
    }
    if (filtersSidebar.parentElement !== appShell) {
        appShell.insertBefore(filtersSidebar, appMain);
    }
}

function cerrarMenuMovil({ inmediato = false } = {}) {
    if (!mobileMenuBackdrop) {
        return;
    }

    clearTimeout(mobileMenuCloseTimeoutRef.current);
    preferencesUIController?.cerrarPanelPreferencias();
    mobileMenuBackdrop.classList.remove("is-open");
    document.body.classList.remove("mobile-menu-open");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");

    if (inmediato) {
        mobileMenuBackdrop.hidden = true;
        return;
    }

    mobileMenuCloseTimeoutRef.current = setTimeout(() => {
        mobileMenuBackdrop.hidden = true;
    }, 220);
}

function abrirMenuMovil() {
    if (!esVistaMovil() || !mobileMenuBackdrop) {
        return;
    }

    sincronizarUbicacionMenuMovil();
    clearTimeout(mobileMenuCloseTimeoutRef.current);
    mobileMenuBackdrop.hidden = false;
    requestAnimationFrame(() => {
        mobileMenuBackdrop.classList.add("is-open");
    });
    document.body.classList.add("mobile-menu-open");
    mobileMenuBtn?.setAttribute("aria-expanded", "true");
}

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
        horaInicio: dateTimeController?.getHoraInicioSeleccionada() || "",
        horaFin: dateTimeController?.getHoraFinSeleccionada() || "",
        rango: radioSeleccionado ? radioSeleccionado.value : "50",
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
        && lastRecommendationContext.horaInicio === currentSignature.horaInicio
        && lastRecommendationContext.horaFin === currentSignature.horaFin
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

function getActivityCards() {
    return Array.from(document.querySelectorAll(".activity-card"));
}

function getActivityIcon(activityName = "") {
    return ACTIVITY_ICON_MAP[activityName] || "\u{1F3D6}\uFE0F";
}

function getActivityIconMarkup(activityName = "") {
    const iconImage = ACTIVITY_IMAGE_MAP[activityName];
    if (iconImage) {
        return `<img class="activity-icon-image" src="${iconImage}" alt="" aria-hidden="true">`;
    }

    return getActivityIcon(activityName);
}

function renderActivityCards(activities = []) {
    if (!activitiesGrid) {
        return;
    }

    if (!Array.isArray(activities) || activities.length === 0) {
        activitiesGrid.innerHTML = `
            <div class="empty-state">
                No hay actividades disponibles en este momento.
            </div>
        `;
        return;
    }

    activitiesGrid.innerHTML = activities.map((activity) => `
        <div class="activity-card" data-activity="${activity.name}">
            <span class="activity-icon">${getActivityIconMarkup(activity.name)}</span>
            <span class="activity-name">${activity.label}</span>
        </div>
    `).join("");
}

async function loadActivities() {
    if (!activitiesGrid) {
        return [];
    }

    try {
        const response = await fetch("/activities/");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const activities = await response.json();
        renderActivityCards(activities);
        return Array.isArray(activities) ? activities : [];
    }
    catch (error) {
        console.error("Error cargando actividades:", error);
        activitiesGrid.innerHTML = `
            <div class="empty-state">
                No se pudieron cargar las actividades.
            </div>
        `;
        statusEl.textContent = "No se pudieron cargar las actividades disponibles.";
        return [];
    }
}

function guardarHorarioRecordado() {
    const fechaSeleccionada = dateTimeController?.getFecha() || fechaInput.value;
    const horaInicioSeleccionada = dateTimeController?.getHoraInicioSeleccionada() || "";
    const horaFinSeleccionada = dateTimeController?.getHoraFinSeleccionada() || "";
    saveRememberedSchedule({
        rememberSchedulePreference,
        fechaSeleccionada,
        horaInicioSeleccionada,
        horaFinSeleccionada
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
        if (data.aviso_sol.bloqueante) {
            statusEl.textContent = "";
            return;
        }
    }
    else {
        ocultarAvisoSolar();
    }
    const horaInicio = data.hora_inicio || data.hora || "";
    const horaFin = data.hora_fin || data.hora || "";
    const rangoTexto = horaInicio && horaFin ? ` entre las ${horaInicio} y las ${horaFin}` : "";
    statusEl.textContent = `Se han encontrado ${data.resultados.length} recomendaciones para ${actividadSeleccionada.replace("_", " ")}${rangoTexto}.`;
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
        horaInicioSelect,
        horaFinSelect,
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
        onRememberActivityChange: guardarActividadRecordada,
        onRememberScheduleChange: guardarHorarioRecordado
    });

    alertsUIController = initAlertsUI({
        openAlertsModalBtn,
        alertsModal,
        closeAlertsModalBtn: closeAlertsModal,
        openAlertsEditorBtn,
        closeAlertsEditorBtn,
        alertsEditorBackdrop,
        alertsEditorTitle,
        alertsEditorCopy,
        alertsForm,
        alertsEditingIdInput,
        cancelAlertEditBtn,
        saveCurrentAlertBtn,
        alertsActivitySelect,
        alertsBeachSelect,
        alertWeekdayCheckboxes,
        alertStartHourInput,
        alertEndHourInput,
        alertMinTemperatureInput,
        alertMaxTemperatureInput,
        alertMinWindInput,
        alertMaxWindInput,
        alertMinCloudInput,
        alertMaxCloudInput,
        alertMinWaveInput,
        alertMaxWaveInput,
        alertsList,
        alertsFeedback,
        getCurrentUser: () => sessionUIController?.getCurrentUser?.(),
        getPreferredActivityName: () => actividadSeleccionada || ""
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
        authActionLabel,
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
        userManagementHistory,
        beachManagementModal,
        closeBeachManagementModal,
        beachManagementList,
        beachManagementFeedback,
        beachSearchInput,
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
        activityCatalogForm,
        activityCatalogNameInput,
        cancelActivityEditBtn,
        activityWeightsPanel,
        activityWeightsGrid,
        activityCatalogFeedback,
        activityCatalogList,
        serviceCatalogForm,
        serviceCatalogNameInput,
        serviceCatalogFeedback,
        serviceCatalogList,
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
    getActivityCards().forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    actividadSeleccionada = actividad;
    guardarActividadRecordada();
    alertsUIController?.syncFormDefaults?.();

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
    if (!activitiesGrid) {
        return;
    }

    activitiesGrid.addEventListener("click", (event) => {
        const card = event.target.closest(".activity-card");
        if (!card) {
            return;
        }

        seleccionarActividad(card.dataset.activity, true);
    });
}

// =========================================================
// BUSQUEDA
// =========================================================

async function buscarRecomendaciones() {
    const fecha = fechaInput.value;
    const horaInicio = dateTimeController?.getHoraInicioSeleccionada() || "";
    const horaFin = dateTimeController?.getHoraFinSeleccionada() || "";
    ocultarAvisoSolar();

    if (!actividadSeleccionada) {
        statusEl.textContent = "Debes seleccionar una actividad.";
        return;
    }
    if (!fecha) {
        statusEl.textContent = "Debes seleccionar una fecha.";
        return;
    }
    if (!horaInicio || !horaFin) {
        statusEl.textContent = "Debes seleccionar una hora de inicio y una hora de fin.";
        return;
    }
    if (fecha < formatearFechaLocal(new Date())) {
        statusEl.textContent = "No puedes seleccionar una fecha pasada.";
        return;
    }
    if (dateTimeController?.esFechaHoy(fecha) && dateTimeController?.esHoraPasadaParaHoy(horaInicio)) {
        statusEl.textContent = "No puedes seleccionar una hora de inicio pasada para el d\u00eda de hoy.";
        guardarHorarioRecordado();
        return;
    }
    if (horaFin <= horaInicio) {
        statusEl.textContent = "La hora de fin debe ser posterior a la hora de inicio.";
        return;
    }
    statusEl.textContent = "Buscando recomendaciones...";
    try {
        const radioSeleccionado = document.querySelector('input[name="rango"]:checked');
        const rango = radioSeleccionado ? radioSeleccionado.value : "50";
        const cantidad = Math.max(0, Number(quantityController?.getCantidadSeleccionada() || 0));
        const recommendationResult = await fetchRecommendations({
            actividad: actividadSeleccionada,
            fecha,
            horaInicio,
            horaFin,
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
            horaInicio,
            horaFin,
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
    const token = sessionStorage.getItem("token");
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

resultsContainer.addEventListener("click", handleReviewClick);
favoritesResultsContainer.addEventListener("click", handleReviewClick);

let currentBeachForReviews = null;

async function handleReviewClick(event) {
    const btn = event.target.closest(".rating-badge");
    if (!btn) return;

    const user = sessionUIController?.getCurrentUser?.();
    console.log("User: ", user);
    if (!user) return;

    event.preventDefault();
    event.stopPropagation();

    const beachId = btn.dataset.id || btn.dataset.ratingId;
    currentBeachForReviews = beachId;

    const modal = document.getElementById("reviewsModal");
    const list = document.getElementById("reviewsList");

    modal.hidden = false;
    list.innerHTML = "<div class='empty-state'>Cargando reseñas...</div>";

    try {
        const res = await authFetch(`/reviews/beach/${beachId}`);
        const reviews = await res.json();
        renderReviews(reviews);
    } 
    catch (err) {
        list.innerHTML = "<div class='empty-state'>Error cargando reseñas</div>";
    }
}

document.getElementById("reviewsList").addEventListener("click", async (event) => {
    const btn = event.target.closest(".delete-review-btn");
    if (!btn) return;

    const reviewId = btn.dataset.id;

    const user = sessionUIController?.getCurrentUser?.();
    if (!user) return;

    const confirmDelete = confirm("¿Seguro que quieres borrar esta reseña?");
    if (!confirmDelete) return;

    try {
        await authFetch(`/reviews/${reviewId}`, {
            method: "DELETE"
        });

        // recargar reviews
        const res = await authFetch(`/reviews/beach/${currentBeachForReviews}`);
        const reviews = await res.json();
        renderReviews(reviews);
    } 
    catch (err) {
        alert("Error al eliminar la reseña");
    }
});

function renderReviews(reviews) {
    const list = document.getElementById("reviewsList");
    const user = sessionUIController?.getCurrentUser?.();

    if (!reviews.length) {
        list.innerHTML = "<div class='empty-state'>Sin reseñas todavía</div>";
        return;
    }

    list.innerHTML = reviews.map(r => {

        const isOwner = user && user.email === r.email;
        const isAdmin = user && user.role === "admin";

        return `
            <div class="review-item" data-id="${r.id}">
                <strong>${r.email}</strong>
                <p>${r.content}</p>
                <small>⭐ ${r.rating}</small>

                ${(isOwner || isAdmin) ? `
                    <button class="delete-review-btn" data-id="${r.id}">
                        🗑️ Eliminar
                    </button>
                ` : ""}
            </div>
        `;
    }).join("");
}

const reviewForm = document.getElementById("reviewForm");

reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentBeachForReviews) return;

    const content = document.getElementById("reviewText").value;
    try {
        await authFetch("/reviews/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                beach_id: Number(currentBeachForReviews),
                rating: selectedRating,
                content
            })
        });
        document.getElementById("reviewText").value = "";

        // recargar lista
        const res = await authFetch(`/reviews/beach/${currentBeachForReviews}`);
        const reviews = await res.json();
        renderReviews(reviews);
    } 
    catch (err) {
        alert("Error al enviar reseña");
    }
});

document.getElementById("openConfigLink").addEventListener("click", () => {
  document.getElementById("filterConfigModal").hidden = false;
});

let selectedRating = 5;
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#starsInput span").forEach(star => {
    star.addEventListener("click", () => {
      selectedRating = Number(star.dataset.value);

      document.querySelectorAll("#starsInput span").forEach(s => {
        s.classList.toggle("active", Number(s.dataset.value) <= selectedRating);
      });
    });
  });
});

document.getElementById("closeReviewsModal").addEventListener("click", () => {
    document.getElementById("reviewsModal").hidden = true;
    currentBeachForReviews = null;
});

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
        cerrarMenuMovil();
        if (loginModalEl && !loginModalEl.hidden) {
            authModalController?.cerrarModalLogin();
        }
        if (alertsModal && !alertsModal.hidden) {
            alertsUIController?.closeModal?.();
        }
        if (preferencesPanel && !preferencesPanel.hidden) {
            preferencesUIController?.cerrarPanelPreferencias();
        }
        adminUIController?.closeModals();
    });

    window.addEventListener("resize", () => {
        actualizarAlturaHeader();
        if (!esVistaMovil()) {
            cerrarMenuMovil({ inmediato: true });
        }
        sincronizarUbicacionMenuMovil();
    });

    mobileMenuMediaQuery.addEventListener("change", () => {
        if (!esVistaMovil()) {
            cerrarMenuMovil({ inmediato: true });
        }
        sincronizarUbicacionMenuMovil();
    });

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", () => {
            if (mobileMenuBackdrop?.hidden) {
                abrirMenuMovil();
                return;
            }
            cerrarMenuMovil();
        });
    }

    if (mobileMenuCloseBtn) {
        mobileMenuCloseBtn.addEventListener("click", () => {
            cerrarMenuMovil();
        });
    }

    if (mobileMenuBackdrop) {
        mobileMenuBackdrop.addEventListener("click", (event) => {
            if (event.target === mobileMenuBackdrop) {
                cerrarMenuMovil();
            }
        });
    }

    if (appHeader && "ResizeObserver" in window) {
        const headerObserver = new ResizeObserver(actualizarAlturaHeader);
        headerObserver.observe(appHeader);
    }
}

async function initInitialState() {
    sincronizarUbicacionMenuMovil();
    actualizarAlturaHeader();
    configurarBotonBusquedaFlotante();

    const activities = await loadActivities();

    if (fechaInput && activities.length > 0) {
        const rememberedActivity = obtenerActividadInicial();
        const availableNames = new Set(activities.map((activity) => activity.name));
        const initialActivity = availableNames.has(rememberedActivity)
            ? rememberedActivity
            : (availableNames.has(DEFAULT_ACTIVITY) ? DEFAULT_ACTIVITY : activities[0].name);

        seleccionarActividad(initialActivity);
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
