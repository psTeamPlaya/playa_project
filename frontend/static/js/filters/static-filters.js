export function obtenerFiltrosTipoPlaya(elements) {
    return {
        tipoArena: Boolean(elements.filterSandBeach?.checked),
        tipoPiedra: Boolean(elements.filterStoneBeach?.checked)
    };
}

export function obtenerFiltrosSeleccionados(staticElements) {
    const filtrosTipo = obtenerFiltrosTipoPlaya(staticElements);

    return {
        tipo_arena: filtrosTipo.tipoArena,
        tipo_piedra: filtrosTipo.tipoPiedra,
        restaurantes: Boolean(staticElements.filterRestaurant?.checked),
        comida_para_llevar: Boolean(staticElements.filterTakeAwayFood?.checked),
        balnearios: Boolean(staticElements.filterBalneario?.checked),
        zona_deportiva: Boolean(staticElements.filterSportZone?.checked),
        pet_friendly: Boolean(staticElements.filterPetFriendly?.checked)
    };
}

export function estaSidebarFiltrosActiva(filtersSidebar) {
    return Boolean(filtersSidebar && !filtersSidebar.hidden);
}

export function desactivarFiltrosEstaticos(staticFilterInputs) {
    staticFilterInputs.forEach(filterInput => {
        if (filterInput) filterInput.checked = false;
    });
}

export function aplicarFiltrosAParametros({
    params,
    filtersSidebar,
    staticElements,
    staticFilterInputs,
    dynamicController
}) {
    if (!estaSidebarFiltrosActiva(filtersSidebar)) return;

    const filtros = obtenerFiltrosSeleccionados(staticElements);
    Object.entries(filtros).forEach(([clave, activo]) => {
        if (activo) {
            params.set(clave, true);
        }
    });

    dynamicController.dynamicFilters.forEach(filtro => {
        const valores = dynamicController.obtenerValoresFiltroDinamico(
            filtro,
            () => estaSidebarFiltrosActiva(filtersSidebar)
        );
        if (valores.activo) {
            params.set(filtro.paramMin, String(valores.min));
            params.set(filtro.paramMax, String(valores.max));
        }
    });
}

export function initStaticFilters({
    staticFilterInputs,
    disableStaticFilters,
    onFiltersChange,
    iluminarChipFiltro
}) {
    let staticFiltersLightTimeout;

    desactivarFiltrosEstaticos(staticFilterInputs);

    staticFilterInputs.forEach(filterInput => {
        if (!filterInput) return;
        filterInput.addEventListener("change", onFiltersChange);
    });

    if (disableStaticFilters) {
        disableStaticFilters.addEventListener("click", () => {
            desactivarFiltrosEstaticos(staticFilterInputs);
            onFiltersChange();
            iluminarChipFiltro(disableStaticFilters, staticFiltersLightTimeout, (timeoutId) => {
                staticFiltersLightTimeout = timeoutId;
            });
        });
    }

    return {
        desactivarFiltrosEstaticos: () => desactivarFiltrosEstaticos(staticFilterInputs)
    };
}
