export function actualizarCantidadSliderUI({
    cantidadSlider,
    cantidadSliderValue
}) {
    if (!cantidadSlider || !cantidadSliderValue) return 0;

    const cantidadSeleccionada = Number(cantidadSlider.value) || 0;
    cantidadSliderValue.value = String(cantidadSeleccionada);
    cantidadSliderValue.textContent = String(cantidadSeleccionada);
    return cantidadSeleccionada;
}

export function restablecerCantidadPorDefecto({
    defaultQuantity,
    cantidadSlider,
    cantidadSliderValue
}) {
    const cantidadSeleccionada = Number(defaultQuantity);
    if (!cantidadSlider || !cantidadSliderValue) return cantidadSeleccionada;

    cantidadSlider.value = defaultQuantity;
    cantidadSliderValue.value = defaultQuantity;
    cantidadSliderValue.textContent = defaultQuantity;
    return cantidadSeleccionada;
}

export function initQuantity({
    cantidadSlider,
    cantidadSliderValue,
    cantidadSliderMax,
    defaultQuantity,
    countEndpoint = "/api/playas/count",
    onChange
}) {
    let cantidadSeleccionada = Number(defaultQuantity);

    function syncCantidad(changed) {
        onChange?.({
            cantidad: cantidadSeleccionada,
            changed
        });
    }

    function actualizarUI() {
        cantidadSeleccionada = actualizarCantidadSliderUI({
            cantidadSlider,
            cantidadSliderValue
        });
        return cantidadSeleccionada;
    }

    function restablecerPorDefecto() {
        cantidadSeleccionada = restablecerCantidadPorDefecto({
            defaultQuantity,
            cantidadSlider,
            cantidadSliderValue
        });
        return cantidadSeleccionada;
    }

    async function configurarSlider() {
        if (!cantidadSlider) return;

        try {
            const response = await fetch(countEndpoint);
            if (!response.ok) {
                throw new Error("No se pudo obtener el total de playas.");
            }

            const data = await response.json();
            const maxPlayas = Math.max(0, Number(data.total) || 0);
            cantidadSlider.max = String(maxPlayas);
            cantidadSlider.value = String(Math.min(Number(defaultQuantity), maxPlayas));

            if (cantidadSliderMax) {
                cantidadSliderMax.textContent = String(maxPlayas);
            }
        } catch (error) {
            console.error(error);
        }

        actualizarUI();
        syncCantidad(false);
    }

    if (cantidadSlider) {
        cantidadSlider.addEventListener("input", () => {
            const anterior = cantidadSeleccionada;
            actualizarUI();
            syncCantidad(cantidadSeleccionada !== anterior);
        });
    }

    return {
        actualizarCantidadSliderUI: actualizarUI,
        restablecerCantidadPorDefecto: restablecerPorDefecto,
        configurarSlider,
        getCantidadSeleccionada: () => cantidadSeleccionada
    };
}
