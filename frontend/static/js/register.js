const registerForm = document.getElementById("registerForm");
const statusMessage = document.getElementById("statusMessage");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                statusMessage.style.color = "var(--success)";
                statusMessage.textContent = "¡Cuenta creada! Redirigiendo al login...";

                setTimeout(() => {
                    window.location.href = "/login";
                }, 2000);
            } else {
                statusMessage.style.color = "#d9534f";
                statusMessage.textContent = data.detail || "Error al crear la cuenta.";
            }
        } catch (error) {
            statusMessage.style.color = "#d9534f";
            statusMessage.textContent = "Error de conexión con el servidor.";
        }
    });
}