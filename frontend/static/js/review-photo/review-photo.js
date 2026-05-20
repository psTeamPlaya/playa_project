/**
 * Opens the photo upload and review modal.
 * Handles image selection, compression, GPS verification, and AI status tracking.
 */
export async function openReviewPhotoModal() {
    const existingModal = document.getElementById("reviewPhotoModal");
    if (existingModal) existingModal.remove();

    const modalWrapper = document.createElement("div");
    modalWrapper.id = "reviewPhotoModal";
    modalWrapper.className = "modal-overlay";

    modalWrapper.innerHTML = `
    <div class="modal-backdrop" id="reviewPhotoContent">
            <button class="modal-close" id="closeReviewPhotoModal" type="button">&times;</button>
            <div class="review-photo-layout" id="modalMainLayout">
                <input type="file" id="reviewPhotoFileInput" accept="image/*" capture="environment" style="display: none;" />
                <div class="photo" id="reviewPhotoZone">Click here or tap Upload to add a photo</div>
                <button class="btn-secondary" id="reviewPhotoActionBtn" type="button">Upload photo</button>
            </div>
    </div>`;

    document.body.appendChild(modalWrapper);

    const fileInput = modalWrapper.querySelector("#reviewPhotoFileInput");
    const photoZone = modalWrapper.querySelector("#reviewPhotoZone");
    const actionBtn = modalWrapper.querySelector("#reviewPhotoActionBtn");
    const modalContent = modalWrapper.querySelector("#reviewPhotoContent");
    const mainLayout = modalWrapper.querySelector("#modalMainLayout");

    let optimizedFileBlob = null;
    let countdownInterval = null;
    let apiCheckInterval = null;

    // Handle modal interaction events
    modalWrapper.addEventListener("click", (e) => {
        const closeBtn = e.target.closest("#closeReviewPhotoModal");
        
        if (closeBtn || e.target === modalWrapper) {
            // Clean up intervals to prevent memory leaks if modal is closed early
            clearInterval(countdownInterval);
            clearInterval(apiCheckInterval);
            modalWrapper.remove();
            return;
        }

        if (e.target === photoZone || (e.target === actionBtn && !optimizedFileBlob)) {
            fileInput.click();
            return;
        }

        if (e.target === actionBtn && optimizedFileBlob && !actionBtn.disabled) {
            sendToVerificationAPI(optimizedFileBlob);
        }
    });

    // Handle file selection and image compression
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image file.");
            return;
        }

        actionBtn.textContent = "Optimizing image...";
        actionBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                compressImage(img, 1024, 0.85, (blob) => {
                    optimizedFileBlob = blob;

                    photoZone.style.backgroundImage = `url('${URL.createObjectURL(blob)}')`;
                    photoZone.style.backgroundSize = "cover";
                    photoZone.style.backgroundPosition = "center";
                    photoZone.textContent = ""; 
                    
                    actionBtn.textContent = "Verify & Submit Location";
                    actionBtn.disabled = false;
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    /**
     * Resizes and compresses image using Canvas API.
     */
    function compressImage(img, maxDimension, quality, callback) {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            }
        } else {
            if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
            callback(blob);
        }, "image/jpeg", quality);
    }

    /**
     * Switches modal view to status tracking and deletion grace period.
     */
    function switchToStatusView(previewBase64, beachId, photoHash) {
        let timeLeft = 180; // 3-minute grace period

        mainLayout.style.display = "none";

        const statusLayout = document.createElement("div");
        statusLayout.className = "review-status-layout";
        statusLayout.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3 style="margin-bottom: 15px; color: #333;">Procesando tu foto</h3>
                
                <div style="position: relative; width: 180px; height: 180px; margin: 0 auto 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    <img src="${previewBase64}" style="width: 100%; height: 100%; object-fit: cover;" />
                    <div id="aiStatusBadge" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: #fff; font-size: 0.8rem; padding: 6px 0;">
                        ⏳ Analizando por AI...
                    </div>
                </div>

                <p style="font-size: 0.9rem; color: #666; margin-bottom: 20px;">
                    Tu foto está en la cola de verificación. Tienes un periodo de gracia para cancelar la publicación si lo deseas.
                </p>

                <button type="button" id="undoPhotoBtn" style="background: #d9534f; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 4px; cursor: pointer; width: 100%; transition: background 0.2s;">
                    Cancelar y eliminar (${timeLeft}s)
                </button>
            </div>
        `;
        modalContent.appendChild(statusLayout);

        const undoBtn = statusLayout.querySelector("#undoPhotoBtn");
        const aiStatusBadge = statusLayout.querySelector("#aiStatusBadge");

        // Grace period countdown
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                undoBtn.disabled = true;
                undoBtn.style.background = "#ccc";
                undoBtn.textContent = "Tiempo de cancelación expirado";
            } else {
                undoBtn.textContent = `Cancelar y eliminar (${timeLeft}s)`;
            }
        }, 1000);

        // Deletion action
        undoBtn.addEventListener("click", async () => {
            if (!confirm("¿Seguro que quieres cancelar la publicación de esta foto?")) return;

            undoBtn.disabled = true;
            undoBtn.textContent = "Eliminando...";

            try {
                const formData = new FormData();
                formData.append("beach_id", beachId);
                formData.append("photo_hash", photoHash);

                const response = await fetch("/api/review-photo/delete-my-photo", {
                    method: "POST",
                    body: formData
                });

                if (response.ok) {
                    alert("Publicación cancelada con éxito.");
                    clearInterval(countdownInterval);
                    clearInterval(apiCheckInterval);
                    modalWrapper.remove(); 
                } else {
                    const err = await response.json();
                    alert(err.detail || "Error al eliminar.");
                    undoBtn.disabled = false;
                }
            } catch (error) {
                console.error(error);
                undoBtn.disabled = false;
            }
        });

        // Periodic status polling
        apiCheckInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/review-photo/check-status/${beachId}/${photoHash}`);
                if (res.ok) {
                    const data = await res.json();

                    if (data.status === "approved") {
                        aiStatusBadge.style.background = "rgba(40, 167, 69, 0.9)";
                        aiStatusBadge.textContent = "✅ ¡Foto aceptada y publicada!";
                    } 
                    else if (data.status === "rejected") {
                        aiStatusBadge.style.background = "rgba(217, 83, 79, 0.9)";
                        aiStatusBadge.textContent = "❌ Foto rechazada por la IA (Entorno inválido)";

                        undoBtn.disabled = false;
                        undoBtn.style.background = "#666";
                        undoBtn.textContent = "Cerrar ventana";
                    }

                    clearInterval(countdownInterval); 
                    clearInterval(apiCheckInterval);
                }
            } catch (err) {
                console.error("Error checking photo status:", err);
            }
        }, 1000);
    }

    /**
     * Verifies the image through backend AI processing.
     */
    async function sendToVerificationAPI(fileBlob) {
        actionBtn.textContent = "Acquiring GPS location...";
        actionBtn.disabled = true;
        
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            actionBtn.disabled = false;
            return;
        }
    
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
            
                actionBtn.textContent = "Generating cryptographic hash (MD5)...";
            
                const reader = new FileReader();
                reader.readAsArrayBuffer(fileBlob);
                reader.onloadend = async function () {
                    const arrayBuffer = reader.result;
                    
                    if (!window.SparkMD5) {
                        alert("Cryptographic library loading. Please try again in a second.");
                        actionBtn.disabled = false;
                        return;
                    }
                    const clientPhotoHash = SparkMD5.ArrayBuffer.hash(arrayBuffer);
                
                    actionBtn.textContent = "Processing Anti-Spoofing & CLIP...";
                
                    const formData = new FormData();
                    formData.append("img", fileBlob, "photo.jpg");
                    formData.append("lat", userLat);
                    formData.append("lon", userLon);
                    formData.append("client_photo_hash", clientPhotoHash);
                
                    try {
                        const response = await fetch("/api/review-photo/verify", {
                            method: "POST",
                            body: formData
                        });
                    
                        const result = await response.json();
                    
                        if (response.ok && result.status === "received") {
                            const previewReader = new FileReader();
                            previewReader.onloadend = function() {
                                switchToStatusView(previewReader.result, result.beach_id, clientPhotoHash);
                            };
                            previewReader.readAsDataURL(fileBlob);
                        
                        } else {
                            alert(`Error: ${result.detail || "Verification failed."}`);
                            actionBtn.textContent = "Verify & Submit Location";
                            actionBtn.disabled = false;
                        }
                    } catch (error) {
                        console.error("API Error:", error);
                        alert("Network error.");
                        actionBtn.disabled = false;
                    }
                };
            },
            (error) => {
                alert("Location access denied.");
                actionBtn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
}