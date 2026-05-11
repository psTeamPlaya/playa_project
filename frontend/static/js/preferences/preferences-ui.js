import { STORAGE_KEYS, cargarPreferenciasUI, guardarPreferencia } from "./storage.js";
export { abrirConfiguradorInicial } from "./filters-ui.js";

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

    const checkPreferencias = document.getElementById('rememberSchedulePreference');
    if (checkPreferencias && checkPreferencias.checked) {
        aplicarVisibilidadFiltros(true);
    }

    if (rememberActivityPreference) {
        rememberActivityPreference.addEventListener("change", () => {
            guardarPreferencia(STORAGE_KEYS.rememberActivity, rememberActivityPreference.checked);
            onRememberActivityChange?.();
        });
    }

    if (rememberSchedulePreference) {
        rememberSchedulePreference.addEventListener("change", () => {
            const estaActivo = rememberSchedulePreference.checked;
            guardarPreferencia(STORAGE_KEYS.rememberSchedule, rememberSchedulePreference.checked);
            aplicarVisibilidadFiltros(estaActivo);
        });
    }

    const openConfigLink = document.getElementById('openConfigLink');
    if (openConfigLink) {
        openConfigLink.addEventListener("click", (e) => {
            e.preventDefault();
            import("./filters-ui.js").then(module => {
                module.abrirConfiguradorInicial();
            });
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

export function aplicarVisibilidadFiltros(soloPersonalizados) {
    const configRaw = localStorage.getItem("preferences.userFiltersConfig");
    const filtersSidebar = document.getElementById('filtersSidebar');
    const appShell = document.querySelector('.app-shell');
    if (!configRaw) return;

    const config = JSON.parse(configRaw);
    const gruposFiltros = document.querySelectorAll('[data-user-filter]');

    gruposFiltros.forEach(grupo => {
        const idFiltro = grupo.getAttribute('data-user-filter');
        const debeMostrarse = config[idFiltro];

        if (soloPersonalizados) {
            grupo.classList.toggle('user-hidden', debeMostrarse === false);
        } else {
            grupo.classList.remove('user-hidden');
        }
    });

    if (filtersSidebar) {
        if (soloPersonalizados) {
            const hayAlgunoVisible = [...gruposFiltros].some(
                g => !g.classList.contains('user-hidden')
            );
            filtersSidebar.classList.toggle('user-hidden', !hayAlgunoVisible);
            appShell.style.gridTemplateColumns = hayAlgunoVisible
                ? '25rem minmax(0, 1fr)'
                : 'minmax(0, 1fr)';
        } else {
            filtersSidebar.classList.remove('user-hidden');
            appShell.style.gridTemplateColumns = '25rem minmax(0, 1fr)';
        }
    }
}
