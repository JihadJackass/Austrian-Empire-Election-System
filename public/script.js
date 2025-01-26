// Initialize the map
const map = L.map('map', {
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 19,
    zoomControl: false // Disable default zoom control placement
}).setView([20, 0], 2);

// Add zoom controls explicitly at the bottom-left
L.control.zoom({ position: 'bottomleft' }).addTo(map);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: true // Prevent wrapping
}).addTo(map);

// Prevent panning outside of map bounds
const bounds = [
    [-90, -180], // Southwest corner of the globe
    [90, 180]    // Northeast corner of the globe
];
map.setMaxBounds(bounds);

map.on('drag', function () {
    map.panInsideBounds(bounds, { animate: true });
});

document.addEventListener('DOMContentLoaded', () => {
    const masterMenus = document.querySelectorAll('.master-menu');
    const submenus = document.querySelectorAll('.submenu');

    // Function to toggle master menus
    function showMasterMenu(menuId) {
        masterMenus.forEach(menu => {
            menu.classList.toggle('active', menu.id === menuId);
        });

        // Hide all submenus when switching master menus
        submenus.forEach(submenu => submenu.classList.remove('active'));
    }

    // Function to toggle submenus
    function showSubmenu(submenuId) {
        submenus.forEach(submenu => {
            submenu.classList.toggle('active', submenu.id === submenuId);
        });
    }

    // Handle Flag Customization
    const fileInput = document.getElementById('flag-file-upload');
    const urlInput = document.getElementById('flag-url-upload');
    const applyButton = document.getElementById('apply-flag');
    const currentFlagImg = document.getElementById('current-flag');
    const topLeftFlag = document.getElementById('top-left-flag');

    applyButton.addEventListener('click', () => {
        const file = fileInput.files[0];
        const url = urlInput.value;

        if (file) {
            const formData = new FormData();
            formData.append('flag', file);

            fetch('/api/flag/upload', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    currentFlagImg.src = data.flagUrl;
                    topLeftFlag.src = data.flagUrl;
                })
                .catch(err => console.error('Error uploading flag:', err));
        } else if (url) {
            currentFlagImg.src = url;
            topLeftFlag.src = url;
        }
    });

    // Expose functions globally for inline use in HTML
    window.showMasterMenu = showMasterMenu;
    window.showSubmenu = showSubmenu;
});



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