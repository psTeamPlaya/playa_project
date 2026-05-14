import { authFetch } from "../api/auth-fetch.js";


function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatAlertFilters(filters = {}) {
    const entries = Object.entries(filters);
    if (entries.length === 0) {
        return "Sin filtros extra";
    }

    return entries
        .map(([key, value]) => `${key}: ${value}`)
        .join(" · ");
}

export function initAlertsUI({
    openAlertsModalBtn,
    alertsModal,
    closeAlertsModalBtn,
    alertsList,
    alertsFeedback,
    saveCurrentAlertBtn,
    alertSummaryActivity,
    alertSummaryLocation,
    alertSummaryFilters,
    getCurrentUser,
    getAlertDraft
}) {
    function setFeedback(message = "", isError = false) {
        if (!alertsFeedback) {
            return;
        }

        alertsFeedback.textContent = message;
        alertsFeedback.classList.toggle("error", Boolean(message && isError));
        alertsFeedback.classList.toggle("success", Boolean(message && !isError));
    }

    function closeModal() {
        if (alertsModal) {
            alertsModal.hidden = true;
        }
    }

    async function fetchJson(url, options = {}) {
        const response = await authFetch(url, options);
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.detail || "No se pudo completar la operación.");
        }
        return response.json();
    }

    function renderAlertDraftSummary() {
        const draft = getAlertDraft?.();
        if (!draft) {
            if (alertSummaryActivity) alertSummaryActivity.textContent = "Selecciona una actividad";
            if (alertSummaryLocation) alertSummaryLocation.textContent = "Selecciona una ubicación y rango";
            if (alertSummaryFilters) alertSummaryFilters.textContent = "Configura los filtros que quieras guardar";
            saveCurrentAlertBtn?.setAttribute("disabled", "disabled");
            return null;
        }

        if (alertSummaryActivity) {
            alertSummaryActivity.textContent = draft.activityLabel || draft.activityName || "Selecciona una actividad";
        }
        if (alertSummaryLocation) {
            alertSummaryLocation.textContent = draft.locationLabel || "Selecciona una ubicación y rango";
        }
        if (alertSummaryFilters) {
            alertSummaryFilters.textContent = formatAlertFilters(draft.filters);
        }

        const isValid = Boolean(draft.activityName && draft.selectedCoords && draft.range);
        if (saveCurrentAlertBtn) {
            saveCurrentAlertBtn.toggleAttribute("disabled", !isValid);
        }
        return draft;
    }

    function renderAlerts(alerts = []) {
        if (!alertsList) {
            return;
        }

        if (!Array.isArray(alerts) || alerts.length === 0) {
            alertsList.innerHTML = `
                <div class="empty-state">
                    No tienes alertas guardadas.
                </div>
            `;
            return;
        }

        alertsList.innerHTML = alerts.map((alert) => `
            <article class="alerts-list-card">
                <div class="alerts-list-card-body">
                    <strong>${escapeHtml(alert.activity_label)}</strong>
                    <div>${escapeHtml(alert.location_label || "Ubicación guardada")}</div>
                    <small>${escapeHtml(formatAlertFilters(alert.filters))}</small>
                    <small>
                        ${alert.last_notified_match
                            ? `Último aviso: ${new Date(alert.last_notified_match).toLocaleString("es-ES")}`
                            : "Sin avisos enviados todavía"}
                    </small>
                </div>
                <button class="btn-secondary alert-delete-btn" type="button" data-alert-id="${alert.id}">
                    Eliminar
                </button>
            </article>
        `).join("");
    }

    async function loadAlerts() {
        const alerts = await fetchJson("/api/users/me/alerts");
        renderAlerts(alerts);
        return alerts;
    }

    async function openModal() {
        if (!getCurrentUser?.()) {
            setFeedback("Debes iniciar sesión para configurar alertas.", true);
            return;
        }

        renderAlertDraftSummary();
        setFeedback("");
        if (alertsModal) {
            alertsModal.hidden = false;
        }
        await loadAlerts();
    }

    async function saveCurrentAlert() {
        const draft = renderAlertDraftSummary();
        if (!draft || !draft.activityName || !draft.selectedCoords) {
            setFeedback("Debes seleccionar actividad, ubicación y rango antes de guardar la alerta.", true);
            return;
        }

        const [longitude, latitude] = draft.selectedCoords;
        try {
            await fetchJson("/api/users/me/alerts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    activity_name: draft.activityName,
                    filters: draft.filters,
                    latitude,
                    longitude,
                    radio_km: Number(draft.range),
                    location_label: draft.locationLabel
                })
            });
            setFeedback("Alerta guardada correctamente.", false);
            await loadAlerts();
        }
        catch (error) {
            setFeedback(error.message, true);
        }
    }

    async function deleteAlert(alertId) {
        try {
            await fetchJson(`/api/users/me/alerts/${alertId}`, {
                method: "DELETE"
            });
            setFeedback("Alerta eliminada.", false);
            await loadAlerts();
        }
        catch (error) {
            setFeedback(error.message, true);
        }
    }

    openAlertsModalBtn?.addEventListener("click", openModal);
    closeAlertsModalBtn?.addEventListener("click", closeModal);
    saveCurrentAlertBtn?.addEventListener("click", saveCurrentAlert);
    alertsList?.addEventListener("click", async (event) => {
        const button = event.target.closest(".alert-delete-btn");
        if (!button) {
            return;
        }
        await deleteAlert(button.dataset.alertId);
    });

    return {
        closeModal,
        openModal,
        refreshDraftSummary: renderAlertDraftSummary,
    };
}
