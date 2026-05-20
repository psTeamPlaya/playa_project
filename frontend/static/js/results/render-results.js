

import { formatearMarea, formatearServicios } from "../shared/formatters.js";
import "../review-photo/galllery-photos.js"

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
                                <button type="button" class="photos-badge" data-id="${playa.beach_id}" data-photos-id="${playa.beach_id}" title="Ver fotos de la playa">🖼️</button>
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
                        <span class="chip">${ICONS.beachType} Tipo: ${playa.tipo}</span>
                        <span class="chip">${ICONS.airTemp} Temp. aire: ${condiciones.air_temp ?? "N/A"} \u00baC</span>
                        <span class="chip">${ICONS.wave} Oleaje: ${condiciones.wave_height ?? "N/A"} m</span>
                        <span class="chip">${ICONS.wind} Viento: ${condiciones.wind_speed ?? "N/A"} km/h</span>
                        <span class="chip">${ICONS.waterTemp} Agua: ${condiciones.water_temp ?? "N/A"} \u00baC</span>
                        <span class="chip">${ICONS.cloud} Nubosidad: ${condiciones.cloud_cover ?? "N/A"}%</span>
                        <span class="chip">${ICONS.rain} Lluvia: ${condiciones.rain_probability ?? "N/A"}%</span>
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

    resultados.forEach(async (playa) => {
        const photoData = await getBeachPhotosCount(playa.beach_id);
        const photoBtn = container.querySelector(`[data-photos-id="${playa.beach_id}"]`);
        if (!photoBtn) return;

        photoBtn.innerHTML = `🖼️ (${photoData.photos_count || 0})`;
    });

    configurarAnimacionDetalles(container);

    configurarAnimacionDetalles(container);
}
