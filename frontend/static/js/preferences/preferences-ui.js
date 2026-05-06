import { STORAGE_KEYS, cargarPreferenciasUI, guardarPreferencia } from "./storage.js";

export function cerrarPanelPreferencias(preferencesPanel, preferencesCloseTimeoutRef) {
    if (preferencesPanel) {
        preferencesPanel.classList.remove("is-open");
        clearTimeout(preferencesCloseTimeoutRef.current);
        preferencesCloseTimeoutRef.current = setTimeout(() => {
            preferencesPanel.hidden = true;
        }, 220);
    }
}

export function abrirPanelPreferencias(preferencesPanel, preferencesCloseTimeoutRef) {
    if (!preferencesPanel) return;

    clearTimeout(preferencesCloseTimeoutRef.current);
    preferencesPanel.hidden = false;
    requestAnimationFrame(() => {
        preferencesPanel.classList.add("is-open");
    });
}

export function initPreferencesUI({
    preferencesPanel,
    authActionBtn,
    rememberActivityPreference,
    rememberSchedulePreference,
    expandResultsPreference,
    onRememberActivityChange,
    onRememberScheduleChange
}) {
    const preferencesCloseTimeoutRef = { current: null };

    cargarPreferenciasUI({
        rememberActivityPreference,
        rememberSchedulePreference,
        expandResultsPreference
    });

    if (rememberActivityPreference) {
        rememberActivityPreference.addEventListener("change", () => {
            guardarPreferencia(STORAGE_KEYS.rememberActivity, rememberActivityPreference.checked);
            onRememberActivityChange?.();
        });
    }

    if (rememberSchedulePreference) {
        rememberSchedulePreference.addEventListener("change", () => {
            guardarPreferencia(STORAGE_KEYS.rememberSchedule, rememberSchedulePreference.checked);
            onRememberScheduleChange?.();
        });
    }

    if (expandResultsPreference) {
        expandResultsPreference.addEventListener("change", () => {
            guardarPreferencia(STORAGE_KEYS.expandResults, expandResultsPreference.checked);
        });
    }

    document.addEventListener("click", (event) => {
        if (!preferencesPanel || preferencesPanel.hidden) return;
        const clickDentroPanel = preferencesPanel.contains(event.target);
        const clickEnToggle = authActionBtn?.contains(event.target);
        if (!clickDentroPanel && !clickEnToggle) {
            cerrarPanelPreferencias(preferencesPanel, preferencesCloseTimeoutRef);
        }
    });

    return {
        abrirPanelPreferencias: () => abrirPanelPreferencias(preferencesPanel, preferencesCloseTimeoutRef),
        cerrarPanelPreferencias: () => cerrarPanelPreferencias(preferencesPanel, preferencesCloseTimeoutRef)
    };
}
