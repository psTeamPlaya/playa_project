import { login } from "./auth/login.js";
import { registerUser } from "./auth/register.js";
import { selectedCoords } from "./localization.js";

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

let hourOptions = [];
let actividadSeleccionada = "";
let horaSeleccionada = "";
let authMode = "login";
let preferencesCloseTimeout;
let staticFiltersLightTimeout;
let dynamicFiltersLightTimeout;

const DEFAULT_ACTIVITY = "tomar_sol";
const DEFAULT_QUANTITY = "3";

const WIND_FILTER_DEFAULTS = { min: 0, max: 15 };
const CLOUD_FILTER_DEFAULTS = { min: 0, max: 20 };
const TEMPERATURE_FILTER_DEFAULTS = { min: 20, max: 29 };
const WAVE_FILTER_DEFAULTS = { min: 0, max: 1 };

const DYNAMIC_FILTERS = [
    {
        id: "viento",
        minInput: filterWindMin, maxInput: filterWindMax,
        minLabel: windMinValue, maxLabel: windMaxValue,
        rangeTrack: windRangeTrack, disabledCheck: filterWindDisabled,
        resetBtn: filterWindReset, defaults: WIND_FILTER_DEFAULTS,
        decimal: false, paramMin: "min_velocidad_viento", paramMax: "max_velocidad_viento",
        timeoutId: null
    },
    {
        id: "nubosidad",
        minInput: filterCloudMin, maxInput: filterCloudMax,
        minLabel: cloudMinValue, maxLabel: cloudMaxValue,
        rangeTrack: cloudRangeTrack, disabledCheck: filterCloudDisabled,
        resetBtn: filterCloudReset, defaults: CLOUD_FILTER_DEFAULTS,
        decimal: false, paramMin: "min_nubosidad", paramMax: "max_nubosidad",
        timeoutId: null
    },
    {
        id: "temperatura_ambiente",
        minInput: filterTemperatureMin, maxInput: filterTemperatureMax,
        minLabel: temperatureMinValue, maxLabel: temperatureMaxValue,
        rangeTrack: temperatureRangeTrack, disabledCheck: filterTemperatureDisabled,
        resetBtn: filterTemperatureReset, defaults: TEMPERATURE_FILTER_DEFAULTS,
        decimal: false, paramMin: "min_temperatura_ambiente", paramMax: "max_temperatura_ambiente",
        timeoutId: null
    },
    {
        id: "oleaje",
        minInput: filterWaveMin, maxInput: filterWaveMax,
        minLabel: waveMinValue, maxLabel: waveMaxValue,
        rangeTrack: waveRangeTrack, disabledCheck: filterWaveDisabled,
        resetBtn: filterWaveReset, defaults: WAVE_FILTER_DEFAULTS,
        decimal: true, paramMin: "min_altura_oleaje", paramMax: "max_altura_oleaje",
        timeoutId: null
    }
];
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
    if (!rememberSchedulePreference?.checked || !fechaInput.value || !horaSeleccionada) {
        localStorage.removeItem(STORAGE_KEYS.savedDate);
        localStorage.removeItem(STORAGE_KEYS.savedHour);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.savedDate, fechaInput.value);
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
    if (fechaGuardada === hoy && esHoraPasadaParaFecha(fechaGuardada, horaGuardada)) {
        return null;
    }
    return {
        fecha: fechaGuardada,
        hora: horaGuardada
    };
}

function obtenerFiltrosTipoPlaya() {
    return {
        tipoArena: Boolean(filterSandBeach?.checked),
        tipoPiedra: Boolean(filterStoneBeach?.checked)
    };
}

function estaSidebarFiltrosActiva() {
    return Boolean(filtersSidebar && !filtersSidebar.hidden);
}

function obtenerValoresFiltroDinamico(filtro) {
    return {
        activo: estaSidebarFiltrosActiva() && !filtro.disabledCheck?.checked,
        min: Number(filtro.minInput?.value ?? filtro.defaults.min),
        max: Number(filtro.maxInput?.value ?? filtro.defaults.max)
    };
}

