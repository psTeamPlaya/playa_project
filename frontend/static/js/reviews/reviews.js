import { authFetch } from "../api/auth-fetch.js";

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
    console.log("User: ", user);
    if (!user) return;

    event.preventDefault();
    event.stopPropagation();

    const beachId = btn.dataset.id || btn.dataset.ratingId;
    currentBeachForReviews = beachId;

    const modal = document.getElementById("reviewsModal");
    const list = document.getElementById("reviewsList");

    modal.hidden = false;
    list.innerHTML = "<div class='empty-state'>Cargando reseñas...</div>";

    try {
        const res = await authFetch(`/reviews/beach/${beachId}`);
        const reviews = await res.json();
        renderReviews(reviews);
    } 
    catch (err) {
        list.innerHTML = "<div class='empty-state'>Error cargando reseñas</div>";
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

        // recargar reviews
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
        list.innerHTML = "<div class='empty-state'>Sin reseñas todavía</div>";
        return;
    }

    list.innerHTML = reviews.map(r => {

        const isOwner = user && user.email === r.email;
        const isAdmin = user && user.role === "admin";

        return `
            <div class="review-item" data-id="${r.id}">
                <strong>${r.email}</strong>
                <p>${r.content}</p>
                <small>⭐ ${r.rating}</small>
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

        // recargar lista
        const res = await authFetch(`/reviews/beach/${currentBeachForReviews}`);
        const reviews = await res.json();
        renderReviews(reviews);
    } 
    catch (err) {
        alert("Error al enviar reseña");
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