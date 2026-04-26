
(() => {
  'use strict';

  const state = {
    driverId: GreenRoute.utils.getStorage(GreenRoute.storage.driverId, null),
    userId: GreenRoute.utils.getStorage('userId', null),
    isOnline: false,
    activeRide: null,
    locationInterval: null,
    driverMap: null,
    driverMarker: null,
    currentLocation: null,
    hasActiveRoute: false,
    routePolyline: null,
    todayEarnings: 0,
    todayTrips: 0,
    currentTripEarnings: 0,
    manualFare: 5.50
  };

  const elements = {
    onlineSwitch: document.getElementById('driver-online-switch'),
    onlineStatus: document.getElementById('driver-online-status'),
    displayName: document.getElementById('driver-display-name'),
    setupPanel: document.getElementById('driver-setup-panel'),
    livePanel: document.getElementById('driver-live-panel'),
    routeSelect: document.getElementById('driver-route-select'),
    startPoint: document.getElementById('driver-start-point'),
    vehiclePlate: document.getElementById('driver-vehicle-plate'),
    vehicleCapacity: document.getElementById('driver-vehicle-capacity'),
    shiftToggle: document.getElementById('shift-toggle'),
    availableSeats: document.getElementById('driver-available-seats'),
    onboardDisplay: document.getElementById('onboard-display'),
    driverMap: document.getElementById('driver-map'),
    recenterBtn: document.getElementById('driver-recenter-btn'),
    fareTotal: document.getElementById('driver-fare-total'),
    todayTrips: document.getElementById('today-trips'),
    todayEarnings: document.getElementById('today-earnings'),
    onboardMinus: document.getElementById('onboard-minus'),
    onboardPlus: document.getElementById('onboard-plus'),
    syncOnboard: document.getElementById('sync-onboard'),
    nextStop: document.getElementById('next-stop'),
    serviceModeButtons: document.querySelectorAll('[data-driver-service-mode]'),
    serviceModePill: document.getElementById('driver-service-mode-pill'),
    sosButton: document.getElementById('panic-button'),
    // Manual fare elements - NEW
    fareLabel: document.getElementById('driver-fare-label'),
    fareInput: document.getElementById('driver-fare-input'),
    fareContainer: document.querySelector('label:has(#driver-fare-input)')
  };

  
  // SOS functionality - Graceful handling if element doesn't exist
  const handleSOS = () => {
    const sosMessage = `
🚨 DRIVER EMERGENCY ALERT 🚨
Driver: ${state.driverId}
Name: ${getDriverCredentials().name}
Plate: ${getDriverCredentials().plate}
Location: ${state.currentLocation ? `${state.currentLocation.lat.toFixed(6)}, ${state.currentLocation.lng.toFixed(6)}` : 'Unknown'}
Time: ${new Date().toLocaleString()}
Status: ${state.isOnline ? 'Online with active route' : 'Offline'}
Vehicle: ${getDriverCredentials().vehicleType} - ${getDriverCredentials().vehicleModel}
    `.trim();

    alert(sosMessage);
    
    console.log('Driver SOS Event:', {
      driverId: state.driverId,
      driverName: getDriverCredentials().name,
      vehiclePlate: getDriverCredentials().plate,
      location: state.currentLocation,
      timestamp: new Date().toISOString(),
      isOnline: state.isOnline,
      hasActiveRoute: state.hasActiveRoute,
      activeRide: state.activeRide
    });

    if (elements.sosButton) {
      elements.sosButton.style.background = '#ef4444';
      elements.sosButton.textContent = 'SOS SENT';
      
      setTimeout(() => {
        elements.sosButton.style.background = '';
        elements.sosButton.textContent = 'SOS';
      }, 3000);
    }
  };

  // Get driver credentials
  const getDriverCredentials = () => {
    return {
      userId: state.userId,
      driverId: state.driverId,
      name: 'Kofi Mensah',
      plate: 'GR-001',
      vehicleType: 'Trotro',
      vehicleModel: 'Toyota Hiace'
    };
  };

  // Create much better driver marker
  const createDriverMarker = (lat, lng) => {
    const credentials = getDriverCredentials();
    const isTrotro = credentials.vehicleType === 'Trotro';
    
    if (isTrotro) {
      // Trotro Bus Icon
      const iconHtml = `<div style="
        width: 56px;
        height: 36px;
        background: linear-gradient(180deg, #ff6b35 0%, #f7931e 100%);
        border-radius: 4px;
        border: 2px solid #c2410c;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="position: absolute; top: 7px; left: 5px; right: 5px; height: 14px; background: rgba(255,255,255,0.2); border-radius: 2px;"></div>
        <div style="position: absolute; top: 9px; left: 7px; width: 7px; height: 10px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; top: 9px; left: 16px; width: 7px; height: 10px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; top: 9px; left: 25px; width: 7px; height: 10px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; top: 9px; left: 34px; width: 7px; height: 10px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; top: 9px; right: 7px; width: 7px; height: 10px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; bottom: 3px; left: 9px; width: 10px; height: 10px; background: #1f2937; border-radius: 50%; border: 2px solid #374151;"></div>
        <div style="position: absolute; bottom: 3px; right: 9px; width: 10px; height: 10px; background: #1f2937; border-radius: 50%; border: 2px solid #374151;"></div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 11px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); background: rgba(0,0,0,0.4); padding: 3px 6px; border-radius: 3px;">BUS</div>
      </div>`;

      return L.divIcon({
        html: iconHtml,
        iconSize: [60, 40],
        iconAnchor: [30, 20],
        popupAnchor: [0, -20],
        className: 'trotro-marker'
      });
    } else {
      // Taxi Icon
      const iconHtml = `<div style="
        width: 42px;
        height: 22px;
        background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
        border-radius: 14px 10px 10px 14px;
        border: 2px solid #d97706;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="position: absolute; top: 5px; left: 5px; right: 5px; height: 9px; background: rgba(255,255,255,0.2); border-radius: 8px 6px 6px 8px;"></div>
        <div style="position: absolute; top: 1px; left: 50%; transform: translateX(-50%); width: 14px; height: 7px; background: #000; border-radius: 2px; display: flex; align-items: center; justify-content: center;"><div style="color: #fbbf24; font-size: 5px; font-weight: bold;">TAXI</div></div>
        <div style="position: absolute; bottom: 2px; left: 7px; width: 7px; height: 7px; background: #1f2937; border-radius: 50%; border: 2px solid #374151;"></div>
        <div style="position: absolute; bottom: 2px; right: 7px; width: 7px; height: 7px; background: #1f2937; border-radius: 50%; border: 2px solid #374151;"></div>
      </div>`;

      return L.divIcon({
        html: iconHtml,
        iconSize: [46, 26],
        iconAnchor: [23, 13],
        popupAnchor: [0, -13],
        className: 'taxi-marker'
      });
    }
  };

  // Get route coordinates
  const getRouteCoordinates = async (route) => {
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

    const normalizedRoute = route.toLowerCase().trim();
    return knownStops[normalizedRoute] || null;
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

  // Create road-based route path - follows actual roads via OSRM
  const createRoadBasedRoutePath = async (fromLat, fromLng, toLat, toLng, color = '#10b981') => {
    // Remove existing route if it exists
    if (state.routePolyline) {
      state.driverMap.removeLayer(state.routePolyline);
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
      console.warn('No valid road path found');
      return;
    }

    // Create the polyline with road-following appearance
    const polyline = L.polyline(roadPath, {
      color: color,
      weight: 4,
      opacity: 0.8,
      dashArray: null,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'road-route-path'
    }).addTo(state.driverMap);

    // Add directional arrows at road intersections
    const arrowInterval = Math.max(3, Math.floor(roadPath.length / 6));
    for (let i = arrowInterval; i < roadPath.length - 1; i += arrowInterval) {
      const point = roadPath[i];
      const nextPoint = roadPath[Math.min(i + 2, roadPath.length - 1)];
      
      if (nextPoint) {
        const angle = Math.atan2(nextPoint[0] - point[0], nextPoint[1] - point[1]) * 180 / Math.PI;
        
        L.marker(point, {
          icon: L.divIcon({
            html: `<div style="
              width: 0;
              height: 0;
              border-left: 10px solid transparent;
              border-right: 10px solid transparent;
              border-bottom: 15px solid ${color};
              transform: rotate(${angle}deg);
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            "></div>`,
            iconSize: [20, 15],
            iconAnchor: [10, 15],
            className: 'road-route-arrow'
          })
        }).addTo(state.driverMap);
      }
    }

    state.routePolyline = polyline;
    
    // Calculate road distance
    const roadDistance = window.RoadRouting ? 
      window.RoadRouting.calculateRoadDistance(roadPath) : 
      GreenRoute.utils.calculateDistance(fromLat, fromLng, toLat, toLng);
    
    // Fit map to show the entire route with proper padding
    const bounds = L.latLngBounds(roadPath);
    state.driverMap.fitBounds(bounds, { padding: [80, 80] });
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

  // Update driver location
  const updateDriverLocation = async (latitude, longitude, isOnline) => {
    if (!state.driverId) return;

    try {
      await window.api.updateDriverLocation(state.driverId, latitude, longitude, isOnline);
      // Update marker on map
      if (state.driverMap) {
        if (state.driverMarker) {
          state.driverMarker.setLatLng([latitude, longitude]);
        } else {
          state.driverMarker = L.marker([latitude, longitude], {
            icon: createDriverMarker(latitude, longitude)
          }).addTo(state.driverMap);
          
          const credentials = getDriverCredentials();
          const popupContent = `
            <div style="min-width: 220px; font-family: system-ui;">
              <strong style="color: #1f2937; font-size: 14px;">You (Driver)</strong><br>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Name:</span> <span style="font-weight: 600;">${credentials.name}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Plate:</span> <span style="font-weight: 600;">${credentials.plate}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Type:</span> <span style="font-weight: 600; color: ${credentials.vehicleType === 'Trotro' ? '#ff6b35' : '#fbbf24'};">${credentials.vehicleType}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Status:</span> <span style="font-weight: 600; color: ${isOnline ? '#10b981' : '#ef4444'};">${isOnline ? 'Online' : 'Offline'}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Location:</span> <span style="font-weight: 600; font-size: 11px;">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Today:</span> <span style="font-weight: 600; color: #10b981;">GHS ${state.todayEarnings.toFixed(2)}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Fare:</span> <span style="font-weight: 600; color: #10b981;">GHS ${state.manualFare.toFixed(2)}/person</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Route:</span> <span style="font-weight: 600; color: #10b981;">Follows actual roads</span></div>
            </div>
          `;
          state.driverMarker.bindPopup(popupContent);
        }

        if (state.driverMap.getCenter().distanceTo([latitude, longitude]) > 5000) {
          state.driverMap.setView([latitude, longitude], 15);
        }
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  // Start GPS tracking
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    if (state.locationInterval) {
      clearInterval(state.locationInterval);
    }

    state.locationInterval = setInterval(async () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          state.currentLocation = { lat: latitude, lng: longitude };

          await updateDriverLocation(latitude, longitude, state.isOnline);
        },
        (error) => {
          console.error('Driver GPS error:', error);
          
          let errorMessage = 'GPS tracking error';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location timeout';
              break;
          }
          console.warn(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: GreenRoute.config.gpsTimeout,
          maximumAge: 30000
        }
      );
    }, GreenRoute.config.pollingInterval);

    };

  // Stop GPS tracking
  const stopGpsTracking = () => {
    if (state.locationInterval) {
      clearInterval(state.locationInterval);
      state.locationInterval = null;
    }
    };

  // Get initial location
  const getInitialLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        state.currentLocation = { lat: latitude, lng: longitude };
        
        if (state.driverMap) {
          state.driverMap.setView([latitude, longitude], 15);
        }
        
        if (state.driverMap) {
          state.driverMarker = L.marker([latitude, longitude], {
            icon: createDriverMarker(latitude, longitude)
          }).addTo(state.driverMap);
          
          const credentials = getDriverCredentials();
          const popupContent = `
            <div style="min-width: 220px; font-family: system-ui;">
              <strong style="color: #1f2937; font-size: 14px;">You (Driver)</strong><br>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Name:</span> <span style="font-weight: 600;">${credentials.name}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Plate:</span> <span style="font-weight: 600;">${credentials.plate}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Type:</span> <span style="font-weight: 600; color: ${credentials.vehicleType === 'Trotro' ? '#ff6b35' : '#fbbf24'};">${credentials.vehicleType}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Status:</span> <span style="font-weight: 600; color: #ef4444;">Offline</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Location:</span> <span style="font-weight: 600; font-size: 11px;">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Today:</span> <span style="font-weight: 600; color: #10b981;">GHS ${state.todayEarnings.toFixed(2)}</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Fare:</span> <span style="font-weight: 600; color: #10b981;">GHS ${state.manualFare.toFixed(2)}/person</span></div>
              <div style="margin: 4px 0;"><span style="color: #6b7280;">Route:</span> <span style="font-weight: 600; color: #10b981;">Follows actual roads</span></div>
            </div>
          `;
          state.driverMarker.bindPopup(popupContent);
        }
        
        updateDriverLocation(latitude, longitude, false);
      },
      (error) => {
        console.error('Failed to get initial location:', error);
        
        let errorMessage = 'Failed to get location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Location services are optional for route tracking.';
            // Set a default location (Accra central) as fallback
            state.currentLocation = { lat: 5.550, lng: -0.206 };
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        console.error(errorMessage);
        
        // Continue with map initialization even without location
        if (state.driverMap && !state.driverMarker) {
          const defaultLocation = state.currentLocation || { lat: 5.550, lng: -0.206 };
          initDriverMarker(defaultLocation.lat, defaultLocation.lng);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: GreenRoute.config.gpsTimeout,
        maximumAge: 60000
      }
    );
  };

  // Handle manual fare input - NEW
  const handleFareInput = (event) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0.5 && value <= 100) {
      state.manualFare = value;
      }
  };

  // Toggle online status with manual fare
  const toggleOnlineStatus = async () => {
    const isOnline = elements.onlineSwitch.checked;
    
    if (isOnline) {
      const route = elements.startPoint?.value?.trim();
      const destination = elements.routeSelect?.value?.trim();
      
      if (!route || !destination) {
        alert('Please set up your route before going online');
        elements.onlineSwitch.checked = false;
        return;
      }

      // Validate fare input
      const fare = parseFloat(elements.fareInput?.value || state.manualFare);
      if (isNaN(fare) || fare < 0.5) {
        alert('Please enter a valid fare (minimum GHS 0.50)');
        elements.onlineSwitch.checked = false;
        return;
      }

      try {
        // Validate route and destination
        if (!route || !destination) {
          alert('Please select both origin and destination');
          elements.onlineSwitch.checked = false;
          return;
        }

        // Get road coordinates for route visualization (optional)
        let routeCoords = null;
        let destCoords = null;
        try {
          routeCoords = await getRouteCoordinates(route);
          destCoords = await getRouteCoordinates(destination);
        } catch (coordError) {
          console.warn('Could not get route coordinates:', coordError);
          // Continue without coordinates
        }
        
        const ride = await window.api.createRide(
          state.driverId,
          route,
          destination,
          fare, // Use manual fare
          parseInt(elements.vehicleCapacity?.value || 14),
          parseInt(elements.vehicleCapacity?.value || 14)
        );

        state.activeRide = ride;
        state.isOnline = true;
        state.hasActiveRoute = true;
        state.manualFare = fare; // Store the fare used
        
        if (elements.onlineStatus) {
          elements.onlineStatus.textContent = 'ONLINE';
        }
        if (elements.setupPanel) {
          elements.setupPanel.hidden = true;
        }
        if (elements.livePanel) {
          elements.livePanel.hidden = false;
        }
        if (elements.shiftToggle) {
          elements.shiftToggle.textContent = 'End Route';
        }
        
        // Hide fare input when online to prevent changes during active trip
        if (elements.fareContainer) {
          elements.fareContainer.style.opacity = '0.5';
          elements.fareInput.disabled = true;
        }
        
        // Create road-based route path
        if (routeCoords && destCoords) {
          await createRoadBasedRoutePath(routeCoords.lat, routeCoords.lng, destCoords.lat, destCoords.lng);
        }
        
        startGpsTracking();
        
        if (state.currentLocation) {
          await updateDriverLocation(
            state.currentLocation.lat, 
            state.currentLocation.lng, 
            true
          );
        }
        
      } catch (error) {
        console.error('Failed to create ride:', error);
        
        // Handle different types of errors
        let errorMessage = 'Failed to start route. Please try again.';
        
        if (error.message) {
          if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = 'Server error. Please try again in a moment.';
          } else if (error.message.includes('Driver not found')) {
            errorMessage = 'Driver profile not found. Please sign in again.';
          } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
            errorMessage = 'Invalid input. Please check your route details and try again.';
          } else if (error.message.includes('Symbol.iterator')) {
            errorMessage = 'System error. Please refresh the page and try again.';
          } else {
            errorMessage = 'Failed to start route: ' + error.message;
          }
        }
        
        alert(errorMessage);
        elements.onlineSwitch.checked = false;
      }
    } else {
      state.isOnline = false;
      state.hasActiveRoute = false;
      
      if (elements.onlineStatus) {
        elements.onlineStatus.textContent = 'OFFLINE';
      }
      if (elements.setupPanel) {
        elements.setupPanel.hidden = false;
      }
      if (elements.livePanel) {
        elements.livePanel.hidden = true;
      }
      if (elements.shiftToggle) {
        elements.shiftToggle.textContent = 'Start Route';
      }
      
      // Show fare input when offline
      if (elements.fareContainer) {
        elements.fareContainer.style.opacity = '1';
        elements.fareInput.disabled = false;
      }
      
      // Remove route path
      if (state.routePolyline) {
        state.driverMap.removeLayer(state.routePolyline);
        state.routePolyline = null;
      }
      
      stopGpsTracking();
      
      if (state.currentLocation) {
        await updateDriverLocation(
          state.currentLocation.lat, 
          state.currentLocation.lng, 
          false
        );
      }
      
      state.activeRide = null;
      }
  };

  // Update seat counts and fare calculations using manual fare
  const updateSeatCounts = () => {
    const capacity = parseInt(elements.vehicleCapacity?.value || 14);
    const onboard = parseInt(elements.onboardDisplay?.textContent || 0);
    const available = Math.max(0, capacity - onboard);
    
    if (elements.availableSeats) {
      elements.availableSeats.textContent = available;
    }
    
    // Calculate current trip earnings using manual fare
    if (state.activeRide && state.isOnline) {
      const farePerPassenger = state.manualFare;
      state.currentTripEarnings = onboard * farePerPassenger;
      
      if (elements.fareTotal) {
        elements.fareTotal.textContent = `GHS ${state.currentTripEarnings.toFixed(2)}`;
      }
      
      // Update ride seats
      window.api.updateRideSeats(state.activeRide.id, available)
        .catch(error => console.error('Failed to update seats:', error));
    }
    
    // Update total earnings display
    if (elements.todayEarnings) {
      elements.todayEarnings.textContent = `GHS ${state.todayEarnings.toFixed(2)}`;
    }
  };

  // Change onboard count with manual fare tracking
  const changeOnboardCount = (delta) => {
    const current = parseInt(elements.onboardDisplay?.textContent || 0);
    const capacity = parseInt(elements.vehicleCapacity?.value || 14);
    const newCount = Math.max(0, Math.min(capacity, current + delta));
    
    if (elements.onboardDisplay) {
      elements.onboardDisplay.textContent = newCount;
    }
    
    // Update trip earnings when passengers board/alight using manual fare
    if (state.activeRide && state.isOnline) {
      const farePerPassenger = state.manualFare;
      const earningsChange = delta * farePerPassenger;
      state.todayEarnings += earningsChange;
      state.currentTripEarnings = newCount * farePerPassenger;
      
      // Update displays
      if (elements.fareTotal) {
        elements.fareTotal.textContent = `GHS ${state.currentTripEarnings.toFixed(2)}`;
      }
      if (elements.todayEarnings) {
        elements.todayEarnings.textContent = `GHS ${state.todayEarnings.toFixed(2)}`;
      }
      
      // Update trip count when passengers board
      if (delta > 0) {
        state.todayTrips += delta;
        if (elements.todayTrips) {
          elements.todayTrips.textContent = state.todayTrips;
        }
      }
    }
    
    updateSeatCounts();
  };

  const initMap = () => {
    if (!elements.driverMap) {
      console.error('Map element not found');
      return;
    }

    if (state.driverMap) {
      console.log('Map already initialized');
      return;
    }

    if (typeof L !== 'undefined') {
      try {
        state.driverMap = L.map(elements.driverMap).setView(GreenRoute.config.mapCenter, GreenRoute.config.defaultZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(state.driverMap);

        const mapLoading = document.querySelector('.map-loading');
        if (mapLoading) {
          mapLoading.style.display = 'none';
        }

        console.log('Driver map initialized successfully');
      } catch (error) {
        console.error('Failed to initialize driver map:', error);
      }
    } else {
      console.error('Leaflet not available');
    }
  };

  // Initialize driver app with manual fare functionality
  const init = () => {
    // Add sign out handler
    const logoutBtn = document.getElementById('driver-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await api.signout();
          window.location.href = './driver-signin.html';
        } catch (error) {
          console.error('Sign out error:', error);
          alert('Error signing out. Please try again.');
        }
      });
    }
    
    // Load road routing system
    if (!window.RoadRouting) {
      const script = document.createElement('script');
      script.src = '../../road-routing.js';
      script.onload = () => {
        };
      document.head.appendChild(script);
    }
    
    const credentials = getDriverCredentials();
    if (elements.displayName) {
      elements.displayName.textContent = credentials.name;
    }
    if (elements.vehiclePlate) {
      elements.vehiclePlate.value = credentials.plate;
    }
    
    // Initialize map
    initMap();
    
    // Get initial location
    getInitialLocation();
    
    // Add SOS button event listener - Graceful handling
    if (elements.sosButton) {
      elements.sosButton.addEventListener('click', handleSOS);
      } else {
      }
    
    // NEW: Set up manual fare input
    if (elements.fareInput) {
      elements.fareInput.value = state.manualFare.toFixed(2);
      elements.fareInput.addEventListener('input', handleFareInput);
      elements.fareInput.addEventListener('blur', handleFareInput);
      }
    
    // Show fare input field
    if (elements.fareContainer) {
      elements.fareContainer.hidden = false;
      elements.fareContainer.style.display = 'block';
    }
    
    // Event listeners - Fixed null element handling
    if (elements.onlineSwitch) {
      elements.onlineSwitch.addEventListener('change', toggleOnlineStatus);
    }
    
    if (elements.shiftToggle) {
      elements.shiftToggle.addEventListener('click', () => {
        if (elements.onlineSwitch) {
          elements.onlineSwitch.checked = !elements.onlineSwitch.checked;
          toggleOnlineStatus();
        }
      });
    }
    
    if (elements.onboardMinus) {
      elements.onboardMinus.addEventListener('click', () => changeOnboardCount(-1));
    }
    
    if (elements.onboardPlus) {
      elements.onboardPlus.addEventListener('click', () => changeOnboardCount(1));
    }
    
    if (elements.syncOnboard) {
      elements.syncOnboard.addEventListener('click', updateSeatCounts);
    }
    
    if (elements.recenterBtn) {
      elements.recenterBtn.addEventListener('click', () => {
        if (state.currentLocation && state.driverMap) {
          state.driverMap.setView([state.currentLocation.lat, state.currentLocation.lng], 15);
          }
      });
    }
    
    // Service mode buttons - Fixed null element handling
    if (elements.serviceModeButtons) {
      elements.serviceModeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (elements.serviceModeButtons) {
            elements.serviceModeButtons.forEach(b => b.classList.remove('active'));
          }
          btn.classList.add('active');
          
          const mode = btn.dataset.driverServiceMode;
          if (elements.serviceModePill) {
            elements.serviceModePill.textContent = `${mode.charAt(0).toUpperCase() + mode.slice(1)} mode`;
          }
          
          // Update default fare based on vehicle type
          if (mode === 'trotro') {
            if (elements.vehicleCapacity) {
              elements.vehicleCapacity.value = 14;
            }
            if (elements.fareInput) {
              elements.fareInput.value = '3.50';
              state.manualFare = 3.50;
            }
          } else if (mode === 'taxi') {
            if (elements.vehicleCapacity) {
              elements.vehicleCapacity.value = 4;
            }
            if (elements.fareInput) {
              elements.fareInput.value = '5.50';
              state.manualFare = 5.50;
            }
          }
          
          updateSeatCounts();
        });
      });
    }
    
    window.addEventListener('beforeunload', () => {
      stopGpsTracking();
      if (state.isOnline && state.currentLocation) {
        updateDriverLocation(state.currentLocation.lat, state.currentLocation.lng, false);
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