function aplicarFiltrosAParametros(params) {
    console.log("PARAMS INICIALES:", params.toString());
    if (!estaSidebarFiltrosActiva()) return;

    const filtros = obtenerFiltrosTipoPlaya();
    if (filtros.tipoArena)  params.set("tipo_arena", true);
    if (filtros.tipoPiedra) params.set("tipo_piedra", true);

    if (filterRestaurant?.checked)   params.set("restaurantes", true);
    if (filterTakeAwayFood?.checked) params.set("comida_para_llevar", true);
    if (filterBalneario?.checked)    params.set("balnearios", true);
    if (filterSportZone?.checked)    params.set("zona_deportiva", true);

    console.log("PARAMS FINALES:", params.toString());
    
    DYNAMIC_FILTERS.forEach(filtro => {
        const valores = obtenerValoresFiltroDinamico(filtro);
        if (valores.activo) {
            params.set(filtro.paramMin, String(valores.min));
            params.set(filtro.paramMax, String(valores.max));
        }
    });
}

function formatearValorDecimalFiltro(valor) {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

function actualizarFiltroDinamicoUI(filtro) {
    if (!filtro.minInput || !filtro.maxInput) return;
    
    let min = Number(filtro.minInput.value);
    let max = Number(filtro.maxInput.value);
    if (min > max) {
        [min, max] = [max, min];
        filtro.minInput.value = String(min);
        filtro.maxInput.value = String(max);
    }

    const formatear = val => filtro.decimal ? formatearValorDecimalFiltro(val) : String(val);

    if (filtro.minLabel) filtro.minLabel.textContent = formatear(min);
    if (filtro.maxLabel) filtro.maxLabel.textContent = formatear(max);
    if (filtro.rangeTrack) {
        const minPermitido = Number(filtro.minInput.min);
        const maxPermitido = Number(filtro.minInput.max);
        const total = maxPermitido - minPermitido;
        const minPorcentaje = ((min - minPermitido) / total) * 100;
        const maxPorcentaje = ((max - minPermitido) / total) * 100;

        filtro.rangeTrack.style.setProperty("--range-min", `${minPorcentaje}%`);
        filtro.rangeTrack.style.setProperty("--range-max", `${maxPorcentaje}%`);
        filtro.rangeTrack.classList.toggle("is-disabled", Boolean(filtro.disabledCheck?.checked));
    }
    const desactivado = Boolean(filtro.disabledCheck?.checked);
    filtro.minInput.disabled = desactivado;
    filtro.maxInput.disabled = desactivado;
}

function restablecerFiltroDinamico(filtro) {
    if (!filtro.minInput || !filtro.maxInput) return;
    filtro.minInput.value = String(filtro.defaults.min);
    filtro.maxInput.value = String(filtro.defaults.max);
    actualizarFiltroDinamicoUI(filtro);
}

function desactivarFiltrosEstaticos() {
    [filterSandBeach, filterStoneBeach, filterRestaurant, 
        filterTakeAwayFood, filterBalneario, filterSportZone].forEach(filterInput => {
        if (filterInput) filterInput.checked = false;
    });
}

function desactivarFiltrosDinamicos() {
    DYNAMIC_FILTERS.forEach(filtro => {
        if (filtro.disabledCheck) filtro.disabledCheck.checked = true;
        actualizarFiltroDinamicoUI(filtro);
    });
}

function iluminarChipFiltro(chip, timeoutId, onTimeoutChange) {
    chip.classList.remove("is-lit");
    void chip.offsetWidth;
    chip.classList.add("is-lit");
    clearTimeout(timeoutId);
    const nextTimeoutId = setTimeout(() => {
        chip.classList.remove("is-lit");
    }, 500);
    onTimeoutChange(nextTimeoutId);
}

const cantidadSlider = document.getElementById("cantidadSlider");
const cantidadSliderValue = document.getElementById("cantidadSliderValue");
const cantidadSliderMax = document.getElementById("cantidadSliderMax");
let cantidadSeleccionada = Number(DEFAULT_QUANTITY);

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

    if (minutos === 0) return hora;
    return hora + 1;
}

function obtenerHoraTexto(hourNumber) {
    const horaNormalizada = Math.min(hourNumber, 23);
    return `${String(horaNormalizada).padStart(2, "0")}:00`;
}

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

function obtenerHorasDisponiblesParaFecha(fechaTexto) {
    const horas = [];
    const hoy = formatearFechaLocal(new Date());
    let horaInicio = 0;

    if (fechaTexto === hoy) horaInicio = obtenerHoraMinimaPermitida();
    for (let hora = horaInicio; hora <= 23; hora++) horas.push(obtenerHoraTexto(hora));
    return horas;
}

