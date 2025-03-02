let map, geocoder;
const ZOOM_THRESHOLD = 17;
const occupancyRectangles = {};

const parkingLots = {
    "ARC Parking": {
        bounds: {
            north: 38.543615,
            south: 38.542556,
            east: -121.756449,
            west: -121.758688
        },
        spots: {
            row1: {
                start: { lat: 38.543574, lng: -121.758342 },
                end: { lat: 38.543564, lng: -121.757409 },
                count: 32,
                available: 15
            },
            row2: {
                start: { lat: 38.543449, lng: -121.758558 },
                end: { lat: 38.543435, lng: -121.756670 },
                count: 64,
                available: 28
            }
        }
    },
    "Visitor Parking Lot 47": {
        bounds: {
            north: 38.535284,
            south: 38.534403,
            east: -121.755545,
            west: -121.757367
        },
        spots: {
            row1: {
                start: { lat: 38.535221, lng: -121.756104 },
                end: { lat: 38.535215, lng: -121.755596 },
                count: 18,
                available: 10 // Assuming 10 spots are available
            }
        }
    }
};

// Add missing functions
function getOccupancyColor(available, total) {
    const ratio = (total - available) / total;
    const red = Math.floor(255 * ratio);
    const green = Math.floor(255 * (1 - ratio));
    return `rgb(${red},${green},0)`;
}

function getLotIcon(available, total) {
    const ratio = available / total;
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: ratio > 0.5 ? '#70e000' : ratio > 0.2 ? '#ffbe0b' : '#ff006e',
        fillOpacity: 0.9,
        strokeColor: 'transparent',
        strokeWeight: 0,
        scale: 12,
        label: {
            text: `${available}`,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold'
        }
    };
}

async function initMap() {
    geocoder = new google.maps.Geocoder();
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: { lat: 38.538066, lng: -121.753007 },
        mapTypeId: 'satellite',
        tilt: 0,
        styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
    });

    window.lotMarkers = [];
    window.spotMarkers = [];

    await Promise.all(Object.entries(parkingLots).map(async ([name, data]) => {
        await createParkingLot(name, data);
    }));

    // Initial color update
    updateOccupancyColors();

    google.maps.event.addListener(map, 'zoom_changed', () => {
        const zoom = map.getZoom();
        const showSpots = zoom > ZOOM_THRESHOLD;
        
        window.lotMarkers.forEach(marker => marker.setVisible(!showSpots));
        window.spotMarkers.forEach(marker => marker.setMap(showSpots ? map : null));
        Object.values(occupancyRectangles).forEach(rect => rect.setMap(showSpots ? null : map));
    });

    setTimeout(() => {
        google.maps.event.trigger(map, 'zoom_changed');
        map.panTo({ lat: 38.543574, lng: -121.758342 });
    }, 1000);
    createLiveFeedItems();
}

async function createParkingLot(name, data) {
    try {
        const total = Object.values(data.spots).reduce((sum, row) => sum + row.count, 0);
        const available = Object.values(data.spots).reduce((sum, row) => sum + row.available, 0);

        // Create occupancy rectangle
        occupancyRectangles[name] = new google.maps.Rectangle({
            bounds: data.bounds,
            map: null,
            fillColor: getOccupancyColor(available, total),
            fillOpacity: 0.6,
            strokeColor: '#ffffff',
            strokeWeight: 1
        });

        const rectangle = occupancyRectangles[name];

        // show lot available/total on hover 
        rectangle.addListener('mouseover', () => {
            rectangle.setOptions({
                fillColor: getOccupancyColor(available, total),
                fillOpacity: 0.8
            });
        });

        rectangle.addListener('mouseout', () => {
            rectangle.setOptions({
                fillColor: getOccupancyColor(available, total),
                fillOpacity: 0.6
            });
        });

        // Create lot marker


        // Generate spots
        const spots = await generateSpots(data.spots);
        spots.forEach(spot => {
            const spotMarker = new google.maps.Marker({
                position: new google.maps.LatLng(spot.position.lat, spot.position.lng),
                map: null,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: spot.available ? '#70e000' : '#ff006e',
                    scale: 6,
                    strokeColor: 'transparent',
                    fillOpacity: 0.9
                }
            });
            window.spotMarkers.push(spotMarker);
        });
    } catch (error) {
        console.error(`Error creating ${name}:`, error);
    }
}

// Convert Plus Codes to coordinates
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

// Generate parking spots between start and end points
async function generateSpots(spotData) {
    const spots = [];
    
    for (const row of Object.values(spotData)) {
        const start = row.start;
        const end = row.end;
        const count = row.count;
        
        const latStep = (end.lat - start.lat) / (count - 1);
        const lngStep = (end.lng - start.lng) / (count - 1);
        
        for (let i = 0; i < count; i++) {
            spots.push({
                position: {
                    lat: start.lat + (latStep * i),
                    lng: start.lng + (lngStep * i)
                },
                available: i < row.available
            });
        }
    }
    return spots;
}

function updateOccupancyColors() {
    Object.entries(parkingLots).forEach(([name, data]) => {
        const total = Object.values(data.spots).reduce((sum, row) => sum + row.count, 0);
        const available = Object.values(data.spots).reduce((sum, row) => sum + row.available, 0);
        
        if (occupancyRectangles[name]) {
            occupancyRectangles[name].setOptions({
                fillColor: getOccupancyColor(available, total),
                strokeColor: getOccupancyColor(available, total)
            });
        }
    });
}

// Live feed functions
function createLiveFeedItems() {
    const container = document.getElementById('feed-grid');
    container.innerHTML = '';
    
    Object.keys(parkingLots).forEach(lot => {
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.innerHTML = `
            <div class="thumbnail"></div>
            <div class="lot-name">${lot}</div>
        `;
        item.onclick = () => {
            document.getElementById('main-feed').src = `${lot.replace(/ /g, '_')}.mp4`;
            document.getElementById('main-feed').play();
        };
        container.appendChild(item);
    });
}

// View controls
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