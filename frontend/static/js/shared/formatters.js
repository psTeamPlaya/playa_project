import { t } from "../languages/i18n.js";

const SERVICE_LABELS = {
    restaurantes: ["\u{1F37D}\uFE0F", "services.restaurant"],
    comida_para_llevar: ["\u{1F96A}", "services.take_away_food"],
    balnearios: ["\u{1F6BF}", "services.spa"],
    balneario: ["\u{1F6BF}", "services.spa"],
    zona_deportiva: ["\u{1F3D0}", "services.sport_zone"],
    escuela_surf: ["\u{1F3C4}", "services.surf_school"],
    escuela_windsurf: ["\u{1F32C}\uFE0F", "services.windsurf_school"],
    pet_friendly: ["\u{1F43E}", "services.pet_friendly"]
};

export function getServiceLabel(serviceName = "") {
    const config = SERVICE_LABELS[serviceName];
    if (!config) {
        return serviceName;
    }

    const [icon, key] = config;
    return `${icon} ${t(key)}`;
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
        return t("tide.low");
    }
    if (tideValue >= 0.10) {
        return t("tide.high");
    }
    return t("tide.medium");
}