function renderizarWheelHoras(fechaTexto) {
    const horasDisponibles = obtenerHorasDisponiblesParaFecha(fechaTexto);

    hourWheel.innerHTML = horasDisponibles
        .map(hora => `<div class="hour-option" data-hour="${hora}">${hora}</div>`)
        .join("");

    hourOptions = [...hourWheel.querySelectorAll(".hour-option")];
    hourOptions.forEach(option => {
        option.addEventListener("click", () => {
            const horaAnterior = horaSeleccionada;
            option.scrollIntoView({
                block: "center",
                behavior: "smooth"
            });

            horaSeleccionada = option.dataset.hour;
            guardarHorarioRecordado();
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
        guardarHorarioRecordado();
    }
}

function actualizarCantidadSliderUI() {
    if (!cantidadSlider || !cantidadSliderValue) return;

    cantidadSeleccionada = Number(cantidadSlider.value) || 0;
    cantidadSliderValue.value = String(cantidadSeleccionada);
    cantidadSliderValue.textContent = String(cantidadSeleccionada);
}

async function configurarSliderCantidad() {
    if (!cantidadSlider) return;
    try {
        const response = await fetch("/api/playas/count");
        if (!response.ok) {
            throw new Error("No se pudo obtener el total de playas.");
        }

        const data = await response.json();
        const maxPlayas = Math.max(0, Number(data.total) || 0);
        cantidadSlider.max = String(maxPlayas);
        cantidadSlider.value = String(Math.min(Number(DEFAULT_QUANTITY), maxPlayas));

        if (cantidadSliderMax) {
            cantidadSliderMax.textContent = String(maxPlayas);
        }
    } 
    catch (error) {console.error(error);}
    actualizarCantidadSliderUI();
}

function esFechaHoy(fechaTexto) {
    return fechaTexto === formatearFechaLocal(new Date());
}

function esHoraPasadaParaFecha(fechaTexto, horaTexto) {
    if (fechaTexto !== formatearFechaLocal(new Date())) {
        return false;
    }
    const horaNumero = Number(horaTexto.split(":")[0]);
    return horaNumero < obtenerHoraMinimaPermitida();
}

function esHoraPasadaParaHoy(horaTexto) {
    return esHoraPasadaParaFecha(fechaInput.value, horaTexto);
}

// ============================================================
// CONFIGURACIÓN INICIAL POR DEFECTO: actividad, fecha y hora
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
    const hoy = new Date();
    const fechaHoy = formatearFechaLocal(hoy);
    const horarioInicial = obtenerHorarioInicial();

    fechaInput.min = fechaHoy;
    fechaInput.value = horarioInicial?.fecha || fechaHoy;
    actualizarTextoFecha();
    actualizarHorasDisponibles();

    if (horarioInicial?.hora && obtenerHorasDisponiblesParaFecha(fechaInput.value).includes(horarioInicial.hora)) {
        fijarHoraInicial(horarioInicial.hora);
        guardarHorarioRecordado();
        return;
    }

    const horaMinima = obtenerHoraMinimaPermitida();
    if (fechaInput.value === fechaHoy && horaMinima > 23) {
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        fechaInput.value = formatearFechaLocal(manana);
        actualizarTextoFecha();
        actualizarHorasDisponibles();
        fijarHoraInicial("00:00");
        guardarHorarioRecordado();
        return;
    }

    const horaInicial = fechaInput.value === fechaHoy
        ? obtenerHoraTexto(horaMinima)
        : "00:00";

    fijarHoraInicial(horaInicial);
    guardarHorarioRecordado();
}

// =========================================================
// DISPONIBILIDAD DE HORAS
// =========================================================

function actualizarHorasDisponibles() {
    renderizarWheelHoras(fechaInput.value);
}

function asegurarHoraValidaSeleccionada() {
    const horasDisponibles = obtenerHorasDisponiblesParaFecha(fechaInput.value);

    if (!horaSeleccionada || !horasDisponibles.includes(horaSeleccionada)) {
        const nuevaHoraValida = horasDisponibles[0] || null;
        if (nuevaHoraValida) fijarHoraInicial(nuevaHoraValida);
        else                 horaSeleccionada = "";
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

        if (distancia < 18)      option.classList.add("active");
        else if (distancia < 54) option.classList.add("near");
    });

    if (opcionMasCercana) {
        const horaAnterior = horaSeleccionada;
        horaSeleccionada = opcionMasCercana.dataset.hour;

        if (horaSeleccionada !== horaAnterior) {
            guardarHorarioRecordado();
            limpiarResultadosPorCambioDeFiltros();
        } 
        else {
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
            guardarHorarioRecordado();

            if (horaSeleccionada !== horaAnterior) limpiarResultadosPorCambioDeFiltros();
            else statusEl.textContent = "";
        } 
        else {
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
        guardarHorarioRecordado();
        setTimeout(actualizarHoraActiva, 50);
    }
}

// =========================================================
// SLIDER DE CANTIDAD
// =========================================================

if (cantidadSlider) {
    cantidadSlider.addEventListener("input", actualizarCantidadSliderUI);
}

// =========================================================
// EVENTOS DE ACTIVIDAD Y FECHA
// =========================================================

activityCards.forEach(card => {
    card.addEventListener("click", () => {
        seleccionarActividad(card.dataset.activity, true);
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
    guardarHorarioRecordado();
    limpiarResultadosPorCambioDeFiltros();
});

// =========================================================
// BÚSQUEDA
// =========================================================

async function buscarRecomendaciones() {
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
        const radioSeleccionado = document.querySelector('input[name="rango"]:checked');
        const rango = radioSeleccionado ? radioSeleccionado.value : "5";
        const cantidad = Math.max(0, Number(cantidadSeleccionada) || 0);
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
        aplicarFiltrosAParametros(params);
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
    } 
    catch (e) {
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
                <div class="score-badge">Score: ${Number(playa.score).toFixed(1)}</div>
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
        balnearios: "🚿 Balneario",
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

function aplicarModoAuth() {
    if (!authModeHint || !toggleAuthModeBtn || !authSubmitBtn) return;
    const titleEl = document.getElementById("loginModalTitle");

    if (authMode === "register") {
        if (titleEl) titleEl.textContent = "Registrarse";
        authSubmitBtn.textContent = "Crear cuenta";
        authModeHint.textContent = "¿Ya tienes cuenta?";
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
    authModeHint.textContent = "¿Todavía no tienes cuenta?";
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
        btn.innerText = "🤍";
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
    if (filtersSidebar) filtersSidebar.hidden = !estaLogueado;
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
            mostrarMensajeAuth("Debes indicar correo y contraseña.");
            return;
        }
        if (authMode === "register") {
            const confirmPassword = confirmPasswordInput?.value ?? "";
            if (password !== confirmPassword) {
                mostrarMensajeAuth("Las contraseñas no coinciden.");
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

[filterSandBeach, filterStoneBeach, filterRestaurant, filterTakeAwayFood, 
    filterBalneario, filterSportZone].forEach(filterInput => {
    if (!filterInput) return;
    filterInput.addEventListener("change", limpiarResultadosPorCambioDeFiltros);
});

if (disableStaticFilters) {
    disableStaticFilters.addEventListener("click", () => {
        desactivarFiltrosEstaticos();
        limpiarResultadosPorCambioDeFiltros();
        iluminarChipFiltro(disableStaticFilters, staticFiltersLightTimeout, (timeoutId) => {
            staticFiltersLightTimeout = timeoutId;
        });
    });
}

if (disableDynamicFilters) {
    disableDynamicFilters.addEventListener("click", () => {
        desactivarFiltrosDinamicos();
        limpiarResultadosPorCambioDeFiltros();
        iluminarChipFiltro(disableDynamicFilters, dynamicFiltersLightTimeout, (timeoutId) => {
            dynamicFiltersLightTimeout = timeoutId;
        });
    });
}

DYNAMIC_FILTERS.forEach(filtro => {
    [filtro.minInput, filtro.maxInput].forEach(filterInput => {
        if (!filterInput) return;
        filterInput.addEventListener("input", () => {
            actualizarFiltroDinamicoUI(filtro);
            limpiarResultadosPorCambioDeFiltros();
        });
    });

    if (filtro.resetBtn) {
        filtro.resetBtn.addEventListener("click", () => {
            restablecerFiltroDinamico(filtro);
            limpiarResultadosPorCambioDeFiltros();
            iluminarChipFiltro(filtro.resetBtn, filtro.timeoutId, (timeoutId) => {
                filtro.timeoutId = timeoutId;
            });
        });
    }

    if (filtro.disabledCheck) {
        filtro.disabledCheck.addEventListener("change", () => {
            actualizarFiltroDinamicoUI(filtro);
            limpiarResultadosPorCambioDeFiltros();
        });
    }
});

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
DYNAMIC_FILTERS.forEach(f => actualizarFiltroDinamicoUI(f));
configurarBotonBusquedaFlotante();
cargarPreferenciasUI();

if (document.getElementById("fecha")) {
    seleccionarActividad(obtenerActividadInicial());
    configurarFechaYHoraIniciales();
}
loadCurrentUser();
configurarSliderCantidad();
actualizarBotonesSesion();
