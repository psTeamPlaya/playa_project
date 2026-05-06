const MAP_INITIAL_VIEW = [28.1235, -15.4363];
const MAP_INITIAL_ZOOM = 10;

function hasValidCoords(playa) {
    return Number.isFinite(Number(playa?.latitud)) && Number.isFinite(Number(playa?.longitud));
}

function createMarkerIcon(rank, score) {
    return L.divIcon({
        className: "results-map-marker-wrapper",
        html: `
            <div class="results-map-marker">
                <span class="results-map-marker-rank">#${rank}</span>
                <span class="results-map-marker-score">${score}</span>
            </div>
        `,
        iconSize: [92, 34],
        iconAnchor: [46, 17]
    });
}

function buildPopup(playa, rank, score) {
    return `
        <div class="results-map-popup">
            <strong>${playa.nombre}</strong>
            <div>${playa.ubicacion || "Ubicacion no disponible"}</div>
            <div>Ranking: #${rank}</div>
            <div>Score: ${score}</div>
        </div>
    `;
}

export function initResultsMap() {
    const openButton = document.getElementById("btnShowResultsMap");
    const modal = document.getElementById("resultsMapModal");
    const closeButton = document.getElementById("closeResultsMap");
    const mapElement = document.getElementById("resultsMap");

    let map = null;
    let tileLayer = null;
    let markersLayer = null;
    let currentResults = [];

    function ensureMap() {
        if (map || !mapElement) {
            return;
        }

        map = L.map(mapElement).setView(MAP_INITIAL_VIEW, MAP_INITIAL_ZOOM);
        tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        });
        tileLayer.addTo(map);
        markersLayer = L.layerGroup().addTo(map);
    }

    function hideButton() {
        openButton?.classList.add("hidden");
    }

    function showButton() {
        openButton?.classList.remove("hidden");
    }

    function clearMarkers() {
        markersLayer?.clearLayers();
    }

    function renderMarkers() {
        ensureMap();
        clearMarkers();

        if (!map || !markersLayer) {
            return;
        }

        const validResults = currentResults.filter(hasValidCoords);
        if (validResults.length === 0) {
            map.setView(MAP_INITIAL_VIEW, MAP_INITIAL_ZOOM);
            return;
        }

        const bounds = [];

        validResults.forEach((playa, index) => {
            const lat = Number(playa.latitud);
            const lng = Number(playa.longitud);
            const rank = index + 1;
            const numericScore = Number(playa.score);
            const score = Number.isFinite(numericScore) ? numericScore.toFixed(1) : "N/A";

            const marker = L.marker([lat, lng], {
                icon: createMarkerIcon(rank, score)
            });

            marker.bindPopup(buildPopup(playa, rank, score));
            marker.addTo(markersLayer);
            bounds.push([lat, lng]);
        });

        if (bounds.length === 1) {
            map.setView(bounds[0], 12);
            return;
        }

        map.fitBounds(bounds, {
            padding: [28, 28]
        });
    }

    function openModal() {
        if (!modal || currentResults.length === 0) {
            return;
        }

        modal.classList.remove("hidden");
        renderMarkers();
        setTimeout(() => map?.invalidateSize(), 100);
    }

    function closeModal() {
        modal?.classList.add("hidden");
    }

    openButton?.addEventListener("click", openModal);
    closeButton?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    return {
        setResults(resultados) {
            currentResults = Array.isArray(resultados) ? resultados.filter(hasValidCoords) : [];

            if (currentResults.length > 0) {
                showButton();
                return;
            }

            hideButton();
            closeModal();
        }
    };
}
