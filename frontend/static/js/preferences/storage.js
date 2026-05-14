export const STORAGE_KEYS = {
    rememberActivity: "preferences.rememberActivity",
    rememberSchedule: "preferences.rememberSchedule",
    expandResults: "preferences.expandResults",
    savedActivity: "preferences.savedActivity",
    savedDate: "preferences.savedDate",
    savedHour: "preferences.savedHour",
    userFiltersConfig: "preferences.userFiltersConfig"
};

export function leerPreferencia(clave) {
    return sessionStorage.getItem(clave) === "true";
}

export function guardarPreferencia(clave, valor) {
    sessionStorage.setItem(clave, valor ? "true" : "false");
}

export function cargarPreferenciasUI({
    rememberActivityPreference,
    rememberSchedulePreference,
    expandResultsPreference
}) {
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

export function guardarActividadRecordada({
    rememberActivityPreference,
    actividadSeleccionada
}) {
    if (!rememberActivityPreference?.checked || !actividadSeleccionada) {
        sessionStorage.removeItem(STORAGE_KEYS.savedActivity);
        return;
    }
    sessionStorage.setItem(STORAGE_KEYS.savedActivity, actividadSeleccionada);
}

export function guardarHorarioRecordado({
    rememberSchedulePreference,
    fechaSeleccionada,
    horaSeleccionada
}) {
    if (!rememberSchedulePreference?.checked || !fechaSeleccionada || !horaSeleccionada) {
        sessionStorage.removeItem(STORAGE_KEYS.savedDate);
        sessionStorage.removeItem(STORAGE_KEYS.savedHour);
        return;
    }
    sessionStorage.setItem(STORAGE_KEYS.savedDate, fechaSeleccionada);
    sessionStorage.setItem(STORAGE_KEYS.savedHour, horaSeleccionada);
}

export function obtenerActividadInicial({
    rememberActivityPreference,
    defaultActivity
}) {
    const actividadGuardada = sessionStorage.getItem(STORAGE_KEYS.savedActivity);
    if (rememberActivityPreference?.checked && actividadGuardada) {
        return actividadGuardada;
    }
    return defaultActivity;
}

export function obtenerHorarioInicial({
    rememberSchedulePreference,
    formatearFechaLocal,
    esHoraPasadaParaFecha
}) {
    if (!rememberSchedulePreference?.checked) return null;

    const fechaGuardada = sessionStorage.getItem(STORAGE_KEYS.savedDate);
    const horaGuardada = sessionStorage.getItem(STORAGE_KEYS.savedHour);
    const hoy = formatearFechaLocal(new Date());

    if (!fechaGuardada || !horaGuardada || fechaGuardada < hoy) return null;
    if (esHoraPasadaParaFecha(fechaGuardada, horaGuardada)) {
        return null;
    }
    return {
        fecha: fechaGuardada,
        hora: horaGuardada
    };
}

export function guardarConfiguracionFiltrosUsuario(config) {
    sessionStorage.setItem(STORAGE_KEYS.userFiltersConfig, JSON.stringify(config));
}

export function leerConfiguracionFiltrosUsuario() {
    const config = sessionStorage.getItem(STORAGE_KEYS.userFiltersConfig);
    return config ? JSON.parse(config) : null;
}