
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
    passengerId: GreenRoute.utils.getStorage(GreenRoute.storage.passengerId, null)
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

  const elements = {
    // Map
    map: byIds('map', 'passenger-map'),
    
    // Form elements
    bookingForm: byIds('booking-form'),
    pickupInput: byIds('pickup-input', 'pv2-origin'),
    destinationInput: byIds('destination-input', 'pv2-destination'),
    rideTypeInput: byIds('ride-type-input'),
    findRideBtn: byIds('find-ride-btn', 'pv2-find-ride'),
    passengersCount: byIds('passengers-count', 'pv2-passenger-count'),
    
    // Driver elements
    driversPanel: byIds('drivers-panel', 'pv2-stats-pill'),
    driversCount: byIds('drivers-count', 'pv2-stats-pill'),
    
    // Active booking elements
    activeRide: byIds('active-booking', 'pv2-active-trip-panel'),
    driverName: byIds('driver-name', 'pv2-driver-name'),
    driverPhoto: byIds('driver-photo', 'pv2-driver-photo'),
    driverRating: byIds('driver-rating'),
    driverTrips: byIds('driver-trips'),
    rideStatus: byIds('ride-status'),
    arrivalTime: byIds('arrival-time', 'pv2-live-eta'),
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
    sosButton: byIds('panic-button')
  };

  const initMap = () => {
    if (!elements.map) {
      console.error('Map element not found');
      return;
    }

    if (state.passengerMap) {
      console.log('Map already initialized');
      return;
    }

    // Initialize map immediately if L is available
    if (typeof L !== 'undefined') {
      try {
        state.passengerMap = L.map(elements.map).setView(GreenRoute.config.mapCenter, GreenRoute.config.defaultZoom);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(state.passengerMap);

        // Hide loading indicator
        const mapLoading = document.querySelector('.map-loading');
        if (mapLoading) {
          mapLoading.style.display = 'none';
        }

        console.log('Map initialized successfully');
        
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
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
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
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (elements.pickupInput) {
          elements.pickupInput.value = 'Enable location to continue';
          elements.pickupInput.disabled = false;
        }
        
        let errorMessage = 'Enable location to continue';
        switch(error.code) {
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
      }
    );
  };

  // Create much better driver icons
  const createDriverMarker = (driver) => {
    const isTrotro = driver.vehicleType?.toLowerCase() === 'trotro';
    
    if (isTrotro) {
      // Trotro Bus Icon
      const iconHtml = `<div style="
        width: 50px;
        height: 32px;
        background: linear-gradient(180deg, #ff6b35 0%, #f7931e 100%);
        border-radius: 4px;
        border: 2px solid #c2410c;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="position: absolute; top: 6px; left: 4px; right: 4px; height: 12px; background: rgba(255,255,255,0.2); border-radius: 2px;"></div>
        <div style="position: absolute; top: 8px; left: 6px; width: 6px; height: 8px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; top: 8px; left: 14px; width: 6px; height: 8px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; top: 8px; left: 22px; width: 6px; height: 8px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; top: 8px; right: 6px; width: 6px; height: 8px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
        <div style="position: absolute; bottom: 2px; left: 8px; width: 8px; height: 8px; background: #1f2937; border-radius: 50%; border: 1px solid #374151;"></div>
        <div style="position: absolute; bottom: 2px; right: 8px; width: 8px; height: 8px; background: #1f2937; border-radius: 50%; border: 1px solid #374151;"></div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 10px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 2px;">BUS</div>
      </div>`;

      return L.divIcon({
        html: iconHtml,
        iconSize: [54, 36],
        iconAnchor: [27, 18],
        popupAnchor: [0, -18],
        className: 'trotro-marker'
      });
    } else {
      // Taxi Icon
      const iconHtml = `<div style="
        width: 38px;
        height: 20px;
        background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
        border-radius: 12px 8px 8px 12px;
        border: 2px solid #d97706;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="position: absolute; top: 4px; left: 4px; right: 4px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 6px 4px 4px 6px;"></div>
        <div style="position: absolute; top: 1px; left: 50%; transform: translateX(-50%); width: 12px; height: 6px; background: #000; border-radius: 2px; display: flex; align-items: center; justify-content: center;"><div style="color: #fbbf24; font-size: 4px; font-weight: bold;">TAXI</div></div>
        <div style="position: absolute; bottom: 2px; left: 6px; width: 6px; height: 6px; background: #1f2937; border-radius: 50%; border: 1px solid #374151;"></div>
        <div style="position: absolute; bottom: 2px; right: 6px; width: 6px; height: 6px; background: #1f2937; border-radius: 50%; border: 1px solid #374151;"></div>
      </div>`;

      return L.divIcon({
        html: iconHtml,
        iconSize: [42, 24],
        iconAnchor: [21, 12],
        popupAnchor: [0, -12],
        className: 'taxi-marker'
      });
    }
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
  const createRoadBasedRoutePath = async (fromLat, fromLng, toLat, toLng, routeId = 'default', color = '#3b82f6') => {
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
    }).addTo(state.passengerMap);

    state.routePolylines.set(routeId, polyline);
    
    // Calculate road distance
    const roadDistance = window.RoadRouting ? 
      window.RoadRouting.calculateRoadDistance(roadPath) : 
      GreenRoute.utils.calculateDistance(fromLat, fromLng, toLat, toLng);
    
    // Fit map to show the entire route with proper padding
    const bounds = L.latLngBounds(roadPath);
    state.passengerMap.fitBounds(bounds, { padding: [80, 80] });
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
  const updateDriverMarkers = async () => {
    // Rate limiting: don't make API calls more frequently than every 5 seconds
    const now = Date.now();
    if (now - lastApiCall < 5000) {
      return;
    }
    lastApiCall = now;

    try {
      const rides = await window.api.getAvailableRides();
      
      if (!Array.isArray(rides)) {
        console.warn('No rides available');
        return;
      }

      const currentDriverIds = new Set();
      
      rides.forEach(ride => {
        if (ride.latitude && ride.longitude && (ride.isOnline !== false)) {
          currentDriverIds.add(ride.driverId);
          
          if (!state.driverMarkers.has(ride.driverId)) {
            const marker = L.marker([ride.latitude, ride.longitude], {
              icon: createDriverMarker(ride)
            }).addTo(state.passengerMap);
            
            const popupContent = `
              <div style="min-width: 220px; font-family: system-ui;">
                <strong style="color: #1f2937; font-size: 14px;">${ride.driverName || 'Driver'}</strong><br>
                <div style="margin: 4px 0;"><span style="color: #6b7280;">Plate:</span> <span style="font-weight: 600;">${ride.licensePlate || 'N/A'}</span></div>
                <div style="margin: 4px 0;"><span style="color: #6b7280;">Type:</span> <span style="font-weight: 600; color: ${ride.vehicleType === 'Trotro' ? '#ff6b35' : '#fbbf24'};">${ride.vehicleType || 'Vehicle'}</span></div>
                <div style="margin: 4px 0;"><span style="color: #6b7280;">Seats:</span> <span style="font-weight: 600;">${ride.seats || 0}</span></div>
                <div style="margin: 4px 0;"><span style="color: #6b7280;">Fare:</span> <span style="font-weight: 600; color: #10b981;">GHS ${ride.fare || '5.50'}</span></div>
                <div style="margin: 4px 0;"><span style="color: #6b7280;">Rating:</span> <span style="font-weight: 600;">${ride.rating || '4.5'}</span></div>
                <div style="margin: 4px 0;"><span style="color: #6b7280;">Route:</span> <span style="font-weight: 600; color: #3b82f6;">Follows actual roads</span></div>
              </div>
            `;
            marker.bindPopup(popupContent);
            
            state.driverMarkers.set(ride.driverId, marker);
          } else {
            const marker = state.driverMarkers.get(ride.driverId);
            marker.setLatLng([ride.latitude, ride.longitude]);
          }
        }
      });

      for (const [driverId, marker] of state.driverMarkers) {
        if (!currentDriverIds.has(driverId)) {
          state.passengerMap.removeLayer(marker);
          state.driverMarkers.delete(driverId);
        }
      }

      const activeDrivers = rides.filter(r => r.latitude && r.longitude && (r.isOnline !== false)).length;
      if (elements.driversCount) {
        elements.driversCount.textContent = `${activeDrivers} drivers found`;
      }
      
      } catch (error) {
      console.error('Failed to update driver markers:', error);
    }
  };

  // Track active trip with road-based route
  const trackActiveTrip = async () => {
    if (!state.activeBooking || !state.activeBooking.rideId) {
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
        if (state.userLocation && elements.arrivalTime) {
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
        } else {
          console.warn('Cannot update ETA - missing user location or arrivalTime element');
        }
      } else {
        console.warn('No driver location available for tracking');
        if (elements.arrivalTime) {
          elements.arrivalTime.textContent = 'Searching...';
        }
      }
    } catch (error) {
      console.error('Failed to track active trip:', error);
      if (elements.arrivalTime) {
        elements.arrivalTime.textContent = 'Error';
      }
    }
  };

  // Start tracking
  const startTracking = () => {
    if (state.isTracking) return;
    
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
    const origin = elements.pickupInput?.value.trim();
    const destination = elements.destinationInput?.value.trim();
    const passengerValue = elements.passengersCount?.value ?? elements.passengersCount?.textContent;
    const passengers = parseInt(String(passengerValue || '1').trim(), 10) || 1;

    if (!origin || !destination) {
      showNotification('Please enter both pickup and destination', 'error');
      return;
    }

    if (!state.userLocation) {
      showNotification('Location access is required to book a ride', 'error');
      return;
    }

    if (state.activeBooking) {
      showNotification('You already have an active ride. Cancel it before booking another.', 'info');
      return;
    }

    try {
      const resumed = await restoreActiveBooking(false);
      if (resumed) {
        showNotification('You already have an active ride. Resuming it now.', 'info');
        return;
      }

      // Show loading state
      if (elements.findRideBtn) {
        elements.findRideBtn.disabled = true;
        elements.findRideBtn.textContent = 'Finding drivers...';
      }

      const rides = await window.api.getAvailableRides();
      
      const suitableRide = rides.find(ride => 
        ride.status === 'available' && 
        ride.seats >= passengers &&
        ride.latitude && ride.longitude
      );

      if (!suitableRide) {
        showNotification('No available drivers found. Please try again later.', 'error');
        return;
      }

      // Calculate fare before booking
      const farePerPerson = suitableRide.fare || 5.50;
      const totalFare = farePerPerson * passengers;

      const booking = await window.api.createBooking(
        suitableRide.id,
        state.passengerId,
        passengers,
        state.userLocation.lat,
        state.userLocation.lng
      );

      // Store booking with fare information
      state.activeBooking = {
        ...booking,
        rideId: suitableRide.id,
        driverId: suitableRide.driverId,
        driverName: suitableRide.driverName,
        driverPlate: suitableRide.licensePlate,
        vehicleType: suitableRide.vehicleType,
        destination: destination,
        origin: origin,
        fare: totalFare,
        seats: passengers,
        farePerPerson: farePerPerson
      };

      // Show active ride panel
      showActiveRide(suitableRide, totalFare, passengers);
      
      // Create route to destination
      const destCoords = await getDestinationCoordinates(destination);
      if (destCoords) {
        await createRoadBasedRoutePath(
          state.userLocation.lat, state.userLocation.lng,
          destCoords.lat, destCoords.lng,
          'passenger-to-destination',
          '#3b82f6'
        );
        
        if (state.destinationMarker) {
          state.passengerMap.removeLayer(state.destinationMarker);
        }
        
        state.destinationMarker = L.marker([destCoords.lat, destCoords.lng], {
          icon: L.divIcon({
            html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">📍</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: 'destination-marker'
          })
        }).addTo(state.passengerMap);
        
        state.destinationMarker.bindPopup(`<strong>Destination</strong><br>${destination}`);
      }
      
      startTracking();
      showNotification('Ride booked successfully!', 'success');

    } catch (error) {
      const errorText = String(error?.message || '');
      if (errorText.includes('You already have an active booking for this ride')) {
        const resumed = await restoreActiveBooking(true);
        if (!resumed) {
          showNotification('You already have an active booking. Refresh and try again.', 'error');
        }
      } else {
        console.error('Failed to find ride:', error);
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

  // Show active ride panel
  const showActiveRide = (ride, totalFare, passengers) => {
    if (!elements.activeRide) return;
    
    // Update driver information
    if (elements.driverName) {
      elements.driverName.textContent = ride.driverName || 'Driver';
    }
    if (elements.driverPhoto) {
      elements.driverPhoto.src = ride.driverPhoto || '/assets/default-driver.svg';
    }
    if (elements.driverRating) {
      elements.driverRating.textContent = `⭐ ${ride.rating || '4.5'}`;
    }
    if (elements.driverTrips) {
      elements.driverTrips.textContent = `• ${ride.trips || '234'} trips`;
    }
    if (elements.rideStatus) {
      elements.rideStatus.textContent = 'Driver confirmed';
    }
    
    // Show the active ride panel
    elements.activeRide.style.display = 'block';
    elements.activeRide.hidden = false;

    const liveFare = byIds('pv2-live-fare');
    if (liveFare) {
      liveFare.textContent = `GHS ${Number(totalFare || 0).toFixed(2)}`;
    }
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
  const init = () => {
    // Load road routing system
    if (!window.RoadRouting) {
      const script = document.createElement('script');
      script.src = '../../road-routing.js';
      script.defer = true;
      document.head.appendChild(script);
    }
    
    initMap();
    getUserLocation();
    
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
    
    window.addEventListener('beforeunload', () => {
      stopTracking();
    });
  };

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();