import { login } from "./login.js";
import { registerUser } from "./register.js";
import { t } from "../languages/i18n.js";

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
    toggleAuthModeBtn,
    onAuthSuccess
}) {
    let authMode = "login";
    let onAuthSuccessCallback = onAuthSuccess || null;

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
            if (titleEl) titleEl.textContent = t("auth.register");
            authSubmitBtn.textContent = t("auth.create_account");
            authModeHint.textContent = t("auth.already_have_account");
            toggleAuthModeBtn.textContent = t("auth.login");
            if (confirmPasswordGroup) {
                confirmPasswordGroup.style.display = "block";
            }
            if (confirmPasswordInput) {
                confirmPasswordInput.required = true;
            }
            return;
        }

        if (titleEl) titleEl.textContent = t("auth.login");
        authSubmitBtn.textContent = t("auth.enter");
        authModeHint.textContent = t("auth.no_account_question");
        toggleAuthModeBtn.textContent = t("auth.register");
        if (confirmPasswordGroup) {
            confirmPasswordGroup.style.display = "none";
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.required = false;
            confirmPasswordInput.value = "";
        }
    }

    function abrirModalLogin(callback) {
        if (!loginModalEl) return;
        if (callback) {
            onAuthSuccessCallback = callback;
        }
        authMode = "login";
        aplicarModoAuth();
        loginModalEl.hidden = false;
        mostrarMensajeAuth("", "error");
        loginModalForm?.reset();
        setTimeout(() => loginEmailInput?.focus(), 0);

        initGoogleSignIn();
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

    async function handleSubmit(event, onAuthSuccessHandler) {
        event.preventDefault();
        const email = loginEmailInput?.value.trim() || "";
        const password = loginPasswordInput?.value || "";

        if (!email || !password) {
            mostrarMensajeAuth(t("auth.errors.email_password_required"));
            return;
        }

        if (authMode === "register") {
            const confirmPassword = confirmPasswordInput?.value ?? "";
            if (password !== confirmPassword) {
                mostrarMensajeAuth(t("auth.errors.passwords_mismatch"));
                return;
            }
        }

        mostrarMensajeAuth(
            authMode === "register" ? t("auth.creating_account") : t("auth.signing_in"),
            "success"
        );

        try {
            if (authMode === "register") {
                await registerUser(email, password);
                authMode = "login";
                aplicarModoAuth();
                mostrarMensajeAuth(t("auth.account_created"), "success");
                if (loginPasswordInput) {
                    loginPasswordInput.value = "";
                }
                if (confirmPasswordInput) {
                    confirmPasswordInput.value = "";
                }
                return;
            }

            const data = await login(email, password);
            sessionStorage.setItem("token", data.access_token);
            await onAuthSuccessHandler?.(data);
            cerrarModalLogin();
        } catch (error) {
            console.error(error);
            mostrarMensajeAuth(error.message || t("auth.errors.generic"));
        }
    }

    window.handleGoogleLogin = async (response) => {
        mostrarMensajeAuth(t("auth.signing_in_google"), "success");
        try {
            const res = await fetch("/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || t("auth.errors.google_login"));
            }

            const data = await res.json();
            sessionStorage.setItem("token", data.access_token);
            await onAuthSuccessCallback?.(data);
            cerrarModalLogin();
        } catch (error) {
            console.error(error);
            mostrarMensajeAuth(error.message || t("auth.errors.google_login"));
        }
    };

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

    let googleInitialized = false;

    function initGoogleSignIn() {
        if (googleInitialized) return;
        const btnContainer = document.getElementById("googleSignInBtn");
        const clientId = btnContainer?.dataset.clientId;
        if (!clientId || clientId.includes("{{")) return;
        if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
                client_id: clientId,
                ux_mode: "popup",
                callback: window.handleGoogleLogin,
                auto_select: false
            });
            window.google.accounts.id.renderButton(btnContainer, {
                type: "standard",
                size: "large",
                theme: "outline",
                text: "signin_with",
                locale: "es",
                width: "250"
            });
            googleInitialized = true;
        }
    }

    initGoogleSignIn();

    return {
        abrirModalLogin,
        cerrarModalLogin,
        handleSubmit,
        initGoogleSignIn
    };
}
