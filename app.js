let map, geocoder;
const parkingLots = {
    "ARC Parking": {
        plusCode: "G6VV+72 Davis, California",
        spots: {
            row1: {
                start: "G6VR+CMC University of California-Davis, California",
                end: "G6VV+C2G University of California-Davis, California",
                count: 32,
                available: 15
            },
            row2: {
                start: "G6VR+9HG University of California-Davis, California",
                end: "G6VV+98G University of California-Davis, California",
                count: 64,
                available: 28
            }
        }
    },
    "Visitor Lot 22": {
        plusCode: "G6VV+WF Davis, California",
        spots: {
            row1: {
                start: "G6VV+WF Davis, California",
                end: "G6VV+WG Davis, California",
                count: 20,
                available: 8
            }
        }
    }
};

async function initMap() {
    geocoder = new google.maps.Geocoder();
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: { lat: 38.5382, lng: -121.7613 },
        mapTypeId: 'satellite',
        tilt: 0
    });

    // Create parking lots
    for (const [name, data] of Object.entries(parkingLots)) {
        await createParkingLot(name, data);
    }

    // Zoom listener
    google.maps.event.addListener(map, 'zoom_changed', () => {
        const zoom = map.getZoom();
        window.lotMarkers.forEach(marker => {
            marker.setVisible(zoom <= 17);
        });
    });

    createLiveFeedItems();
}

async function createParkingLot(name, data) {
    try {
        const position = await convertPlusCode(data.plusCode);
        const available = Object.values(data.spots).reduce((sum, row) => sum + row.available, 0);
        const total = Object.values(data.spots).reduce((sum, row) => sum + row.count, 0);

        const marker = new google.maps.Marker({
            position,
            map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#3a86ff',
                fillOpacity: 0.9,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: 10,
                label: {
                    text: `${available}`,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                }
            },
            title: `${name} (${available}/${total} available)`
        });

        marker.addListener('click', async () => {
            map.setCenter(position);
            map.setZoom(19);
            showSpots(await generateSpots(data.spots));
        });

        window.lotMarkers = window.lotMarkers || [];
        window.lotMarkers.push(marker);

    } catch (error) {
        console.error(`Error loading ${name}:`, error);
    }
}

async function generateSpots(spotData) {
    const spots = [];
    for (const row of Object.values(spotData)) {
        const start = await convertPlusCode(row.start);
        const end = await convertPlusCode(row.end);
        const count = row.count;
        
        const latStep = (end.lat() - start.lat()) / (count - 1);
        const lngStep = (end.lng() - start.lng()) / (count - 1);
        
        for (let i = 0; i < count; i++) {
            spots.push({
                position: {
                    lat: start.lat() + (latStep * i),
                    lng: start.lng() + (lngStep * i)
                },
                available: i < row.available
            });
        }
    }
    return spots;
}

async function convertPlusCode(plusCode) {
    return new Promise((resolve, reject) => {
        geocoder.geocode({ address: plusCode }, (results, status) => {
            if (status === "OK") {
                resolve(results[0].geometry.location);
            } else {
                reject(`Failed to convert: ${plusCode}`);
            }
        });
    });
}

function showSpots(spots) {
    if (window.spotMarkers) {
        window.spotMarkers.forEach(m => m.setMap(null));
    }
    
    window.spotMarkers = spots.map(spot => new google.maps.Marker({
        position: spot.position,
        map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: spot.available ? '#70e000' : '#ff006e',
            fillOpacity: 0.9,
            strokeColor: 'white',
            strokeWeight: 1,
            scale: 6
        }
    }));
}

function createLiveFeedItems() {
    const container = document.getElementById('feed-grid');
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