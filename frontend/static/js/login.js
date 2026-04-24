async function handleLogin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorDiv = document.getElementById("errorMessage");

    errorDiv.textContent = "";

    try {
        const response = await fetch("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("token", data.access_token);

            window.location.href = "/";
        } else {
            errorDiv.textContent = data.detail || "Login fallido. Revisa tus credenciales.";
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        errorDiv.textContent = "No se pudo conectar con el servidor.";
    }
}