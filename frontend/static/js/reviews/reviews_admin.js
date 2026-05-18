import { authFetch } from "../api/auth-fetch.js";

export async function openReviewAdminModal(params) {
    const { beachId, onRefresh } = params;

    const existingModal = document.getElementById("reviewAdminModal");
    if (existingModal) existingModal.remove();

    const modalWrapper = document.createElement("div");
    modalWrapper.id = "reviewAdminModal";
    modalWrapper.className = "modal-overlay";

    modalWrapper.innerHTML = `
    <div class="modal-backdrop" id="reviewManagementModal">
        <div class="reviews-admin-modal auth-modal reviews-modal">
            <button class="modal-close" id="closeReviewManagementModal" type="button">&times;</button>
            <div class="reviews-admin-layout">
                <div class="list-vertical" id="modalNavigation">
                    <button type="button" class="list-item-vertical button-active" data-tab="statistics">Statistics</button>
                    <button type="button" class="list-item-vertical" data-tab="all">All reviews</button>
                    <button type="button" class="list-item-vertical" data-tab="reported">Reported</button>
                </div>
                <div id="reviewsAdminContent">
                    Loading Content...
                </div>
            </div>
        </div>
    </div>`;

    document.body.appendChild(modalWrapper);

    const closeBtn = modalWrapper.querySelector("#closeReviewManagementModal");
    const contentContainer = modalWrapper.querySelector("#reviewsAdminContent");
    const navigation = modalWrapper.querySelector("#modalNavigation");

    function renderAdminReviews(reviews, container) {
        if (reviews.length === 0) {
            container.innerHTML = `<p class="empty">Brak recenzji dla tej plaży.</p>`;
            return;
        }
        container.innerHTML = reviews.map(r => `
            <div class="admin-review-item review-item">
                <div class="review-info">
                    <strong>${r.email}</strong>
                    <p>${r.content}</p>
                </div>
                <button class="delete-admin-review-btn" data-id="${r.id}">🗑️ Remove</button>
            </div>
        `).join("");
    }

    async function modalClickEvents(e) {
        const deleteBtn = e.target.closest(".delete-admin-review-btn");
        if (deleteBtn) {
            await deleteReview(deleteBtn);
            return;
        }

        const tabBtn = e.target.closest("[data-tab]");
        if (tabBtn) {
            console.log(`Przełączono na zakładkę: ${tabBtn.dataset.tab}`);
            await tabManaging(tabBtn.dataset.tab);
            return;
        }

        if (e.target === modalWrapper.querySelector("#reviewManagementModal")) {
            modalWrapper.remove();
        }
    }

    async function deleteReview(deleteBtn) {
        const reviewId = deleteBtn.dataset.id;
        if (!confirm("Czy jako Administrator na pewno chcesz usunąć tę recenzję?")) return;

        try {
            const res = await authFetch(`/admin/reviews/${reviewId}`, { method: "DELETE" });
            if (res.ok) {
                deleteBtn.closest(".admin-review-item").remove();
                onRefresh?.(); 
            } else {
                alert("Błąd podczas usuwania");
            }
        } catch (err) {
            console.error("Błąd sieci:", err);
        }
    }

    let activeTab = "statistics";
    let snapshotId = null;
    let currentOffset = 0; 
    const limit = 20;
    let isLoadingMore = false;
    let hasMore = true;

    async function tabManaging(tab) {
        if (activeTab === tab) return;
        activeTab = tab;

        navigation.querySelectorAll("[data-tab]").forEach(btn => {
            btn.classList.toggle("button-active", btn.dataset.tab === tab);
        });

        snapshotId = null;
        currentOffset = 0;
        hasMore = true;
        isLoadingMore = false;

        contentContainer.innerHTML = '<div class="loader">Loading content...</div>';

        if (tab === "statistics") await tabStatistics();
        else if (tab === "all") await tabAll();
        else if (tab === "reported") await tabReported();
    }

    async function tabStatistics() {
        function renderReviewsStats(data) {
            const beachesHtml = data.popular_beaches.map(b => `
                <li class="stat-beach-item">
                    <strong>${b.name}</strong> 
                    <span>⭐ ${b.average_rating} (${b.reviews_count} opinii)</span>
                </li>
            `).join("");

            contentContainer.innerHTML = `
                <div class="admin-stats-wrapper">
                    <h3>System Overview</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-value">${data.summary.total_reviews}</span>
                            <span class="stat-label">Total Reviews</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">⭐ ${data.summary.global_average_rating}</span>
                            <span class="stat-label">Global Rating</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">+${data.summary.reviews_last_7_days}</span>
                            <span class="stat-label">Last 7 Days</span>
                        </div>
                    </div>

                    <div class="stats-sections">
                        <div class="stat-section">
                            <h4>Rating Distribution</h4>
                            <div class="rating-bar-chart">
                                ${[5,4,3,2,1].map(stars => {
                                    const count = data.rating_distribution[stars] || 0;
                                    const percent = data.summary.total_reviews > 0 ? (count / data.summary.total_reviews * 100).toFixed(0) : 0;
                                    return `
                                        <div class="chart-row">
                                            <span class="star-label">${stars} ⭐</span>
                                            <div class="bar-fill-bg">
                                                <div class="bar-fill" style="width: ${percent}%"></div>
                                            </div>
                                            <span class="count-label">${count} (${percent}%)</span>
                                        </div>`;
                                }).join("")}
                            </div>
                        </div>
                        <div class="stat-section">
                            <h4>Top Reviewed Beaches</h4>
                            <ul class="stat-beaches-list">${beachesHtml || "<li>Brak danych</li>"}</ul>
                        </div>
                    </div>
                </div>
            `;
        }

        try {
            const res = await authFetch(`/admin/reviews/statistics`);
            if (!res.ok) throw new Error("Status " + res.status);
            const data = await res.json();
            
            if (activeTab !== "statistics") return;
            renderReviewsStats(data);
        } catch (err) {
            console.error("Rendering review statistics: ", err);
            contentContainer.innerHTML = `<p class="error">Nie udało się załadować statystyk.</p>`;
        }
    }

    async function tabAll() {
        contentContainer.innerHTML = `
            <div class="admin-reviews-list-wrapper">
                <h3>All Platform Reviews</h3>
                <div id="virtualScrollArea" style="height: 500px; overflow-y: auto; border: 1px solid #ccc;">
                    <div id="globalReviewsList" class="admin-reviews-list"></div>
                </div>
            </div>
        `;

        const scrollableContainer = contentContainer.querySelector("#virtualScrollArea");
        const listContainer = contentContainer.querySelector("#globalReviewsList");

        function renderReviewItem(item) {
            const el = document.createElement("div");
            el.className = "admin-review-item review-item";
            el.setAttribute("data-id", item.id);
            el.innerHTML = `
                <div class="review-info">
                    <div class="review-meta">
                        <span class="review-author">👤 ${item.email}</span>
                        <span class="review-stars">${"⭐".repeat(item.rating)}</span>
                    </div>
                    <p class="review-text">${item.content || "<i>Brak treści pisemnej</i>"}</p>
                </div>
                <button class="delete-admin-review-btn" data-id="${item.id}">🗑️ Remove</button>
            `;
            return el;
        }

        try {
            // Pobierasz już tylko dane z API, bo biblioteka czeka już w oknie przeglądarki
            const res = await authFetch(`/admin/reviews?limit=1000&offset=0`);
            if (!res.ok) throw new Error("Status " + res.status);
            const result = await res.json();

            if (activeTab !== "all") return;

            const reviews = result.data || [];

            if (reviews.length === 0) {
                listContainer.innerHTML = `<p class="empty">Brak recenzji w bazie danych.</p>`;
                return;
            }

            // Sprawdzamy czy globalny obiekt istnieje na wypadek problemów z sieciami CDN
            if (!window.VirtualScroller) {
                throw new Error("VirtualScroller global script is not loaded");
            }

            // Inicjalizacja z obiektu globalnego window
            new window.VirtualScroller(listContainer, reviews, renderReviewItem, {
                scrollableContainer: scrollableContainer
            });

        } catch (err) {
            console.error("Error loading reviews: ", err);
            contentContainer.innerHTML = `<p class="error">Błąd ładowania danych lub komponentu przewijania.</p>`;
        }
    }

    async function tabReported() {
        function renderReviewsReported(data) {
            if (data.length === 0) {
                contentContainer.innerHTML = `<h3>Reported Reviews</h3><p class="empty">Brak zgłoszonych recenzji.</p>`;
                return;
            }
            contentContainer.innerHTML = `
                <div class="admin-reviews-list-wrapper">
                    <h3>Reported Reviews</h3>
                    <div class="admin-reviews-list">
                        ${data.map(r => `
                            <div class="admin-review-item review-item" data-id="${r.id}">
                                <div class="review-info">
                                    <div class="review-meta">
                                        <span class="review-author">👤 ${r.email}</span>
                                        <span class="review-stars">${"⭐".repeat(r.rating)}</span>
                                        <span class="review-reason" style="color:red; font-weight:bold; margin-left:10px;">⚠️ ${r.reason}</span>
                                    </div>
                                    <p class="review-text">${r.content || "<i>Brak treści pisemnej</i>"}</p>
                                </div>
                                <button class="delete-admin-review-btn" data-id="${r.id}">🗑️ Remove</button>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        try {
            const res = await authFetch(`/admin/reviews/reported`);
            if (!res.ok) throw new Error("Status " + res.status);
            const data = await res.json();
            
            if (activeTab !== "reported") return;
            renderReviewsReported(data);

        } catch (err) {
            console.error("Rendering reported reviews: ", err);
            contentContainer.innerHTML = `<p class="error">Błąd ładowania danych.</p>`;
        }
    }

    closeBtn.addEventListener("click", () => modalWrapper.remove());
    modalWrapper.addEventListener("click", modalClickEvents);

    tabStatistics();
}