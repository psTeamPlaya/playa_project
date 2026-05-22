import { t } from "/static/js/languages/i18n.js";
import "../review-photo/galllery-photos.js";
import {
    formatearEtiquetaEventoMarea,
    formatearMarea,
    formatearMotivoRecomendacion,
    formatearServicios,
    formatearTipoPlaya,
} from "../shared/formatters.js";
import { formatTemperature, formatWindSpeed, getTemperatureUnit, getWindSpeedUnit } from "../shared/units.js";


// const DEFAULT_OPTIONS = {
const getDefaultOptions = () => ({
    emptyMessage: t("results.no_results"),
    showScore: true,
    showMotivo: true,
    favoriteButtonLabel: null,
    favoriteButtonAriaLabel: null
});

const ICONS = {
    beachType: "\u{1F3D6}\uFE0F",
    airTemp: "\u{1F321}\uFE0F",
    wave: "\u{1F30A}",
    wind: "\u{1F4A8}",
    waterTemp: "\u{1F321}\uFE0F",
    cloud: "\u{1F324}\uFE0F",
    rain: "\u{1F327}\uFE0F",
    tide: "\u{1F319}"
};

function getFavoriteIcon(playa, options) {
    if (options.favoriteButtonLabel) {
        return options.favoriteButtonLabel;
    }
    return playa.isFavorite ? "\u2764\uFE0F" : "\u{1F90D}";
}

function renderScore(playa, options) {
    if (!options.showScore) {
        return "";
    }
    const score = Number(playa.score);
    const scoreText = Number.isFinite(score) ? score.toFixed(1) : "N/A";
    return `<div class="score-badge">${t("results.score")}: ${scoreText}</div>`;
}

function renderMotivo(playa, options) {
    if (!options.showMotivo) {
        return "";
    }
    return `
        <div class="motivo detalle-box">
            <strong>${t("results.recommendation_explanation")}:</strong> ${formatearMotivoRecomendacion(playa.motivo)}
        </div>
    `;
}

function renderIntervalChip(condiciones = {}) {
    const horaInicio = condiciones.hora_inicio;
    const horaFin = condiciones.hora_fin;
    const hoursCount = Number(condiciones.hours_count || 1);

    if (!horaInicio || !horaFin || hoursCount <= 1) {
        return "";
    }

    return `<span class="chip">${t("results.interval")}: ${horaInicio} - ${horaFin}</span>`;
}

function renderTideEventChips(condiciones = {}) {
    const events = Array.isArray(condiciones.tide_events) ? condiciones.tide_events : [];

    if (events.length > 0) {
        return events
            .filter((event) => event?.label && event?.hour)
            .map((event) => `<span class="chip">\u23F0 ${formatearEtiquetaEventoMarea(event.label)}: ${event.hour}</span>`)
            .join("");
    }

    const label = condiciones.tide_next_event_label;
    const hour = condiciones.tide_next_event_hour;
    if (!label || !hour) {
        return "";
    }

    return `<span class="chip">\u23F0 ${formatearEtiquetaEventoMarea(label)}: ${hour}</span>`;
}

function renderTideChips(condiciones = {}) {
    return `
        <span class="chip">${ICONS.tide} ${t("results.tide")}: ${formatearMarea(condiciones)}</span>
        ${renderTideEventChips(condiciones)}
    `;
}

function roundToNearestQuarter(value) {
    return Math.round(Number(value) * 4) / 4;
}

function formatConditionValue(value, { quarterStep = false } = {}) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return "N/A";
    }

    if (quarterStep) {
        const roundedValue = roundToNearestQuarter(numericValue);
        return `${roundedValue}`;
    }

    return `${Math.round(numericValue)}`;
}

function renderFavoriteButton(playa, options) {
    const ariaLabel = options.favoriteButtonAriaLabel ? ` aria-label="${options.favoriteButtonAriaLabel}"` : "";
    return `
        <button class="favorite-btn" data-id="${playa.beach_id}"${ariaLabel}>
            ${getFavoriteIcon(playa, options)}
        </button>
    `;
}

async function getBeachPhotosCount(beachId) {
    try {
        const res = await fetch(`/api/review-photo/count-photos/${beachId}`);
        if (!res.ok) return { photos_count: 0 };
        return await res.json();
    } catch (err) {
        console.error("Error fetching photos count:", err);
        return { photos_count: 0 };
    }
}

async function getBeachRating(beachId) {
    const res = await fetch(`/reviews/beach/${beachId}/rating`);
    return await res.json();
}

export function configurarAnimacionDetalles(container) {
    const beachCards = container?.querySelectorAll(".beach-card") || [];
    beachCards.forEach((card) => {
        card.addEventListener("toggle", () => {
            if (!card.open) {
                card.classList.remove("is-revealing");
                return;
            }

            card.classList.remove("is-revealing");
            void card.offsetWidth;
            card.classList.add("is-revealing");
        });
    });
}

function mapBeachType(type) {
    const map = {
        arena: "sand",
        piedra: "stone",
        piscina_natural: "natural_pool"
    };

    return map[type] ?? "sand";
}

function mapTide(tide) {
    const map = {
        baja: "low_tide",
        alta: "high_tide"
    };

    return map[tide] ?? tide;
}


