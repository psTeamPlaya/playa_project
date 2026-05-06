export function obtenerFiltrosTipoPlaya(elements) {
    return {
        tipoArena: Boolean(elements.filterSandBeach?.checked),
        tipoPiedra: Boolean(elements.filterStoneBeach?.checked)
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

    const filtros = obtenerFiltrosTipoPlaya(staticElements);
    if (filtros.tipoArena) params.set("tipo_arena", true);
    if (filtros.tipoPiedra) params.set("tipo_piedra", true);

    if (staticElements.filterRestaurant?.checked) params.set("restaurantes", true);
    if (staticElements.filterTakeAwayFood?.checked) params.set("comida_para_llevar", true);
    if (staticElements.filterBalneario?.checked) params.set("balnearios", true);
    if (staticElements.filterSportZone?.checked) params.set("zona_deportiva", true);
    if (staticElements.filterPetFriendly?.checked) params.set("pet_friendly", true);

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
