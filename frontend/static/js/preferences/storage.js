export const STORAGE_KEYS = {
    rememberActivity: "preferences.rememberActivity",
    rememberSchedule: "preferences.rememberSchedule",
    expandResults: "preferences.expandResults",
    savedActivity: "preferences.savedActivity",
    savedDate: "preferences.savedDate",
    savedHour: "preferences.savedHour"
};

export function leerPreferencia(clave) {
    return localStorage.getItem(clave) === "true";
}

export function guardarPreferencia(clave, valor) {
    localStorage.setItem(clave, valor ? "true" : "false");
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
        localStorage.removeItem(STORAGE_KEYS.savedActivity);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.savedActivity, actividadSeleccionada);
}

export function guardarHorarioRecordado({
    rememberSchedulePreference,
    fechaSeleccionada,
    horaSeleccionada
}) {
    if (!rememberSchedulePreference?.checked || !fechaSeleccionada || !horaSeleccionada) {
        localStorage.removeItem(STORAGE_KEYS.savedDate);
        localStorage.removeItem(STORAGE_KEYS.savedHour);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.savedDate, fechaSeleccionada);
    localStorage.setItem(STORAGE_KEYS.savedHour, horaSeleccionada);
}

export function obtenerActividadInicial({
    rememberActivityPreference,
    defaultActivity
}) {
    const actividadGuardada = localStorage.getItem(STORAGE_KEYS.savedActivity);
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

    const fechaGuardada = localStorage.getItem(STORAGE_KEYS.savedDate);
    const horaGuardada = localStorage.getItem(STORAGE_KEYS.savedHour);
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
