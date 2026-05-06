import { login } from "./login.js";
import { registerUser } from "./register.js";

export function initAuthModal({
    loginModalEl,
    closeLoginModalBtn,
    loginModalForm,
    loginEmailInput,
    loginPasswordInput,
    confirmPasswordInput,
    confirmPasswordGroup,
    loginErrorMessageEl,
    authSubmitBtn,
    authModeHint,
    toggleAuthModeBtn
}) {
    let authMode = "login";

    function mostrarMensajeAuth(mensaje, tipo = "error") {
        if (!loginErrorMessageEl) return;
        loginErrorMessageEl.textContent = mensaje;
        loginErrorMessageEl.classList.remove("success", "error");
        loginErrorMessageEl.classList.add(tipo);
    }

    function aplicarModoAuth() {
        if (!authModeHint || !toggleAuthModeBtn || !authSubmitBtn) return;
        const titleEl = document.getElementById("loginModalTitle");

        if (authMode === "register") {
            if (titleEl) titleEl.textContent = "Registrarse";
            authSubmitBtn.textContent = "Crear cuenta";
            authModeHint.textContent = "\u00bfYa tienes cuenta?";
            toggleAuthModeBtn.textContent = "Iniciar sesion";
            if (confirmPasswordGroup) {
                confirmPasswordGroup.style.display = "block";
            }
            if (confirmPasswordInput) {
                confirmPasswordInput.required = true;
            }
            return;
        }
        if (titleEl) titleEl.textContent = "Iniciar sesion";
        authSubmitBtn.textContent = "Entrar a mi cuenta";
        authModeHint.textContent = "\u00bfTodav\u00eda no tienes cuenta?";
        toggleAuthModeBtn.textContent = "Registrarse";
        if (confirmPasswordGroup) {
            confirmPasswordGroup.style.display = "none";
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.required = false;
            confirmPasswordInput.value = "";
        }
    }

    function abrirModalLogin() {
        if (!loginModalEl) return;
        authMode = "login";
        aplicarModoAuth();
        loginModalEl.hidden = false;
        mostrarMensajeAuth("", "error");
        loginModalForm?.reset();
        setTimeout(() => loginEmailInput?.focus(), 0);
    }

    function cerrarModalLogin() {
        if (!loginModalEl) return;
        loginModalEl.hidden = true;
        mostrarMensajeAuth("", "error");
        loginModalForm?.reset();
        if (confirmPasswordGroup) {
            confirmPasswordGroup.style.display = "none";
        }
    }

    async function handleSubmit(event, onAuthSuccess) {
        event.preventDefault();
        const email = loginEmailInput?.value.trim() || "";
        const password = loginPasswordInput?.value || "";

        if (!email || !password) {
            mostrarMensajeAuth("Debes indicar correo y contrase\u00f1a.");
            return;
        }
        if (authMode === "register") {
            const confirmPassword = confirmPasswordInput?.value ?? "";
            if (password !== confirmPassword) {
                mostrarMensajeAuth("Las contrase\u00f1as no coinciden.");
                return;
            }
        }
        mostrarMensajeAuth(
            authMode === "register" ? "Creando cuenta..." : "Accediendo...",
            "success"
        );
        try {
            if (authMode === "register") {
                await registerUser(email, password);
                authMode = "login";
                aplicarModoAuth();
                mostrarMensajeAuth("Cuenta creada. Ya puedes iniciar sesion.", "success");
                if (loginPasswordInput) {
                    loginPasswordInput.value = "";
                }
                if (confirmPasswordInput) {
                    confirmPasswordInput.value = "";
                }
                return;
            }

            const data = await login(email, password);
            localStorage.setItem("token", data.access_token);
            await onAuthSuccess?.(data);
            cerrarModalLogin();
        } catch (error) {
            console.error(error);
            mostrarMensajeAuth(error.message || "No se pudo completar la operacion.");
        }
    }

    if (closeLoginModalBtn) {
        closeLoginModalBtn.addEventListener("click", cerrarModalLogin);
    }

    if (loginModalEl) {
        loginModalEl.addEventListener("click", (event) => {
            if (event.target === loginModalEl) {
                cerrarModalLogin();
            }
        });
    }

    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.addEventListener("click", () => {
            authMode = authMode === "login" ? "register" : "login";
            aplicarModoAuth();
            mostrarMensajeAuth("", "error");
            if (loginPasswordInput) {
                loginPasswordInput.value = "";
            }
        });
    }

    return {
        abrirModalLogin,
        cerrarModalLogin,
        handleSubmit
    };
}
