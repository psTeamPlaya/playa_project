import { authFetch } from "../api/auth-fetch.js";

const FILTER_FIELDS = [
    ["min_temperatura_ambiente", "Temperatura mín.", "ºC"],
    ["max_temperatura_ambiente", "Temperatura máx.", "ºC"],
    ["min_velocidad_viento", "Viento mín.", "km/h"],
    ["max_velocidad_viento", "Viento máx.", "km/h"],
    ["min_nubosidad", "Nubosidad mín.", "%"],
    ["max_nubosidad", "Nubosidad máx.", "%"],
    ["min_altura_oleaje", "Oleaje mín.", "m"],
    ["max_altura_oleaje", "Oleaje máx.", "m"],
];
const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const WEEKDAY_SHORT_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatAlertFilters(filters = {}) {
    const formatted = FILTER_FIELDS
        .filter(([key]) => filters[key] !== undefined && filters[key] !== null && filters[key] !== "")
        .map(([key, label, unit]) => `${label}: ${filters[key]} ${unit}`.trim());

    return formatted.length > 0 ? formatted.join(" · ") : "Sin condiciones extra";
}

function parseOptionalNumber(value) {
    if (value === "" || value === null || value === undefined) {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeWeekdays(filters = {}) {
    const weekdays = filters.dias_semana ?? filters.dia_semana;
    if (weekdays === undefined || weekdays === null || weekdays === "") {
        return [];
    }

    const rawValues = Array.isArray(weekdays) ? weekdays : [weekdays];
    return rawValues
        .map((value) => Number(value))
        .filter((value, index, values) => Number.isInteger(value) && value >= 0 && value <= 6 && values.indexOf(value) === index)
        .sort((left, right) => left - right);
}

function formatAlertSchedule(filters = {}) {
    const parts = [];

    const weekdays = normalizeWeekdays(filters);
    if (weekdays.length > 0) {
        const weekdayLabels = weekdays
            .map((weekday) => WEEKDAY_SHORT_LABELS[weekday])
            .filter(Boolean);
        if (weekdayLabels.length > 0) {
            parts.push(`Días: ${weekdayLabels.join(", ")}`);
        }
    }

    const hasStartHour = filters.hora_inicio !== undefined && filters.hora_inicio !== null && filters.hora_inicio !== "";
    const hasEndHour = filters.hora_fin !== undefined && filters.hora_fin !== null && filters.hora_fin !== "";
    if (hasStartHour && hasEndHour) {
        const startHour = String(Number(filters.hora_inicio)).padStart(2, "0");
        const endHour = String(Number(filters.hora_fin)).padStart(2, "0");
        parts.push(`Horario: ${startHour}:00-${endHour}:00`);
    }

    return parts.join(" · ");
}

export function initAlertsUI({
    openAlertsModalBtn,
    alertsModal,
    closeAlertsModalBtn,
    openAlertsEditorBtn,
    closeAlertsEditorBtn,
    alertsEditorBackdrop,
    alertsEditorTitle,
    alertsEditorCopy,
    alertsForm,
    alertsEditingIdInput,
    cancelAlertEditBtn,
    saveCurrentAlertBtn,
    alertsActivitySelect,
    alertsBeachSelect,
    alertWeekdayCheckboxes,
    alertStartHourInput,
    alertEndHourInput,
    alertMinTemperatureInput,
    alertMaxTemperatureInput,
    alertMinWindInput,
    alertMaxWindInput,
    alertMinCloudInput,
    alertMaxCloudInput,
    alertMinWaveInput,
    alertMaxWaveInput,
    alertsList,
    alertsFeedback,
    getCurrentUser,
    getPreferredActivityName,
}) {
    let activityOptions = [];
    let beachOptions = [];
    let catalogsLoaded = false;
    let lastLoadedAlerts = [];

    function setFeedback(message = "", isError = false) {
        if (!alertsFeedback) {
            return;
        }

        alertsFeedback.textContent = message;
        alertsFeedback.classList.toggle("error", Boolean(message && isError));
        alertsFeedback.classList.toggle("success", Boolean(message && !isError));
    }

    async function fetchJson(url, options = {}) {
        const response = await authFetch(url, options);
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.detail || "No se pudo completar la operación.");
        }
        return response.json();
    }

    function getEditingId() {
        return Number(alertsEditingIdInput?.value || 0) || null;
    }

    function isEditorOpen() {
        return alertsForm ? !alertsForm.hidden : false;
    }

    function updateEditorCopy(isEditing) {
        if (alertsEditorTitle) {
            alertsEditorTitle.textContent = isEditing ? "Editar alerta" : "Nueva alerta";
        }
        if (alertsEditorCopy) {
            alertsEditorCopy.textContent = isEditing
                ? "Actualiza la actividad, la playa o las condiciones de esta alerta."
                : "Configura la actividad, la playa y las condiciones a vigilar.";
        }
    }

    function closeEditor({ reset = false, preservePreferredActivity = true } = {}) {
        if (alertsForm) {
            alertsForm.hidden = true;
        }
        if (alertsEditorBackdrop) {
            alertsEditorBackdrop.hidden = true;
        }
        if (reset) {
            resetForm({ preservePreferredActivity });
        }
    }

    function openEditor({ isEditing = false } = {}) {
        updateEditorCopy(isEditing);
        if (alertsEditorBackdrop) {
            alertsEditorBackdrop.hidden = false;
        }
        if (alertsForm) {
            alertsForm.hidden = false;
        }
    }

    function closeModal() {
        closeEditor({ reset: true, preservePreferredActivity: false });
        if (alertsModal) {
            alertsModal.hidden = true;
        }
    }

    function resetForm({ preservePreferredActivity = true } = {}) {
        alertsForm?.reset();
        if (alertsEditingIdInput) {
            alertsEditingIdInput.value = "";
        }
        if (cancelAlertEditBtn) {
            cancelAlertEditBtn.hidden = true;
        }
        if (saveCurrentAlertBtn) {
            saveCurrentAlertBtn.textContent = "Guardar alerta";
        }

        const preferred = preservePreferredActivity ? getPreferredActivityName?.() || "" : "";
        if (preferred && alertsActivitySelect && activityOptions.some((activity) => activity.name === preferred)) {
            alertsActivitySelect.value = preferred;
        }
    }

    function populateActivitySelect() {
        if (!alertsActivitySelect) {
            return;
        }

        const currentValue = alertsActivitySelect.value || getPreferredActivityName?.() || "";
        alertsActivitySelect.innerHTML = `
            <option value="">Selecciona una actividad</option>
            ${activityOptions.map((activity) => `
                <option value="${escapeHtml(activity.name)}">${escapeHtml(activity.label)}</option>
            `).join("")}
        `;

        if (currentValue && activityOptions.some((activity) => activity.name === currentValue)) {
            alertsActivitySelect.value = currentValue;
        }
    }

    function populateBeachSelect() {
        if (!alertsBeachSelect) {
            return;
        }

        const currentValue = alertsBeachSelect.value;
        alertsBeachSelect.innerHTML = `
            <option value="">Selecciona una playa</option>
            ${beachOptions.map((beach) => `
                <option value="${escapeHtml(String(beach.id))}">${escapeHtml(beach.label)}</option>
            `).join("")}
        `;

        if (currentValue && beachOptions.some((beach) => String(beach.id) === currentValue)) {
            alertsBeachSelect.value = currentValue;
        }
    }

    async function ensureCatalogsLoaded() {
        if (catalogsLoaded) {
            populateActivitySelect();
            populateBeachSelect();
            return;
        }

        const [activities, beaches] = await Promise.all([
            fetchJson("/activities/"),
            fetchJson("/beaches/"),
        ]);

        activityOptions = Array.isArray(activities) ? activities : [];
        beachOptions = Array.isArray(beaches) ? beaches : [];
        catalogsLoaded = true;
        populateActivitySelect();
        populateBeachSelect();
    }

    function buildFiltersPayload() {
        const selectedWeekdays = Array.isArray(alertWeekdayCheckboxes)
            ? alertWeekdayCheckboxes
                .filter((checkbox) => checkbox?.checked)
                .map((checkbox) => Number(checkbox.value))
                .filter((value) => Number.isInteger(value))
            : [];

        const filters = {
            dias_semana: selectedWeekdays.length > 0 ? selectedWeekdays : null,
            hora_inicio: parseOptionalNumber(alertStartHourInput?.value),
            hora_fin: parseOptionalNumber(alertEndHourInput?.value),
            min_temperatura_ambiente: parseOptionalNumber(alertMinTemperatureInput?.value),
            max_temperatura_ambiente: parseOptionalNumber(alertMaxTemperatureInput?.value),
            min_velocidad_viento: parseOptionalNumber(alertMinWindInput?.value),
            max_velocidad_viento: parseOptionalNumber(alertMaxWindInput?.value),
            min_nubosidad: parseOptionalNumber(alertMinCloudInput?.value),
            max_nubosidad: parseOptionalNumber(alertMaxCloudInput?.value),
            min_altura_oleaje: parseOptionalNumber(alertMinWaveInput?.value),
            max_altura_oleaje: parseOptionalNumber(alertMaxWaveInput?.value),
        };

        return Object.fromEntries(
            Object.entries(filters).filter(([, value]) => value !== null)
        );
    }

    function validateFilters(filters) {
        const hasStartHour = filters.hora_inicio !== undefined;
        const hasEndHour = filters.hora_fin !== undefined;
        if (hasStartHour !== hasEndHour) {
            throw new Error("Debes indicar la hora de inicio y la hora de fin del rango horario.");
        }

        if (hasStartHour && hasEndHour && filters.hora_inicio > filters.hora_fin) {
            throw new Error("La hora de inicio no puede ser mayor que la hora de fin.");
        }

        const ranges = [
            ["Temperatura", filters.min_temperatura_ambiente, filters.max_temperatura_ambiente],
            ["Viento", filters.min_velocidad_viento, filters.max_velocidad_viento],
            ["Nubosidad", filters.min_nubosidad, filters.max_nubosidad],
            ["Oleaje", filters.min_altura_oleaje, filters.max_altura_oleaje],
        ];

        for (const [label, minValue, maxValue] of ranges) {
            if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
                throw new Error(`${label}: el mínimo no puede ser mayor que el máximo.`);
            }
        }
    }

    function populateFormForEdit(alert) {
        if (!alert) {
            return;
        }

        if (alertsEditingIdInput) {
            alertsEditingIdInput.value = String(alert.id);
        }
        if (alertsActivitySelect) {
            alertsActivitySelect.value = alert.activity_name || "";
        }
        if (alertsBeachSelect) {
            alertsBeachSelect.value = String(alert.beach_id || "");
        }
        const selectedWeekdays = new Set(normalizeWeekdays(alert.filters));
        if (Array.isArray(alertWeekdayCheckboxes)) {
            alertWeekdayCheckboxes.forEach((checkbox) => {
                if (!checkbox) {
                    return;
                }
                checkbox.checked = selectedWeekdays.has(Number(checkbox.value));
            });
        }
        if (alertStartHourInput) {
            alertStartHourInput.value = alert.filters?.hora_inicio ?? "";
        }
        if (alertEndHourInput) {
            alertEndHourInput.value = alert.filters?.hora_fin ?? "";
        }
        if (alertMinTemperatureInput) {
            alertMinTemperatureInput.value = alert.filters?.min_temperatura_ambiente ?? "";
        }
        if (alertMaxTemperatureInput) {
            alertMaxTemperatureInput.value = alert.filters?.max_temperatura_ambiente ?? "";
        }
        if (alertMinWindInput) {
            alertMinWindInput.value = alert.filters?.min_velocidad_viento ?? "";
        }
        if (alertMaxWindInput) {
            alertMaxWindInput.value = alert.filters?.max_velocidad_viento ?? "";
        }
        if (alertMinCloudInput) {
            alertMinCloudInput.value = alert.filters?.min_nubosidad ?? "";
        }
        if (alertMaxCloudInput) {
            alertMaxCloudInput.value = alert.filters?.max_nubosidad ?? "";
        }
        if (alertMinWaveInput) {
            alertMinWaveInput.value = alert.filters?.min_altura_oleaje ?? "";
        }
        if (alertMaxWaveInput) {
            alertMaxWaveInput.value = alert.filters?.max_altura_oleaje ?? "";
        }
        if (cancelAlertEditBtn) {
            cancelAlertEditBtn.hidden = false;
        }
        if (saveCurrentAlertBtn) {
            saveCurrentAlertBtn.textContent = "Guardar cambios";
        }
        setFeedback(`Editando alerta para ${alert.beach_label || alert.activity_label}.`, false);
        openEditor({ isEditing: true });
    }

    function renderAlerts(alerts = []) {
        if (!alertsList) {
            return;
        }

        if (!Array.isArray(alerts) || alerts.length === 0) {
            alertsList.innerHTML = `
                <div class="empty-state">
                    <p>No tienes alertas guardadas.</p>
                </div>
            `;
            return;
        }

        const formatAlertSummary = (filters = {}) => {
            const scheduleText = formatAlertSchedule(filters);
            const conditionsText = formatAlertFilters(filters);
            const parts = [scheduleText];
            if (!scheduleText || conditionsText !== "Sin condiciones extra") {
                parts.push(conditionsText);
            }
            const uniqueParts = parts.filter((part, index) => parts.indexOf(part) === index);
            return uniqueParts.join(" · ");
        };

        alertsList.innerHTML = alerts.map((alert) => `
            <article class="alerts-list-card">
                <div class="alerts-list-card-body">
                    <strong>${escapeHtml(alert.activity_label)}</strong>
                    <div>${escapeHtml(alert.beach_label || "Playa guardada")}</div>
                    <small>${escapeHtml(formatAlertSummary(alert.filters))}</small>
                    <small>
                        ${alert.last_notified_match
                            ? `Último aviso: ${new Date(alert.last_notified_match).toLocaleString("es-ES")}`
                            : "Sin avisos enviados todavía"}
                    </small>
                </div>
                <div class="alerts-list-card-actions">
                    <button class="btn-secondary alert-edit-btn" type="button" data-alert-id="${alert.id}">
                        Editar
                    </button>
                    <button class="btn-secondary alert-delete-btn" type="button" data-alert-id="${alert.id}">
                        Eliminar
                    </button>
                </div>
            </article>
        `).join("");
    }

    async function loadAlerts() {
        const alerts = await fetchJson("/api/users/me/alerts");
        lastLoadedAlerts = Array.isArray(alerts) ? alerts : [];
        renderAlerts(lastLoadedAlerts);
        return lastLoadedAlerts;
    }

    function openCreateEditor() {
        resetForm();
        setFeedback("");
        openEditor({ isEditing: false });
    }

    async function openModal() {
        if (!getCurrentUser?.()) {
            setFeedback("Debes iniciar sesión para configurar alertas.", true);
            return;
        }

        await ensureCatalogsLoaded();
        resetForm();
        closeEditor();
        setFeedback("");
        if (alertsModal) {
            alertsModal.hidden = false;
        }
        await loadAlerts();
    }

    async function saveAlert(event) {
        event?.preventDefault?.();

        const activityName = alertsActivitySelect?.value || "";
        const beachId = Number(alertsBeachSelect?.value || 0);
        const filters = buildFiltersPayload();

        if (!activityName || !beachId) {
            setFeedback("Debes seleccionar una actividad y una playa.", true);
            return;
        }

        const editingId = getEditingId();
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/api/users/me/alerts/${editingId}` : "/api/users/me/alerts";

        try {
            validateFilters(filters);
            await fetchJson(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    activity_name: activityName,
                    beach_id: beachId,
                    filters,
                }),
            });
            closeEditor({ reset: true });
            setFeedback(editingId ? "Alerta actualizada correctamente." : "Alerta guardada correctamente.", false);
            await loadAlerts();
        } catch (error) {
            setFeedback(error.message, true);
        }
    }

    async function deleteAlert(alertId) {
        try {
            await fetchJson(`/api/users/me/alerts/${alertId}`, {
                method: "DELETE",
            });
            if (getEditingId() === Number(alertId)) {
                closeEditor({ reset: true, preservePreferredActivity: false });
            }
            setFeedback("Alerta eliminada.", false);
            await loadAlerts();
        } catch (error) {
            setFeedback(error.message, true);
        }
    }

    async function editAlert(alertId) {
        const selectedAlert = lastLoadedAlerts.find((alert) => Number(alert.id) === Number(alertId));
        if (!selectedAlert) {
            const alerts = await loadAlerts();
            const reloadedAlert = alerts.find((alert) => Number(alert.id) === Number(alertId));
            if (!reloadedAlert) {
                setFeedback("No se pudo cargar la alerta para editarla.", true);
                return;
            }
            populateFormForEdit(reloadedAlert);
            return;
        }

        populateFormForEdit(selectedAlert);
    }

    openAlertsModalBtn?.addEventListener("click", openModal);
    closeAlertsModalBtn?.addEventListener("click", closeModal);
    openAlertsEditorBtn?.addEventListener("click", openCreateEditor);
    closeAlertsEditorBtn?.addEventListener("click", () => {
        closeEditor({ reset: true });
        setFeedback("");
    });
    alertsEditorBackdrop?.addEventListener("click", () => {
        closeEditor({ reset: true });
        setFeedback("");
    });
    cancelAlertEditBtn?.addEventListener("click", () => {
        closeEditor({ reset: true });
        setFeedback("");
    });
    alertsForm?.addEventListener("submit", saveAlert);
    alertsList?.addEventListener("click", async (event) => {

        const editButton = event.target.closest(".alert-edit-btn");
        if (editButton) {
            await editAlert(editButton.dataset.alertId);
            return;
        }

        const deleteButton = event.target.closest(".alert-delete-btn");
        if (deleteButton) {
            await deleteAlert(deleteButton.dataset.alertId);
        }
    });

    return {
        closeModal,
        openModal,
        syncFormDefaults: () => {
            populateActivitySelect();
            populateBeachSelect();
        },
        isEditorOpen,
    };
}
