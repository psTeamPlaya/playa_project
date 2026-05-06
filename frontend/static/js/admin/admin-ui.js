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
    };

    function updateAdminVisibility(user) {
        adminPreferencesGroup?.classList.toggle("hidden", !user?.is_admin);
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
        if (beachTypeInput) beachTypeInput.value = beach?.type ?? "arena";
        if (beachAccessibilityInput) beachAccessibilityInput.value = beach?.accessibility ?? "alta";
        if (beachLatitudeInput) beachLatitudeInput.value = beach?.latitude ?? "";
        if (beachLongitudeInput) beachLongitudeInput.value = beach?.longitude ?? "";
        if (beachImageInput) beachImageInput.value = beach?.image ?? "";
        if (beachDescriptionInput) beachDescriptionInput.value = beach?.description ?? "";
        setSelectedOptions(beachServicesOptions, beach?.services ?? []);
        setSelectedOptions(beachActivitiesOptions, beach?.activities ?? []);
        renderBeachList();
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
            await ensureCatalogLoaded();
            await loadBeaches();
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
            type: beachTypeInput?.value || "arena",
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

    return {
        updateAdminVisibility,
        closeModals: () => {
            closeModal(userManagementModal);
            closeModal(beachManagementModal);
        },
    };
}
