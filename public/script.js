document.addEventListener('DOMContentLoaded', () => {
    const masterMenus = document.querySelectorAll('.master-menu');
    const menuButton = document.getElementById('menu-button');
    const menuDropdown = document.getElementById('menu-dropdown');
    let isDragging = false; // Tracks if a drag action is happening
    let initialX, initialY; // Tracks initial mouse position for drag detection
    let isMenuOpen = false; // Tracks whether the menu is open

    // Open the dropdown menu when clicking the menu button
    menuButton.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        menuDropdown.style.display = isMenuOpen ? 'block' : 'none';
    });

    // Dragging logic for windows
    function makeDraggable(menuId) {
        const menu = document.getElementById(menuId);
        let offsetX, offsetY;

        menu.addEventListener('mousedown', (e) => {
            isDragging = false; // Reset dragging state
            const startX = e.clientX;
            const startY = e.clientY;

            function onMouseMove(e) {
                const distanceX = Math.abs(e.clientX - startX);
                const distanceY = Math.abs(e.clientY - startY);

                if (distanceX > 5 || distanceY > 5) {
                    isDragging = true; // Mark as dragging if the cursor moves
                }

                menu.style.position = 'absolute';
                menu.style.zIndex = 1000; // Bring to front
                menu.style.left = `${e.clientX - offsetX}px`;
                menu.style.top = `${e.clientY - offsetY}px`;
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            // Calculate offset
            offsetX = e.clientX - menu.offsetLeft;
            offsetY = e.clientY - menu.offsetTop;

            // Attach listeners for dragging
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // Apply dragging to all master menus
    masterMenus.forEach(menu => {
        makeDraggable(menu.id);
    });

    // Show a specific master menu
    function showMasterMenu(menuId) {
        masterMenus.forEach(menu => {
            menu.classList.toggle('active', menu.id === menuId);
        });
    }

    // Close a specific master menu
    function closeMenu(menuId) {
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.remove('active');
        }
    }

    // Attach event listeners
    window.showMasterMenu = showMasterMenu;
    window.closeMenu = closeMenu;
});
    
// Initialize the map
const map = L.map('map', {
    worldCopyJump: false, // Prevent wrapping around the globe
    minZoom: 3, // Lock the minimum zoom to the "fitted" level
    maxZoom: 19, // Allow zooming in for more details
    zoomControl: false // We'll add custom zoom controls later if needed
}).setView([20, 0], 3); // Set the default view with the adjusted zoom level

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: true // Disable wrapping
}).addTo(map);

// Prevent panning outside of map bounds
const bounds = [
    [-90, -180], // Southwest corner of the globe
    [90, 180]    // Northeast corner of the globe
];
map.setMaxBounds(bounds);

// Prevent dragging outside bounds
map.on('drag', function () {
    map.panInsideBounds(bounds, { animate: true });
});

// Add zoom controls explicitly at the bottom-left
L.control.zoom({ position: 'bottomleft' }).addTo(map);

// GeoJSON URL for country boundaries
const geojsonURL = 'https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson';
let highlightLayer;

// Function to update both the top-left flag and the current flag in the menu
function updateFlag(newFlagUrl) {
    const topLeftFlag = document.getElementById('top-left-flag');
    const flagImgInMenu = document.getElementById('current-flag');

    // Use fallback if no flag is set
    const flagUrl = newFlagUrl || '/flags/fallback_flag.png';

    // Update the top-left flag and the current flag in the menu
    topLeftFlag.src = flagUrl;
    flagImgInMenu.src = flagUrl;

    // Persist the selected flag in the backend (if a new flag is provided)
    if (newFlagUrl) {
        fetch('/api/flag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flagUrl: newFlagUrl })
        })
            .then(response => response.json())
            .then(data => console.log('Flag updated:', data.message))
            .catch(err => console.error('Error updating flag:', err));
    }
}

// Handle file upload
document.getElementById('flag-file-upload').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('flag', file);

    fetch('/api/flag/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => updateFlag(data.flagUrl)) // Update the flag dynamically
        .catch(err => console.error('Error uploading file:', err));
});

// Handle URL upload
document.getElementById('flag-url-upload').addEventListener('input', (event) => {
    const flagUrl = event.target.value;
    document.getElementById('apply-flag').onclick = () => {
        updateFlag(flagUrl); // Update the flag dynamically
    };
});

// Fetch the current flag on page load
fetch('/api/flag')
    .then(response => response.json())
    .then(data => {
        if (data.flagUrl) {
            updateFlag(data.flagUrl); // Set the flag to the fetched URL
        } else {
            updateFlag(); // Use fallback flag
        }
    })
    .catch(err => {
        console.error('Error fetching current flag:', err);
        updateFlag(); // Use fallback if the fetch fails
    });

// Dynamically populate dropdown with GeoJSON data
fetch(geojsonURL)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const regions = new Set();
        data.features.forEach(feature => {
            const continent = feature.properties.CONTINENT;
            regions.add(continent);
        });

        const dropdown = document.getElementById('highlight-area');
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.toLowerCase();
            option.textContent = region;
            dropdown.appendChild(option);
        });

        console.log(`Populated dropdown with regions: ${Array.from(regions).join(', ')}`);
    })
    .catch(err => console.error(`Error loading GeoJSON: ${err.message}`));

// Highlight selected area
function applyHighlight(color, area) {
    if (highlightLayer) {
        map.removeLayer(highlightLayer);
    }

    fetch(geojsonURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const filteredData = {
                type: 'FeatureCollection',
                features: data.features.filter(feature =>
                    feature.properties.CONTINENT.toLowerCase() === area
                )
            };

            highlightLayer = L.geoJSON(filteredData, {
                style: {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.5
                }
            }).addTo(map);

            console.log(`Highlight applied for area: ${area}`);
        })
        .catch(err => console.error(`Error applying highlight: ${err.message}`));
}

// Admin tools interaction
document.getElementById('apply-settings').addEventListener('click', () => {
    const color = document.getElementById('highlight-color').value;
    const area = document.getElementById('highlight-area').value;
    applyHighlight(color, area);
});

// Add zoom controls explicitly at the bottom-left
L.control.zoom({ position: 'bottomleft' }).addTo(map);

// Get all master menus
const masterMenus = document.querySelectorAll('.master-menu');

// Function to toggle visibility of the master menus
function showMasterMenu(menuId) {
    masterMenus.forEach(menu => {
        if (menu.id === menuId) {
            menu.classList.add('active'); // Show the selected menu
        } else {
            menu.classList.remove('active'); // Hide all other menus
        }
    });
}

// Function to toggle visibility of submenus within the admin tools menu
function showSubmenu(submenuId) {
    const submenus = document.querySelectorAll('.submenu');
    submenus.forEach(submenu => {
        if (submenu.id === submenuId) {
            submenu.classList.add('active'); // Show the selected submenu
        } else {
            submenu.classList.remove('active'); // Hide all other submenus
        }
    });
}

// Attach event listeners to the menu buttons for better control
document.querySelectorAll('#menu-buttons button').forEach(button => {
    button.addEventListener('click', (event) => {
        const menuId = button.getAttribute('onclick').match(/'(.+)'/)[1];
        showMasterMenu(menuId);
    });
});