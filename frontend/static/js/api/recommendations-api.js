import { authFetch } from "./auth-fetch.js";

export async function getFavoriteBeachIds() {
    const token = localStorage.getItem("token");
    if (!token) {
        return [];
    }

    try {
        const response = await authFetch("/api/favorites/ids");
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to load favorites");
        return [];
    }
}

export function buildRecommendationsParams({
    actividad,
    fecha,
    hora,
    rango,
    cantidad,
    selectedCoords,
    applyFilters
}) {
    const params = new URLSearchParams({
        actividad,
        fecha,
        hora,
        radio_km: rango,
        top_n: String(cantidad)
    });

    if (!selectedCoords) {
        return null;
    }

    const [lon, lat] = selectedCoords;
    params.set("lat", String(lat));
    params.set("lon", String(lon));

    applyFilters?.(params);

    return params;
}

export async function fetchRecommendations({
    actividad,
    fecha,
    hora,
    rango,
    cantidad,
    selectedCoords,
    applyFilters
}) {
    const params = buildRecommendationsParams({
        actividad,
        fecha,
        hora,
        rango,
        cantidad,
        selectedCoords,
        applyFilters
    });

    if (!params) {
        return {
            ok: false,
            reason: "missing-location"
        };
    }

    const response = await fetch(`/recomendaciones?${params.toString()}`);
    if (!response.ok) {
        throw new Error("No se pudieron obtener las recomendaciones.");
    }

    const data = await response.json();
    const favorites = await getFavoriteBeachIds();
    const favoriteIds = new Set(favorites.map(f => f.beach_id));

    data.resultados.forEach(playa => {
        playa.isFavorite = favoriteIds.has(playa.beach_id);
    });

    return {
        ok: true,
        data
    };
}
