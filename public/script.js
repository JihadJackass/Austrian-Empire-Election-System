// Initialize map
const map = L.map('map', {
    worldCopyJump: true // Prevent infinite scrolling
}).setView([20, 0], 2); // Centered on the globe

// Add a base layer with no wrapping
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: true // Disable wrapping
}).addTo(map);

// Set maximum bounds to constrain the map to a single Earth
const bounds = [
    [-90, -180], // Southwest corner of the Earth
    [90, 180]    // Northeast corner of the Earth
];
map.setMaxBounds(bounds);

// Optional: Prevent dragging the map outside of bounds
map.on('drag', function () {
    map.panInsideBounds(bounds, { animate: true });
});