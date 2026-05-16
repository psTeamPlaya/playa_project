const SERVICE_LABELS = {
    restaurantes: "\u{1F37D}\uFE0F Restaurantes",
    comida_para_llevar: "\u{1F96A} Comida para llevar",
    balnearios: "\u{1F6BF} Balneario",
    balneario: "\u{1F6BF} Balneario",
    zona_deportiva: "\u{1F3D0} Zona deportiva",
    escuela_surf: "\u{1F3C4} Escuela de surf",
    escuela_windsurf: "\u{1F32C}\uFE0F Escuela de windsurf",
    pet_friendly: "\u{1F43E} Pet-friendly"
};

export function getServiceLabel(serviceName = "") {
    return SERVICE_LABELS[serviceName] || serviceName;
}

export function formatearServicios(servicios = {}) {
    return Object.entries(servicios)
        .filter(([, disponible]) => disponible)
        .map(([clave]) => `<span class="chip">${getServiceLabel(clave)}</span>`)
        .join("");
}

export function formatearMarea(condiciones = {}) {
    if (typeof condiciones.tide_status === "string" && condiciones.tide_status.trim()) {
        return condiciones.tide_status;
    }

    if (typeof condiciones.marea === "string" && condiciones.marea.trim()) {
        return condiciones.marea;
    }

    if (typeof condiciones.tide === "string" && condiciones.tide.trim()) {
        return condiciones.tide;
    }

    const tideValue = Number(condiciones.tide);
    if (Number.isNaN(tideValue)) {
        return "---";
    }
    if (tideValue <= -0.10) {
        return "baja";
    }
    if (tideValue >= 0.10) {
        return "alta";
    }
    return "media";
}
