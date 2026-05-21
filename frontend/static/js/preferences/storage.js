export const STORAGE_KEYS = {
    rememberActivity: "preferences.rememberActivity",
    rememberSchedule: "preferences.rememberSchedule",
    expandResults: "preferences.expandResults",
    savedActivity: "preferences.savedActivity",
    savedDate: "preferences.savedDate",
    savedStartHour: "preferences.savedStartHour",
    savedEndHour: "preferences.savedEndHour",
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
    rememberSchedulePreference
}) {
    if (rememberActivityPreference) {
        rememberActivityPreference.checked = leerPreferencia(STORAGE_KEYS.rememberActivity);
    }
    if (rememberSchedulePreference) {
        rememberSchedulePreference.checked = leerPreferencia(STORAGE_KEYS.rememberSchedule);
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
    horaInicioSeleccionada,
    horaFinSeleccionada
}) {
    if (!rememberSchedulePreference?.checked || !fechaSeleccionada || !horaInicioSeleccionada || !horaFinSeleccionada) {
        sessionStorage.removeItem(STORAGE_KEYS.savedDate);
        sessionStorage.removeItem(STORAGE_KEYS.savedStartHour);
        sessionStorage.removeItem(STORAGE_KEYS.savedEndHour);
        return;
    }
    sessionStorage.setItem(STORAGE_KEYS.savedDate, fechaSeleccionada);
    sessionStorage.setItem(STORAGE_KEYS.savedStartHour, horaInicioSeleccionada);
    sessionStorage.setItem(STORAGE_KEYS.savedEndHour, horaFinSeleccionada);
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
    const horaInicioGuardada = sessionStorage.getItem(STORAGE_KEYS.savedStartHour);
    const horaFinGuardada = sessionStorage.getItem(STORAGE_KEYS.savedEndHour);
    const hoy = formatearFechaLocal(new Date());

    if (!fechaGuardada || !horaInicioGuardada || !horaFinGuardada || fechaGuardada < hoy) return null;
    if (esHoraPasadaParaFecha(fechaGuardada, horaInicioGuardada)) {
        return null;
    }
    return {
        fecha: fechaGuardada,
        horaInicio: horaInicioGuardada,
        horaFin: horaFinGuardada
    };
}

export function guardarConfiguracionFiltrosUsuario(config) {
    sessionStorage.setItem(STORAGE_KEYS.userFiltersConfig, JSON.stringify(config));
}

export function leerConfiguracionFiltrosUsuario() {
    const config = sessionStorage.getItem(STORAGE_KEYS.userFiltersConfig);
    return config ? JSON.parse(config) : null;
}
