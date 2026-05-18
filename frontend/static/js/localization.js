const API_CONFIG = {
    photonUrl: "https://photon.komoot.io/api/",
    maxResults: 5,            
    cacheLimit: 5,            
    cacheTTL: 5 * 60 * 1000   
};

const searchCache = new Map();

const locationInput = document.getElementById("locationInput");
const btnGeolocalizar = document.getElementById("btnGeolocalizar");
const suggestionsEl = document.getElementById("suggestions");

export let selectedCoords = null;

function saveToCache(query, results) {
    const key = query.trim().toLowerCase();

    if (searchCache.has(key)) {
        searchCache.delete(key);
    }

    if (searchCache.size >= API_CONFIG.cacheLimit) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
    }

    searchCache.set(key, {
        data: results,
        timestamp: Date.now()
    });
}

function setLocationInURL(coords, name) {
    const url = new URL(window.location);
    url.searchParams.set('lon', coords[0]);
    url.searchParams.set('lat', coords[1]);
    url.searchParams.set('location_name', name);
    window.history.pushState({}, '', url);
    selectedCoords = coords;
}

function getFromCache(query) {
    const key = query.trim().toLowerCase();
    const entry = searchCache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > API_CONFIG.cacheTTL) {
        searchCache.delete(key);
        return null;
    }

    searchCache.delete(key);
    searchCache.set(key, entry);

    return entry.data;
}

let debounceTimer;
let lastQuery = "";

async function fetchLocations(query) {
    const url = `${API_CONFIG.photonUrl}?q=${encodeURIComponent(query)}&limit=${API_CONFIG.maxResults}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    const json = await response.json();
    return json.features;
}

locationInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();

    clearTimeout(debounceTimer);

    if (val.length < 3) {
        suggestionsEl.style.display = "none";
        return;
    }

    debounceTimer = setTimeout(async () => {
        lastQuery = val;

        let results = getFromCache(val);

        if (!results) {
            try {
                results = await fetchLocations(val);
                saveToCache(val, results);
            } catch (err) {
                console.error("API fetch error:", err);
                return;
            }
        }

        if (val !== lastQuery) return;

        renderSuggestions(results);
    }, 400);
});

function renderSuggestions(features) {
    suggestionsEl.innerHTML = "";

    if (!features || features.length === 0) {
        suggestionsEl.style.display = "none";
        return;
    }

    features.forEach(feature => {
        const p = feature.properties;
        const coords = feature.geometry.coordinates;
        const displayName = `${p.name}${p.city ? ", " + p.city : ""} (${p.country || ""})`;

        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = displayName;

        item.addEventListener("click", () => {
            selectLocation(p.name, coords);
        });

        suggestionsEl.appendChild(item);
    });

    suggestionsEl.style.display = "block";
}

function selectLocation(name, coords) {
    locationInput.value = name;
    suggestionsEl.style.display = "none";

    saveToHistory(name);
    setLocationInURL(coords, name);
}

btnGeolocalizar.addEventListener("click", async () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;
            const name = await reverseGeocode(latitude, longitude);

            locationInput.value = name;
            selectLocation(name, [longitude, latitude]);
        },
        (err) => {
            console.error("Geolocation error:", err);
            alert("Failed to retrieve location: " + err.message);
        }
    );
});

function saveToHistory(city) {
    let history = JSON.parse(sessionStorage.getItem("locHistory") || "[]");
    history = [city, ...history.filter(c => c !== city)].slice(0, 10);
    sessionStorage.setItem("locHistory", JSON.stringify(history));
}

let map;
let marker = null;

const mapModal = document.getElementById("mapModal");
const btnMapa = document.getElementById("btnMapa");
const closeMap = document.getElementById("closeMap");
const confirmLocation = document.getElementById("confirmLocation");

btnMapa.addEventListener("click", () => {
    mapModal.classList.remove("hidden");

    if (!map) {
        map = L.map("map").setView([28.1235, -15.4363], 10);
        const mapContainer = map.getContainer();
        mapContainer.classList.add("location-picker-map");

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        map.on("dragstart", () => {
            mapContainer.classList.add("is-dragging");
        });

        map.on("dragend", () => {
            mapContainer.classList.remove("is-dragging");
        });

        map.on("click", (e) => {
            const { lat, lng } = e.latlng;
            selectedCoords = [lng, lat];

            if (marker) {
                marker.setLatLng(e.latlng);
            } else {
                marker = L.marker(e.latlng).addTo(map);
            }
        });
    }

    setTimeout(() => map.invalidateSize(), 100);
});

if (closeMap) {
    closeMap.addEventListener("click", () => {
        mapModal.classList.add("hidden");
    });
}

async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        );

        if (!res.ok) throw new Error("Reverse geocoding failed");

        const data = await res.json();
        const addr = data.address || {};
        const parts = [
            addr.road,
            addr.city || addr.town || addr.village,
            addr.state,
            addr.country
        ].filter(Boolean);

        return parts.length > 0
            ? parts.join(", ")
            : data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    } catch (err) {
        console.error("Reverse geocoding error:", err);
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
}

confirmLocation.addEventListener("click", async () => {
    if (!selectedCoords) return;

    const [lon, lat] = selectedCoords;
    const name = await reverseGeocode(lat, lon);

    selectLocation(name, [lon, lat]);
    mapModal.classList.add("hidden");
});

const DEFAULT_LOCATION = {
    name: "Las Palmas de Gran Canaria",
    coords: [-15.4163, 28.0997]
};

function getLocalizationCoord() {
    const urlParams = new URLSearchParams(window.location.search);
    const lon = urlParams.get('lon');
    const lat = urlParams.get('lat');
    return [lon, lat];
}

function cargarUbicacionPorDefecto() {
    const [lon, lat] = getLocalizationCoord();
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get('location_name');

    if (lon && lat && name) {
        selectedCoords = [Number(lon), Number(lat)];
        locationInput.value = name;
        return;
    }

    if (locationInput.value.trim() || selectedCoords) return;

    locationInput.value = DEFAULT_LOCATION.name;
    setLocationInURL(DEFAULT_LOCATION.coords, DEFAULT_LOCATION.name);
}

cargarUbicacionPorDefecto();