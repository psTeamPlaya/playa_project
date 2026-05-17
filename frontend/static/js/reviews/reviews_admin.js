// review_admin.js
import { authFetch } from "../api/auth-fetch.js";

export async function openReviewAdminModal(params) {
    const { beachId, onRefresh } = params;

    // 1. Zapobiegamy dublowaniu modali
    const existingModal = document.getElementById("reviewAdminModal");
    if (existingModal) existingModal.remove();

    // 2. Tworzymy kontener dla modala
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "reviewAdminModal";
    modalWrapper.className = "modal-overlay";

    // 3. Wstrzykujemy strukturę HTML modala
    modalWrapper.innerHTML = `
    <div class="modal-backdrop" id="reviewManagementModal">
        <div class="reviews-admin-modal auth-modal reviews-modal">
            <button class="modal-close" id="closeReviewManagementModal" type="button">&times;</button>
            <div class="reviews-admin-layout">
                <!-- Menu / Zakładki -->
                <div class="list-vertical" id="modalNavigation">
                    <button type="button" class="list-item-vertical button-active" data-tab="statistics">Statistics</button>
                    <button type="button" class="list-item-vertical" data-tab="all">All reviews</button>
                    <button type="button" class="list-item-vertical" data-tab="reported">Reported</button>
                </div>
                <!-- Kontener na dynamiczną treść (Poprawione ID) -->
                <div id="reviewsAdminContent">
                    Loading Content...
                </div>
            </div>
        </div>
    </div>`;

    document.body.appendChild(modalWrapper);

    // 5. Pobieramy referencje (Poprawiony selektor na content)
    const closeBtn = modalWrapper.querySelector("#closeReviewManagementModal");
    const contentContainer = modalWrapper.querySelector("#reviewsAdminContent");
    const navigation = modalWrapper.querySelector("#modalNavigation");

    // ==========================================
    // WEWNĘTRZNE FUNKCJE POMOCNICZE (CLOSURES)
    // ==========================================

    // Funkcja do renderowania HTML listy opinii
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


    // Główny zarządca kliknięć w modalu (Wydajny!)
    async function modalClickEvents(e) {
        // Obsługa kliknięcia przycisku USUŃ
        const deleteBtn = e.target.closest(".delete-admin-review-btn");
        if (deleteBtn) {
            await deleteReview(deleteBtn);
            return;
        }

        // Obsługa przełączania zakładek (Zapas na logikę zakładek w przyszłości)
        const tabBtn = e.target.closest("[data-tab]");
        if (tabBtn) {
            console.log(`Przełączono na zakładkę: ${tabBtn.dataset.tab}`);
            await tabManaging(tabBtn.dataset.tab);
            return;
        }

        // Zamknięcie modala po kliknięciu w szary backdrop na zewnątrz okna
        if (e.target === modalWrapper.querySelector("#reviewManagementModal")) {
            modalWrapper.remove();
        }
    }

    async function deleteReview(deleteBtn) {
        const reviewId = deleteBtn.dataset.id;
        if (!confirm("Czy jako Administrator na pewno chcesz usunąć tę recenzję?")) return;

        try {
            const res = await authFetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
            if (res.ok) {
                deleteBtn.closest(".admin-review-item").remove();
                onRefresh?.(); // Działa bezbłędnie, bo funkcja widzi parametry z góry!
            } else {
                alert("Błąd podczas usuwania");
            }
        } catch (err) {
            console.error("Błąd sieci:", err);
        }
    }
    // ==========================================
    // Tabs functions
    // ==========================================
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
    // Funkcja do dopisywania kolejnych wierszy do istniejącej listy
    function renderReviewsAll(reviews, isFirstLoad) {
        if (isFirstLoad) {
            contentContainer.innerHTML = `
                <div class="admin-reviews-list-wrapper">
                    <h3>All Platform Reviews</h3>
                    <div class="admin-reviews-list" id="globalReviewsList"></div>
                    <div class="scroll-trigger-wrapper">
                        <button type="button" id="loadMoreReviewsBtn" class="btn-secondary">Load more reviews</button>
                    </div>
                </div>
            `;
        }

        const listContainer = contentContainer.querySelector("#globalReviewsList");
        const loadMoreBtn = contentContainer.querySelector("#loadMoreReviewsBtn");

        if (reviews.length === 0 && isFirstLoad) {
            listContainer.innerHTML = `<p class="empty">Brak recenzji w bazie danych.</p>`;
            if (loadMoreBtn) loadMoreBtn.remove();
            return;
        }

        // Mapujemy i dorzucamy nowe elementy na koniec listy
        const html = reviews.map(r => `
            <div class="admin-review-item review-item" data-id="${r.id}">
                <div class="review-info">
                    <div class="review-meta">
                        <span class="review-author">👤 ${r.email}</span>
                        <span class="review-stars">${"⭐".repeat(r.rating)}</span>
                    </div>
                    <p class="review-text">${r.content || "<i>Brak treści pisemnej</i>"}</p>
                </div>
                <button class="delete-review-btn" data-id="${r.id}">🗑️ Remove</button>
            </div>
        `).join("");

        listContainer.insertAdjacentHTML("beforeend", html);

        // Jeśli baza zwróciła mniej rekordów niż nasz limit, oznacza to, że dno zostało osiągnięte
        if (reviews.length < limit) {
            hasMore = false;
            if (loadMoreBtn) {
                loadMoreBtn.innerText = "No more reviews to load";
                loadMoreBtn.disabled = true;
            }
        }
    }

    // Wewnętrzna funkcja wykonująca zapytanie do API
    async function loadMoreData() {
        if (isLoadingMore || !hasMore) return;
        isLoadingMore = true;

        const loadMoreBtn = contentContainer.querySelector("#loadMoreReviewsBtn");
        if (loadMoreBtn) loadMoreBtn.innerText = "Loading...";

        try {
            // Budujemy URL z parametrami dla naszej unikalnej strategii migawki (Snapshot)!
            let url = `/admin/reviews?limit=${limit}&offset=${currentOffset}`;
            if (snapshotId) {
                url += `&snapshot_id=${snapshotId}`;
            }

            const res = await authFetch(url);
            if (!res.ok) throw new Error("Status " + res.status);
            const result = await res.json();

            if (activeTab !== "all") return; // Blokada wyścigu zakładek

            // Przy pierwszym strzale zapisujemy snapshotId zwrócony przez backend!
            if (!snapshotId && result.snapshot_id) {
                snapshotId = result.snapshot_id;
            }

            const isFirst = currentOffset === 0;
            renderReviewsAll(result.data, isFirst);

            // Zwiększamy offset na potrzeby kolejnego kliknięcia
            currentOffset += result.data.length;

        } catch (err) {
            console.error("Error loading reviews: ", err);
            if (currentOffset === 0) {
                contentContainer.innerHTML = `<p class="error">Błąd ładowania danych.</p>`;
            }
        } finally {
            isLoadingMore = false;
            const btn = contentContainer.querySelector("#loadMoreReviewsBtn");
            if (btn && hasMore) btn.innerText = "Load more reviews";
        }
    }

    // Wywołujemy pierwsze ładowanie (offset 0)
    await loadMoreData();

    // Rejestrujemy nasłuchiwanie kliknięcia "Load More" za pomocą delegacji wewnątrz kontenera
    contentContainer.addEventListener("click", async (e) => {
        if (e.target.id === "loadMoreReviewsBtn") {
            await loadMoreData();
        }
    });
}

    async function tabReported() {
        function renderReviewsReported(data){

        }

        try {
            const res = await authFetch(`/admin/reviews/reported`)
            if(!(activeTab === "all")) return;
            renderReviewsStats(res);

        } catch (err) {
            console.error("Rendering review statistics: " , err)
        }
    }

    // ==========================================
    // PODPINANIE LISTENERY I START
    // ==========================================
    
    closeBtn.addEventListener("click", () => modalWrapper.remove());
    modalWrapper.addEventListener("click", modalClickEvents);

    tabStatistics();
}