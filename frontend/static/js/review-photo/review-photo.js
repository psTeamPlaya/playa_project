export async function openReviewPhotoModal() {
    const existingModal = document.getElementById("reviewPhotoModal");
    if (existingModal) existingModal.remove();

    const modalWrapper = document.createElement("div");
    modalWrapper.id = "reviewPhotoModal";
    modalWrapper.className = "modal-overlay";

    modalWrapper.innerHTML = `
    <div class="modal-backdrop" id="reviewPhotoContent">
            <button class="modal-close" id="closeReviewPhotoModal" type="button">&times;</button>
            <div class="review-photo-layout">
                <input type="file" id="reviewPhotoFileInput" accept="image/*" capture="environment" style="display: none;" />
                <div class="photo" id="reviewPhotoZone">Click here or tap Upload to add a photo</div>
                <button class="btn-secondary" id="reviewPhotoActionBtn" type="button">Upload photo</button>
            </div>
    </div>`;

    document.body.appendChild(modalWrapper);

    const fileInput = modalWrapper.querySelector("#reviewPhotoFileInput");
    const photoZone = modalWrapper.querySelector("#reviewPhotoZone");
    const actionBtn = modalWrapper.querySelector("#reviewPhotoActionBtn");

    let optimizedFileBlob = null;

    modalWrapper.addEventListener("click", (e) => {
        const closeBtn = e.target.closest("#closeReviewPhotoModal");
        
        if (closeBtn || e.target === modalWrapper) {
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

    async function sendToVerificationAPI(fileBlob) {
        actionBtn.textContent = "Acquiring GPS location...";
        actionBtn.disabled = true;

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            actionBtn.textContent = "Verify & Submit Location";
            actionBtn.disabled = false;
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                actionBtn.textContent = "Processing Anti-Spoofing & CLIP...";

                const formData = new FormData();
                formData.append("img", fileBlob, "photo.jpg");
                
                formData.append("lat", userLat);
                formData.append("lon", userLon);

                try {
                    const response = await fetch("/api/review-photo/verify", {
                        method: "POST",
                        body: formData
                    });

                    const result = await response.json();

                    if (response.ok && result.verified) {
                        alert("Location successfully verified by AI! Enjoy the beach.");
                        modalWrapper.remove();
                    } else {
                        alert(`Verification failed: ${result.message || "Invalid location or image spoofing detected."}`);
                        actionBtn.textContent = "Verify & Submit Location";
                        actionBtn.disabled = false;
                    }
                } catch (error) {
                    console.error("API Error:", error);
                    alert("Network error during image verification.");
                    actionBtn.textContent = "Verify & Submit Location";
                    actionBtn.disabled = false;
                }
            },
            (error) => {
                console.error("Geolocation Error:", error);
                let errorMsg = "Could not get your location.";
                
                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = "Please enable GPS and allow location access to verify.";
                }
                
                alert(errorMsg);
                actionBtn.textContent = "Verify & Submit Location";
                actionBtn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 1000000,
                maximumAge: 0
            }
        );
    }
}