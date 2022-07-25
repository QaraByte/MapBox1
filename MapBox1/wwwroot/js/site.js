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
    let truckLocation = [-83.093, 42.386];
    const warehouseLocation = [-83.083, 42.363];
    // Create an empty GeoJSON feature collection for drop-off locations
    const dropoffs = turf.featureCollection([]);
    // Create an empty GeoJSON feature collection, which will be used as the data source for the route before users add any new data
    const nothing = turf.featureCollection([]);
    const lastAtRestaurant = 0;
    let keepTrack = [];
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
        map.addLayer(
            {
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
            }
        );
        map.addLayer(
            {
                id: 'dropoffs-symbol',
                type: 'symbol',
                source: {
                    data: dropoffs,
                    type: 'geojson'
                },
                layout: {
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'icon-image': 'marker-15'
                }
            }
        );
        map.addSource('route', {
            type: 'geojson',
            data: nothing
        });

        map.addLayer(
            {
                id: 'routeline-active',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3887be',
                    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 22, 12]
                }
            },
            'waterway-label'
        );
        map.addLayer(
            {
                id: 'routearrows',
                type: 'symbol',
                source: 'route',
                layout: {
                    'symbol-placement': 'line',
                    'text-field': '▶',
                    'text-size': ['interpolate', ['linear'], ['zoom'], 12, 24, 22, 60],
                    'symbol-spacing': ['interpolate', ['linear'], ['zoom'], 12, 30, 22, 160],
                    'text-keep-upright': false
                },
                paint: {
                    'text-color': '#3887be',
                    'text-halo-color': 'hsl(55, 11%, 96%)',
                    'text-halo-width': 3
                }
            },
            'waterway-label'
        );

        //truckLocation = [-83.093, 42.376];
        // повторить с интервалом 2 секунды
        let timerId = setInterval(() => ChangeLocation(truckLocation, marker, map), 2000);
        //new mapboxgl.Marker(marker).setLngLat(truckLocation).addTo(map);
        // остановить вывод через 5 секунд
        setTimeout(() => { clearInterval(timerId); console.log('stop'); }, 10000);
        

        // Listen for a click on the map
        await map.on('click', addWaypoints);
    });

    async function addWaypoints(event) {
        // When the map is clicked, add a new drop off point
        // and update the `dropoffs-symbol` layer
        await newDropoff(map.unproject(event.point));
        updateDropoffs(dropoffs);
    }

    async function newDropoff(coordinates) {
        // Store the clicked point as a new GeoJSON feature with
        // two properties: `orderTime` and `key`
        const pt = turf.point([coordinates.lng, coordinates.lat], {
            orderTime: Date.now(),
            key: Math.random()
        });
        dropoffs.features.push(pt);
        pointHopper[pt.properties.key] = pt;

        // Make a request to the Optimization API
        const query = await fetch(assembleQueryURL(), { method: 'GET' });
        const response = await query.json();

        // Create an alert for any requests that return an error
        if (response.code !== 'Ok') {
            const handleMessage =
                response.code === 'InvalidInput'
                    ? 'Refresh to start a new route. For more information: https://docs.mapbox.com/api/navigation/optimization/#optimization-api-errors'
                    : 'Try a different point.';
            alert(`${response.code} - ${response.message}\n\n${handleMessage}`);
            // Remove invalid point
            dropoffs.features.pop();
            delete pointHopper[pt.properties.key];
            return;
        }
        // Create a GeoJSON feature collection
        const routeGeoJSON = turf.featureCollection([
            turf.feature(response.trips[0].geometry)
        ]);
        // Update the `route` source by getting the route source
        // and setting the data equal to routeGeoJSON
        map.getSource('route').setData(routeGeoJSON);
    }

    function updateDropoffs(geojson) {
        map.getSource('dropoffs-symbol').setData(geojson);
    }

    // Here you'll specify all the parameters necessary for requesting a response from the Optimization API
    function assembleQueryURL() {
        // Store the location of the truck in a constant called coordinates
        const coordinates = [truckLocation];
        const distributions = [];
        let restaurantIndex;
        keepTrack = [truckLocation];

        // Create an array of GeoJSON feature collections for each point
        const restJobs = Object.keys(pointHopper).map((key) => pointHopper[key]);

        // If there are any orders from this restaurant
        if (restJobs.length > 0) {
            // Check to see if the request was made after visiting the restaurant
            const needToPickUp =
                restJobs.filter((d) => {
                    return d.properties.orderTime > lastAtRestaurant;
                }).length > 0;

            // If the request was made after picking up from the restaurant,
            // Add the restaurant as an additional stop
            if (needToPickUp) {
                restaurantIndex = coordinates.length;
                // Add the restaurant as a coordinate
                coordinates.push(warehouseLocation);
                // push the restaurant itself into the array
                keepTrack.push(pointHopper.warehouse);
            }

            for (const job of restJobs) {
                // Add dropoff to list
                keepTrack.push(job);
                coordinates.push(job.geometry.coordinates);
                // if order not yet picked up, add a reroute
                if (needToPickUp && job.properties.orderTime > lastAtRestaurant) {
                    distributions.push(`${restaurantIndex},${coordinates.length - 1}`);
                }
            }
        }

        // Set the profile to `driving`
        // Coordinates will include the current location of the truck,
        return `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates.join(
            ';'
        )}?distributions=${distributions.join(
            ';'
        )}&overview=full&steps=true&geometries=geojson&source=first&access_token=${mapboxgl.accessToken
            }`;
    }

    

    function ChangeLocation(location, marker, map) {
        let x = location[0];
        let y = location[1];
        x = x - 0.01;
        y = y + 0.01;
        new mapboxgl.Marker(marker).setLngLat(truckLocation).addTo(map);
        console.log('x=' + x+'; y=' + y);
        truckLocation = [x, y];
    }
}

