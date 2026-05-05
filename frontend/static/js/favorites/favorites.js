// import { authFetch, loadCurrentUser, getFavoriteBeachIds } from "../main.js";

const favoritesLabel = document.getElementById("favoritesLabel");
let isFavoritesMode = false;

favoritesLabel.addEventListener("click", (e) => {
    // Prevent default if you find it double-triggering
    e.preventDefault(); 
    console.log("Favorites label clicked");  // TODO for debug    
    // cerrarPanelPreferencias(); 

    console.log("isFavoritesMode before toggle:", isFavoritesMode);  // TODO for debug
    isFavoritesMode = !isFavoritesMode;  // Toggle the mode

    toggleSearchUI(!isFavoritesMode);  // Toggle search UI based on current visibility
});

const searchUIIds = [
    "activitySection", 
    "dateSection", 
    "locationSection", 
    "searchSection",
];


/**
 * Helper to toggle visibility for all search-related elements
 * @param {boolean} show - true to show search UI, false to hide it
 */
function toggleSearchUI(show) {
    searchUIIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (show) {
                el.classList.remove("hidden");
            } else {
                el.classList.add("hidden");
            }
        }
    });
}


/* export async function loadFavoritesPage() {
    console.log("Loading favorites page...");  // TODO for debug
    const user = await loadCurrentUser();
    if (!user) {
        alert("Please log in to view your favorites.");
        window.location.href = "/login";
        return;
    }

    const favoriteBeachIds = await getFavoriteBeachIds();
    const favoritesContainer = document.getElementById("favoritesContainer");
    favoritesContainer.innerHTML = "";  // Clear previous content

    if (favoriteBeachIds.length === 0) {
        favoritesContainer.innerHTML = "<p>You have no favorite beaches yet.</p>";
        return;
    }

    for (const beachId of favoriteBeachIds) {
        try {
            const response = await authFetch(`/api/beaches/${beachId}`);
            if (!response.ok) {
                console.error(`Failed to fetch beach with ID ${beachId}`);
                continue;
            }
            const beachData = await response.json();
            const beachItem = document.createElement("div");
            beachItem.className = "favorite-beach-item";
            beachItem.innerHTML = `
                <h3>${beachData.name}</h3>
                <p>${beachData.description}</p>
                <button onclick="removeFromFavorites(${beachId})">Remove from Favorites</button>
            `;
            favoritesContainer.appendChild(beachItem);
        } catch (error) {
            console.error(`Error fetching beach with ID ${beachId}:`, error);
        }
    }
}

export async function removeFromFavorites(beachId) {
    try {
        const response = await authFetch(`/api/favorites/${beachId}`, {
            method: "DELETE"
        });
        if (!response.ok) {
            alert("Failed to remove beach from favorites.");
            return;
        }
        alert("Beach removed from favorites.");
        loadFavoritesPage();  // Refresh the list
    } catch (error) {
        console.error(`Error removing beach with ID ${beachId} from favorites:`, error);
        alert("An error occurred while trying to remove the beach from favorites.");
    }
}

loadFavoritesPage(); */