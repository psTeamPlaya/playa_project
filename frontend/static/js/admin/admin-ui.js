import { authFetch } from "../api/auth-fetch.js";
import { getServiceLabel } from "../shared/formatters.js";

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

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

function buildAdminCheckboxes(container, options, labelFormatter = null) {
    if (!container) return;
    container.innerHTML = options.map((option) => {
        const value = typeof option === "string" ? option : option.name;
        const baseLabel = typeof option === "string" ? option : option.label;
        const label = labelFormatter ? labelFormatter(value, baseLabel, option) : baseLabel;
        return `
        <label class="admin-chip-option">
            <input type="checkbox" value="${escapeHtml(value)}">
            <span>${escapeHtml(label)}</span>
        </label>
    `;
    }).join("");
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
    userManagementHistory,
    beachManagementModal,
    closeBeachManagementModal,
    beachManagementList,
    beachManagementFeedback,
    beachSearchInput,
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
    activityCatalogForm,
    activityCatalogNameInput,
    cancelActivityEditBtn,
    activityWeightsPanel,
    activityWeightsGrid,
    activityCatalogFeedback,
    activityCatalogList,
    serviceCatalogForm,
    serviceCatalogNameInput,
    serviceCatalogFeedback,
    serviceCatalogList,
    getCurrentUser,
    onClosePreferences,
}) {
    const state = {
        activities: [],
        services: [],
        variables: [],
        activityWeightTemplates: {},
        activityItems: [],
        serviceItems: [],
        beaches: [],
        selectedBeachId: null,
        beachSearchTerm: "",
        map: null,
        mapMarker: null,
        activityWeightSourceKey: "",
        editingActivityName: null,
    };

    const DEFAULT_MAP_COORDS = [28.1235, -15.4363];
    const DEFAULT_MAP_ZOOM = 10;
    const DETAIL_MAP_ZOOM = 15;
    const adminTabButtons = Array.from(
        beachManagementModal?.querySelectorAll("[data-admin-tab-target]") || []
    );
    const adminTabPanels = Array.from(
        beachManagementModal?.querySelectorAll("[data-admin-tab-panel]") || []
    );
    const ACTIVITY_ALIASES = {
        "tomar sol": "tomar_sol",
        "nadar": "nadar",
        "surf": "surf",
        "windsurf": "windsurf",
        "wind surf": "windsurf",
        "buceo": "bucear",
        "bucear": "bucear",
        "snorkel": "bucear",
        "caminar": "caminar",
        "pasear": "caminar",
        "pescar": "pescar",
        "kayak": "kayak",
        "kitesurf": "kitesurf",
        "kite surf": "kitesurf",
        "piscina natural": "piscina_natural",
    };

    function setActiveAdminTab(tabName = "beaches") {
        adminTabButtons.forEach((button) => {
            const isActive = button.dataset.adminTabTarget === tabName;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
            button.tabIndex = isActive ? 0 : -1;
        });

        adminTabPanels.forEach((panel) => {
            const isActive = panel.dataset.adminTabPanel === tabName;
            panel.classList.toggle("is-active", isActive);
            panel.hidden = !isActive;
        });
    }

    function focusAdminTabByOffset(currentButton, offset) {
        if (!currentButton || adminTabButtons.length === 0) return;

        const currentIndex = adminTabButtons.indexOf(currentButton);
        if (currentIndex < 0) return;

        const nextIndex = (currentIndex + offset + adminTabButtons.length) % adminTabButtons.length;
        const nextButton = adminTabButtons[nextIndex];
        nextButton?.focus();
        if (nextButton?.dataset.adminTabTarget) {
            setActiveAdminTab(nextButton.dataset.adminTabTarget);
        }
    }

    function updateAdminVisibility(user) {
        adminPreferencesGroup?.classList.toggle("hidden", !user?.is_admin);
    }

    function parseCoordinate(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function normalizeSearchText(value = "") {
        return String(value)
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function normalizeActivityName(name = "") {
        const normalized = String(name)
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase()
            .replaceAll("-", " ")
            .replaceAll("_", " ")
            .replace(/\s+/g, " ");

        return ACTIVITY_ALIASES[normalized] || normalized.replaceAll(" ", "_");
    }

    function formatVariableLabel(variable) {
        if (!variable) return "";
        return variable.unit
            ? `${variable.label} (${variable.unit})`
            : variable.label;
    }

    function buildActivityWeightInputs(weights = {}) {
        if (activityWeightsPanel) {
            activityWeightsPanel.hidden = state.variables.length === 0;
        }
        if (!activityWeightsGrid) return;

        activityWeightsGrid.innerHTML = state.variables.map((variable) => {
            const value = Number(weights[variable.name] ?? 0);
            return `
                <label class="admin-weight-field">
                    <span>${escapeHtml(formatVariableLabel(variable))}</span>
                    <input
                        type="number"
                        min="0"
                        step="0.05"
                        value="${Number.isFinite(value) ? value : 0}"
                        data-variable-name="${escapeHtml(variable.name)}"
                    >
                </label>
            `;
        }).join("");
    }

    function getActivityCatalogSubmitButton() {
        return activityCatalogForm?.querySelector('button[type="submit"]') || null;
    }

    function setActivityEditMode(item = null) {
        state.editingActivityName = item?.name || null;
        if (activityCatalogNameInput) {
            activityCatalogNameInput.value = item?.name || "";
            activityCatalogNameInput.readOnly = Boolean(item && item.can_rename === false);
        }
        if (cancelActivityEditBtn) {
            cancelActivityEditBtn.hidden = !item;
        }
        const submitButton = getActivityCatalogSubmitButton();
        if (submitButton) {
            submitButton.textContent = item ? "Guardar cambios" : "Añadir";
        }
        state.activityWeightSourceKey = item?.name || "";
        buildActivityWeightInputs(item?.weights || {});
    }

    function syncActivityWeightInputsFromName() {
        const normalizedName = normalizeActivityName(activityCatalogNameInput?.value || "");
        if (normalizedName === state.activityWeightSourceKey) {
            return;
        }

        state.activityWeightSourceKey = normalizedName;
        const templateWeights = state.activityWeightTemplates[normalizedName] || {};
        buildActivityWeightInputs(templateWeights);
    }

    function getActivityWeightsPayload() {
        if (!activityWeightsGrid) return {};

        return Array.from(activityWeightsGrid.querySelectorAll("[data-variable-name]"))
            .reduce((acc, input) => {
                const numericValue = Number(input.value);
                if (Number.isFinite(numericValue) && numericValue > 0) {
                    acc[input.dataset.variableName] = numericValue;
                }
                return acc;
            }, {});
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
                    <div class="admin-list-meta">${user.is_admin ? "Administrador" : user.is_banned ? "Usuario baneado" : "Usuario"}</div>
                </div>
                ${user.is_admin || user.id === currentUser?.id ? "" : `
                    <div class="admin-inline-actions">
                        <button
                            class="btn-secondary admin-inline-button ${user.is_banned ? "admin-inline-button-danger" : ""}"
                            data-user-id="${user.id}"
                            data-user-action="toggle-ban"
                            data-user-banned="${user.is_banned ? "true" : "false"}"
                            type="button"
                        >
                            ${user.is_banned ? "Baneado" : "Banear"}
                        </button>
                        <button
                            class="btn-secondary admin-inline-button"
                            data-user-id="${user.id}"
                            data-user-action="delete"
                            type="button"
                        >
                            Eliminar
                        </button>
                    </div>
                `}
            </article>
        `).join("");
    }

    function formatAuditAction(log) {
        if (log.action === "register") {
            return `Registro de ${escapeHtml(log.target_email)}`;
        }
        if (log.action === "ban") {
            return `Baneo de ${escapeHtml(log.target_email)}`;
        }
        if (log.action === "unban") {
            return `Desbaneo de ${escapeHtml(log.target_email)}`;
        }
        if (log.action === "delete") {
            return `Eliminación de ${escapeHtml(log.target_email)}`;
        }
        return `${escapeHtml(log.action)} · ${escapeHtml(log.target_email)}`;
    }

    function formatAuditMeta(log) {
        const timestamp = new Date(log.created_at);
        const dateText = Number.isNaN(timestamp.getTime())
            ? "Fecha no disponible"
            : new Intl.DateTimeFormat("es-ES", {
                dateStyle: "short",
                timeStyle: "short",
            }).format(timestamp);

        if (!log.actor_email) {
            return dateText;
        }

        return `${dateText} · por ${escapeHtml(log.actor_email)}`;
    }

    function renderUserHistory(logs) {
        if (!userManagementHistory) return;

        if (!logs.length) {
            userManagementHistory.innerHTML = '<div class="empty-state">Todavía no hay eventos de usuarios.</div>';
            return;
        }

        userManagementHistory.innerHTML = logs.map((log) => `
            <article class="admin-history-entry">
                <div class="admin-history-chip admin-history-chip-${escapeHtml(log.action)}">${formatAuditAction(log)}</div>
                <div class="admin-history-meta">${formatAuditMeta(log)}</div>
            </article>
        `).join("");
    }

    function renderCatalogList(container, items, type) {
        if (!container) return;
        if (!items.length) {
            container.innerHTML = '<div class="empty-state">No hay elementos creados.</div>';
            return;
        }

        container.innerHTML = items.map((item) => `
            <article class="admin-list-card">
                <div>
                    <strong>${escapeHtml(item.label)}</strong>
                    <div class="admin-list-meta">${escapeHtml(item.name)}</div>
                </div>
                <div class="admin-inline-actions">
                    ${type === "activity" ? `
                        <button
                            class="btn-secondary admin-inline-button"
                            data-catalog-type="${type}"
                            data-catalog-action="edit"
                            data-catalog-name="${escapeHtml(item.name)}"
                            type="button"
                        >
                            Editar
                        </button>
                    ` : ""}
                    ${item.can_delete !== false ? `
                        <button
                            class="btn-secondary admin-inline-button"
                            data-catalog-type="${type}"
                            data-catalog-action="delete"
                            data-catalog-id="${item.id}"
                            type="button"
                        >
                            Eliminar
                        </button>
                    ` : ""}
                </div>
            </article>
        `).join("");
    }

    async function loadUsers() {
        setFeedback(userManagementFeedback, "Cargando usuarios...");
        const [users, history] = await Promise.all([
            fetchJson("/admin/users"),
            fetchJson("/admin/users/history"),
        ]);
        renderUsers(users);
        renderUserHistory(history || []);
        setFeedback(userManagementFeedback, "");
    }

    function renderBeachList() {
        if (!beachManagementList) return;
        if (!state.beaches.length) {
            beachManagementList.innerHTML = '<div class="empty-state">No hay playas registradas.</div>';
            return;
        }

        const normalizedSearchTerm = normalizeSearchText(state.beachSearchTerm);
        const filteredBeaches = normalizedSearchTerm.length >= 3
            ? state.beaches.filter((beach) => {
                const searchableText = normalizeSearchText(`${beach.name} ${beach.location || ""}`);
                return searchableText.includes(normalizedSearchTerm);
            })
            : state.beaches;

        if (!filteredBeaches.length) {
            beachManagementList.innerHTML = '<div class="empty-state">No hay playas que coincidan con la búsqueda.</div>';
            return;
        }

        beachManagementList.innerHTML = filteredBeaches.map((beach) => `
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

    async function loadCatalog() {
        const catalog = await fetchJson("/admin/catalog");
        state.activities = catalog.activities || [];
        state.services = catalog.services || [];
        state.variables = catalog.variables || [];
        state.activityWeightTemplates = catalog.activity_weight_templates || {};

        const selectedServices = getSelectedOptions(beachServicesOptions);
        const selectedActivities = getSelectedOptions(beachActivitiesOptions);
        buildAdminCheckboxes(beachActivitiesOptions, state.activities);
        buildAdminCheckboxes(beachServicesOptions, state.services, (value, baseLabel) => {
            const decorated = getServiceLabel(value);
            return decorated === value ? baseLabel : decorated;
        });
        setSelectedOptions(beachServicesOptions, selectedServices);
        setSelectedOptions(beachActivitiesOptions, selectedActivities);
        buildActivityWeightInputs();
        syncActivityWeightInputsFromName();
    }

    async function loadCatalogItems() {
        const [activityItems, serviceItems] = await Promise.all([
            fetchJson("/admin/activities"),
            fetchJson("/admin/services"),
        ]);

        state.activityItems = activityItems || [];
        state.serviceItems = serviceItems || [];

        renderCatalogList(activityCatalogList, state.activityItems, "activity");
        renderCatalogList(serviceCatalogList, state.serviceItems, "service");
    }

    async function reloadAdminCatalogData({ refreshBeaches = false } = {}) {
        await loadCatalog();
        await loadCatalogItems();

        if (refreshBeaches) {
            await loadBeaches();
        }
    }

    async function loadBeaches() {
        setFeedback(beachManagementFeedback, "Cargando playas...");
        const selectedBeachId = state.selectedBeachId;
        state.beaches = await fetchJson("/admin/beaches");
        renderBeachList();
        const selectedBeach = state.beaches.find((beach) => beach.id === selectedBeachId);
        fillBeachForm(selectedBeach || state.beaches[0] || null);
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
        setActiveAdminTab("beaches");
        state.beachSearchTerm = "";
        if (beachSearchInput) {
            beachSearchInput.value = "";
        }
        try {
            ensureBeachMap();
            await reloadAdminCatalogData();
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

    async function setUserBanStatus(userId, isBanned) {
        await fetchJson(`/admin/users/${userId}/ban`, {
            method: "PATCH",
            body: JSON.stringify({ is_banned: isBanned }),
        });
        await loadUsers();
        setFeedback(
            userManagementFeedback,
            isBanned ? "Usuario baneado." : "Usuario desbaneado.",
            "success",
        );
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

    async function createCatalogItem(type, rawName) {
        const url = type === "activity" ? "/admin/activities" : "/admin/services";
        const payload = type === "activity"
            ? { name: rawName, weights: getActivityWeightsPayload() }
            : { name: rawName };
        return fetchJson(url, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async function updateActivityCatalogItem(previousName, rawName) {
        return fetchJson(`/admin/activities/${encodeURIComponent(previousName)}`, {
            method: "PUT",
            body: JSON.stringify({
                name: rawName,
                weights: getActivityWeightsPayload(),
            }),
        });
    }

    async function submitCatalogForm(event, type) {
        event.preventDefault();

        const input = type === "activity" ? activityCatalogNameInput : serviceCatalogNameInput;
        const feedback = type === "activity" ? activityCatalogFeedback : serviceCatalogFeedback;
        const rawName = input?.value?.trim() || "";

        if (!rawName) {
            setFeedback(feedback, "Debes indicar un nombre.", "error");
            return;
        }

        try {
            setFeedback(feedback, "Guardando...");
            const wasEditingActivity = type === "activity" && Boolean(state.editingActivityName);
            if (type === "activity" && state.editingActivityName) {
                await updateActivityCatalogItem(state.editingActivityName, rawName);
            } else {
                await createCatalogItem(type, rawName);
            }
            if (input) {
                input.value = "";
            }
            if (type === "activity") {
                setActivityEditMode(null);
            }
            await reloadAdminCatalogData({ refreshBeaches: true });
            setFeedback(
                feedback,
                type === "activity"
                    ? wasEditingActivity
                        ? "Actividad actualizada."
                        : "Actividad añadida."
                    : "Servicio añadido.",
                "success",
            );
        } catch (error) {
            setFeedback(feedback, error.message, "error");
        }
    }

    async function deleteCatalogItem(type, id) {
        const url = type === "activity" ? `/admin/activities/${id}` : `/admin/services/${id}`;
        await fetchJson(url, { method: "DELETE" });
        await reloadAdminCatalogData({ refreshBeaches: true });
    }

    openUserManagementBtn?.addEventListener("click", openUsersModal);
    openBeachManagementBtn?.addEventListener("click", openBeachesModal);
    openReviewManagementBtn?.addEventListener("click", () => {});

    closeUserManagementModal?.addEventListener("click", () => closeModal(userManagementModal));
    closeBeachManagementModal?.addEventListener("click", () => closeModal(beachManagementModal));

    adminTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (!button.dataset.adminTabTarget) return;
            setActiveAdminTab(button.dataset.adminTabTarget);
        });

        button.addEventListener("keydown", (event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                focusAdminTabByOffset(button, 1);
                return;
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                focusAdminTabByOffset(button, -1);
                return;
            }
            if (event.key === "Home") {
                event.preventDefault();
                const firstButton = adminTabButtons[0];
                firstButton?.focus();
                if (firstButton?.dataset.adminTabTarget) {
                    setActiveAdminTab(firstButton.dataset.adminTabTarget);
                }
                return;
            }
            if (event.key === "End") {
                event.preventDefault();
                const lastButton = adminTabButtons[adminTabButtons.length - 1];
                lastButton?.focus();
                if (lastButton?.dataset.adminTabTarget) {
                    setActiveAdminTab(lastButton.dataset.adminTabTarget);
                }
            }
        });
    });

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
            if (button.dataset.userAction === "toggle-ban") {
                await setUserBanStatus(
                    button.dataset.userId,
                    button.dataset.userBanned !== "true",
                );
                return;
            }

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
    beachSearchInput?.addEventListener("input", () => {
        state.beachSearchTerm = beachSearchInput.value || "";
        renderBeachList();
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
    activityCatalogForm?.addEventListener("submit", (event) => submitCatalogForm(event, "activity"));
    activityCatalogNameInput?.addEventListener("input", syncActivityWeightInputsFromName);
    cancelActivityEditBtn?.addEventListener("click", () => {
        setActivityEditMode(null);
        setFeedback(activityCatalogFeedback, "");
    });
    serviceCatalogForm?.addEventListener("submit", (event) => submitCatalogForm(event, "service"));
    activityCatalogList?.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-catalog-action]");
        if (!button) return;
        if (button.dataset.catalogAction === "edit") {
            const activity = state.activityItems.find((item) => item.name === button.dataset.catalogName);
            setActivityEditMode(activity || null);
            setFeedback(
                activityCatalogFeedback,
                activity?.can_rename === false
                    ? "Puedes editar los pesos de esta actividad base, pero no cambiar su nombre."
                    : "",
            );
            return;
        }
        try {
            setFeedback(activityCatalogFeedback, "Eliminando...");
            await deleteCatalogItem(button.dataset.catalogType, button.dataset.catalogId);
            setActivityEditMode(null);
            setFeedback(activityCatalogFeedback, "Actividad eliminada.", "success");
        } catch (error) {
            setFeedback(activityCatalogFeedback, error.message, "error");
        }
    });
    serviceCatalogList?.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-catalog-id]");
        if (!button) return;
        try {
            setFeedback(serviceCatalogFeedback, "Eliminando...");
            await deleteCatalogItem(button.dataset.catalogType, button.dataset.catalogId);
            setFeedback(serviceCatalogFeedback, "Servicio eliminado.", "success");
        } catch (error) {
            setFeedback(serviceCatalogFeedback, error.message, "error");
        }
    });

    return {
        updateAdminVisibility,
        closeModals: () => {
            closeModal(userManagementModal);
            closeModal(beachManagementModal);
        },
    };
}
