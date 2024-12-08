

document.addEventListener('DOMContentLoaded', () => {
    let socket = io(4000); // Connect to server socket
    const canvas1 = document.getElementById('compass1');
    const canvas2 = document.getElementById('compass2');
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    const coordinatesEl = document.getElementById('coordinates');

    let userLocation = { latitude: null, longitude: null };
    let orientation = 0;
    let otherLocations = [];

    // Device Orientation Permissions
    function requestOrientationPermission() {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }

    // Handle orientation updates
    function handleOrientation(event) {
        orientation = event.alpha || 0;
        socket.emit('orientation', orientation);
        updateCompass();
    }

    // Geolocation tracking
    function startLocationTracking() {
        if ("geolocation" in navigator) {
            navigator.geolocation.watchPosition(
                (position) => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    
                    // Update coordinates display
                    coordinatesEl.textContent = 
                        `Your Coordinates: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
                    
                    // Emit location to server
                    socket.emit('location', userLocation);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    coordinatesEl.textContent = `Location Error: ${error.message}`;
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }

    // Calculate bearing between two coordinates
    function calculateBearing(lat1, lon1, lat2, lon2) {
        const toRadians = (deg) => (deg * Math.PI) / 180;
        const toDegrees = (rad) => (rad * 180) / Math.PI;
        
        const dLon = toRadians(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
        const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
                  Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
        
        return (toDegrees(Math.atan2(y, x)) + 360) % 360;
    }

    // Draw compass needle
    function drawCompass(ctx, angle, label) {
        ctx.clearRect(0, 0, 300, 300);
        ctx.save();
        ctx.translate(150, 150);
        ctx.rotate((angle * Math.PI) / 180);
        
        // Draw compass needle
        ctx.beginPath();
        ctx.moveTo(0, -100);  // Needle tip
        ctx.lineTo(10, -90);  // Right base
        ctx.lineTo(-10, -90); // Left base
        ctx.closePath();
        ctx.fillStyle = 'red';
        ctx.fill();
        
        ctx.restore();
        
        // Label
        ctx.font = '16px Arial';
        ctx.fillText(label, 100, 290);
    }

    // Update compass based on current data
    function updateCompass() {
        if (otherLocations.length && userLocation.latitude && userLocation.longitude) {
            const otherLocation = otherLocations[0]; // Take first other location
            
            const bearing = calculateBearing(
                userLocation.latitude, 
                userLocation.longitude,
                otherLocation.latitude, 
                otherLocation.longitude
            );

            // Draw first compass as user's orientation
            drawCompass(ctx1, orientation, 'Your Orientation');
            
            // Draw second compass as relative direction to other user
            drawCompass(ctx2, (bearing - orientation + 360) % 360, 'Relative Direction');
        }
    }

    // Listen for location updates from server
    socket.on('locationUpdate', (locations) => {
        otherLocations = locations.filter(
            loc => 
                loc.latitude !== userLocation.latitude && 
                loc.longitude !== userLocation.longitude
        );
        updateCompass();
    });

    // Initialize
    document.getElementById('enable-permissions').addEventListener('click', () => {
        requestOrientationPermission();
        startLocationTracking();
    });
});