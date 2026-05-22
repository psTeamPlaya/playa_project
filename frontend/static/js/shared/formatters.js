import { t } from "../languages/i18n.js";
import {
    formatTemperature,
    formatWindSpeed,
    getTemperatureUnit,
    getWindSpeedUnit,
} from "./units.js";

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
const BEACH_TYPE_LABELS = {
    arena: "beach_types.sand",
    piedra: "beach_types.stone",
    piscina_natural: "beach_types.natural_pool",
    roca: "beach_types.natural_pool",
};
const TIDE_LABELS = {
    baja: "tide_high.low",
    media: "tide_high.medium",
    alta: "tide_high.high",
    subiendo: "tide_high.rising",
    bajando: "tide_high.falling",
    pleamar: "tide_high.high_tide",
    bajamar: "tide_high.low_tide",
};
const RECOMMENDATION_FACTORS = {
    "temperatura media": "air_temp",
    "viento medio": "wind_speed",
    "oleaje medio": "wave_height",
    "temperatura del agua": "water_temp",
    "nubosidad media": "cloud_cover",
    "probabilidad media de lluvia": "rain_probability",
    "índice UV medio": "uv_index",
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

export function formatearTipoPlaya(tipo = "") {
    const key = BEACH_TYPE_LABELS[String(tipo).trim().toLowerCase()];
    return key ? t(key) : tipo;
}

function traducirValorMarea(valor = "") {
    console.log("Translating tide value:", valor);
    const key = TIDE_LABELS[String(valor).trim().toLowerCase()];
    console.log("Mapped tide key:", key);
    return key ? t(key) : valor;
}

export function formatearEtiquetaEventoMarea(label = "") {
    return traducirValorMarea(label);
}

export function formatearMarea(condiciones = {}) {
    if (typeof condiciones.tide_status === "string" && condiciones.tide_status.trim()) {
        return traducirValorMarea(condiciones.tide_status);
    }

    if (typeof condiciones.marea === "string" && condiciones.marea.trim()) {
        return traducirValorMarea(condiciones.marea);
    }

    if (typeof condiciones.tide === "string" && condiciones.tide.trim()) {
        return traducirValorMarea(condiciones.tide);
    }

    const tideValue = Number(condiciones.tide);
    if (Number.isNaN(tideValue)) {
        return "---";
    }
    if (tideValue <= -0.10) {
        return t("weather.tide_high.low");
    }
    if (tideValue >= 0.10) {
        return t("weather.tide_high.high");
    }
    return t("weather.tide_high.medium");
}

function formatearFactorRecomendacion(factor = "") {
    const normalizedFactor = String(factor).trim();
    const ofText = t("recommendation.of").trim();
    const joinOf = ofText ? ` ${ofText} ` : " ";

    for (const [spanishLabel, key] of Object.entries(RECOMMENDATION_FACTORS)) {
        const prefix = `${spanishLabel} de `;
        if (!normalizedFactor.startsWith(prefix)) {
            continue;
        }

        const rawValue = normalizedFactor.slice(prefix.length).trim();
        if (key === "air_temp" || key === "water_temp") {
            const numericValue = Number(rawValue.replace(/[º°]\s*[CF]/gi, "").trim());
            return `${t(`recommendation.factors.${key}`)}${joinOf}${formatTemperature(numericValue)} ${getTemperatureUnit()}`;
        }

        if (key === "wind_speed") {
            const numericValue = Number(rawValue.replace(getWindSpeedUnit(), "").replace("km/h", "").replace("mph", "").trim());
            return `${t(`recommendation.factors.${key}`)}${joinOf}${formatWindSpeed(numericValue)} ${getWindSpeedUnit()}`;
        }

        return `${t(`recommendation.factors.${key}`)}${joinOf}${rawValue}`;
    }

    return normalizedFactor;
}

function construirDescripcionFactores(texto = "") {
    const separador = ", ";
    const ultimoSeparador = " y ";

    if (texto.includes(separador)) {
        const partes = texto.split(separador);
        const ultimaParte = partes.pop();
        const factores = partes.concat(ultimaParte ? ultimaParte.split(ultimoSeparador) : []).filter(Boolean);
        if (factores.length === 1) {
            return formatearFactorRecomendacion(factores[0]);
        }
        return factores
            .map((factor, index) => index === factores.length - 1
                ? `${t("recommendation.and")} ${formatearFactorRecomendacion(factor)}`
                : formatearFactorRecomendacion(factor))
            .join(", ")
            .replace(`, ${t("recommendation.and")} `, ` ${t("recommendation.and")} `);
    }

    if (texto.includes(ultimoSeparador)) {
        const factores = texto.split(ultimoSeparador).filter(Boolean);
        return factores
            .map((factor) => formatearFactorRecomendacion(factor))
            .join(` ${t("recommendation.and")} `);
    }

    return formatearFactorRecomendacion(texto);
}

export function formatearMotivoRecomendacion(motivo = "") {
    const texto = String(motivo).trim();
    if (!texto) {
        return t("recommendation.generic");
    }

    const pattern = /^Se recomienda (.+?) por (.+?)(?:\. Además, la playa encaja especialmente bien con la actividad seleccionada\.)?\.$/;
    const match = texto.match(pattern);
    if (!match) {
        return texto;
    }

    const [, tramo, descripcion] = match;
    let tramoTraducido = tramo;
    const ideal = texto.includes("Además, la playa encaja especialmente bien con la actividad seleccionada.");

    if (tramo.startsWith("entre las ")) {
        const tramoPattern = /^entre las (.+) y las (.+)$/;
        const tramoMatch = tramo.match(tramoPattern);
        if (tramoMatch) {
            tramoTraducido = t("recommendation.recommended_between", {
                start: tramoMatch[1],
                end: tramoMatch[2],
            });
        }
    } else if (tramo.startsWith("a las ")) {
        tramoTraducido = t("recommendation.recommended_at", {
            time: tramo.replace("a las ", ""),
        });
    } else if (tramo === "en ese momento") {
        tramoTraducido = t("recommendation.recommended_now");
    }

    const descripcionTraducida = construirDescripcionFactores(descripcion);
    const base = `${tramoTraducido} ${t("recommendation.because")} ${descripcionTraducida}`;
    return ideal ? `${base}. ${t("recommendation.also_ideal")}` : `${base}.`;
}
