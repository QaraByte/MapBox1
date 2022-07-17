// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

$(document).ready(function () {
    let accessToken = 'pk.eyJ1IjoibnVyYmFjayIsImEiOiJjbDRpbWMxNjQwYXA2M2Rtbnl5b3lkYm8zIn0.beN8YkQ7eUrdsoRWDfKacg';
    //BuildingRoute1(accessToken);
    BuildingRoute2(accessToken);
});

function BuildingRoute1(token) {
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v10',
        //center: [22.662323, 25.523751], // starting position
        center: [76.841553, 43.234878], //; 76.82364625026634, 43.24952996412378
        zoom: 12
    });
    // set the bounds of the map
    //[-123.069003, 45.495273],
    //[-122.303707, 45.612333]
    const bounds = [
        [76.274003, 43.095273],
        [77.373707, 43.912333]
    ];
    map.setMaxBounds(bounds);
    // an arbitrary start will always be the same
    // only the end or destination will change
    const start = [76.841553, 43.234878];

    // this is where the code for the next step will go
    // create a function to make a directions request
    async function getRoute(end) {
        // make a directions request using cycling profile
        // an arbitrary start will always be the same
        // only the end or destination will change
        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
            { method: 'GET' }
        );
        const json = await query.json();
        const data = json.routes[0];
        const route = data.geometry.coordinates;
        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route
            }
        };
        // if the route already exists on the map, we'll reset it using setData
        if (map.getSource('route')) {
            map.getSource('route').setData(geojson);
        }
        // otherwise, we'll make a new request
        else {
            map.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: geojson
                },
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3887be',
                    'line-width': 5,
                    'line-opacity': 0.75
                }
            });
        }
        // add turn instructions here at the end
        // get the sidebar and add the instructions
        const instructions = document.getElementById('instructions');
        const steps = data.legs[0].steps;

        let tripInstructions = '';
        for (const step of steps) {
            tripInstructions += `<li>${step.maneuver.instruction}</li>`;
        }
        instructions.innerHTML = `<p><strong>Trip duration: ${Math.floor(
            data.duration / 60
        )} min 🚗 </strong></p><ol>${tripInstructions}</ol>`;
    }

    map.on('load', () => {
        // make an initial directions request that
        // starts and ends at the same location
        getRoute(start);

        // Add starting point to the map
        map.addLayer({
            id: 'point',
            type: 'circle',
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'Point',
                                coordinates: start
                            }
                        }
                    ]
                }
            },
            paint: {
                'circle-radius': 10,
                'circle-color': '#3887be'
            }
        });
        // this is where the code from the next step will go
        map.loadImage(
            //'https://docs.mapbox.com/mapbox-gl-js/assets/cat.png',
            'files/retro-car002.png',
            (error, image) => {
                if (error) throw error;

                // Add the image to the map style.
                map.addImage('cat', image);

                // Add a data source containing one point feature.
                map.addSource('point', {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': [
                            {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': [76.842553, 43.234878]
                                }
                            }
                        ]
                    }
                });

                // Add a layer to use the image to represent the data.
                map.addLayer({
                    'id': 'points',
                    'type': 'symbol',
                    'source': 'point', // reference the data source
                    'layout': {
                        'icon-image': 'cat', // reference the image
                        'icon-size': 0.25
                    }
                });
            }
        );
    });
    map.on('click', (event) => {
        const coords = Object.keys(event.lngLat).map((key) => event.lngLat[key]);
        const end = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Point',
                        coordinates: coords
                    }
                }
            ]
        };
        if (map.getLayer('end')) {
            map.getSource('end').setData(end);
        } else {
            map.addLayer({
                id: 'end',
                type: 'circle',
                source: {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: [
                            {
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'Point',
                                    coordinates: coords
                                }
                            }
                        ]
                    }
                },
                paint: {
                    'circle-radius': 10,
                    'circle-color': '#f30'
                }
            });
        }
        getRoute(coords);

        const point = new mapboxgl.Point(76, 43);
    });
}

function BuildingRoute2(token) {
    const truckLocation = [-83.093, 42.376];
    const warehouseLocation = [-83.083, 42.363];
    const lastAtRestaurant = 0;
    const keepTrack = [];
    const pointHopper = {};

    // Add your access token
    mapboxgl.accessToken = token;

    // Initialize a map
    const map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/light-v10', // stylesheet location
        center: truckLocation, // starting position
        zoom: 12 // starting zoom
    });

    map.on('load', async () => {
        const marker = document.createElement('div');
        marker.classList = 'truck';

        // Create a new marker
        new mapboxgl.Marker(marker).setLngLat(truckLocation).addTo(map);
        // Create a GeoJSON feature collection for the warehouse
        const warehouse = turf.featureCollection([turf.point(warehouseLocation)]);

        map.addLayer({
            id: 'warehouse',
            type: 'circle',
            source: {
                data: warehouse,
                type: 'geojson'
            },
            paint: {
                'circle-radius': 20,
                'circle-color': 'white',
                'circle-stroke-color': '#3887be',
                'circle-stroke-width': 3
            }
        });

        // Create a symbol layer on top of circle layer
        map.addLayer({
            id: 'warehouse-symbol',
            type: 'symbol',
            source: {
                data: warehouse,
                type: 'geojson'
            },
            layout: {
                'icon-image': 'grocery-15',
                'icon-size': 1
            },
            paint: {
                'text-color': '#3887be'
            }
        });

        // Listen for a click on the map
        await map.on('click', addWaypoints);
    });


    async function addWaypoints(event) {
        // When the map is clicked, add a new drop off point
        // and update the `dropoffs-symbol` layer
        await newDropoff(map.unproject(event.point));
        updateDropoffs(dropoffs);
    }
}