export function pintarResultados(resultados, container, options = {}) {
    if (!container) {
        return;
    }

    // const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

    const resolvedOptions = {
        ...getDefaultOptions(),
        ...options
    };

    if (!resultados || resultados.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                ${resolvedOptions.emptyMessage}
            </div>
        `;
        return;
    }

    container.innerHTML = resultados.map((playa, index) => {
        const servicios = formatearServicios(playa.servicios);
        const condiciones = playa.condiciones || {};

        return `
            <details class="beach-card desplegable">
                <summary class="beach-summary">
                    <div class="beach-summary-left">
                        <div class="ranking-badge">#${index + 1}</div>
                        <div class="beach-summary-content">
                            <h3 class="beach-title">${playa.nombre}</h3>
                            <div class="beach-location">${playa.ubicacion}</div>
                            <div class="beach-actions-row">
                                <button type="button" class="rating-badge" data-id="${playa.beach_id}" data-rating-id="${playa.beach_id}">&#9733; ...</button>
                                <button type="button" class="photos-badge" data-id="${playa.beach_id}" data-photos-id="${playa.beach_id}" title="${t("results.view_beach_photos")}">📷</button>
                                <div class="beach-actions-trailing">
                                    ${renderFavoriteButton(playa, resolvedOptions)}
                                    <span class="expand-hint expand-hint-inline" aria-hidden="true">+</span>
                                </div>
                            </div>
                            <div class="beach-short-motivo"></div>
                        </div>
                    </div>

                    <div class="beach-summary-right">
                        ${renderScore(playa, resolvedOptions)}
                    </div>
                </summary>

                <div class="beach-detail">
                    <p class="beach-desc">${playa.descripcion}</p>

                    <div class="meta-list">
                        ${renderIntervalChip(condiciones)}
<<<<<<< HT16-languages-part2
                        <span class="chip">${ICONS.beachType} ${t("titles.beach_type")}: ${t(`beach_types.${mapBeachType(playa.tipo)}`)}</span>
                        <span class="chip">${ICONS.airTemp} ${t("weather.temp")}: ${condiciones.air_temp ?? "N/A"} \u00baC</span>
                        <span class="chip">${ICONS.wave} ${t("weather.waves")}: ${condiciones.wave_height ?? "N/A"} m</span>
                        <span class="chip">${ICONS.wind} ${t("weather.wind")}: ${condiciones.wind_speed ?? "N/A"} km/h</span>
                        <span class="chip">${ICONS.waterTemp} ${t("weather.water_temp")}: ${condiciones.water_temp ?? "N/A"} \u00baC</span>
                        <span class="chip">${ICONS.cloud} ${t("weather.cloudiness")}: ${condiciones.cloud_cover ?? "N/A"}%</span>
                        <span class="chip">${ICONS.rain} ${t("weather.rain")}: ${condiciones.rain_probability ?? "N/A"}%</span>
                        <span class="chip">${ICONS.tide} ${t("weather.tide")}: ${t(`weather.${mapTide(formatearMarea(condiciones))}`)}</span>
=======
                        <span class="chip">${ICONS.beachType} ${t("results.beach_type")}: ${formatearTipoPlaya(playa.tipo)}</span>
                        <span class="chip">${ICONS.airTemp} ${t("results.avg_air_temp")}: ${formatTemperature(condiciones.air_temp)} ${getTemperatureUnit()}</span>
                        <span class="chip">${ICONS.wave} ${t("results.avg_wave")}: ${formatConditionValue(condiciones.wave_height, { quarterStep: true })} m</span>
                        <span class="chip">${ICONS.wind} ${t("results.avg_wind")}: ${formatWindSpeed(condiciones.wind_speed)} ${getWindSpeedUnit()}</span>
                        <span class="chip">${ICONS.waterTemp} ${t("results.avg_water_temp")}: ${formatTemperature(condiciones.water_temp)} ${getTemperatureUnit()}</span>
                        <span class="chip">${ICONS.cloud} ${t("results.avg_cloud")}: ${formatConditionValue(condiciones.cloud_cover)}%</span>
                        <span class="chip">${ICONS.rain} ${t("results.avg_rain")}: ${formatConditionValue(condiciones.rain_probability)}%</span>
>>>>>>> feature/njhm-recomendacion-playas-fecha-rango-horas
                        ${renderTideChips(condiciones)}
                    </div>

                    ${renderMotivo(playa, resolvedOptions)}

                    <div class="services-list">
                        ${servicios}
                    </div>
                </div>
            </details>
        `;
    }).join("");

    resultados.forEach(async (playa) => {
        const rating = await getBeachRating(playa.beach_id);

        const el = container.querySelector(
            `[data-rating-id="${playa.beach_id}"]`
        );

        if (!el) return;

        el.innerHTML = `
            &#9733; ${rating.avg_rating ? rating.avg_rating.toFixed(1) : "---"}
            <span>(${rating.reviews_count || 0})</span>
        `;
    });

    resultados.forEach(async (playa) => {
        const photoData = await getBeachPhotosCount(playa.beach_id);
        const photoBtn = container.querySelector(`[data-photos-id="${playa.beach_id}"]`);
        if (!photoBtn) return;

        photoBtn.innerHTML = `📷 (${photoData.photos_count || 0})`;
    });

    configurarAnimacionDetalles(container);
}
