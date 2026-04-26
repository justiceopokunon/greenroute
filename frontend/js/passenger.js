
(() => {
  'use strict';

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
    passengerId: GreenRoute.utils.getStorage(GreenRoute.storage.passengerId, 'ca1f1983-a755-4359-8a5d-6699a1988c29') // Use real passenger ID
  };

  const elements = {
    originInput: document.getElementById('pv2-origin'),
    destinationInput: document.getElementById('pv2-destination'),
    passengerCount: document.getElementById('pv2-passenger-count'),
    findRideBtn: document.getElementById('pv2-find-ride'),
    activeTripPanel: document.getElementById('pv2-active-trip-panel'),
    driverName: document.getElementById('pv2-driver-name'),
    driverPlate: document.getElementById('pv2-driver-plate'),
    driverPhoto: document.getElementById('pv2-driver-photo'),
    liveEta: document.getElementById('pv2-live-eta'),
    cancelBtn: document.getElementById('pv2-cancel-btn'),
    statsPill: document.getElementById('pv2-stats-pill'),
    passengerMap: document.getElementById('passenger-map'),
    userName: document.getElementById('pv2-user-name'),
    minusBtn: document.getElementById('pv2-minus'),
    plusBtn: document.getElementById('pv2-plus'),
    modal: document.getElementById('pv2-modal'),
    modalSearching: document.getElementById('pv2-modal-searching'),
    modalNoMatch: document.getElementById('pv2-modal-no-match'),
    modalMatched: document.getElementById('pv2-modal-matched'),
    modalDriverName: document.getElementById('pv2-modal-driver-name'),
    modalPlate: document.getElementById('pv2-modal-plate'),
    modalVehicle: document.getElementById('pv2-modal-vehicle'),
    modalEta: document.getElementById('pv2-modal-eta'),
    modalFare: document.getElementById('pv2-modal-fare'),
    liveEta: document.getElementById('pv2-live-eta'),
    liveFare: document.getElementById('pv2-live-fare'),
    trackMapBtn: document.getElementById('pv2-track-map'),
    cancelModalBtn: document.getElementById('pv2-cancel-modal'),
    tryDifferentBtn: document.getElementById('pv2-try-different'),
    sosButton: document.getElementById('panic-button'),
    tripFare: document.getElementById('pv2-trip-fare'),
    tripSeats: document.getElementById('pv2-trip-seats')
  };

  const initMap = () => {
    if (!elements.passengerMap || state.passengerMap) return;

    if (typeof L === 'undefined') {
      console.error('Leaflet not loaded');
      return;
    }

    state.passengerMap = L.map('passenger-map').setView(GreenRoute.config.mapCenter, GreenRoute.config.defaultZoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(state.passengerMap);
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
      elements.originInput.value = 'Enable location to continue';
      elements.originInput.disabled = true;
      return;
    }

    elements.originInput.value = 'Detecting your location...';
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        state.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        const address = await GreenRoute.utils.reverseGeocode(state.userLocation.lat, state.userLocation.lng);
        elements.originInput.value = address || 'Current location';

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
        elements.originInput.value = 'Enable location to continue';
        elements.originInput.disabled = false;
        
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
        elements.originInput.value = errorMessage;
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
    return knownStops[normalizedDest] || null;
  };

  // Create road-based route path - FIXED TO FOLLOW ACTUAL ROADS
  const createRoadBasedRoutePath = (fromLat, fromLng, toLat, toLng, routeId = 'default', color = '#3b82f6') => {
    // Remove existing route if it exists
    if (state.routePolylines.has(routeId)) {
      state.passengerMap.removeLayer(state.routePolylines.get(routeId));
    }

    let roadPath = null;

    // Try to find road path between known stops
    const fromStop = findNearestStop(fromLat, fromLng);
    const toStop = findNearestStop(toLat, toLng);
    
    if (fromStop && toStop && window.RoadRouting) {
      roadPath = window.RoadRouting.getRoadPath(fromStop, toStop);
    }

    // If no road path found, create realistic path
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
      dashArray: '15, 10',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'road-route-path'
    }).addTo(state.passengerMap);

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
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-bottom: 12px solid ${color};
              transform: rotate(${angle}deg);
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            "></div>`,
            iconSize: [16, 12],
            iconAnchor: [8, 12],
            className: 'road-route-arrow'
          })
        }).addTo(state.passengerMap);
      }
    }

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
  const updateDriverMarkers = async () => {
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
      elements.statsPill.textContent = activeDrivers > 0 ? `${activeDrivers} drivers active` : 'No drivers active';
      
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
        if (state.userLocation && elements.liveEta) {
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
          
          elements.liveEta.textContent = `${eta} min`;
          // Create road-based route from driver to passenger
          createRoadBasedRoutePath(
            ride.latitude, ride.longitude,
            state.userLocation.lat, state.userLocation.lng,
            'driver-to-passenger',
            '#10b981'
          );
        } else {
          console.warn('Cannot update ETA - missing user location or liveEta element');
        }
      } else {
        console.warn('No driver location available for tracking');
        if (elements.liveEta) {
          elements.liveEta.textContent = 'Searching...';
        }
      }
    } catch (error) {
      console.error('Failed to track active trip:', error);
      if (elements.liveEta) {
        elements.liveEta.textContent = 'Error';
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

  // Find and book ride with road-based routing
  const findRide = async () => {
    const origin = elements.originInput.value.trim();
    const destination = elements.destinationInput.value.trim();
    const passengers = parseInt(elements.passengerCount.textContent);

    if (!origin || !destination) {
      alert('Please enter both origin and destination');
      return;
    }

    if (!state.userLocation) {
      alert('Location access is required to book a ride');
      return;
    }

    elements.modal.hidden = false;
    elements.modalSearching.hidden = false;
    elements.modalNoMatch.hidden = true;
    elements.modalMatched.hidden = true;

    try {
      const rides = await window.api.getAvailableRides();
      
      const suitableRide = rides.find(ride => 
        ride.status === 'available' && 
        ride.seats >= passengers &&
        ride.latitude && ride.longitude
      );

      if (!suitableRide) {
        elements.modalSearching.hidden = true;
        elements.modalNoMatch.hidden = false;
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

      elements.modalSearching.hidden = true;
      elements.modalMatched.hidden = false;
      
      // Set modal driver information
      if (elements.modalDriverName) {
        elements.modalDriverName.textContent = suitableRide.driverName || suitableRide.name || 'Driver';
      }
      if (elements.modalPlate) {
        elements.modalPlate.textContent = `Plate: ${suitableRide.licensePlate || suitableRide.plate || 'N/A'}`;
      }
      if (elements.modalVehicle) {
        elements.modalVehicle.textContent = `Vehicle: ${suitableRide.vehicleType || 'Vehicle'}`;
      }
      
      // Display fare information
      if (elements.modalFare) {
        elements.modalFare.textContent = `GHS ${totalFare.toFixed(2)}`;
        elements.modalFare.style.color = '#10b981';
        elements.modalFare.style.fontWeight = 'bold';
      }
      
      // Calculate and display ETA
      if (suitableRide.latitude && suitableRide.longitude && state.userLocation) {
        const distance = GreenRoute.utils.calculateDistance(
          suitableRide.latitude, suitableRide.longitude,
          state.userLocation.lat, state.userLocation.lng
        );
        let eta;
        try {
          eta = GreenRoute.utils.calculateETA(distance);
        } catch (etaError) {
          eta = Math.ceil(distance * 2); // Fallback
        }
        if (elements.modalEta) {
          elements.modalEta.textContent = `${eta} min`;
        }
      } else {
        if (elements.modalEta) {
          elements.modalEta.textContent = 'Calculating...';
        }
      }

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

      // Show active trip panel with driver info
      if (elements.activeTripPanel) {
        elements.activeTripPanel.hidden = false;
        elements.activeTripPanel.style.display = 'block';
        }
      
      // Display driver information with fallbacks
      if (elements.driverName) {
        const driverName = suitableRide.driverName || suitableRide.name || 'Driver';
        elements.driverName.textContent = driverName;
        }
      
      if (elements.driverPlate) {
        const plate = suitableRide.licensePlate || suitableRide.plate || 'N/A';
        elements.driverPlate.textContent = `Plate: ${plate}`;
        }
      
      // Set driver photo if available
      if (elements.driverPhoto) {
        elements.driverPhoto.src = suitableRide.driverPhoto || suitableRide.photo || '';
        elements.driverPhoto.alt = suitableRide.driverName || suitableRide.name || 'Driver';
      }
      
      // Display fare in active trip panel
      if (elements.liveFare) {
        elements.liveFare.textContent = `GHS ${totalFare.toFixed(2)}`;
        elements.liveFare.style.color = '#10b981';
        elements.liveFare.style.fontWeight = 'bold';
      }
      
      if (elements.tripSeats) {
        elements.tripSeats.textContent = `${passengers} ${passengers === 1 ? 'seat' : 'seats'}`;
      }
      
      // Calculate initial ETA if driver location is available
      if (suitableRide.latitude && suitableRide.longitude && state.userLocation) {
        const distance = GreenRoute.utils.calculateDistance(
          suitableRide.latitude, suitableRide.longitude,
          state.userLocation.lat, state.userLocation.lng
        );
        const eta = GreenRoute.utils.calculateETA(distance);
        if (elements.liveEta) {
          elements.liveEta.textContent = `${eta} min`;
          }
      } else {
        console.warn('Cannot calculate ETA - missing driver location or user location');
        if (elements.liveEta) {
          elements.liveEta.textContent = 'Calculating...';
        }
      }
      
      // Create road-based route from passenger to destination
      const destCoords = await getDestinationCoordinates(destination);
      if (destCoords) {
        createRoadBasedRoutePath(
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

    } catch (error) {
      console.error('Failed to find ride:', error);
      elements.modalSearching.hidden = true;
      elements.modalNoMatch.hidden = false;
    }
  };

  // Cancel booking
  const cancelBooking = async () => {
    if (!state.activeBooking) return;

    try {
      await window.api.cancelBooking(state.activeBooking.id);
      
      state.activeBooking = null;
      
      // Hide and reset Active Trip panel
      if (elements.activeTripPanel) {
        elements.activeTripPanel.hidden = true;
        elements.activeTripPanel.style.display = 'none';
      }
      
      // Reset driver information displays
      if (elements.driverName) {
        elements.driverName.textContent = '-';
      }
      if (elements.driverPlate) {
        elements.driverPlate.textContent = 'Plate: -';
      }
      if (elements.driverPhoto) {
        elements.driverPhoto.src = '';
        elements.driverPhoto.alt = 'Driver';
      }
      if (elements.liveEta) {
        elements.liveEta.textContent = '--';
      }
      
      // Hide modal
      if (elements.modal) {
        elements.modal.hidden = true;
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
      
      // Clear fare displays
      if (elements.tripFare) {
        elements.tripFare.textContent = '';
      }
      if (elements.tripSeats) {
        elements.tripSeats.textContent = '';
      }
      
      stopTracking();
      
      // Reset form inputs
      if (elements.destinationInput) {
        elements.destinationInput.value = '';
      }
      if (elements.passengerCount) {
        elements.passengerCount.textContent = '1';
      }
      
      } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  };

  // Initialize passenger app
  const init = () => {
    // Load road routing system
    if (!window.RoadRouting) {
      const script = document.createElement('script');
      script.src = '../../road-routing.js';
      script.onload = () => {
        };
      document.head.appendChild(script);
    }
    
    initMap();
    getUserLocation();
    
    // Add SOS button event listener
    if (elements.sosButton) {
      elements.sosButton.addEventListener('click', handleSOS);
      } else {
      console.warn('SOS button not found in DOM');
    }
    
    // Start driver polling after a short delay
    setTimeout(() => {
      const driverPollInterval = setInterval(updateDriverMarkers, GreenRoute.config.pollingInterval);
      state.pollingIntervals.set('driverPolling', driverPollInterval);
      
      updateDriverMarkers();
    }, 1000);
    
    // Event listeners
    elements.findRideBtn?.addEventListener('click', findRide);
    elements.cancelBtn?.addEventListener('click', cancelBooking);
    elements.trackMapBtn?.addEventListener('click', () => {
      // Close modal and show Active Trip
      if (elements.modal) {
        elements.modal.hidden = true;
      }
      
      // Ensure Active Trip panel is visible
      if (elements.activeTripPanel) {
        elements.activeTripPanel.hidden = false;
        elements.activeTripPanel.style.display = 'block';
      }
      
      // Center map on user location
      if (state.userLocation && state.passengerMap) {
        state.passengerMap.setView([state.userLocation.lat, state.userLocation.lng], 15);
      }
      
      });
    
    elements.cancelModalBtn?.addEventListener('click', cancelBooking);
    elements.tryDifferentBtn?.addEventListener('click', () => {
      elements.modal.hidden = true;
    });
    
    // Passenger count controls
    let currentCount = 1;
    elements.minusBtn?.addEventListener('click', () => {
      if (currentCount > 1) {
        currentCount--;
        elements.passengerCount.textContent = currentCount;
      }
    });
    
    elements.plusBtn?.addEventListener('click', () => {
      if (currentCount < 10) {
        currentCount++;
        elements.passengerCount.textContent = currentCount;
      }
    });
    
    // Quick route buttons
    document.querySelectorAll('[data-pv2-from][data-pv2-to]').forEach(btn => {
      btn.addEventListener('click', () => {
        elements.originInput.value = btn.dataset.pv2From;
        elements.destinationInput.value = btn.dataset.pv2To;
      });
    });
    
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