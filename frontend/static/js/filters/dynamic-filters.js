export const WIND_FILTER_DEFAULTS = { min: 0, max: 15 };
export const CLOUD_FILTER_DEFAULTS = { min: 0, max: 20 };
export const TEMPERATURE_FILTER_DEFAULTS = { min: 20, max: 29 };
export const WAVE_FILTER_DEFAULTS = { min: 0, max: 1 };

export function createDynamicFilters(elements) {
    return [
        {
            id: "viento",
            minInput: elements.filterWindMin,
            maxInput: elements.filterWindMax,
            minLabel: elements.windMinValue,
            maxLabel: elements.windMaxValue,
            rangeTrack: elements.windRangeTrack,
            disabledCheck: elements.filterWindDisabled,
            resetBtn: elements.filterWindReset,
            defaults: WIND_FILTER_DEFAULTS,
            decimal: false,
            paramMin: "min_velocidad_viento",
            paramMax: "max_velocidad_viento",
            timeoutId: null
        },
        {
            id: "nubosidad",
            minInput: elements.filterCloudMin,
            maxInput: elements.filterCloudMax,
            minLabel: elements.cloudMinValue,
            maxLabel: elements.cloudMaxValue,
            rangeTrack: elements.cloudRangeTrack,
            disabledCheck: elements.filterCloudDisabled,
            resetBtn: elements.filterCloudReset,
            defaults: CLOUD_FILTER_DEFAULTS,
            decimal: false,
            paramMin: "min_nubosidad",
            paramMax: "max_nubosidad",
            timeoutId: null
        },
        {
            id: "temperatura_ambiente",
            minInput: elements.filterTemperatureMin,
            maxInput: elements.filterTemperatureMax,
            minLabel: elements.temperatureMinValue,
            maxLabel: elements.temperatureMaxValue,
            rangeTrack: elements.temperatureRangeTrack,
            disabledCheck: elements.filterTemperatureDisabled,
            resetBtn: elements.filterTemperatureReset,
            defaults: TEMPERATURE_FILTER_DEFAULTS,
            decimal: false,
            paramMin: "min_temperatura_ambiente",
            paramMax: "max_temperatura_ambiente",
            timeoutId: null
        },
        {
            id: "oleaje",
            minInput: elements.filterWaveMin,
            maxInput: elements.filterWaveMax,
            minLabel: elements.waveMinValue,
            maxLabel: elements.waveMaxValue,
            rangeTrack: elements.waveRangeTrack,
            disabledCheck: elements.filterWaveDisabled,
            resetBtn: elements.filterWaveReset,
            defaults: WAVE_FILTER_DEFAULTS,
            decimal: true,
            paramMin: "min_altura_oleaje",
            paramMax: "max_altura_oleaje",
            timeoutId: null
        }
    ];
}

