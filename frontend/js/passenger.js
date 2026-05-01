
(() => {
  'use strict';

  const byIds = (...ids) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        return el;
      }
    }
    return null;
  };

  const state = {
    userLocation: null,
    activeBooking: null,
    driverMarkers: new Map(),
    routePolylines: new Map(),
    destinationMarker: null,
    pollingIntervals: new Map(),
    passengerMap: null,
    userMarker: null,
    isTracking: false,
    pendingTracking: false,
    locationRetryAttempted: false,
    selectedDriverId: null,
    trackedDriverId: null,
    trackedDriverData: null,
    lastTrackedLocation: null,
    nearbyVehiclesInterval: null,
    trackingUpdateInterval: null,
    passengerId: GreenRoute.utils.getStorage(GreenRoute.storage.passengerId, null),
    passengerName: null,
    passengerPhoto: null
  };

  const handleSignOut = async () => {
    const sessionId = localStorage.getItem('sessionId');
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(sessionId ? { 'x-session-id': sessionId } : {}) },
        body: JSON.stringify({ sessionId })
      });
    } catch (error) {
      console.warn('Sign out request failed, clearing local session only:', error);
    }

    localStorage.removeItem('sessionId');
    GreenRoute.utils.removeStorage(GreenRoute.storage.passengerId);
    GreenRoute.utils.removeStorage(GreenRoute.storage.userRole);
    window.location.href = '../index.html';
  };

  let elements = {};

  const initMap = () => {
    if (!elements.map) {
      console.error('Map element not found');
      return;
    }

    // Avoid double initialization
    if (state.passengerMap) {
      console.warn('Map already initialized');
      return;
    }

    if (window.L) {
      try {
        state.passengerMap = L.map(elements.map, {
          center: GreenRoute.config.mapCenter,
          zoom: GreenRoute.config.defaultZoom,
          zoomControl: false,
          attributionControl: false
        });

        const primaryTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        });

        const fallbackTiles = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        });

        primaryTiles.on('tileerror', () => {
          if (!state.passengerMap.hasLayer(fallbackTiles)) {
            fallbackTiles.addTo(state.passengerMap);
          }
        });

        primaryTiles.addTo(state.passengerMap);

        // Hide loading indicator
        const mapLoading = document.querySelector('.map-loading');
        if (mapLoading) {
          mapLoading.style.display = 'none';
        }


        // Get user location after map loads
        setTimeout(() => {
          getUserLocation();
        }, 1000);

      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    } else {
      console.error('Leaflet not available');
    }
  };

  const handleSOS = () => {
    const message = `EMERGENCY ALERT\nPassenger: ${state.passengerId}\nLocation: ${state.userLocation ? `${state.userLocation.lat.toFixed(6)}, ${state.userLocation.lng.toFixed(6)}` : 'Unknown'}\nTime: ${new Date().toLocaleString()}\nStatus: ${state.activeBooking ? 'On trip' : 'Waiting for ride'}`;
    alert(message);

    if (elements.sosButton) {
      elements.sosButton.style.background = '#ef4444';
      elements.sosButton.textContent = 'SOS SENT';

      setTimeout(() => {
        elements.sosButton.style.background = '';
        elements.sosButton.textContent = 'SOS';
      }, 3000);
    }
  };

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      if (elements.pickupInput) {
        elements.pickupInput.value = 'Enable location to continue';
        elements.pickupInput.disabled = true;
      }
      return;
    }

    if (elements.pickupInput) {
      elements.pickupInput.value = 'Detecting your location...';
    }

    const requestLocation = (options) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          state.locationRetryAttempted = false;
          state.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          const address = await GreenRoute.utils.reverseGeocode(state.userLocation.lat, state.userLocation.lng);
          if (elements.pickupInput) {
            elements.pickupInput.value = address || 'Current location';
          }

          // Add user marker to map
          if (state.passengerMap && state.userLocation) {
            if (state.userMarker) {
              state.userMarker.setLatLng([state.userLocation.lat, state.userLocation.lng]);
            } else {
              state.userMarker = L.marker([state.userLocation.lat, state.userLocation.lng], {
                icon: L.divIcon({
                  html: '<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4);"></div>',
                  iconSize: [22, 22],
                  iconAnchor: [11, 11],
                  className: 'user-location-marker'
                })
              }).addTo(state.passengerMap);

              state.userMarker.bindPopup('<strong>Your Location</strong><br>You are here');
              state.passengerMap.setView([state.userLocation.lat, state.userLocation.lng], 15);
            }
          }

          if (state.pendingTracking) {
            state.pendingTracking = false;
            startTracking();
          }
        },
        (error) => {
          if (error.code === error.TIMEOUT && !state.locationRetryAttempted) {
            console.warn('Geolocation timed out, retrying with relaxed settings');
            state.locationRetryAttempted = true;
            if (elements.pickupInput) {
              elements.pickupInput.value = 'Location timed out. Retrying...';
            }
            requestLocation({
              enableHighAccuracy: false,
              timeout: Math.max(GreenRoute.config.gpsTimeout || 10000, 15000),
              maximumAge: 300000
            });
            return;
          }

          console.error('Geolocation error:', error);

          if (elements.pickupInput) {
            elements.pickupInput.value = 'Enable location to continue';
            elements.pickupInput.disabled = false;
          }

          let errorMessage = 'Enable location to continue';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          if (elements.pickupInput) {
            elements.pickupInput.value = errorMessage;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: GreenRoute.config.gpsTimeout,
          maximumAge: 60000
        });
    };

    requestLocation({
      enableHighAccuracy: true,
      timeout: GreenRoute.config.gpsTimeout,
      maximumAge: 60000
    });
  };

  // Create much better driver icons
  const createDriverMarker = (driver) => {
    const isTrotro = driver.vehicleType?.toLowerCase() === 'trotro';
    const photoUrl = driver.driverPhoto || '../assets/default-driver.svg';
    const borderColor = isTrotro ? '#f59e0b' : '#3b82f6';
    
    const iconHtml = `<div style="
      width: 48px;
      height: 48px;
      position: relative;
      cursor: pointer;
    ">
      <div style="
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 4px solid ${borderColor};
        overflow: hidden;
        background: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        <img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='../assets/default-driver.svg'">
      </div>
    </div>`;

    return L.divIcon({
      html: iconHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
      className: 'driver-photo-marker'
    });
  };

  const getDirectionText = (origin, destination) => {
    if (!origin && !destination) {
      return 'Direction unknown';
    }
    if (origin && destination) {
      return `${origin} → ${destination}`;
    }
    return origin || destination || 'Direction unknown';
  };

  const getVehicleLabel = (vehicleType) => {
    return (vehicleType || 'taxi').toLowerCase() === 'trotro' ? 'Trotro' : 'Taxi';
  };

  // Get route coordinates for destination
  const getDestinationCoordinates = async (destination) => {
    const knownStops = {
      'madina': { lat: 5.678, lng: -0.165 },
      'circle': { lat: 5.560, lng: -0.205 },
      'adenta': { lat: 5.701, lng: -0.166 },
      'kaneshie': { lat: 5.570, lng: -0.234 },
      'tema station': { lat: 5.614, lng: -0.072 },
      'accra central': { lat: 5.550, lng: -0.206 },
      'airport': { lat: 5.605, lng: -0.171 },
      'east legon': { lat: 5.640, lng: -0.148 },
      'labone': { lat: 5.563, lng: -0.189 },
      'osu': { lat: 5.553, lng: -0.198 }
    };

    const normalizedDest = destination.toLowerCase().trim();
    if (knownStops[normalizedDest]) {
      return knownStops[normalizedDest];
    }

    // Fallback to geocoding so free-text destinations can still use road routing.
    try {
      const query = encodeURIComponent(`${destination}, Accra, Ghana`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`);
      if (!response.ok) {
        return null;
      }

      const results = await response.json();
      const first = Array.isArray(results) ? results[0] : null;
      if (!first) {
        return null;
      }

      return {
        lat: Number(first.lat),
        lng: Number(first.lon)
      };
    } catch (error) {
      console.warn('Destination geocoding failed:', error);
      return null;
    }
  };

  const fetchRoadGeometry = async (fromLat, fromLng, toLat, toLng, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const coordinates = data?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          continue;
        }

        // OSRM returns [lng, lat], Leaflet expects [lat, lng].
        return coordinates.map(([lng, lat]) => [lat, lng]);
      } catch (error) {
        console.warn(`OSRM road routing attempt ${attempt + 1} failed:`, error.message);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    return null;
  };

  // Create road-based route path - FIXED TO FOLLOW ACTUAL ROADS
  const createRoadBasedRoutePath = async (fromLat, fromLng, toLat, toLng, routeId = 'default', color = 'var(--primary)', skipFitBounds = false) => {
    if (!state.passengerMap) return;
    // Remove existing route if it exists
    if (state.routePolylines.has(routeId)) {
      state.passengerMap.removeLayer(state.routePolylines.get(routeId));
    }

    let roadPath = await fetchRoadGeometry(fromLat, fromLng, toLat, toLng);

    // Fallback to local road graph for known nearby stops.
    if (!roadPath) {
      const fromStop = findNearestStop(fromLat, fromLng);
      const toStop = findNearestStop(toLat, toLng);

      if (fromStop && toStop && window.RoadRouting) {
        roadPath = window.RoadRouting.getRoadPath(fromStop, toStop);
      }
    }

    // Final fallback if routing providers are unavailable.
    if (!roadPath) {
      roadPath = createRealisticPath([fromLat, fromLng], [toLat, toLng]);
    }

    if (!roadPath || roadPath.length < 2) {
      console.warn('No valid road path found', { fromLat, fromLng, toLat, toLng, roadPath });
      return;
    }

    // Normalize path entries: allow objects {lat,lng} or arrays [lat,lng]
    roadPath = roadPath.map(pt => {
      if (Array.isArray(pt)) return pt;
      if (pt && typeof pt === 'object' && ('lat' in pt) && ('lng' in pt)) return [pt.lat, pt.lng];
      return null;
    }).filter(Boolean);

    // Create the polyline with road-following appearance
    const polyline = L.polyline(roadPath, {
      color: color,
      weight: 6,
      opacity: 0.9,
      dashArray: null,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'road-route-path'
    }).addTo(state.passengerMap);
    
    state.routePolylines.set(routeId, polyline);

    // Calculate road distance
    const roadDistance = window.RoadRouting ?
      window.RoadRouting.calculateRoadDistance(roadPath) :
      GreenRoute.utils.calculateDistance(fromLat, fromLng, toLat, toLng);

    // Fit map to show the entire route with proper padding
    if (!skipFitBounds && roadPath.length > 0) {
      try {
        const bounds = L.latLngBounds(roadPath);
        state.passengerMap.fitBounds(bounds, { padding: [50, 50] });
      } catch (boundsErr) {
        console.warn('Map: Failed to fit bounds:', boundsErr);
      }
    }
  };

  // Find nearest known stop to coordinates
  const findNearestStop = (lat, lng) => {
    const stops = {
      'madina': { lat: 5.678, lng: -0.165 },
      'circle': { lat: 5.560, lng: -0.205 },
      'adenta': { lat: 5.701, lng: -0.166 },
      'kaneshie': { lat: 5.570, lng: -0.234 },
      'tema station': { lat: 5.614, lng: -0.072 },
      'accra central': { lat: 5.550, lng: -0.206 },
      'airport': { lat: 5.605, lng: -0.171 },
      'east legon': { lat: 5.640, lng: -0.148 },
      'labone': { lat: 5.563, lng: -0.189 },
      'osu': { lat: 5.553, lng: -0.198 }
    };

    let nearestStop = null;
    let minDistance = Infinity;

    for (const [name, coords] of Object.entries(stops)) {
      const distance = GreenRoute.utils.calculateDistance(lat, lng, coords.lat, coords.lng);
      if (distance < minDistance && distance < 2.0) { // Within 2km
        minDistance = distance;
        nearestStop = name;
      }
    }

    return nearestStop;
  };

  // Create realistic path with road-like curves
  const createRealisticPath = (startPoint, endPoint) => {
    const [fromLat, fromLng] = startPoint;
    const [toLat, toLng] = endPoint;

    const path = [[fromLat, fromLng]];

    // Add intermediate waypoints that simulate road bends
    const steps = 12;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;

      // Linear interpolation
      let lat = fromLat + (toLat - fromLat) * t;
      let lng = fromLng + (toLng - fromLng) * t;

      // Add road-like curves (simulate following actual roads)
      const curve = Math.sin(t * Math.PI * 2) * 0.003;
      const bend = Math.cos(t * Math.PI * 1.5) * 0.002;

      lng += curve + bend;

      path.push([lat, lng]);
    }

    path.push([toLat, toLng]);
    return path;
  };

  // Update driver markers with improved icons
  let lastApiCall = 0;
  const updateDriverMarkers = async (forceRefresh = false) => {
    if (!state.passengerMap) return;
    
    // Rate limiting: don't make API calls more frequently than every 5 seconds
    if (!forceRefresh) {
      const now = Date.now();
      if (now - lastApiCall < 5000) {
        return;
      }
      lastApiCall = now;
    }

    try {
      const rides = await window.api.getAvailableRides();
      if (!Array.isArray(rides)) {
        console.warn('No rides available');
        return;
      }

      const currentDriverIds = new Set();
      const nearbyVehicleRows = [];

      // Update stats pill text instead of clearing it
      if (elements.nearbyVehicles) elements.nearbyVehicles.innerHTML = '';

      for (const ride of rides) {
        if (!(ride.latitude && ride.longitude)) continue;
        currentDriverIds.add(ride.driverId);

        const vehicleLabel = getVehicleLabel(ride.vehicleType);
        const directionText = getDirectionText(ride.origin, ride.destination);
        const isTrotro = vehicleLabel === 'Trotro';
        const distanceKm = state.userLocation
          ? GreenRoute.utils.calculateDistance(ride.latitude, ride.longitude, state.userLocation.lat, state.userLocation.lng)
          : null;

        // Compute ETA if we have user location
        let etaText = 'N/A';
        if (state.userLocation) {
          const distance = distanceKm;
          try {
            const eta = GreenRoute.utils.calculateETA(distance);
            etaText = `${eta} min`;
          } catch {
            etaText = Math.ceil(distance * 2) + ' min';
          }
        }

        // Create/update marker
        if (!state.driverMarkers.has(ride.driverId)) {
          if (state.passengerMap) {
            const marker = L.marker([ride.latitude, ride.longitude], { icon: createDriverMarker(ride) }).addTo(state.passengerMap);
            const popupContent = `<div style="min-width: 220px; font-family: system-ui;"><strong style="color: #1f2937; font-size: 14px;">${ride.driverName || 'Driver'}</strong><br><div style="margin:4px 0;"><span style="color:#6b7280;">Plate:</span> <span style="font-weight:600;">${ride.licensePlate || 'N/A'}</span></div><div style="margin:4px 0;"><span style="color:#6b7280;">Type:</span> <span style="font-weight:600;">${vehicleLabel}</span></div><div style="margin:4px 0;"><span style="color:#6b7280;">Route:</span> <span style="font-weight:600;">${directionText}</span></div><div style="margin:4px 0;"><span style="color:#6b7280;">ETA:</span> <span style="font-weight:600;">${etaText}</span></div></div>`;
            marker.bindPopup(popupContent);
            state.driverMarkers.set(ride.driverId, marker);
          }
        } else {
          const marker = state.driverMarkers.get(ride.driverId);
          marker.setLatLng([ride.latitude, ride.longitude]);
          marker.getPopup()?.setContent(`<div style="min-width: 220px; font-family: system-ui;"><strong style="color: #1f2937; font-size: 14px;">${ride.driverName || 'Driver'}</strong><br><div style="margin:4px 0;"><span style="color:#6b7280;">Plate:</span> <span style="font-weight:600;">${ride.licensePlate || 'N/A'}</span></div><div style="margin:4px 0;"><span style="color:#6b7280;">Type:</span> <span style="font-weight:600;">${vehicleLabel}</span></div><div style="margin:4px 0;"><span style="color:#6b7280;">Route:</span> <span style="font-weight:600;">${directionText}</span></div><div style="margin:4px 0;"><span style="color:#6b7280;">ETA:</span> <span style="font-weight:600;">${etaText}</span></div></div>`);
        }

        nearbyVehicleRows.push({
          driverName: ride.driverName || 'Driver',
          driverPhoto: ride.driverPhoto,
          plate: ride.licensePlate || 'N/A',
          vehicleLabel,
          directionText,
          etaText,
          isTrotro,
          distanceKm: distanceKm ?? Number.POSITIVE_INFINITY,
          trackerCount: ride.trackerCount || 0,
          ride
        });
      }


      if (elements.nearbyVehicles) {
        const orderedVehicles = nearbyVehicleRows
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 8);

        elements.nearbyVehicles.innerHTML = orderedVehicles.map(vehicle => {
          const isTracking = state.trackedDriverId && vehicle.ride && state.trackedDriverId === vehicle.ride.driverId;
          const photoUrl = vehicle.driverPhoto || '../assets/default-driver.svg';
          
          return `
          <div class="vehicle-row-v2 ${isTracking ? 'active' : ''}" data-driver-id="${vehicle.ride?.driverId || ''}">
            <img src="${photoUrl}" alt="${vehicle.driverName}" class="vehicle-avatar-v2" onerror="this.src='../assets/default-driver.svg'">
            <div class="vehicle-info-v2">
              <div class="vehicle-name-v2">
                ${vehicle.driverName}
              </div>
              <div class="vehicle-meta-v2">${vehicle.plate} • ${vehicle.vehicleLabel}</div>
              <div class="vehicle-trackers-v2">
                <span style="display:inline-block;width:6px;height:6px;background:var(--primary);border-radius:50%;animation:pulse 2s infinite;"></span>
                ${vehicle.trackerCount} tracking
              </div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:4px;">
                ${vehicle.directionText}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:8px;">
              <div class="vehicle-eta-v2">
                <strong>${vehicle.etaText}</strong>
                <span>ETA</span>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="track-driver-btn btn-track-v2 ${isTracking ? 'active' : ''}" data-driver-id="${vehicle.ride?.driverId || ''}" data-driver-name="${vehicle.driverName}" data-ride-id="${vehicle.ride?.id || ''}">
                  ${isTracking ? 'Tracking' : 'Track'}
                </button>
                <button class="book-driver-btn btn-book-v2" data-driver-id="${vehicle.ride?.driverId || ''}" data-driver-name="${vehicle.driverName}" data-ride-id="${vehicle.ride?.id || ''}" data-fare="${vehicle.ride?.fare || 5.50}">
                  Book
                </button>
              </div>
            </div>
          </div>
          `;
        }).join('');

        // Update tracking panel and live route
        if (typeof updateTrackingList === 'function') {
          updateTrackingList(orderedVehicles);
        }

        // Auto-update route for currently tracked driver if they moved
        if (state.trackedDriverId && state.userLocation) {
          const trackedRide = rides.find(r => r.driverId === state.trackedDriverId);
          if (trackedRide && trackedRide.latitude && trackedRide.longitude) {
            // Only update if driver has moved significantly (> 50m)
            const lastLoc = state.lastTrackedLocation;
            const hasMoved = !lastLoc || GreenRoute.utils.calculateDistance(
              trackedRide.latitude, trackedRide.longitude, 
              lastLoc.lat, lastLoc.lng
            ) > 0.05;

            if (hasMoved) {
              createRoadBasedRoutePath(
                trackedRide.latitude, trackedRide.longitude,
                state.userLocation.lat, state.userLocation.lng,
                'driver-to-passenger',
                'var(--primary)',
                true // skipFitBounds
              );
              state.lastTrackedLocation = { lat: trackedRide.latitude, lng: trackedRide.longitude };
            }
          }
        }

        const nearbyContainer = document.getElementById('nearby-vehicles-container');
        if (!orderedVehicles.length) {
          elements.nearbyVehicles.innerHTML = '<div style="opacity:0.75;padding:6px 0;text-align:center;">No nearby taxis or trotros found.</div>';
          if (nearbyContainer) nearbyContainer.style.display = 'none';
        } else {
          if (nearbyContainer) nearbyContainer.style.display = 'block';
        }

        // Handle Booking from list
        document.querySelectorAll('.book-driver-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const dest = btn.closest('div').parentElement.querySelector('[data-dest]')?.getAttribute('data-dest') || '';
            // If the driver has a destination, we can use it, but usually passenger wants THEIR destination
            if (elements.destinationInput && !elements.destinationInput.value) {
              showNotification('Please enter your destination first', 'warning');
              elements.destinationInput.focus();
              return;
            }
            findRide();
          });
        });

        // Add click handlers to track buttons
        document.querySelectorAll('.track-driver-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const driverId = btn.getAttribute('data-driver-id');
            const driverName = btn.getAttribute('data-driver-name');

            if (!driverId) return;

            try {
              if (state.trackedDriverId === driverId) {
                // Stop tracking
                await window.api.stopTrackingDriver(state.passengerId, driverId);
                state.trackedDriverId = null;
                state.trackedDriverData = null;
                localStorage.removeItem('greenroute-tracked-driver-id');
                btn.textContent = 'Track';
                btn.style.background = 'transparent';
                btn.style.color = '#3b82f6';
                if (state.trackingUpdateInterval) {
                  clearInterval(state.trackingUpdateInterval);
                  state.trackingUpdateInterval = null;
                }
                if (elements.nearbyVehicles && elements.nearbyVehicles.parentElement) {
                  const statusDiv = elements.nearbyVehicles.parentElement.querySelector('.tracking-status');
                  if (statusDiv) statusDiv.remove();
                }
                // Remove route polyline
                if (state.routePolylines.has('driver-to-passenger')) {
                  state.passengerMap.removeLayer(state.routePolylines.get('driver-to-passenger'));
                  state.routePolylines.delete('driver-to-passenger');
                }
              } else {
                // Start tracking
                if (!state.userLocation) {
                  showNotification('Please set your location on the map first to see the route.', 'warning');
                }

                if (state.trackedDriverId) {
                  // Stop tracking previous driver
                  await window.api.stopTrackingDriver(state.passengerId, state.trackedDriverId);
                }
                await window.api.startTrackingDriver(
                  state.passengerId, 
                  driverId, 
                  state.userLocation ? state.userLocation.lat : null,
                  state.userLocation ? state.userLocation.lng : null,
                  elements.destinationInput?.value || ''
                );
                state.trackedDriverId = driverId;
                state.trackedDriverData = { driverId, driverName };
                localStorage.setItem('greenroute-tracked-driver-id', driverId);
                btn.textContent = 'Tracking';
                btn.style.background = '#3b82f6';
                btn.style.color = 'white';

                // Periodically update passenger location for the driver
                if (state.trackingUpdateInterval) clearInterval(state.trackingUpdateInterval);
                state.trackingUpdateInterval = setInterval(async () => {
                  if (state.trackedDriverId && state.userLocation) {
                    try {
                      console.log(`[Tracking] Sending heartbeat for driver ${state.trackedDriverId}...`);
                      await window.api.startTrackingDriver(
                        state.passengerId, 
                        state.trackedDriverId,
                        state.userLocation.lat,
                        state.userLocation.lng,
                        elements.destinationInput?.value || '',
                        state.passengerName,
                        state.passengerPhoto
                      );
                    } catch (err) {
                      console.error('[Tracking] Heartbeat failed:', err);
                    }
                  }
                }, 10000); // Update location every 10 seconds

                // Draw route from driver to passenger on the map
                if (state.userLocation) {
                  const rideId = btn.getAttribute('data-ride-id');
                  if (rideId) {
                    try {
                      const rideData = await window.api.getRide(rideId);
                      if (rideData && rideData.latitude && rideData.longitude) {
                        await createRoadBasedRoutePath(
                          rideData.latitude, rideData.longitude,
                          state.userLocation.lat, state.userLocation.lng,
                          'driver-to-passenger',
                          '#3b82f6'
                        );
                      }
                    } catch (routeErr) {
                      // Silently fail if route cannot be drawn
                    }
                  }
                }

                // Show tracking status indicator
                if (elements.nearbyVehicles && elements.nearbyVehicles.parentElement) {
                  let statusDiv = elements.nearbyVehicles.parentElement.querySelector('.tracking-status');
                  if (!statusDiv) {
                    statusDiv = document.createElement('div');
                    statusDiv.className = 'tracking-status';
                    elements.nearbyVehicles.parentElement.insertBefore(statusDiv, elements.nearbyVehicles);
                  }
                  statusDiv.innerHTML = `Tracking <strong>${driverName}</strong> — Driver notified`;
                }
              }
              // Re-render to show updated button states
              updateDriverMarkers(true);
            } catch (err) {
              console.error('Failed to toggle tracking:', err);
              alert('Failed to ' + (state.trackedDriverId === driverId ? 'stop' : 'start') + ' tracking: ' + err.message);
            }
          });
        });

        // Add click handlers to book buttons
        document.querySelectorAll('.book-driver-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const rideId = btn.getAttribute('data-ride-id');
            const driverId = btn.getAttribute('data-driver-id');
            const driverName = btn.getAttribute('data-driver-name');
            const fare = parseFloat(btn.getAttribute('data-fare') || '5.50');

            if (!rideId || !driverId) return;

            if (!state.passengerId) {
              alert('Please sign in to book a ride');
              return;
            }

            if (!state.userLocation) {
              alert('Please enable location to book a ride');
              return;
            }

            const getPassengersCount = () => {
              if (!elements.passengersCount) return 1;
              const val = elements.passengersCount.value || elements.passengersCount.textContent;
              return parseInt(val || '1', 10) || 1;
            };
            const passengers = getPassengersCount();

            try {
              btn.disabled = true;
              btn.textContent = 'Booking...';

              const booking = await window.api.createBooking(
                rideId,
                state.passengerId,
                passengers,
                state.userLocation.lat,
                state.userLocation.lng
              );

              const totalFare = fare * passengers;

              state.activeBooking = {
                ...booking,
                rideId: rideId,
                driverId: driverId,
                driverName: booking.driverName || driverName,
                licensePlate: booking.licensePlate || 'N/A',
                fare: totalFare,
                seats: passengers
              };

              // Hide nearby vehicles panel
              const nearbyContainer = document.getElementById('nearby-vehicles-container');
              if (nearbyContainer) nearbyContainer.style.display = 'none';

              // Show active ride panel
              showActiveRide(state.activeBooking, totalFare, passengers);

              showNotification('Ride booked successfully!', 'success');

              // Start tracking the ride
              startTracking();

            } catch (err) {
              console.error('Failed to book ride:', err);
              alert('Failed to book ride: ' + (err.message || 'Unknown error'));
              btn.disabled = false;
              btn.textContent = 'Book';
            }
          });
        });
      }

      // Remove markers that are no longer active
      for (const [driverId, marker] of state.driverMarkers) {
        if (!currentDriverIds.has(driverId)) {
          if (state.passengerMap) {
            state.passengerMap.removeLayer(marker);
          }
          state.driverMarkers.delete(driverId);
        }
      }

      if (elements.driversCount) {
        elements.driversCount.textContent = `${currentDriverIds.size} nearby vehicles`;
      }
    } catch (err) {
      console.error('Failed to update driver markers:', err);
    }
  };

  // Track active trip with road-based route
  const trackActiveTrip = async () => {
    if (!state.activeBooking || !state.activeBooking.rideId) {
      return;
    }

    if (!state.userLocation) {
      if (elements.arrivalTime) {
        elements.arrivalTime.textContent = 'Locating...';
      }
      return;
    }

    if (!elements.arrivalTime) {
      return;
    }

    try {
      const ride = await window.api.getRide(state.activeBooking.rideId);

      if (ride && ride.latitude && ride.longitude) {
        // Update driver marker position
        const marker = state.driverMarkers.get(ride.driverId);
        if (marker) {
          marker.setLatLng([ride.latitude, ride.longitude]);
        }

        // Update ETA if user location is available
        if (state.userLocation) {
          const distance = GreenRoute.utils.calculateDistance(
            ride.latitude, ride.longitude,
            state.userLocation.lat, state.userLocation.lng
          );

          // Calculate ETA with fallback
          let eta;
          try {
            eta = GreenRoute.utils.calculateETA(distance);
          } catch (etaError) {
            console.warn('ETA calculation failed:', etaError.message);
            eta = Math.ceil(distance * 2); // Fallback: 2 minutes per km
          }

          elements.arrivalTime.textContent = `${eta} min`;
          // Create road-based route from driver to passenger
          await createRoadBasedRoutePath(
            ride.latitude, ride.longitude,
            state.userLocation.lat, state.userLocation.lng,
            'driver-to-passenger',
            '#10b981'
          );
        }
      } else {
        elements.arrivalTime.textContent = 'Searching...';
      }
    } catch (error) {
      console.error('Failed to track active trip:', error);
      elements.arrivalTime.textContent = 'Error';
    }
  };

  // Start tracking
  const startTracking = () => {
    if (state.isTracking) return;
    if (!state.userLocation) {
      state.pendingTracking = true;
      return;
    }

    state.isTracking = true;
    const interval = setInterval(trackActiveTrip, GreenRoute.config.pollingInterval);
    state.pollingIntervals.set('driverTracking', interval);

  };

  // Stop tracking
  const stopTracking = () => {
    state.pollingIntervals.forEach((interval, key) => {
      clearInterval(interval);
      state.pollingIntervals.delete(key);
    });

    state.isTracking = false;
  };

  const restoreActiveBooking = async (showMessage = false) => {
    if (!state.passengerId) {
      return false;
    }

    try {
      const existing = await window.api.getActiveBooking(state.passengerId);
      if (!existing) {
        return false;
      }

      const seats = Number(existing.bookingSeats || existing.seats || 1);
      const fare = Number(existing.bookingFare || existing.fare || existing.rideFare || 0);

      state.activeBooking = {
        ...existing,
        rideId: existing.rideId,
        driverName: existing.driverName,
        driverPlate: existing.licensePlate,
        vehicleType: existing.vehicleType,
        destination: existing.destination,
        origin: existing.origin,
        fare,
        seats,
        farePerPerson: Number(existing.rideFare || 0)
      };

      showActiveRide(state.activeBooking, fare, seats);

      const destination = state.activeBooking.destination;
      if (destination && state.userLocation) {
        const destCoords = await getDestinationCoordinates(destination);
        if (destCoords) {
          await createRoadBasedRoutePath(
            state.userLocation.lat, state.userLocation.lng,
            destCoords.lat, destCoords.lng,
            'passenger-to-destination',
            '#3b82f6'
          );
        }
      }

      startTracking();

      if (showMessage) {
        showNotification('You already have an active ride. Resuming it now.', 'info');
      }

      return true;
    } catch (error) {
      console.error('Failed to restore active booking:', error);
      return false;
    }
  };

  // Find and book ride with road-based routing
  const findRide = async () => {
    console.log('findRide called');
    const origin = elements.pickupInput?.value.trim();
    const destination = elements.destinationInput?.value.trim();
    const passengerValue = elements.passengersCount?.value ?? elements.passengersCount?.textContent;
    const passengers = parseInt(String(passengerValue || '1').trim(), 10) || 1;

    console.log('Form data:', { origin, destination, passengers, passengerId: state.passengerId });
    console.log('nearbyVehicles element exists:', !!elements.nearbyVehicles);

    if (!origin || !destination) {
      console.warn('Missing origin or destination');
      showNotification('Please enter both pickup and destination', 'error');
      return;
    }

    // Allow proceeding without GPS location if we have manual addresses
    let userLocation = state.userLocation;
    if (!userLocation) {
      console.log('No GPS location, attempting to geocode origin address:', origin);
      try {
        const coords = await getDestinationCoordinates(origin);
        if (coords) {
          userLocation = { lat: coords.lat, lng: coords.lng };
          console.log('Geocoded origin address:', userLocation);
        }
      } catch (e) {
        console.warn('Could not geocode origin:', e.message);
      }
    }

    if (!userLocation) {
      console.error('No location available (GPS and geocoding both failed)');
      showNotification('Unable to determine your location. Please enable location services or try another origin.', 'error');
      return;
    }

    if (!state.passengerId) {
      console.error('CRITICAL: passengerId is null/undefined!');
      console.log('Checking localStorage:', localStorage.getItem('passengerId'));
      showNotification('Not logged in. Please sign in first.', 'error');
      return;
    }

    if (state.activeBooking) {
      console.log('Already has active booking');
      showNotification('You already have an active ride. Cancel it before booking another.', 'info');
      return;
    }

    try {
      const resumed = await restoreActiveBooking(false);
      if (resumed) {
        console.log('Resumed active booking');
        showNotification('You already have an active ride. Resuming it now.', 'info');
        return;
      }

      // Show loading state
      if (elements.findRideBtn) {
        elements.findRideBtn.disabled = true;
        elements.findRideBtn.textContent = 'Finding drivers...';
      }

      const rides = await window.api.getAvailableRides();
      console.log(`Fetched ${rides.length} available rides`);

      // Filter suitable rides
      const suitableRides = rides.filter(ride =>
        ride.status === 'available' &&
        ride.seats >= passengers &&
        ride.latitude && ride.longitude
      );

      if (suitableRides.length === 0) {
        showNotification('No available drivers found. Please try again later.', 'error');
        if (elements.findRideBtn) {
          elements.findRideBtn.disabled = false;
          elements.findRideBtn.textContent = 'Find Available Rides';
        }
        return;
      }

      // Show nearby vehicles list with track buttons
      const nearbyContainer = document.getElementById('nearby-vehicles-container');
      if (nearbyContainer) {
        nearbyContainer.style.display = 'block';
      }

      // Update driver markers to show available vehicles
      console.log('Calling updateDriverMarkers...');
      await updateDriverMarkers(true);

      // Update stats pill with driver count
      if (elements.driversPanel) {
        elements.driversPanel.textContent = `${suitableRides.length} drivers active`;
      }

      showNotification(`Found ${suitableRides.length} available drivers. Click "Track" on a driver to let them know you want to board.`, 'info');

      if (elements.findRideBtn) {
        elements.findRideBtn.disabled = false;
        elements.findRideBtn.textContent = 'Find Available Rides';
      }

    } catch (error) {
      const errorText = String(error?.message || '');
      if (errorText.includes('You already have an active booking for this ride')) {
        console.log('Attempting to resume active booking');
        const resumed = await restoreActiveBooking(true);
        if (!resumed) {
          showNotification('You already have an active booking. Refresh and try again.', 'error');
        }
      } else {
        console.error('Booking failed with error:', error);
        console.error('Error details:', {
          message: error?.message,
          status: error?.status,
          statusText: error?.statusText,
          response: error?.response
        });
        showNotification('Failed to book ride. Please try again.', 'error');
      }
    } finally {
      // Reset button state
      if (elements.findRideBtn) {
        elements.findRideBtn.disabled = false;
        elements.findRideBtn.textContent = 'Find Available Rides';
      }
    }
  };

  // Show notification
  const showNotification = (message, type = 'info') => {
    if (elements.notification && elements.notificationMessage) {
      elements.notificationMessage.textContent = message;
      elements.notification.className = `notification ${type}`;
      elements.notification.style.display = 'block';

      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (elements.notification) {
          elements.notification.style.display = 'none';
        }
      }, 5000);
    }
  };

  window.GreenRoutePassenger = window.GreenRoutePassenger || {};
  window.GreenRoutePassenger.findRide = findRide;
  window.GreenRoutePassenger.init = () => init();
  window.GreenRoutePassenger.initialized = false;

  // Show active ride panel
  const showActiveRide = (ride, totalFare, passengers) => {
    if (!elements.activeRide) return;

    // Update driver information
    if (elements.driverName) {
      elements.driverName.textContent = ride.driverName || 'Driver';
    }
    if (elements.driverPlate) {
      elements.driverPlate.textContent = ride.licensePlate ? `Plate: ${ride.licensePlate}` : 'Plate: -';
    }
    if (elements.driverPhoto) {
      elements.driverPhoto.src = ride.driverPhoto || '../assets/default-driver.svg';
    }
    if (elements.driverRating) {
      const rating = ride.rating || '4.5';
      const ratingSpan = elements.driverRating.querySelector('span');
      if (ratingSpan) ratingSpan.textContent = rating;
      else elements.driverRating.textContent = `Rating: ${rating}`;
    }
    if (elements.driverTrips) {
      elements.driverTrips.textContent = `• ${ride.trips || '234'} trips`;
    }
    if (elements.rideStatus) {
      elements.rideStatus.textContent = ride.status === 'confirmed' ? 'Driver confirmed' : ride.status;
    }

    // Update trip details
    if (elements.rideFare) {
      elements.rideFare.textContent = `GHS ${Number(totalFare || ride.fare || 0).toFixed(2)}`;
    }
    if (elements.arrivalTime) {
      elements.arrivalTime.textContent = ride.eta || 'Calculating...';
    }
    if (elements.rideDistance) {
      elements.rideDistance.textContent = ride.distance || 'Calculating...';
    }

    // Show the active ride panel
    elements.activeRide.style.display = 'block';
    elements.activeRide.hidden = false;
  };

  // Handle contact driver
  const handleContactDriver = () => {
    if (state.activeBooking && state.activeBooking.driverName) {
      showNotification(`Contacting ${state.activeBooking.driverName}...`, 'info');
    } else {
      showNotification('Driver information not available', 'error');
    }
  };

  // Handle cancel ride (alias for cancelBooking)
  const handleCancelRide = () => {
    cancelBooking();
  };

  // Cancel booking
  const cancelBooking = async () => {
    if (!state.activeBooking) return;

    try {
      await window.api.cancelBooking(state.activeBooking.id);

      state.activeBooking = null;

      // Hide active ride panel
      if (elements.activeRide) {
        elements.activeRide.style.display = 'none';
        elements.activeRide.hidden = true;
      }

      // Clear all route polylines
      state.routePolylines.forEach(polyline => {
        state.passengerMap.removeLayer(polyline);
      });
      state.routePolylines.clear();

      // Remove destination marker
      if (state.destinationMarker) {
        state.passengerMap.removeLayer(state.destinationMarker);
        state.destinationMarker = null;
      }

      stopTracking();

      // Reset form inputs
      if (elements.destinationInput) {
        elements.destinationInput.value = '';
      }

      showNotification('Ride cancelled successfully', 'success');

    } catch (error) {
      console.error('Failed to cancel booking:', error);
      showNotification('Failed to cancel ride. Please try again.', 'error');
    }
  };

  // Initialize passenger app
  const enableManualLocation = () => {
    if (!state.passengerMap) return;

    showNotification('Click on the map to set your pickup location', 'info');
    state.passengerMap.getContainer().style.cursor = 'crosshair';

    const onMapClick = async (e) => {
      const { lat, lng } = e.latlng;
      state.userLocation = { lat, lng };

      // Update marker
      if (state.userMarker) {
        state.userMarker.setLatLng([lat, lng]);
      } else {
        state.userMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: '<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            className: 'user-location-marker'
          })
        }).addTo(state.passengerMap);
      }

      // Reverse geocode
      const address = await GreenRoute.utils.reverseGeocode(lat, lng);
      if (elements.pickupInput) {
        elements.pickupInput.value = address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

      state.passengerMap.getContainer().style.cursor = '';
      state.passengerMap.off('click', onMapClick);
      showNotification('Location set manually', 'success');
    };

    state.passengerMap.on('click', onMapClick);
  };

  const updateTrackingList = (allVehicles) => {
    if (!elements.trackingList || !elements.trackingVehiclesContainer) return;

    if (!state.trackedDriverId) {
      elements.trackingVehiclesContainer.style.display = 'none';
      return;
    }

    const trackedVehicle = allVehicles.find(v => v.ride?.driverId === state.trackedDriverId);

    if (!trackedVehicle) {
      elements.trackingList.innerHTML = `
        <div style="padding: 10px; text-align: center; opacity: 0.7;">
          <p style="font-size: 12px; margin-bottom: 5px;">Driver is currently offline.</p>
          <button id="stop-tracking-missing" style="color: var(--alert); background: none; border: none; cursor: pointer; text-decoration: underline; font-size: 11px;">Stop Tracking</button>
        </div>
      `;
      elements.trackingVehiclesContainer.style.display = 'block';

      document.getElementById('stop-tracking-missing')?.addEventListener('click', () => {
        state.trackedDriverId = null;
        state.trackedDriverData = null;
        localStorage.removeItem('greenroute-tracked-driver-id');
        updateTrackingList(allVehicles);
      });
      return;
    }

    elements.trackingVehiclesContainer.style.display = 'block';
    elements.trackingList.innerHTML = `
      <div class="tracking-card-v2">
        <div style="position: absolute; top: 0; right: 0; width: 40px; height: 40px; background: var(--primary); opacity: 0.1; border-radius: 0 0 0 40px;"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1;">
          <div>
            <div style="font-weight: 800; font-size: 14px; color: var(--text);">${trackedVehicle.driverName}</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">${trackedVehicle.plate} • ${trackedVehicle.vehicleLabel}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; color: var(--primary); font-size: 16px; line-height: 1;">${trackedVehicle.etaText}</div>
            <div style="font-size: 9px; color: var(--muted); text-transform: uppercase; margin-top: 4px;">ETA</div>
          </div>
        </div>
        
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1;">
          <div style="font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px;">
            <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${trackedVehicle.directionText}</span>
          </div>
          <button id="stop-tracking-btn" style="background: var(--alert); color: white; border: none; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; cursor: pointer; transition: transform 0.2s;">Stop</button>
        </div>
      </div>
    `;

    document.getElementById('stop-tracking-btn')?.addEventListener('click', async () => {
      try {
        await window.api.stopTrackingDriver(state.passengerId, state.trackedDriverId);
        state.trackedDriverId = null;
        state.trackedDriverData = null;
        localStorage.removeItem('greenroute-tracked-driver-id');
        updateTrackingList(allVehicles);
        updateDriverMarkers(true);
      } catch (err) {
        console.error('Stop tracking error:', err);
      }
    });
  };

  // Load passenger profile
  const loadPassengerProfile = async () => {
    const pId = state.passengerId || GreenRoute.utils.getStorage('userId');
    if (!pId) {
      console.warn('[Passenger] No passenger ID found in state or storage');
      return;
    }
    
    try {
      console.log(`[Passenger] Loading profile for ID: ${pId}`);
      const profile = await window.api.getProfile(pId);
      console.log('[Passenger] Profile loaded:', profile);
      
      if (profile.name) {
        state.passengerName = profile.name;
        if (elements.passengerDisplayName) {
          elements.passengerDisplayName.textContent = profile.name;
        }
      }
      
      const photo = profile.profilePhoto || profile.photo || profile.driverPhoto;
      if (photo) {
        state.passengerPhoto = photo;
        if (elements.passengerProfilePhoto) {
          elements.passengerProfilePhoto.src = photo;
          console.log('[Passenger] Profile photo updated');
        }
      } else if (elements.passengerProfilePhoto) {
        console.warn('[Passenger] No photo found in profile data');
      }
    } catch (err) {
      console.error('[Passenger] Could not load profile:', err.message || err);
    }
  };

  const init = () => {
    if (window.GreenRoutePassenger && window.GreenRoutePassenger.initialized) {
      console.warn('[Passenger] App already initialized');
      return;
    }
    
    // UI elements initialization
    elements = {
      // Map
      map: byIds('map', 'passenger-map'),

      // Form elements
      bookingForm: byIds('booking-form', 'pv2-booking-form'),
      pickupInput: byIds('pickup-input', 'pv2-origin'),
      destinationInput: byIds('destination-input', 'pv2-destination'),
      rideTypeInput: byIds('ride-type-input'),
      findRideBtn: byIds('find-ride-btn', 'pv2-find-ride'),
      passengersCount: byIds('passengers-count', 'pv2-passenger-count'),

      // Driver elements
      driversPanel: byIds('drivers-panel', 'pv2-stats-pill'),
      driversCount: byIds('drivers-count', 'pv2-stats-pill'),
      nearbyVehicles: byIds('pv2-nearby-vehicles'),

      // Check for nearby vehicles container
      nearbyVehiclesContainer: document.getElementById('nearby-vehicles-container'),

      // Active booking elements
      activeRide: byIds('active-booking', 'pv2-active-trip-panel'),
      driverName: byIds('driver-name', 'pv2-driver-name'),
      driverPlate: byIds('pv2-driver-plate'),
      driverPhoto: byIds('driver-photo', 'pv2-driver-photo'),
      driverRating: byIds('driver-rating'),
      driverTrips: byIds('driver-trips'),
      rideStatus: byIds('ride-status'),
      arrivalTime: byIds('arrival-time', 'pv2-live-eta'),
      rideFare: byIds('ride-fare', 'pv2-live-fare'),
      rideDistance: byIds('ride-distance'),

      // Action buttons
      cancelBtn: byIds('cancel-ride-btn', 'pv2-cancel-btn'),
      contactDriverBtn: byIds('contact-driver-btn'),

      // Navigation
      mobileSignoutBtn: byIds('mobile-signout-btn', 'passenger-logout-mobile'),
      bookingsLink: byIds('bookings-link'),
      mobileBookingsLink: byIds('mobile-bookings-link'),
      profileLink: byIds('profile-link'),
      mobileProfileLink: byIds('mobile-profile-link'),

      // Modals
      bookingsModal: byIds('bookings-modal'),
      profileModal: byIds('profile-modal'),
      closeBookingsModal: byIds('close-bookings-modal'),
      closeProfileModal: byIds('close-profile-modal'),

      // Notification element
      notification: byIds('notification'),
      notificationMessage: byIds('notification-message'),
      notificationClose: byIds('notification-close'),
      desktopSignoutBtn: byIds('passenger-logout'),
      sosButton: byIds('panic-button'),
      pickOnMapBtn: byIds('pick-on-map-btn'),
      trackingVehiclesContainer: byIds('tracking-vehicles-container'),
      trackingList: byIds('tracking-list'),
      plusBtn: byIds('plus-btn', 'pv2-plus'),
      minusBtn: byIds('minus-btn', 'pv2-minus'),
      modalTrackBtn: byIds('pv2-track-map'),
      modalCancelBtn: byIds('pv2-cancel-modal'),
      modalRetryBtn: byIds('pv2-try-different'),
      passengerDisplayName: byIds('passenger-display-name', 'pv2-user-name'),
      passengerProfilePhoto: byIds('passenger-profile-photo', 'pv2-user-photo')
    };

    // Restore tracking state
    const savedTrackedId = localStorage.getItem('greenroute-tracked-driver-id');
    if (savedTrackedId) {
      state.trackedDriverId = savedTrackedId;
    }

    // Load road routing system
    if (!window.RoadRouting) {
      const script = document.createElement('script');
      script.src = '/road-routing.js';
      script.defer = true;
      document.head.appendChild(script);
    }

    initMap();
    getUserLocation();
    loadPassengerProfile();

    // Event listeners
    elements.bookingForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      findRide();
    });

    elements.findRideBtn?.addEventListener('click', findRide);
    elements.cancelBtn?.addEventListener('click', cancelBooking);
    elements.contactDriverBtn?.addEventListener('click', handleContactDriver);

    // Event listeners for updated HTML
    // Ride type selection
    document.querySelectorAll('.choice-btn[data-ride-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.choice-btn[data-ride-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update hidden input if exists
        if (elements.rideTypeInput) {
          elements.rideTypeInput.value = btn.dataset.rideType;
        }
      });
    });

    // Quick route buttons
    document.querySelectorAll('[data-pv2-from][data-pv2-to]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (elements.pickupInput) {
          elements.pickupInput.value = btn.dataset.pv2From;
        }
        if (elements.destinationInput) {
          elements.destinationInput.value = btn.dataset.pv2To;
        }
      });
    });

    // Sign out buttons
    elements.mobileSignoutBtn?.addEventListener('click', handleSignOut);
    elements.desktopSignoutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSignOut();
    });
    elements.sosButton?.addEventListener('click', handleSOS);
    elements.pickOnMapBtn?.addEventListener('click', enableManualLocation);

    // Stepper logic
    const updateStepper = (delta) => {
      if (!elements.passengersCount) return;
      let count = parseInt(elements.passengersCount.value || elements.passengersCount.textContent || '1', 10) || 1;
      count = Math.max(1, Math.min(10, count + delta));
      if (elements.passengersCount.tagName === 'INPUT') {
        elements.passengersCount.value = count;
      } else {
        elements.passengersCount.textContent = count;
      }
    };

    elements.plusBtn?.addEventListener('click', () => updateStepper(1));
    elements.minusBtn?.addEventListener('click', () => updateStepper(-1));

    // Modal actions
    elements.modalCancelBtn?.addEventListener('click', () => {
      const modal = byIds('pv2-modal');
      if (modal) modal.hidden = true;
      cancelBooking();
    });

    elements.modalRetryBtn?.addEventListener('click', () => {
      const modal = byIds('pv2-modal');
      if (modal) modal.hidden = true;
    });

    elements.modalTrackBtn?.addEventListener('click', () => {
      const modal = byIds('pv2-modal');
      if (modal) modal.hidden = true;
    });

    // Quick Routes logic
    document.querySelectorAll('[data-pv2-from]').forEach(chip => {
      chip.addEventListener('click', () => {
        const from = chip.getAttribute('data-pv2-from');
        const to = chip.getAttribute('data-pv2-to');
        if (elements.pickupInput && from) elements.pickupInput.value = from;
        if (elements.destinationInput && to) elements.destinationInput.value = to;
        showNotification(`Route set: ${from} to ${to}`, 'info');
      });
    });

    // Navigation links
    elements.bookingsLink?.addEventListener('click', (e) => {
      e.preventDefault();
      showNotification('Booking history coming soon', 'info');
    });
    elements.mobileBookingsLink?.addEventListener('click', (e) => {
      e.preventDefault();
      showNotification('Booking history coming soon', 'info');
    });
    elements.profileLink?.addEventListener('click', (e) => {
      e.preventDefault();
      showNotification('Profile management coming soon', 'info');
    });
    elements.mobileProfileLink?.addEventListener('click', (e) => {
      e.preventDefault();
      showNotification('Profile management coming soon', 'info');
    });

    // Nearby vehicles collapse logic
    const nearbyHeader = document.getElementById('nearby-vehicles-header');
    const nearbyContainer = document.getElementById('nearby-vehicles-container');
    const nearbyCollapseBtn = document.getElementById('nearby-collapse-btn');
    
    if (nearbyHeader && nearbyContainer) {
      nearbyHeader.addEventListener('click', () => {
        const isCollapsed = nearbyContainer.style.maxHeight === '45px';
        if (isCollapsed) {
          nearbyContainer.style.maxHeight = '250px';
          if (nearbyCollapseBtn) nearbyCollapseBtn.style.transform = 'rotate(0deg)';
        } else {
          nearbyContainer.style.maxHeight = '45px';
          if (nearbyCollapseBtn) nearbyCollapseBtn.style.transform = 'rotate(180deg)';
        }
      });
    }

    // Modal close buttons
    elements.closeBookingsModal?.addEventListener('click', () => {
      if (elements.bookingsModal) {
        elements.bookingsModal.style.display = 'none';
      }
    });
    elements.closeProfileModal?.addEventListener('click', () => {
      if (elements.profileModal) {
        elements.profileModal.style.display = 'none';
      }
    });

    // Notification close
    elements.notificationClose?.addEventListener('click', () => {
      if (elements.notification) {
        elements.notification.style.display = 'none';
      }
    });

    // Restore any server-side active booking on load to avoid duplicate booking attempts.
    restoreActiveBooking(false);

    updateDriverMarkers();
    if (state.nearbyVehiclesInterval) {
      clearInterval(state.nearbyVehiclesInterval);
    }
    state.nearbyVehiclesInterval = setInterval(updateDriverMarkers, GreenRoute.config.pollingInterval);

    window.GreenRoutePassenger = {
      initialized: true,
      findRide: findRide,
      cancelBooking: cancelBooking
    };

    window.addEventListener('beforeunload', () => {
      stopTracking();
      if (state.nearbyVehiclesInterval) {
        clearInterval(state.nearbyVehiclesInterval);
        state.nearbyVehiclesInterval = null;
      }
    });
  };

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();