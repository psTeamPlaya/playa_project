import { authFetch } from "../api/auth-fetch.js";
import { abrirConfiguradorInicial, aplicarVisibilidadFiltros } from "../preferences/preferences-ui.js";
import { iniciarAsistente } from "../preferences/onboarding-ui.js";

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
    let currentUser = null;

    async function loadCurrentUser() {
        const token = localStorage.getItem("token");
        if (!token) {
            currentUser = null;
            if (preferencesUserInfo) preferencesUserInfo.textContent = "";
            return null;
        }
        try {
            const response = await authFetch("/auth/me");
            if (!response.ok) {
                localStorage.removeItem("token");
                currentUser = null;
                if (preferencesUserInfo) {
                    preferencesUserInfo.textContent = "";
                }
                actualizarBotonesSesion();
                return null;
            }
            const data = await response.json();
            currentUser = data;

            if (preferencesUserInfo) {
                preferencesUserInfo.textContent = data.email;
            }

            try {
                const prefResponse = await authFetch("/api/users/me/filters");
                if (prefResponse.ok) {
                    const filtrosNube = await prefResponse.json();
                    console.log("🔍 Filtros recibidos del servidor:", filtrosNube);
                    localStorage.setItem("preferences.userFiltersConfig", JSON.stringify(filtrosNube));

                    /*const esUsuarioNuevo = Object.keys(filtrosNube).length === 0;*/
                    const tieneFiltros = filtrosNube && Object.keys(filtrosNube).length > 0;
                    console.log("❓ ¿Tiene filtros guardados?:", tieneFiltros);

                    if (!tieneFiltros) {
                        iniciarAsistente(async (configFinal) => {
                            const response = await authFetch("/api/users/me/filters", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(configFinal)
                            });

                            if (response.ok) {
                                localStorage.setItem("preferences.userFiltersConfig", JSON.stringify(configFinal));
                                aplicarVisibilidadFiltros(true);
                            }
                        });
                    } else {
                        const checkPersonalizados = document.getElementById('rememberSchedulePreference');
                        if (typeof aplicarVisibilidadFiltros === 'function') {
                            aplicarVisibilidadFiltros(checkPersonalizados?.checked);
                        }
                    }
                }
            } catch (prefError) {
                console.error("Error al sincronizar filtros desde el servidor:", prefError);
            }

            return data;

        } catch (error) {
            console.error("Failed to load user");
            currentUser = null;
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
        onSessionChange?.(estaLogueado, currentUser);

        if (estaLogueado) {
            const checkPreferencias = document.getElementById('rememberSchedulePreference');
            aplicarVisibilidadFiltros(checkPreferencias?.checked ?? false);
        } else {
            const appShell = document.querySelector('.app-shell');
            if (appShell) appShell.style.gridTemplateColumns = '';
        }

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
        localStorage.removeItem("preferences.userFiltersConfig");
        if (preferencesUserInfo) preferencesUserInfo.textContent = "";

        const appShell = document.querySelector('.app-shell');
        if (appShell) appShell.style.gridTemplateColumns = '';

        await loadCurrentUser();
        onLogout?.();
        actualizarBotonesSesion();
        onClosePreferences?.();
    }

    async function toggleAuthAction() {
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
            toggleAuthAction();
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
        logout,
        getCurrentUser: () => currentUser
    };
}
