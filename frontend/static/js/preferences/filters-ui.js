import { authFetch } from "../api/auth-fetch.js";
import { aplicarVisibilidadFiltros } from "./preferences-ui.js";
import { guardarPreferencia, STORAGE_KEYS } from "./storage.js";

const FILTROS_CONFIGURABLES = [
    { id: 'tipo_playa', nombre: 'Tipo de Playa (Arena, Piedra...)' },
    { id: 'servicios', nombre: 'Servicios (Restaurantes, Deporte...)' },
    { id: 'nubosidad', nombre: 'Filtro de Nubosidad' },
    { id: 'viento', nombre: 'Filtro de Viento' },
    { id: 'temperatura', nombre: 'Filtro de Temperatura' },
    { id: 'oleaje', nombre: 'Filtro de Oleaje' }
];

export function abrirConfiguradorInicial() {
    const modal = document.getElementById('filterConfigModal');
    const lista = document.getElementById('configFilterList');
    if (!modal || !lista) return;

    const configPrevia = JSON.parse(sessionStorage.getItem("preferences.userFiltersConfig") || "{}");

    lista.innerHTML = FILTROS_CONFIGURABLES.map(f => {
        const isChecked = configPrevia[f.id] !== false;

        return `
            <div class="config-item">
                <span>${f.nombre}</span>
                <label class="switch">
                    <input type="checkbox" data-id="${f.id}" ${isChecked ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        `;
    }).join('');

    modal.hidden = false;

    document.getElementById('saveFilterConfigBtn').onclick = async () => {
        const nuevaConfig = {};
        lista.querySelectorAll('input').forEach(input => {
            nuevaConfig[input.dataset.id] = input.checked;
        });

        try {
            const response = await authFetch("/api/users/me/filters", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json" // Esto es VITAL para evitar el 422
                },
                body: JSON.stringify(nuevaConfig)
            });

            if (response.ok) {
                sessionStorage.setItem("preferences.userFiltersConfig", JSON.stringify(nuevaConfig));
                modal.hidden = true;

                const checkPreferencias = document.getElementById('rememberSchedulePreference');
                aplicarVisibilidadFiltros(checkPreferencias?.checked || false);
            }
        } catch (error) {
            console.error("Error al guardar filtros:", error);
        }
    };
}