export function formatearValorDecimalFiltro(valor) {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

export function obtenerValoresFiltroDinamico(filtro, estaSidebarFiltrosActiva) {
    return {
        activo: estaSidebarFiltrosActiva() && !filtro.disabledCheck?.checked,
        min: Number(filtro.minInput?.value ?? filtro.defaults.min),
        max: Number(filtro.maxInput?.value ?? filtro.defaults.max)
    };
}

export function actualizarFiltroDinamicoUI(filtro) {
    if (!filtro.minInput || !filtro.maxInput) return;

    let min = Number(filtro.minInput.value);
    let max = Number(filtro.maxInput.value);
    if (min > max) {
        [min, max] = [max, min];
        filtro.minInput.value = String(min);
        filtro.maxInput.value = String(max);
    }

    const formatear = (val) => filtro.decimal ? formatearValorDecimalFiltro(val) : String(val);

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

    const toggleLabel = filtro.disabledCheck?.closest(".filter-toggle-button");
    const toggleText = toggleLabel?.querySelector(".filter-toggle-text");
    if (toggleText) {
        toggleText.textContent = desactivado ? "Activar filtro" : "Desactivar filtro";
    }
    if (toggleLabel) {
        toggleLabel.classList.toggle("is-active", desactivado);
        toggleLabel.setAttribute("aria-pressed", desactivado ? "true" : "false");
    }
}

export function restablecerFiltroDinamico(filtro) {
    if (!filtro.minInput || !filtro.maxInput) return;
    filtro.minInput.value = String(filtro.defaults.min);
    filtro.maxInput.value = String(filtro.defaults.max);
    actualizarFiltroDinamicoUI(filtro);
}

export function estanTodosLosFiltrosDinamicosDesactivados(dynamicFilters) {
    return dynamicFilters.every(filtro => Boolean(filtro.disabledCheck?.checked));
}

export function actualizarToggleFiltrosDinamicos(disableDynamicFilters, dynamicFilters) {
    if (!disableDynamicFilters) return;

    const desactivados = estanTodosLosFiltrosDinamicosDesactivados(dynamicFilters);
    disableDynamicFilters.textContent = desactivados
        ? "Activar filtros din\u00e1micos"
        : "Desactivar filtros din\u00e1micos";
    disableDynamicFilters.setAttribute("aria-pressed", desactivados ? "true" : "false");
    disableDynamicFilters.classList.toggle("is-active", desactivados);
}

export function iluminarChipFiltro(chip, timeoutId, onTimeoutChange) {
    chip.classList.remove("is-lit");
    void chip.offsetWidth;
    chip.classList.add("is-lit");
    clearTimeout(timeoutId);
    const nextTimeoutId = setTimeout(() => {
        chip.classList.remove("is-lit");
    }, 500);
    onTimeoutChange(nextTimeoutId);
}

export function desactivarFiltrosDinamicos(dynamicFilters) {
    dynamicFilters.forEach(filtro => {
        if (filtro.disabledCheck) filtro.disabledCheck.checked = true;
        actualizarFiltroDinamicoUI(filtro);
    });
}

export function alternarFiltrosDinamicos(dynamicFilters, disableDynamicFilters) {
    const desactivar = !estanTodosLosFiltrosDinamicosDesactivados(dynamicFilters);
    dynamicFilters.forEach(filtro => {
        if (filtro.disabledCheck) filtro.disabledCheck.checked = desactivar;
        actualizarFiltroDinamicoUI(filtro);
    });
    actualizarToggleFiltrosDinamicos(disableDynamicFilters, dynamicFilters);
}

export function initDynamicFilters({
    dynamicFilters,
    disableDynamicFilters,
    onFiltersChange
}) {
    let dynamicFiltersLightTimeout;

    if (disableDynamicFilters) {
        disableDynamicFilters.addEventListener("click", () => {
            alternarFiltrosDinamicos(dynamicFilters, disableDynamicFilters);
            onFiltersChange();
            iluminarChipFiltro(disableDynamicFilters, dynamicFiltersLightTimeout, (timeoutId) => {
                dynamicFiltersLightTimeout = timeoutId;
            });
        });
    }

    dynamicFilters.forEach(filtro => {
        [filtro.minInput, filtro.maxInput].forEach(filterInput => {
            if (!filterInput) return;
            filterInput.addEventListener("input", () => {
                actualizarFiltroDinamicoUI(filtro);
                onFiltersChange();
            });
        });

        if (filtro.resetBtn) {
            filtro.resetBtn.addEventListener("click", () => {
                restablecerFiltroDinamico(filtro);
                onFiltersChange();
                iluminarChipFiltro(filtro.resetBtn, filtro.timeoutId, (timeoutId) => {
                    filtro.timeoutId = timeoutId;
                });
            });
        }

        if (filtro.disabledCheck) {
            filtro.disabledCheck.addEventListener("change", () => {
                actualizarFiltroDinamicoUI(filtro);
                actualizarToggleFiltrosDinamicos(disableDynamicFilters, dynamicFilters);
                onFiltersChange();
            });
        }
    });

    dynamicFilters.forEach(actualizarFiltroDinamicoUI);
    actualizarToggleFiltrosDinamicos(disableDynamicFilters, dynamicFilters);

    return {
        dynamicFilters,
        obtenerValoresFiltroDinamico: (filtro, estaSidebarFiltrosActiva) =>
            obtenerValoresFiltroDinamico(filtro, estaSidebarFiltrosActiva),
        desactivarFiltrosDinamicos: () => desactivarFiltrosDinamicos(dynamicFilters),
        estanTodosLosFiltrosDinamicosDesactivados: () => estanTodosLosFiltrosDinamicosDesactivados(dynamicFilters),
        actualizarToggleFiltrosDinamicos: () => actualizarToggleFiltrosDinamicos(disableDynamicFilters, dynamicFilters),
        alternarFiltrosDinamicos: () => alternarFiltrosDinamicos(dynamicFilters, disableDynamicFilters)
    };
}
