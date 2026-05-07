import { authFetch } from "../api/auth-fetch.js";

function setFeedback(element, message = "", type = "") {
    if (!element) return;
    element.textContent = message;
    element.classList.remove("error", "success");
    if (type) {
        element.classList.add(type);
    }
}

function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
}

function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
}

function buildAdminCheckboxes(container, options) {
    if (!container) return;
    container.innerHTML = options.map((option) => `
        <label class="admin-chip-option">
            <input type="checkbox" value="${option}">
            <span>${option}</span>
        </label>
    `).join("");
}

function setSelectedOptions(container, selectedValues) {
    if (!container) return;
    const selected = new Set(selectedValues);
    container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = selected.has(input.value);
    });
}

function getSelectedOptions(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function normalizeBeachType(beachType) {
    if (beachType === "roca") {
        return "piscina_natural";
    }
    return beachType;
}

export function initAdminUI({
    adminPreferencesGroup,
    openUserManagementBtn,
    openBeachManagementBtn,
    openReviewManagementBtn,
    userManagementModal,
    closeUserManagementModal,
    userManagementList,
    userManagementFeedback,
    beachManagementModal,
    closeBeachManagementModal,
    beachManagementList,
    beachManagementFeedback,
    beachManagementForm,
    newBeachBtn,
    resetBeachFormBtn,
    beachIdInput,
    beachNameInput,
    beachLocationInput,
    beachTypeInput,
    beachAccessibilityInput,
    beachLatitudeInput,
    beachLongitudeInput,
    beachPickOnMapBtn,
    beachMapElement,
    beachImageInput,
    beachDescriptionInput,
    beachServicesOptions,
    beachActivitiesOptions,
    getCurrentUser,
    onClosePreferences,
}) {
    const state = {
        catalogLoaded: false,
        activities: [],
        services: [],
        beaches: [],
        selectedBeachId: null,
        map: null,
        mapMarker: null,
    };

    const DEFAULT_MAP_COORDS = [28.1235, -15.4363];
    const DEFAULT_MAP_ZOOM = 10;
    const DETAIL_MAP_ZOOM = 15;

    function updateAdminVisibility(user) {
        adminPreferencesGroup?.classList.toggle("hidden", !user?.is_admin);
    }

    function parseCoordinate(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getBeachCoordinates() {
        const latitude = parseCoordinate(beachLatitudeInput?.value);
        const longitude = parseCoordinate(beachLongitudeInput?.value);

        if (latitude === null || longitude === null) {
            return null;
        }

        return [latitude, longitude];
    }

    function syncMapWithInputs({ focus = false } = {}) {
        if (!state.map) return;

        const coords = getBeachCoordinates();
        const targetCoords = coords || DEFAULT_MAP_COORDS;
        const targetZoom = coords ? DETAIL_MAP_ZOOM : DEFAULT_MAP_ZOOM;

        if (coords) {
            if (state.mapMarker) {
                state.mapMarker.setLatLng(coords);
            } else {
                state.mapMarker = L.marker(coords).addTo(state.map);
            }
        } else if (state.mapMarker) {
            state.map.removeLayer(state.mapMarker);
            state.mapMarker = null;
        }

        if (focus) {
            state.map.setView(targetCoords, targetZoom);
        }

        window.setTimeout(() => {
            state.map?.invalidateSize();
        }, 0);
    }

    async function reverseGeocodeBeachLocation(latitude, longitude) {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            {
                headers: {
                    Accept: "application/json",
                },
            },
        );

        if (!response.ok) {
            throw new Error("No se pudo traducir la ubicación seleccionada.");
        }

        const data = await response.json();
        const address = data.address || {};
        const placeName = [
            address.city || address.town || address.village || address.municipality,
            address.state,
            address.country,
        ].filter(Boolean);

        return placeName[0] ? placeName.join(", ") : data.display_name || "";
    }

    async function updateCoordinatesFromMapSelection(latlng) {
        if (!latlng) return;

        const latitude = Number(latlng.lat.toFixed(6));
        const longitude = Number(latlng.lng.toFixed(6));

        if (beachLatitudeInput) beachLatitudeInput.value = String(latitude);
        if (beachLongitudeInput) beachLongitudeInput.value = String(longitude);

        syncMapWithInputs();

        setFeedback(beachManagementFeedback, "Actualizando ubicación desde el mapa...");
        try {
            const resolvedLocation = await reverseGeocodeBeachLocation(latitude, longitude);
            if (beachLocationInput && resolvedLocation) {
                beachLocationInput.value = resolvedLocation;
            }
            setFeedback(beachManagementFeedback, "Ubicación seleccionada en el mapa.", "success");
        } catch (error) {
            console.error("Reverse geocoding failed", error);
            setFeedback(
                beachManagementFeedback,
                "Coordenadas actualizadas. No se pudo resolver el nombre de la ubicación.",
                "success",
            );
        }
    }

    function ensureBeachMap() {
        if (!beachMapElement || state.map) return;

        state.map = L.map(beachMapElement).setView(DEFAULT_MAP_COORDS, DEFAULT_MAP_ZOOM);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(state.map);

        state.map.on("click", (event) => {
            updateCoordinatesFromMapSelection(event.latlng);
        });
    }

    async function fetchJson(url, options = {}) {
        const response = await authFetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
            ...options,
        });

        if (!response.ok) {
            let detail = "No se pudo completar la operación.";
            try {
                const data = await response.json();
                detail = data.detail || detail;
            } catch (error) {
                console.error("Error reading error payload", error);
            }
            throw new Error(detail);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    function renderUsers(users) {
        if (!userManagementList) return;
        const currentUser = getCurrentUser?.();

        if (!users.length) {
            userManagementList.innerHTML = '<div class="empty-state">No hay usuarios registrados.</div>';
            return;
        }

        userManagementList.innerHTML = users.map((user) => `
            <article class="admin-list-card">
                <div>
                    <strong>${user.email}</strong>
                    <div class="admin-list-meta">${user.is_admin ? "Administrador" : "Usuario"}</div>
                </div>
                ${user.is_admin || user.id === currentUser?.id ? "" : `<button class="btn-secondary admin-inline-button" data-user-id="${user.id}" type="button">Eliminar</button>`}
            </article>
        `).join("");
    }

    async function loadUsers() {
        setFeedback(userManagementFeedback, "Cargando usuarios...");
        const users = await fetchJson("/admin/users");
        renderUsers(users);
        setFeedback(userManagementFeedback, "");
    }

    function renderBeachList() {
        if (!beachManagementList) return;
        if (!state.beaches.length) {
            beachManagementList.innerHTML = '<div class="empty-state">No hay playas registradas.</div>';
            return;
        }

        beachManagementList.innerHTML = state.beaches.map((beach) => `
            <button
                class="admin-list-card admin-beach-card ${state.selectedBeachId === beach.id ? "is-selected" : ""}"
                data-beach-id="${beach.id}"
                type="button"
            >
                <strong>${beach.name}</strong>
                <span class="admin-list-meta">${beach.location || "Sin ubicación"}</span>
            </button>
        `).join("");
    }

    function fillBeachForm(beach = null) {
        state.selectedBeachId = beach?.id ?? null;
        if (beachIdInput) beachIdInput.value = beach?.id ?? "";
        if (beachNameInput) beachNameInput.value = beach?.name ?? "";
        if (beachLocationInput) beachLocationInput.value = beach?.location ?? "";
        if (beachTypeInput) beachTypeInput.value = normalizeBeachType(beach?.type) ?? "arena";
        if (beachAccessibilityInput) beachAccessibilityInput.value = beach?.accessibility ?? "alta";
        if (beachLatitudeInput) beachLatitudeInput.value = beach?.latitude ?? "";
        if (beachLongitudeInput) beachLongitudeInput.value = beach?.longitude ?? "";
        if (beachImageInput) beachImageInput.value = beach?.image ?? "";
        if (beachDescriptionInput) beachDescriptionInput.value = beach?.description ?? "";
        setSelectedOptions(beachServicesOptions, beach?.services ?? []);
        setSelectedOptions(beachActivitiesOptions, beach?.activities ?? []);
        renderBeachList();
        syncMapWithInputs({ focus: true });
    }

    async function ensureCatalogLoaded() {
        if (state.catalogLoaded) return;
        const catalog = await fetchJson("/admin/catalog");
        state.activities = catalog.activities || [];
        state.services = catalog.services || [];
        buildAdminCheckboxes(beachActivitiesOptions, state.activities);
        buildAdminCheckboxes(beachServicesOptions, state.services);
        state.catalogLoaded = true;
    }

    async function loadBeaches() {
        setFeedback(beachManagementFeedback, "Cargando playas...");
        state.beaches = await fetchJson("/admin/beaches");
        renderBeachList();
        fillBeachForm(state.beaches[0] ?? null);
        setFeedback(beachManagementFeedback, "");
    }

    async function openUsersModal() {
        onClosePreferences?.();
        openModal(userManagementModal);
        try {
            await loadUsers();
        } catch (error) {
            setFeedback(userManagementFeedback, error.message, "error");
        }
    }

    async function openBeachesModal() {
        onClosePreferences?.();
        openModal(beachManagementModal);
        try {
            ensureBeachMap();
            await ensureCatalogLoaded();
            await loadBeaches();
            syncMapWithInputs({ focus: true });
        } catch (error) {
            setFeedback(beachManagementFeedback, error.message, "error");
        }
    }

    async function deleteUser(userId) {
        await fetchJson(`/admin/users/${userId}`, { method: "DELETE" });
        await loadUsers();
        setFeedback(userManagementFeedback, "Usuario eliminado.", "success");
    }

    function getBeachPayload() {
        return {
            name: beachNameInput?.value?.trim() || "",
            location: beachLocationInput?.value?.trim() || "",
            description: beachDescriptionInput?.value?.trim() || "",
            type: normalizeBeachType(beachTypeInput?.value) || "arena",
            latitude: Number(beachLatitudeInput?.value || 0),
            longitude: Number(beachLongitudeInput?.value || 0),
            accessibility: beachAccessibilityInput?.value || "alta",
            image: beachImageInput?.value?.trim() || "",
            service_names: getSelectedOptions(beachServicesOptions),
            activity_names: getSelectedOptions(beachActivitiesOptions),
        };
    }

    async function submitBeachForm(event) {
        event.preventDefault();
        const payload = getBeachPayload();

        if (!payload.name || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
            setFeedback(beachManagementFeedback, "Nombre, latitud y longitud son obligatorios.", "error");
            return;
        }

        const beachId = beachIdInput?.value;
        const url = beachId ? `/admin/beaches/${beachId}` : "/admin/beaches";
        const method = beachId ? "PUT" : "POST";

        try {
            setFeedback(beachManagementFeedback, "Guardando playa...");
            const savedBeach = await fetchJson(url, {
                method,
                body: JSON.stringify(payload),
            });

            const existingIndex = state.beaches.findIndex((item) => item.id === savedBeach.id);
            if (existingIndex >= 0) {
                state.beaches.splice(existingIndex, 1, savedBeach);
            } else {
                state.beaches.push(savedBeach);
            }

            state.beaches.sort((a, b) => a.name.localeCompare(b.name, "es"));
            fillBeachForm(savedBeach);
            setFeedback(beachManagementFeedback, "Playa guardada correctamente.", "success");
        } catch (error) {
            setFeedback(beachManagementFeedback, error.message, "error");
        }
    }

    function resetBeachForm() {
        fillBeachForm(null);
        setFeedback(beachManagementFeedback, "");
    }

    openUserManagementBtn?.addEventListener("click", openUsersModal);
    openBeachManagementBtn?.addEventListener("click", openBeachesModal);
    openReviewManagementBtn?.addEventListener("click", () => {});

    closeUserManagementModal?.addEventListener("click", () => closeModal(userManagementModal));
    closeBeachManagementModal?.addEventListener("click", () => closeModal(beachManagementModal));

    userManagementModal?.addEventListener("click", (event) => {
        if (event.target === userManagementModal) {
            closeModal(userManagementModal);
        }
    });

    beachManagementModal?.addEventListener("click", (event) => {
        if (event.target === beachManagementModal) {
            closeModal(beachManagementModal);
        }
    });

    userManagementList?.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-user-id]");
        if (!button) return;
        try {
            await deleteUser(button.dataset.userId);
        } catch (error) {
            setFeedback(userManagementFeedback, error.message, "error");
        }
    });

    beachManagementList?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-beach-id]");
        if (!button) return;
        const beach = state.beaches.find((item) => String(item.id) === button.dataset.beachId);
        fillBeachForm(beach || null);
    });

    beachManagementForm?.addEventListener("submit", submitBeachForm);
    newBeachBtn?.addEventListener("click", resetBeachForm);
    resetBeachFormBtn?.addEventListener("click", resetBeachForm);
    beachPickOnMapBtn?.addEventListener("click", () => {
        ensureBeachMap();
        syncMapWithInputs({ focus: true });
    });
    beachLatitudeInput?.addEventListener("input", () => syncMapWithInputs());
    beachLongitudeInput?.addEventListener("input", () => syncMapWithInputs());

    return {
        updateAdminVisibility,
        closeModals: () => {
            closeModal(userManagementModal);
            closeModal(beachManagementModal);
        },
    };
}
