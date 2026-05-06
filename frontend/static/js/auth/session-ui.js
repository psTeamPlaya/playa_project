import { authFetch } from "../api/auth-fetch.js";

export function initSessionUI({
    preferencesUserInfo,
    preferencesPanel,
    authActionBtn,
    authActionIcon,
    filtersSidebar,
    preferencesLogoutBtn,
    onOpenPreferences,
    onClosePreferences,
    onOpenLogin,
    onSessionChange,
    onLogout
}) {
    async function loadCurrentUser() {
        const token = localStorage.getItem("token");
        if (!token) {
            if (preferencesUserInfo) preferencesUserInfo.textContent = "";
            return null;
        }
        try {
            const response = await authFetch("/auth/me");
            if (!response.ok) {
                localStorage.removeItem("token");
                if (preferencesUserInfo) {
                    preferencesUserInfo.textContent = "";
                }
                actualizarBotonesSesion();
                return null;
            }
            const data = await response.json();
            if (preferencesUserInfo) {
                preferencesUserInfo.textContent = data.email;
            }
            return data;
        } catch (error) {
            console.error("Failed to load user");
            return null;
        }
    }

    function actualizarBotonesSesion() {
        const token = localStorage.getItem("token");
        const estaLogueado = Boolean(token);

        document.body.classList.toggle("is-authenticated", estaLogueado);
        document.querySelectorAll(".loggedIn").forEach(element => {
            element.classList.toggle("hidden", !estaLogueado);
        });
        if (filtersSidebar) {
            filtersSidebar.hidden = !estaLogueado;
            filtersSidebar.classList.toggle("hidden", !estaLogueado);
        }
        onSessionChange?.(estaLogueado);
        if (!authActionBtn || !authActionIcon) return;
        if (estaLogueado) {
            authActionBtn.hidden = false;
            authActionBtn.setAttribute("aria-label", "Preferencias");
            authActionIcon.className = "bi bi-person-circle";
            return;
        }
        authActionIcon.className = "bi bi-box-arrow-in-right";
        authActionBtn.hidden = false;
        authActionBtn.setAttribute("aria-label", "Acceder");
        onClosePreferences?.();
    }

    async function logout() {
        localStorage.removeItem("token");
        await loadCurrentUser();
        onLogout?.();
        actualizarBotonesSesion();
        onClosePreferences?.();
    }

    async function toggleAuthAction(preferencesPanel) {
        if (localStorage.getItem("token")) {
            if (!preferencesPanel) return;
            if (preferencesPanel.hidden) {
                onOpenPreferences?.();
                return;
            }
            onClosePreferences?.();
            return;
        }
        onOpenLogin?.();
    }

    if (authActionBtn) {
        authActionBtn.addEventListener("click", () => {
            toggleAuthAction(preferencesPanel);
        });
    }

    if (preferencesLogoutBtn) {
        preferencesLogoutBtn.addEventListener("click", () => {
            logout();
        });
    }

    return {
        loadCurrentUser,
        actualizarBotonesSesion,
        logout
    };
}
