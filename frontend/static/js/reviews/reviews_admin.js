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
            container.innerHTML = `<p class="empty">No reviews for this beach.</p>`;
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

        const dismissBtn = e.target.closest(".dismiss-admin-report-btn");
        if (dismissBtn) {
            await dismissReport(dismissBtn);
            return;
        }

        const tabBtn = e.target.closest("[data-tab]");
        if (tabBtn) {
            console.log(`Switched to tab: ${tabBtn.dataset.tab}`);
            await tabManaging(tabBtn.dataset.tab);
            return;
        }

        if (e.target === modalWrapper.querySelector("#reviewManagementModal")) {
            modalWrapper.remove();
        }
    }

    async function deleteReview(deleteBtn) {
        const reviewId = deleteBtn.dataset.id;
        if (!confirm("Are you sure you want to delete this review as an Administrator?")) return;

        try {
            const res = await authFetch(`/admin/reviews/${reviewId}`, { method: "DELETE" });
            if (res.ok) {
                await tabManaging("all", true);
                onRefresh?.(); 
            } 
            else {
                alert("Error while deleting");
            }
        } 
        catch (err) {
            console.error("Network error:", err);
        }
    }

    async function dismissReport(dismissBtn) {
        const reviewId = dismissBtn.dataset.id;
        
        try {
            const res = await authFetch(`/admin/reviews/${reviewId}/dismiss`, { method: "POST" });
            if (res.ok) {
                dismissBtn.closest(".admin-review-item").remove();
            } else {
                alert("Error while dismissing the report");
            }
        } catch (err) {
            console.error("Network error:", err);
        }
    }

    let activeTab = "statistics";
    let snapshotId = null;
    let currentOffset = 0; 
    const limit = 20;
    let isLoadingMore = false;
    let hasMore = true;

    async function tabManaging(tab, force=false) {
        if (activeTab === tab && !force) return;
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
                    <span>⭐ ${b.average_rating} (${b.reviews_count} reviews)</span>
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
                            <ul class="stat-beaches-list">${beachesHtml || "<li>No data available</li>"}</ul>
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
            contentContainer.innerHTML = `<p class="error">Failed to load statistics.</p>`;
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
            el.className = "review-item admin-virtual-item"; 
            el.setAttribute("data-id", item.id);
            el.innerHTML = `
                <div class="review-item-header">
                    <strong>${item.email}</strong>
                    <div class="review-actions-meta">
                        <span class="review-rating-badge">⭐ ${item.rating}</span>
                        <button class="review-action delete-admin-review-btn" data-id="${item.id}">🗑️ Remove</button>
                    </div>
                </div>
                <div class="review-item-body">
                    <p title="${item.content || ''}">${item.content || '<i>No written content</i>'}</p>
                </div>
            `;
            return el;
        }
        try {
            const res = await authFetch(`/admin/reviews?limit=1000&offset=0`);
            if (!res.ok) throw new Error("Status " + res.status);
            const result = await res.json();

            if (activeTab !== "all") return;

            const reviews = result.data || [];

            if (reviews.length === 0) {
                listContainer.innerHTML = `<p class="empty">No reviews in database.</p>`;
                return;
            }

            if (!window.VirtualScroller) {
                throw new Error("VirtualScroller global script is not loaded");
            }

            new window.VirtualScroller(listContainer, reviews, renderReviewItem, {
                scrollableContainer: scrollableContainer
            });

        } catch (err) {
            console.error("Error loading reviews: ", err);
            contentContainer.innerHTML = `<p class="error">Error loading data.</p>`;
        }
    }

    async function tabReported() {
        function renderReviewsReported(data) {
            if (data.length === 0) {
                contentContainer.innerHTML = `<h3>Reported Reviews</h3><p class="empty">No reported reviews.</p>`;
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
                                        <span class="review-reason" style="color:#d9534f; font-weight:bold; margin-left:10px; background:#f9eded; padding:2px 6px; border-radius:4px;">⚠️ ${r.reason}</span>
                                    </div>
                                    <p class="review-text">${r.content || "<i></i>"}</p>
                                </div>
                                <div class="admin-actions-vault" style="display:flex; gap:10px;">
                                    <button class="dismiss-admin-report-btn" data-id="${r.id}" style="background-color: #5cb85c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✅ Keep & Dismiss</button>
                                    <button class="delete-admin-review-btn" data-id="${r.id}" style="background-color: #d9534f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️ Remove</button>
                                </div>
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
            contentContainer.innerHTML = `<p class="error">Error loading data.</p>`;
        }
    }

    closeBtn.addEventListener("click", () => modalWrapper.remove());
    modalWrapper.addEventListener("click", modalClickEvents);

    tabStatistics();
};