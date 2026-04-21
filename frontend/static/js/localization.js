/**
 * ============================================
 * API & CACHE CONFIGURATION
 * Easily adjust API endpoint and behavior here
 * ============================================
 */
const API_CONFIG = {
    photonUrl: "https://photon.komoot.io/api/",
    maxResults: 5,            // Number of results fetched from API
    cacheLimit: 5,            // Max number of cached queries
    cacheTTL: 5 * 60 * 1000   // Cache validity (5 minutes)
};

/**
 * Cache Map structure:
 * key -> { data: [...], timestamp: number }
 */
const searchCache = new Map();

/**
 * DOM Elements
 */
const locationInput = document.getElementById("locationInput");
const btnGeolocalizar = document.getElementById("btnGeolocalizar");
const suggestionsEl = document.getElementById("suggestions");
const locationHistoryEl = document.getElementById("locationHistory");

/**
 * ============================================
 * CACHE LOGIC (LRU + TTL)
 * ============================================
 */

/**
 * Save query results to cache.
 * Maintains LRU (Least Recently Used) behavior.
 */
function saveToCache(query, results) {
    const key = query.trim().toLowerCase();

    // If key already exists → refresh position
    if (searchCache.has(key)) {
        searchCache.delete(key);
    }

    // Remove oldest entry if limit exceeded
    if (searchCache.size >= API_CONFIG.cacheLimit) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
    }

    searchCache.set(key, {
        data: results,
        timestamp: Date.now()
    });
}

/**
 * Retrieve data from cache.
 * Returns null if not found or expired.
 */
function getFromCache(query) {
    const key = query.trim().toLowerCase();
    const entry = searchCache.get(key);

    if (!entry) return null;

    // Check TTL expiration
    if (Date.now() - entry.timestamp > API_CONFIG.cacheTTL) {
        searchCache.delete(key);
        return null;
    }

    // Refresh entry position (LRU)
    searchCache.delete(key);
    searchCache.set(key, entry);

    return entry.data;
}

/**
 * ============================================
 * SEARCH LOGIC (Debounce + Race Condition Safe)
 * ============================================
 */

let debounceTimer;
let lastQuery = "";

/**
 * Fetch location suggestions from API
 */
async function fetchLocations(query) {
    const url = `${API_CONFIG.photonUrl}?q=${encodeURIComponent(query)}&limit=${API_CONFIG.maxResults}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    const json = await response.json();
    return json.features;
}

/**
 * Handle user input with debounce
 */
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

        // Prevent outdated results (race condition)
        if (val !== lastQuery) return;

        renderSuggestions(results);
    }, 400);
});

/**
 * ============================================
 * UI RENDERING (SAFE - NO innerHTML)
 * ============================================
 */

/**
 * Render suggestion list safely using DOM API
 */
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

/**
 * Handle selection of a suggestion
 */
function selectLocation(name, coords) {
    locationInput.value = name;
    suggestionsEl.style.display = "none";

    saveToHistory(name);

    console.log("Selected location:", name, coords);

    // You can store coords globally here if needed
}

/**
 * ============================================
 * GEOLOCATION HANDLING
 * ============================================
 */

btnGeolocalizar.addEventListener("click", async () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {  // 🔥 TU DODAJESZ async
            const { latitude, longitude } = pos.coords;

            const name = await reverseGeocode(latitude, longitude);

            locationInput.value = name;

            // keep consistent format [lat, lon]
            selectedCoords = [latitude, longitude];
        },
        (err) => {
            console.error("Geolocation error:", err);
            alert("Failed to retrieve location: " + err.message);
        }
    );
});

/**
 * ============================================
 * SEARCH HISTORY (localStorage)
 * ============================================
 */

/**
 * Save location to history (max 10 entries)
 */
function saveToHistory(city) {
    let history = JSON.parse(localStorage.getItem("locHistory") || "[]");

    // Remove duplicates and add new item at the beginning
    history = [city, ...history.filter(c => c !== city)].slice(0, 10);

    localStorage.setItem("locHistory", JSON.stringify(history));

    renderHistory();
}

/**
 * Render history as clickable tags
 */
function renderHistory() {
    if (!locationHistoryEl) return;

    const history = JSON.parse(localStorage.getItem("locHistory") || "[]");

    locationHistoryEl.innerHTML = "";

    history.forEach(city => {
        const tag = document.createElement("span");
        tag.className = "location-tag";
        tag.textContent = city;

        tag.addEventListener("click", () => {
            selectLocation(city, null);
        });

        locationHistoryEl.appendChild(tag);
    });
}

/**
 * Initialize history on page load
 */
renderHistory();

/**
 * ============================================
 * MAP + REVERSE GEOCODING (FIXED)
 * Works for any location (map click + geolocation)
 * ============================================
 */

let map;
let marker = null;
let selectedCoords = null;

const mapModal = document.getElementById("mapModal");
const btnMapa = document.getElementById("btnMapa");
const closeMap = document.getElementById("closeMap");
const confirmLocation = document.getElementById("confirmLocation");

/**
 * Open map modal
 */
btnMapa.addEventListener("click", () => {
    mapModal.classList.remove("hidden");

    if (!map) {
        map = L.map("map").setView([28.1235, -15.4363], 10); // Default: Gran Canaria

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        /**
         * Click on map → select location
         */
        map.on("click", (e) => {
            const { lat, lng } = e.latlng;

            selectedCoords = [lat, lng];

            if (marker) {
                marker.setLatLng(e.latlng);
            } else {
                marker = L.marker(e.latlng).addTo(map);
            }
        });
    }

    setTimeout(() => map.invalidateSize(), 100);
});

/**
 * Close modal
 */
if (closeMap) {
    closeMap.addEventListener("click", () => {
        mapModal.classList.add("hidden");
    });
}

/**
 * Reverse geocoding using Nominatim
 */
async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        );

        if (!res.ok) throw new Error("Reverse geocoding failed");

        const data = await res.json();

        // Build readable name
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

/**
 * Confirm location from map
 */
confirmLocation.addEventListener("click", async () => {
    if (!selectedCoords) return;

    const [lat, lon] = selectedCoords;

    const name = await reverseGeocode(lat, lon);

    // IMPORTANT: keep coords format consistent [lon, lat] (GeoJSON style)
    selectLocation(name, [lon, lat]);

    mapModal.classList.add("hidden");
});