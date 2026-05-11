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

    const configPrevia = JSON.parse(localStorage.getItem("preferences.userFiltersConfig") || "{}");

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

    document.getElementById('saveFilterConfigBtn').onclick = () => {
        const nuevaConfig = {};
        lista.querySelectorAll('input').forEach(input => {
            nuevaConfig[input.dataset.id] = input.checked;
        });

        localStorage.setItem("preferences.userFiltersConfig", JSON.stringify(nuevaConfig));
        modal.hidden = true;

        const checkPreferencias = document.getElementById('rememberSchedulePreference');
        if (checkPreferencias  && !checkPreferencias.checked) {
            checkPreferencias.checked = true;
            guardarPreferencia(STORAGE_KEYS.rememberSchedule, true);
        }
        aplicarVisibilidadFiltros(true);
    };
}