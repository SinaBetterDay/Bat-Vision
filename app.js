let map, geocoder;
const parkingLots = {
    "ARC Parking": {
        plusCode: "G6VV+72 Davis, California",
        spots: {
            row1: {
                start: "G6VR+CMC University of California-Davis, California",
                end: "G6VV+C2G University of California-Davis, California",
                count: 32
            },
            row2: {
                start: "G6VR+9HG University of California-Davis, California",
                end: "G6VV+98G University of California-Davis, California",
                count: 64
            }
        }
    },
    "Visitor Lot 22": {
        plusCode: "G6VV+WF Davis, California",
        spots: {}
    },
    "Non-Visitor lot 41": {
        plusCode: "G6QV+F5C University of California-Davis, California",
        spots: {}
    },
    "Aggie Stadium, Visitor Lot": {
        plusCode: "G6PP+3W6 University of California-Davis, California",
        spots: {}
    },
    "Aggie Stadium, Non-Visitor Lot": {
        plusCode: "G6PP+3JC University of California-Davis, California",
        spots: {}
    }
};

async function initMap() {
    geocoder = new google.maps.Geocoder();
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: { lat: 38.5382, lng: -121.7613 },
        mapTypeId: 'satellite',
        tilt: 0,
        styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
    });

    // Force 2D view
    map.setTilt(0);
    
    // Create parking lots
    for (const [name, data] of Object.entries(parkingLots)) {
        await createParkingLot(name, data);
    }

    // Zoom listener
    google.maps.event.addListener(map, 'zoom_changed', handleZoomChange);
    
    // Initialize live feeds
    createLiveFeedItems();
}

async function createParkingLot(name, data) {
    try {
        const position = await convertPlusCode(data.plusCode);
        const totalSpots = Object.values(data.spots).reduce((sum, row) => sum + row.count, 0);
        const availableSpots = calculateAvailableSpots(data.spots);

        const marker = new google.maps.Marker({
            position,
            map,
            title: `${name} - ${availableSpots}/${totalSpots} available`,
            icon: getLotIcon(availableSpots, totalSpots),
            class: 'lot-marker',
            zIndex: google.maps.Marker.MAX_ZINDEX + 1,
            visible: map.getZoom() <= 17
        });

        marker.addListener('click', async () => {
            window.activeLot = data;
            map.setCenter(position);
            map.setZoom(19);
            if (Object.keys(data.spots).length > 0) {
                showSpots(await generateSpots(data.spots));
            }
        });

        // Store reference for zoom updates
        marker.availableSpots = availableSpots;
        marker.totalSpots = totalSpots;
    } catch (error) {
        console.error(`Error creating ${name}:`, error);
    }
}

function getLotIcon(available, total) {
    const ratio = available / total;
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: ratio > 0.5 ? '#70e000' : ratio > 0.2 ? '#ffbe0b' : '#ff006e',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8 + Math.log(total) * 1.5,
        label: {
            text: `${available}`,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold'
        }
    };
}

function handleZoomChange() {
    const zoom = map.getZoom();
    
    // Update lot markers
    document.querySelectorAll('.lot-marker').forEach(marker => {
        const shouldShow = zoom <= 17;
        marker.setVisible(shouldShow);
        
        if (shouldShow) {
            const scale = 6 + (zoom/2);
            marker.setIcon({
                ...marker.icon,
                scale: Math.min(scale, 16),
                label: {
                    ...marker.icon.label,
                    fontSize: `${Math.min(zoom * 0.8, 14)}px`
                }
            });
        }
    });

    // Handle spot markers
    if (zoom > 17 && window.activeLot) {
        showSpots(window.activeLot.spots);
    } else if (window.spotMarkers) {
        window.spotMarkers.forEach(m => m.setMap(null));
    }
}

async function generateSpots(spotData) {
    const spots = [];
    for (const row of Object.values(spotData)) {
        const start = await convertPlusCode(row.start);
        const end = await convertPlusCode(row.end);
        spots.push(...generateRowSpots(start, end, row.count));
    }
    return spots;
}

function generateRowSpots(start, end, count) {
    const latStep = (end.lat() - start.lat()) / (count - 1);
    const lngStep = (end.lng() - start.lng()) / (count - 1);
    
    return Array.from({ length: count }, (_, i) => ({
        position: {
            lat: start.lat() + (latStep * i),
            lng: start.lng() + (lngStep * i)
        },
        available: Math.random() > 0.5
    }));
}

function calculateAvailableSpots(spotData) {
    // Replace with actual AI data
    return Object.values(spotData).reduce((sum, row) => 
        sum + Math.floor(row.count * 0.6), 0);
}

async function convertPlusCode(plusCode) {
    return new Promise((resolve, reject) => {
        geocoder.geocode({ address: plusCode }, (results, status) => {
            if (status === "OK") {
                resolve(results[0].geometry.location);
            } else {
                reject(new Error(`Geocode failed for ${plusCode}: ${status}`));
            }
        });
    });
}

function createLiveFeedItems() {
    const container = document.getElementById('feed-grid');
    container.innerHTML = '';
    
    Object.keys(parkingLots).forEach(lotName => {
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.innerHTML = `
            <div class="thumbnail"></div>
            <div class="lot-name">${lotName}</div>
        `;
        item.onclick = () => showFeed(lotName);
        container.appendChild(item);
    });
}

function showFeed(lotName) {
    const video = document.getElementById('main-feed');
    video.src = `videos/${lotName.replace(/ /g, '_')}.mp4`;
    video.load();
    video.play().catch(error => console.log('Video play failed:', error));
}

function showMainView(view) {
    document.getElementById('splash-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('splash-screen').remove();
        document.getElementById('main-content').style.display = 'block';
        showView(view);
    }, 500);
}

function showView(viewId) {
    document.getElementById('map').style.display = viewId === 'map' ? 'block' : 'none';
    document.getElementById('live-feeds').style.display = viewId === 'live-feeds' ? 'block' : 'none';
}

function showSpots(spots) {
    if (window.spotMarkers) spotMarkers.forEach(m => m.setMap(null));
    
    window.spotMarkers = spots.map(spot => new google.maps.Marker({
        position: spot.position,
        map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: spot.available ? '#70e000' : '#ff006e',
            fillOpacity: 0.9,
            strokeColor: '#fff',
            strokeWeight: 1,
            scale: 6
        },
        zIndex: 999
    }));
}