

import { formatearMarea, formatearServicios } from "../shared/formatters.js";

const DEFAULT_OPTIONS = {
    emptyMessage: "No hay resultados para esa b\u00fasqueda.",
    showScore: true,
    showMotivo: true,
    favoriteButtonLabel: null,
    favoriteButtonAriaLabel: null
};

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
    return `<div class="score-badge">Score: ${scoreText}</div>`;
}

function renderMotivo(playa, options) {
    if (!options.showMotivo) {
        return "";
    }
    return `
        <div class="motivo detalle-box">
            <strong>Explicaci\u00f3n de la recomendaci\u00f3n:</strong> ${playa.motivo}
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

    return `<span class="chip">Tramo: ${horaInicio} - ${horaFin}</span>`;
}

function renderNextTideEventChip(condiciones = {}) {
    const label = condiciones.tide_next_event_label;
    const hour = condiciones.tide_next_event_hour;

    if (!label || !hour) {
        return "";
    }

    return `<span class="chip">\u23F0 ${label}: ${hour}</span>`;
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

export function pintarResultados(resultados, container, options = {}) {
    if (!container) {
        return;
    }

    const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

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
                        ${renderNextTideEventChip(condiciones)}
                        <span class="chip">${ICONS.beachType} Tipo: ${playa.tipo}</span>
                        <span class="chip">${ICONS.airTemp} Temp. aire media: ${formatConditionValue(condiciones.air_temp)} \u00baC</span>
                        <span class="chip">${ICONS.wave} Oleaje medio: ${formatConditionValue(condiciones.wave_height, { quarterStep: true })} m</span>
                        <span class="chip">${ICONS.wind} Viento medio: ${formatConditionValue(condiciones.wind_speed)} km/h</span>
                        <span class="chip">${ICONS.waterTemp} Agua media: ${formatConditionValue(condiciones.water_temp)} \u00baC</span>
                        <span class="chip">${ICONS.cloud} Nubosidad media: ${formatConditionValue(condiciones.cloud_cover)}%</span>
                        <span class="chip">${ICONS.rain} Lluvia media: ${formatConditionValue(condiciones.rain_probability)}%</span>
                        <span class="chip">${ICONS.tide} Marea: ${formatearMarea(condiciones)}</span>
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

    configurarAnimacionDetalles(container);
}
