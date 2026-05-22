import { authFetch } from "../api/auth-fetch.js";
import { t } from "../languages/i18n.js";

const resultsContainer = document.getElementById("resultsContainer");
const favoritesResultsContainer = document.getElementById("favoritesResultsContainer");

resultsContainer.addEventListener("click", handleReviewClick);
favoritesResultsContainer.addEventListener("click", handleReviewClick);

let currentBeachForReviews = null;
let sessionUIController;

export function initReviewsModule(sessionUI){
    sessionUIController = sessionUI;
}

async function handleReviewClick(event) {
    const btn = event.target.closest(".rating-badge");
    if (!btn) return;

    const user = sessionUIController?.getCurrentUser?.();
    console.log("Usuario: ", user);
    if (!user) return;

    event.preventDefault();
    event.stopPropagation();

    const beachId = btn.dataset.id || btn.dataset.ratingId;
    currentBeachForReviews = beachId;

    const modal = document.getElementById("reviewsModal");
    const list = document.getElementById("reviewsList");

    modal.hidden = false;
    list.innerHTML = `<div class='empty-state'>${t("reviews.loading")}</div>`;

    try {
        const res = await authFetch(`/reviews/beach/${beachId}`);
        const reviews = await res.json();
        renderReviews(reviews);
    } 
    catch (err) {
        list.innerHTML = `<div class='empty-state'>${t("reviews.load_error")}</div>`;
        console.log(err);
    }
}

document.getElementById("reviewsList").addEventListener("click", async (event) => {
    const btn = event.target.closest(".delete-review-btn");
    if (!btn) return;

    const reviewId = btn.dataset.id;

    const user = sessionUIController?.getCurrentUser?.();
    if (!user) return;

    const confirmDelete = confirm("¿Seguro que quieres borrar esta reseña?");
    if (!confirmDelete) return;

    try {
        await authFetch(`/reviews/${reviewId}`, {
            method: "DELETE"
        });

        // Recargar reseñas
        const res = await authFetch(`/reviews/beach/${currentBeachForReviews}`);
        const reviews = await res.json();
        renderReviews(reviews);
    } 
    catch (err) {
        alert("Error al eliminar la reseña");
    }
});

function renderReviews(reviews) {
    const list = document.getElementById("reviewsList");
    const user = sessionUIController?.getCurrentUser?.();

    if (!reviews.length) {
        list.innerHTML = `<div class='empty-state'>${t("reviews.empty")}</div>`;
        return;
    }

    list.innerHTML = reviews.map(r => {
        const isOwner = user && user.email === r.email;
        
        const reportActionHtml = !isOwner && user 
            ? `<button class="review-action report-review-btn" data-id="${r.id}" title="Denunciar esta reseña">⚠️ Reportar</button>` 
            : '';

        return `
            <div class="review-item" data-id="${r.id}">
                <div class="review-item-header">
                    <strong>${r.email}</strong>
                    <div class="review-actions-meta">
                        <span class="review-rating-badge">⭐ ${r.rating}</span>
                        ${reportActionHtml}
                    </div>
                </div>
                <div class="review-item-body">
                    <p>${r.content}</p>
                </div>
            </div>
        `;
    }).join("");
}

const reviewForm = document.getElementById("reviewForm");

reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentBeachForReviews) return;

    const content = document.getElementById("reviewText").value;
    try {
        await authFetch("/reviews/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                beach_id: Number(currentBeachForReviews),
                rating: selectedRating,
                content
            })
        });
        document.getElementById("reviewText").value = "";

        // Recargar lista
        const res = await authFetch(`/reviews/beach/${currentBeachForReviews}`);
        const reviews = await res.json();
        renderReviews(reviews);
    } 
    catch (err) {
        alert("Error al enviar la reseña");
    }
});

document.getElementById("openConfigLink").addEventListener("click", () => {
  document.getElementById("filterConfigModal").hidden = false;
});

let selectedRating = 5;
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#starsInput span").forEach(star => {
    star.addEventListener("click", () => {
      selectedRating = Number(star.dataset.value);

      document.querySelectorAll("#starsInput span").forEach(s => {
        s.classList.toggle("active", Number(s.dataset.value) <= selectedRating);
      });
    });
  });
});

document.getElementById("closeReviewsModal").addEventListener("click", () => {
    document.getElementById("reviewsModal").hidden = true;
    currentBeachForReviews = null;
});

document.getElementById("reviewsList").addEventListener("click", async (event) => {
    const reportBtn = event.target.closest(".report-review-btn");
    if (!reportBtn) return;

    const reviewId = reportBtn.dataset.id;

    const reason = prompt("Por favor, introduce el motivo del reporte (ej. Spam, contenido ofensivo, etc.):");
    
    if (reason === null || reason.trim() === "") return;

    try {
        const res = await authFetch(`/reviews/${reviewId}/report?reason=${encodeURIComponent(reason)}`, {
            method: "POST"
        });

        if (res.ok) {
            alert("Reseña reportada con éxito. Un administrador la revisará.");
            reportBtn.textContent = "✅ Reportada";
            reportBtn.disabled = true;
            reportBtn.style.opacity = "0.5";
        } else {
            alert("Error al reportar la reseña.");
        }
    } catch (err) {
        console.error("Error:", err);
        alert("Error de red al intentar reportar.");
    }
});
