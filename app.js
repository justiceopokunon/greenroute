(() => {
  'use strict';

  const themeStorageKey = 'greenroute-theme';
  const roleStorageKey = 'greenroute-user-role';
  const lastOriginStorageKey = 'greenroute-last-origin';
  const lastDestinationStorageKey = 'greenroute-last-destination';
  const lastRecentPlacesStorageKey = 'greenroute-recent-places';
  const activeTripStorageKey = 'greenroute-active-trip';
  const root = document.documentElement;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const routes = [
    {
      id: 1,
      from: 'Madina',
      to: 'Circle',
      fare: 2.5,
      eta: 6,
      seats: 2,
      vehicle: 'GR-214 · Toyota Hiace',
      status: 'On-Route',
      note: '2 seats left',
      progress: 82,
      timeline: [['Madina', 'Departed'], ['37 Junction', 'In transit'], ['Airport', '2 mins'], ['Circle', 'ETA 6 mins']]
    },
    {
      id: 2,
      from: 'Adenta',
      to: 'Accra Central',
      fare: 3.2,
      eta: 12,
      seats: 8,
      vehicle: 'GR-301 · Hyundai County',
      status: 'Departing',
      note: 'Plenty space',
      progress: 44,
      timeline: [['Adenta', 'Boarding'], ['Madina', 'Upcoming'], ['Circle', 'Upcoming'], ['Accra Central', 'ETA 12 mins']]
    },
    {
      id: 3,
      from: 'Kaneshie',
      to: 'Tema Station',
      fare: 3.8,
      eta: 9,
      seats: 4,
      vehicle: 'GR-119 · Ford Transit',
      status: 'Confirmed',
      note: 'Boarding soon',
      progress: 67,
      timeline: [['Kaneshie', 'Departed'], ['Odorkor', 'In transit'], ['Abossey Okai', 'In transit'], ['Tema Station', 'ETA 9 mins']]
    }
  ];

  const elements = {
    themeToggles: Array.from(document.querySelectorAll('#theme-toggle')),
    routeList: document.getElementById('route-list'),
    resultsCount: document.getElementById('results-count'),
    activeRoutes: document.getElementById('active-routes'),
    nearbyRoutes: document.getElementById('nearby-routes'),
    availableSeats: document.getElementById('available-seats'),
    selectedEta: document.getElementById('selected-eta'),
    selectedRouteName: document.getElementById('selected-route-name'),
    selectedFare: document.getElementById('selected-fare'),
    selectedRouteNote: document.getElementById('selected-route-note'),
    selectedSeatNote: document.getElementById('selected-seat-note'),
    mapRouteLabel: document.getElementById('map-route-label'),
    mapVehicleLabel: document.getElementById('map-vehicle-label'),
    mapFrame: document.querySelector('.map-frame'),
    mapHotspots: Array.from(document.querySelectorAll('.map-hotspot')),
    mapModeOrigin: document.getElementById('map-mode-origin'),
    mapModeDestination: document.getElementById('map-mode-destination'),
    locateMe: document.getElementById('locate-me'),
    userLocationChip: document.getElementById('user-location-chip'),
    userDot: document.getElementById('user-dot'),
    pinA: document.querySelector('.pin-a'),
    pinB: document.querySelector('.pin-b'),
    vehicle: document.getElementById('vehicle'),
    routeProgress: document.getElementById('route-progress'),
    timeline: document.getElementById('timeline'),
    passengerCount: document.getElementById('passenger-count'),
    origin: document.getElementById('origin'),
    destination: document.getElementById('destination'),
    searchRoutes: document.getElementById('search-routes'),
    resetSearch: document.getElementById('reset-search'),
    plus: document.getElementById('plus'),
    minus: document.getElementById('minus'),
    bookRoute: document.getElementById('book-route'),
    tripDate: document.getElementById('trip-date'),
    mapStage: document.querySelector('.map-stage'),
    spotlightToggle: document.getElementById('spotlight-toggle'),
    shareTrip: document.getElementById('share-trip'),
    shareTripMobile: document.getElementById('share-trip-mobile'),
    bookRouteMobile: document.getElementById('book-route-mobile'),
    choiceButtons: Array.from(document.querySelectorAll('[data-choice]')),
    recentPlaceButtons: Array.from(document.querySelectorAll('[data-recent-place]')),
    authForms: Array.from(document.querySelectorAll('[data-auth-form]')),
    passwordToggles: Array.from(document.querySelectorAll('[data-password-toggle]')),
    formNotes: Array.from(document.querySelectorAll('[data-form-note]')),
    driverRequestList: document.getElementById('driver-request-list'),
    shiftToggle: document.getElementById('shift-toggle'),
    completeRide: document.getElementById('complete-ride'),
    autoAccept: document.getElementById('auto-accept'),
    todayTrips: document.getElementById('today-trips'),
    todayEarnings: document.getElementById('today-earnings'),
    activeRideCount: document.getElementById('active-ride-count'),
    queueSize: document.getElementById('queue-size'),
    nextStop: document.getElementById('next-stop'),
    driverStatusPill: document.getElementById('driver-status-pill'),
    driverMapLabel: document.getElementById('driver-map-label'),
    driverMapNote: document.getElementById('driver-map-note'),
    liveTripTitle: document.getElementById('live-trip-title'),
    liveTripCopy: document.getElementById('live-trip-copy'),
    approachAlertTitle: document.getElementById('approach-alert-title'),
    approachAlertCopy: document.getElementById('approach-alert-copy'),
    vehicleAlertTitle: document.getElementById('vehicle-alert-title'),
    vehicleAlertCopy: document.getElementById('vehicle-alert-copy'),
    activityAlertTitle: document.getElementById('activity-alert-title'),
    activityAlertCopy: document.getElementById('activity-alert-copy')
  };

  const state = {
    selectedRouteId: routes[0].id,
    passengers: 1,
    filteredRoutes: routes.slice(),
    spotlightEnabled: false,
    mapSelectionMode: 'origin',
    locationWatchId: null,
    fallbackNoticeShown: false
  };

  const mapBounds = {
    minLon: -0.244,
    maxLon: -0.124,
    minLat: 5.529,
    maxLat: 5.686
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const coordinatesFromLatLon = (latitude, longitude) => {
    const x = ((longitude - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * 100;
    const y = (1 - ((latitude - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat))) * 100;
    return {
      x: clamp(x, 2, 98),
      y: clamp(y, 2, 98)
    };
  };

  const placeToCoordinates = (place) => {
    const normalizedPlace = String(place || '').trim().toLowerCase();
    if (!normalizedPlace) {
      return null;
    }

    const hotspot = elements.mapHotspots.find(
      (node) => (node.dataset.place || '').trim().toLowerCase() === normalizedPlace
    );
    if (!hotspot) {
      return null;
    }

    const latitude = Number(hotspot.dataset.lat || '0');
    const longitude = Number(hotspot.dataset.lon || '0');
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  };

  const makeAbbreviation = (place) =>
    String(place || '')
      .trim()
      .split(/\s+/)
      .map((word) => word[0] || '')
      .join('')
      .slice(0, 3)
      .toUpperCase();

  const setPinPosition = (pinElement, place) => {
    if (!pinElement) {
      return;
    }

    const coords = placeToCoordinates(place);
    if (!coords) {
      return;
    }

    const point = coordinatesFromLatLon(coords.latitude, coords.longitude);
    pinElement.style.left = `${point.x}%`;
    pinElement.style.top = `${point.y}%`;

    const abbreviation = makeAbbreviation(place);
    if (abbreviation) {
      pinElement.textContent = abbreviation;
    }
  };

  const updateMapFrameBounds = () => {
    if (!elements.mapFrame) {
      return;
    }

    const originCoords = placeToCoordinates(elements.origin?.value || '');
    const destinationCoords = placeToCoordinates(elements.destination?.value || '');
    const points = [originCoords, destinationCoords].filter(Boolean);
    if (!points.length) {
      return;
    }

    const lats = points.map((point) => point.latitude);
    const lons = points.map((point) => point.longitude);
    const padding = 0.028;
    const minLon = Math.min(...lons) - padding;
    const maxLon = Math.max(...lons) + padding;
    const minLat = Math.min(...lats) - padding;
    const maxLat = Math.max(...lats) + padding;

    const nextSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(minLon)},${encodeURIComponent(minLat)},${encodeURIComponent(maxLon)},${encodeURIComponent(maxLat)}&layer=mapnik`;
    if (elements.mapFrame.src !== nextSrc) {
      elements.mapFrame.src = nextSrc;
    }
  };

  const updateMapSelectionState = () => {
    const originPlace = String(elements.origin?.value || '').trim().toLowerCase();
    const destinationPlace = String(elements.destination?.value || '').trim().toLowerCase();

    elements.mapHotspots.forEach((hotspot) => {
      const place = String(hotspot.dataset.place || '').trim().toLowerCase();
      hotspot.classList.toggle('origin-active', Boolean(originPlace) && place === originPlace);
      hotspot.classList.toggle('destination-active', Boolean(destinationPlace) && place === destinationPlace);
      hotspot.classList.toggle('active', (Boolean(originPlace) && place === originPlace) || (Boolean(destinationPlace) && place === destinationPlace));
    });

    setPinPosition(elements.pinA, elements.origin?.value || '');
    setPinPosition(elements.pinB, elements.destination?.value || '');
    updateMapFrameBounds();
  };

  const saveLastInputs = () => {
    if (elements.origin?.value) {
      localStorage.setItem(lastOriginStorageKey, elements.origin.value.trim());
    }
    if (elements.destination?.value) {
      localStorage.setItem(lastDestinationStorageKey, elements.destination.value.trim());
    }
  };

  const readActiveTrip = () => {
    try {
      return JSON.parse(localStorage.getItem(activeTripStorageKey) || 'null');
    } catch {
      return null;
    }
  };

  const saveActiveTrip = (trip) => {
    if (!trip) {
      localStorage.removeItem(activeTripStorageKey);
      return;
    }

    localStorage.setItem(activeTripStorageKey, JSON.stringify(trip));
  };

  const updateLiveTripCard = (trip) => {
    if (!elements.liveTripTitle || !elements.liveTripCopy) {
      return;
    }

    if (!trip) {
      elements.liveTripTitle.textContent = 'No Active Trip';
      elements.liveTripCopy.textContent = 'Accepted driver assignments will appear here in real time.';
      return;
    }

    const etaText = trip.eta ? `ETA ${trip.eta} min` : 'Live Update';
    elements.liveTripTitle.textContent = `${trip.rider || 'Rider'} · ${trip.from} → ${trip.to}`;
    elements.liveTripCopy.textContent = `${trip.vehicle || 'Driver Assigned'} · ${trip.fare ? `GHS ${Number(trip.fare).toFixed(2)}` : 'Fare pending'} · ${etaText}`;
  };

  const updateContextAlerts = (route, trip) => {
    if (!elements.approachAlertTitle || !elements.approachAlertCopy || !elements.vehicleAlertTitle || !elements.vehicleAlertCopy || !elements.activityAlertTitle || !elements.activityAlertCopy) {
      return;
    }

    const current = trip || route;
    if (!current) {
      elements.approachAlertTitle.textContent = 'Vehicle Arrival';
      elements.approachAlertCopy.textContent = 'Your vehicle is approximately 300 meters from Kaneshie Overhead.';
      elements.vehicleAlertTitle.textContent = 'Vehicle Capacity';
      elements.vehicleAlertCopy.textContent = 'Vehicle capacity is limited. Two seats are currently available.';
      elements.activityAlertTitle.textContent = 'Route Activity';
      elements.activityAlertCopy.textContent = 'Route updates are reflected in the map and live tracker.';
      return;
    }

    const eta = Number(current.eta);
    const seats = Number(current.seats);
    const destination = current.to || 'destination';
    const origin = current.from || 'pickup point';
    const vehicle = current.vehicle || 'Vehicle assigned';

    const approachDistanceMeters = Number.isFinite(eta) ? Math.max(200, Math.round(eta * 85)) : null;
    const approachText = approachDistanceMeters
      ? `${vehicle} is about ${approachDistanceMeters}m away from ${origin}.`
      : `${vehicle} is moving toward your pickup point at ${origin}.`;

    elements.approachAlertTitle.textContent = `${origin} Pickup`;
    elements.approachAlertCopy.textContent = `${approachText} ${Number.isFinite(eta) ? `ETA ${eta} min.` : 'Live tracking is active.'}`;

    if (Number.isFinite(seats)) {
      if (seats <= 2) {
        elements.vehicleAlertTitle.textContent = 'Vehicle Alert';
        elements.vehicleAlertCopy.textContent = `Vehicle almost full. Only ${seats} seat${seats === 1 ? '' : 's'} remaining.`;
      } else if (seats <= 5) {
        elements.vehicleAlertTitle.textContent = 'Vehicle Capacity Update';
        elements.vehicleAlertCopy.textContent = `${seats} seats are available on ${vehicle}.`;
      } else {
        elements.vehicleAlertTitle.textContent = 'Seats available';
        elements.vehicleAlertCopy.textContent = `${seats} seats open from ${origin} to ${destination}.`;
      }
    } else {
      elements.vehicleAlertTitle.textContent = 'Vehicle Assignment';
      elements.vehicleAlertCopy.textContent = `${vehicle} is assigned for ${origin} to ${destination}.`;
    }

    elements.activityAlertTitle.textContent = trip ? 'Live Trip Activity' : 'Route Activity';
    elements.activityAlertCopy.textContent = trip
      ? `${trip.status || 'The driver accepted your trip'}. ${origin} to ${destination} is now tracked in real time.`
      : `${origin} to ${destination} updates are reflected on the map and tracker.`;
  };

  const syncPassengerLiveTrip = () => {
    const activeTrip = readActiveTrip();

    updateLiveTripCard(activeTrip);
    updateContextAlerts(getSelectedRoute(), activeTrip);
    if (!activeTrip) {
      return;
    }

    if (elements.selectedRouteName) {
      elements.selectedRouteName.textContent = `${activeTrip.rider || 'Active Trip'} · ${activeTrip.from} → ${activeTrip.to}`;
    }
    if (elements.selectedFare) {
      elements.selectedFare.textContent = activeTrip.fare ? `GHS ${Number(activeTrip.fare).toFixed(2)}` : 'Live';
    }
    if (elements.selectedEta) {
      elements.selectedEta.textContent = activeTrip.eta ? `${activeTrip.eta} min` : 'Live';
    }
    if (elements.vehicle) {
      elements.vehicle.textContent = activeTrip.vehicle || 'Driver Assigned';
    }
    if (elements.mapRouteLabel) {
      elements.mapRouteLabel.textContent = `Live Trip: ${activeTrip.from} → ${activeTrip.to}`;
    }
    if (elements.mapVehicleLabel) {
      elements.mapVehicleLabel.textContent = activeTrip.driver || 'Assigned driver';
    }
    if (elements.selectedRouteNote) {
      elements.selectedRouteNote.textContent = activeTrip.status || 'The driver has accepted your trip';
    }
    if (elements.selectedSeatNote) {
      elements.selectedSeatNote.textContent = activeTrip.seats ? `${activeTrip.seats} seat${activeTrip.seats === 1 ? '' : 's'} booked` : 'Seat confirmed';
    }
    if (elements.routeProgress && activeTrip.progress !== undefined) {
      elements.routeProgress.style.width = `${activeTrip.progress}%`;
    }
  };

  const rememberRecentPlace = (place) => {
    if (!place) {
      return;
    }

    const normalized = place.trim();
    if (!normalized) {
      return;
    }

    const current = JSON.parse(localStorage.getItem(lastRecentPlacesStorageKey) || '[]');
    const next = [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 3);
    localStorage.setItem(lastRecentPlacesStorageKey, JSON.stringify(next));

    elements.recentPlaceButtons.forEach((button, index) => {
      button.textContent = next[index] || button.textContent;
      button.dataset.recentPlace = button.textContent || '';
    });
  };

  const initializeRememberedInputs = () => {
    const lastOrigin = localStorage.getItem(lastOriginStorageKey);
    const lastDestination = localStorage.getItem(lastDestinationStorageKey);
    if (lastOrigin && elements.origin) {
      elements.origin.value = lastOrigin;
    }
    if (lastDestination && elements.destination) {
      elements.destination.value = lastDestination;
    }

    const recentPlaces = JSON.parse(localStorage.getItem(lastRecentPlacesStorageKey) || '[]');
    if (recentPlaces.length) {
      elements.recentPlaceButtons.forEach((button, index) => {
        if (recentPlaces[index]) {
          button.textContent = recentPlaces[index];
          button.dataset.recentPlace = recentPlaces[index];
        }
      });
    }
  };

  const setTheme = (theme) => {
    root.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
    elements.themeToggles.forEach((button) => {
      button.textContent = theme === 'dark' ? 'Dark Theme' : 'Light Theme';
    });
  };

  const toast = (message) => {
    const toastElement = document.createElement('div');
    toastElement.className = 'toast';
    toastElement.textContent = message;
    document.body.appendChild(toastElement);
    window.setTimeout(() => toastElement.classList.add('visible'), 10);
    window.setTimeout(() => {
      toastElement.classList.remove('visible');
      window.setTimeout(() => toastElement.remove(), 220);
    }, 2400);
  };

  const getSelectedRoute = () => state.filteredRoutes.find((route) => route.id === state.selectedRouteId) || state.filteredRoutes[0] || routes[0];

  const renderStats = () => {
    const routeCount = state.filteredRoutes.length;
    const seatCount = state.filteredRoutes.reduce((sum, route) => sum + route.seats, 0);

    if (elements.activeRoutes) {
      elements.activeRoutes.textContent = String(routeCount);
    }
    if (elements.nearbyRoutes) {
      elements.nearbyRoutes.textContent = String(routeCount);
    }
    if (elements.availableSeats) {
      elements.availableSeats.textContent = String(seatCount);
    }
  };

  const setBookButtonState = (route) => {
    if (!elements.bookRoute && !elements.bookRouteMobile) {
      return;
    }

    if (!route) {
      [elements.bookRoute, elements.bookRouteMobile].forEach((button) => {
        if (!button) {
          return;
        }
        button.textContent = 'No route available';
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
      });
      return;
    }

    [elements.bookRoute, elements.bookRouteMobile].forEach((button) => {
      if (!button) {
        return;
      }
      button.disabled = false;
      button.style.opacity = '';
      button.style.cursor = '';
      button.textContent = state.passengers > route.seats ? 'Not enough seats' : 'Reserve seat';
    });
  };

  const setActiveChoice = (choice) => {
    elements.choiceButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.choice === choice);
    });
  };

  const setMapSelectionMode = (mode) => {
    state.mapSelectionMode = mode;
    elements.mapModeOrigin?.classList.toggle('active', mode === 'origin');
    elements.mapModeDestination?.classList.toggle('active', mode === 'destination');
    toast(mode === 'origin' ? 'Select a map point to set the origin.' : 'Select a map point to set the destination.');
  };

  const updateUserDot = (latitude, longitude) => {
    if (!elements.userDot) {
      return;
    }

    const { x: clampedX, y: clampedY } = coordinatesFromLatLon(latitude, longitude);

    elements.userDot.hidden = false;
    elements.userDot.style.left = `${clampedX}%`;
    elements.userDot.style.top = `${clampedY}%`;
  };

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const distanceKm = (lat1, lon1, lat2, lon2) => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const nearestHotspot = (latitude, longitude) => {
    if (!elements.mapHotspots.length) {
      return null;
    }

    let nearest = null;
    let smallestDistance = Number.POSITIVE_INFINITY;

    elements.mapHotspots.forEach((hotspot) => {
      const lat = Number(hotspot.dataset.lat || '0');
      const lon = Number(hotspot.dataset.lon || '0');
      const d = distanceKm(latitude, longitude, lat, lon);
      if (d < smallestDistance) {
        smallestDistance = d;
        nearest = hotspot;
      }
    });

    return nearest;
  };

  const scoreRoute = (route, originValue, destinationValue) => {
    const routeFrom = route.from.toLowerCase();
    const routeTo = route.to.toLowerCase();
    const originText = String(originValue || '').trim().toLowerCase();
    const destinationText = String(destinationValue || '').trim().toLowerCase();

    let score = 0;

    if (originText && routeFrom.includes(originText)) {
      score += 0;
    } else if (originText && routeTo.includes(originText)) {
      score += 1.5;
    } else if (originText) {
      score += 6;
    }

    if (destinationText && routeTo.includes(destinationText)) {
      score += 0;
    } else if (destinationText && routeFrom.includes(destinationText)) {
      score += 1.5;
    } else if (destinationText) {
      score += 6;
    }

    const originCoords = placeToCoordinates(originValue);
    const destinationCoords = placeToCoordinates(destinationValue);
    const routeFromCoords = placeToCoordinates(route.from);
    const routeToCoords = placeToCoordinates(route.to);

    if (originCoords && routeFromCoords) {
      score += distanceKm(originCoords.latitude, originCoords.longitude, routeFromCoords.latitude, routeFromCoords.longitude);
    }
    if (destinationCoords && routeToCoords) {
      score += distanceKm(destinationCoords.latitude, destinationCoords.longitude, routeToCoords.latitude, routeToCoords.longitude);
    }

    return score;
  };

  const startLiveLocation = () => {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported on this browser.');
      return;
    }

    if (state.locationWatchId !== null) {
      navigator.geolocation.clearWatch(state.locationWatchId);
      state.locationWatchId = null;
      if (elements.locateMe) {
        elements.locateMe.textContent = 'Start Live Location';
      }
      if (elements.userLocationChip) {
        elements.userLocationChip.textContent = 'Live Location: Off';
      }
      if (elements.userDot) {
        elements.userDot.hidden = true;
      }
      toast('Live location tracking has stopped.');
      return;
    }

    const onPosition = (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy || 0);

      updateUserDot(latitude, longitude);
      if (elements.userLocationChip) {
        elements.userLocationChip.textContent = `Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)} • ±${accuracy}m`;
      }

      const nearest = nearestHotspot(latitude, longitude);
      if (nearest && elements.origin && !elements.origin.value.trim()) {
        elements.origin.value = nearest.dataset.place || '';
      }

      filterRoutes();
      saveLastInputs();
      updateMapSelectionState();
    };

    const onError = () => {
      toast('Unable to access live location data.');
      if (elements.userLocationChip) {
        elements.userLocationChip.textContent = 'Location Permission Denied';
      }
    };

    state.locationWatchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 12000
    });

    if (elements.locateMe) {
      elements.locateMe.textContent = 'Stop Live Location';
    }
    if (elements.userLocationChip) {
      elements.userLocationChip.textContent = 'Locating...';
    }
    toast('Live location tracking has started.');
  };

  const toggleSpotlight = () => {
    state.spotlightEnabled = !state.spotlightEnabled;
    elements.mapStage?.classList.toggle('spotlight-on', state.spotlightEnabled);
    if (elements.spotlightToggle) {
      elements.spotlightToggle.textContent = state.spotlightEnabled ? 'Disable Spotlight' : 'Enable Spotlight';
    }
    toast(state.spotlightEnabled ? 'Spotlight enabled for easier pickup visibility.' : 'Spotlight disabled.');
  };

  const shareTripDetails = async () => {
    const route = getSelectedRoute();
    const routeText = route ? `${route.from} to ${route.to}` : 'your selected route';
    const etaText = route ? `${route.eta} minutes` : 'a few minutes';
    const message = `I am on Green Route: ${routeText}. ETA ${etaText}.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Green Route trip update',
          text: message,
          url: window.location.href
        });
        toast('Trip details shared.');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${message} ${window.location.href}`);
        toast('Trip details copied to clipboard.');
        return;
      }

      toast('Sharing not available on this device.');
    } catch {
      toast('Unable to share trip details right now.');
    }
  };

  const renderNoRouteDetails = () => {
    if (elements.selectedRouteName) {
      elements.selectedRouteName.textContent = 'No matching route';
    }
    if (elements.selectedFare) {
      elements.selectedFare.textContent = '—';
    }
    if (elements.selectedEta) {
      elements.selectedEta.textContent = '—';
    }
    if (elements.vehicle) {
      elements.vehicle.textContent = 'Adjust your filters to find a suitable route.';
    }
    if (elements.mapRouteLabel) {
      elements.mapRouteLabel.textContent = 'No Route Selected';
    }
    if (elements.mapVehicleLabel) {
      elements.mapVehicleLabel.textContent = 'Awaiting a route match';
    }
    if (elements.selectedRouteNote) {
      elements.selectedRouteNote.textContent = 'No route matches your current origin and destination.';
    }
    if (elements.selectedSeatNote) {
      elements.selectedSeatNote.textContent = `${state.passengers} seat${state.passengers === 1 ? '' : 's'} requested`;
    }
    if (elements.routeProgress) {
      elements.routeProgress.style.width = '0%';
    }
    if (elements.timeline) {
      elements.timeline.innerHTML = '<div class="timeline-item"><strong>No Stops</strong><span>Try different search criteria</span></div>';
    }

    updateContextAlerts(null, null);

    setBookButtonState(null);
  };

  const setActiveChipFromOrigin = () => {
    const currentOrigin = (elements.origin?.value || '').trim().toLowerCase();
    document.querySelectorAll('.chip').forEach((chip) => {
      const isActive = (chip.textContent || '').trim().toLowerCase() === currentOrigin;
      chip.classList.toggle('active', isActive);
    });
  };

  const renderTimeline = (route) => {
    if (!elements.timeline) {
      return;
    }

    elements.timeline.replaceChildren();

    route.timeline.forEach(([stop, status]) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = `<strong>${stop}</strong><span>${status}</span>`;
      elements.timeline.appendChild(item);
    });
  };

  const updateRouteDetails = (route) => {
    if (!route) {
      renderNoRouteDetails();
      return;
    }

    if (elements.selectedRouteName) {
      elements.selectedRouteName.textContent = `${route.from} → ${route.to}`;
    }
    if (elements.selectedFare) {
      elements.selectedFare.textContent = `GHS ${route.fare.toFixed(2)}`;
    }
    if (elements.selectedEta) {
      elements.selectedEta.textContent = `${route.eta} min`;
    }
    if (elements.vehicle) {
      elements.vehicle.textContent = route.vehicle;
    }
    if (elements.mapRouteLabel) {
      elements.mapRouteLabel.textContent = `${route.from} → ${route.to}`;
    }
    if (elements.mapVehicleLabel) {
      elements.mapVehicleLabel.textContent = route.vehicle;
    }
    if (elements.selectedRouteNote) {
      elements.selectedRouteNote.textContent = `${route.note} · ${route.seats} seats remaining`;
    }
    if (elements.selectedSeatNote) {
      elements.selectedSeatNote.textContent = `${state.passengers} seat${state.passengers === 1 ? '' : 's'} requested`;
    }
    if (elements.routeProgress) {
      elements.routeProgress.style.width = `${route.progress}%`;
    }

    renderTimeline(route);
    updateContextAlerts(route, readActiveTrip());
    setBookButtonState(route);
  };

  const renderRoutes = () => {
    if (!elements.routeList) {
      return;
    }

    elements.routeList.replaceChildren();

    if (!state.filteredRoutes.length) {
      elements.routeList.innerHTML = `
        <article class="route-card route-empty surface">
          <h3>No Routes Found</h3>
          <p>Try a different origin or destination, or reset your filters.</p>
          <button class="ghost" type="button" id="empty-reset-routes">Reset Filters</button>
        </article>
      `;

      const emptyResetButton = document.getElementById('empty-reset-routes');
      emptyResetButton?.addEventListener('click', () => {
        elements.resetSearch?.click();
      });

      if (elements.resultsCount) {
        elements.resultsCount.textContent = '0';
      }

      renderStats();
      renderNoRouteDetails();
      return;
    }

    state.filteredRoutes.forEach((route, index) => {
      const card = document.createElement('article');
      card.className = `route-card surface${route.id === state.selectedRouteId ? ' selected' : ''}`;
      card.style.setProperty('--route-delay', `${index * 60}ms`);
      card.innerHTML = `
        <div class="route-top">
          <div class="route-title">
            <div class="tiny">${route.status.toUpperCase()} • ETA ${route.eta} MIN</div>
            <h3>${route.from} → ${route.to}</h3>
          </div>
          <div class="status ${route.status === 'On-Route' ? 'confirmed' : route.status === 'Confirmed' ? 'confirmed' : 'pending'}">${route.status}</div>
        </div>
        <div class="meta-row">
          <div class="tiny">${route.vehicle}</div>
          <div class="tiny">${route.note}</div>
        </div>
        <div class="route-track"><span style="width:${route.progress}%"></span></div>
        <div class="route-meta">
          <span>${route.eta} min</span>
          <strong>GHS ${route.fare.toFixed(2)}</strong>
        </div>
        <button class="route-cta" type="button">Select Route</button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        state.selectedRouteId = route.id;
        if (elements.origin) {
          elements.origin.value = route.from;
        }
        if (elements.destination) {
          elements.destination.value = route.to;
        }
        setActiveChipFromOrigin();
        updateMapSelectionState();
        saveLastInputs();
        renderRoutes();
        updateRouteDetails(route);
        toast(`Route selected: ${route.from} → ${route.to}.`);
      });

      if (!reducedMotionQuery.matches) {
        card.style.animationDelay = `${index * 40}ms`;
      }

      elements.routeList.appendChild(card);
    });

    if (elements.resultsCount) {
      elements.resultsCount.textContent = `${state.filteredRoutes.length}`;
    }

    renderStats();
    updateRouteDetails(getSelectedRoute());
  };

  const filterRoutes = () => {
    const originValue = (elements.origin?.value || '').trim().toLowerCase();
    const destinationValue = (elements.destination?.value || '').trim().toLowerCase();

    const strictMatches = routes.filter((route) => {
      const matchesOrigin = !originValue || route.from.toLowerCase().includes(originValue);
      const matchesDestination = !destinationValue || route.to.toLowerCase().includes(destinationValue);
      return matchesOrigin && matchesDestination;
    });

    if (strictMatches.length) {
      state.filteredRoutes = strictMatches;
      state.fallbackNoticeShown = false;
    } else {
      state.filteredRoutes = routes
        .slice()
        .sort(
          (a, b) =>
            scoreRoute(a, elements.origin?.value || '', elements.destination?.value || '') -
            scoreRoute(b, elements.origin?.value || '', elements.destination?.value || '')
        )
        .slice(0, 3);

      if ((originValue || destinationValue) && !state.fallbackNoticeShown) {
        toast('No exact route was found. Showing the closest available options.');
        state.fallbackNoticeShown = true;
      }
    }

    state.selectedRouteId = state.filteredRoutes[0]?.id || routes[0].id;
    updateMapSelectionState();
    renderRoutes();
  };

  const updatePassengerCount = (nextCount) => {
    state.passengers = Math.max(1, Math.min(nextCount, 8));
    if (elements.passengerCount) {
      elements.passengerCount.textContent = String(state.passengers);
    }

    const selectedRoute = getSelectedRoute();
    if (elements.selectedSeatNote) {
      elements.selectedSeatNote.textContent = `${state.passengers} seat${state.passengers === 1 ? '' : 's'} requested`;
    }

    if (selectedRoute && elements.bookRoute) {
      setBookButtonState(selectedRoute);
    }
  };

  const handleBooking = () => {
    const selectedRoute = getSelectedRoute();
    if (!selectedRoute) {
      toast('Please select a route first.');
      return;
    }

    if (state.passengers > selectedRoute.seats) {
      toast(`Only ${selectedRoute.seats} seats remaining.`);
      return;
    }

    selectedRoute.seats -= state.passengers;
    rememberRecentPlace(selectedRoute.to);
    saveLastInputs();
    toast(`Reservation confirmed for ${selectedRoute.from} → ${selectedRoute.to}.`);
    renderRoutes();
    updatePassengerCount(state.passengers);
  };

  const initDashboard = () => {
    if (!elements.routeList) {
      return;
    }

    elements.plus?.addEventListener('click', () => updatePassengerCount(state.passengers + 1));
    elements.minus?.addEventListener('click', () => updatePassengerCount(state.passengers - 1));
    elements.searchRoutes?.addEventListener('click', filterRoutes);
    elements.locateMe?.addEventListener('click', startLiveLocation);
    elements.mapModeOrigin?.addEventListener('click', () => setMapSelectionMode('origin'));
    elements.mapModeDestination?.addEventListener('click', () => setMapSelectionMode('destination'));

    elements.mapHotspots.forEach((hotspot) => {
      hotspot.addEventListener('click', () => {
        const place = hotspot.dataset.place || '';
        if (!place) {
          return;
        }

        if (state.mapSelectionMode === 'origin' && elements.origin) {
          elements.origin.value = place;
          setActiveChipFromOrigin();
          toast(`Origin set to ${place}.`);
          setMapSelectionMode('destination');
        } else if (elements.destination) {
          elements.destination.value = place;
          rememberRecentPlace(place);
          toast(`Destination set to ${place}.`);
        }

        filterRoutes();
        saveLastInputs();
        updateMapSelectionState();
      });
    });
    elements.resetSearch?.addEventListener('click', () => {
      if (elements.origin) {
        elements.origin.value = 'East Legon';
      }
      if (elements.destination) {
        elements.destination.value = 'Circle';
      }
      state.filteredRoutes = routes.slice();
      state.selectedRouteId = routes[0].id;
      setActiveChipFromOrigin();
      setActiveChoice('greenx');
      renderRoutes();
      saveLastInputs();
      updateMapSelectionState();
      toast('Route filters have been reset.');
    });

    [elements.origin, elements.destination].forEach((input) => {
      input?.addEventListener('input', () => {
        filterRoutes();
        setActiveChipFromOrigin();
        saveLastInputs();
        updateMapSelectionState();
      });
      input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          filterRoutes();
          saveLastInputs();
          updateMapSelectionState();
          toast('Routes updated successfully.');
        }
      });
    });

    document.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach((item) => item.classList.remove('active'));
        chip.classList.add('active');
        if (elements.origin) {
          elements.origin.value = chip.textContent || '';
        }
        filterRoutes();
        saveLastInputs();
        updateMapSelectionState();
      });
    });

    elements.bookRoute?.addEventListener('click', handleBooking);
    elements.bookRouteMobile?.addEventListener('click', handleBooking);

    elements.choiceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveChoice(button.dataset.choice || 'greenx');
        const passengers = Number(button.dataset.passengers || '1');
        updatePassengerCount(passengers);
        filterRoutes();
        toast(`${button.textContent} option selected.`);
      });
    });

    elements.recentPlaceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (!elements.destination) {
          return;
        }
        elements.destination.value = button.dataset.recentPlace || button.textContent || '';
        saveLastInputs();
        filterRoutes();
        updateMapSelectionState();
        toast(`Destination set to ${elements.destination.value}.`);
      });
    });

    elements.spotlightToggle?.addEventListener('click', toggleSpotlight);
    elements.shareTrip?.addEventListener('click', shareTripDetails);
    elements.shareTripMobile?.addEventListener('click', shareTripDetails);

    if (elements.tripDate && !elements.tripDate.value) {
      elements.tripDate.value = new Date().toISOString().split('T')[0];
    }

    initializeRememberedInputs();
    setActiveChipFromOrigin();
    setActiveChoice('greenx');
    updateMapSelectionState();

    updatePassengerCount(1);
    renderRoutes();
    syncPassengerLiveTrip();
  };

  const initAuthForms = () => {
    if (!elements.authForms.length) {
      return;
    }

    elements.passwordToggles.forEach((toggleButton) => {
      toggleButton.addEventListener('click', () => {
        const field = toggleButton.closest('.password-field')?.querySelector('input');
        if (!field) {
          return;
        }

        const isPassword = field.type === 'password';
        field.type = isPassword ? 'text' : 'password';
        toggleButton.textContent = isPassword ? 'Hide' : 'Show';
      });
    });

    elements.authForms.forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const values = Object.fromEntries(formData.entries());
        const note = form.querySelector('[data-form-note]');

        const requiredFields = Array.from(form.querySelectorAll('[required]'));
        const missingField = requiredFields.find((field) => {
          if (field.type === 'checkbox') {
            return !field.checked;
          }

          return !String(field.value || '').trim();
        });

        if (missingField) {
          note.textContent = 'Complete all required fields before continuing.';
          missingField.focus();
          toast('Please complete all required fields.');
          return;
        }

        if (form.dataset.authForm === 'signup' && values.password !== values.confirmPassword) {
          note.textContent = 'Passwords do not match.';
          toast('Passwords must match.');
          return;
        }

        const authRole = form.dataset.authForm === 'driver-signin' ? 'driver' : 'passenger';
        localStorage.setItem(roleStorageKey, authRole);

        note.textContent = form.dataset.authForm.includes('signin') ? 'Signing you in...' : 'Creating your account...';
        toast(authRole === 'driver' ? 'Driver access granted.' : 'Sign-in successful. Welcome back.');

        window.setTimeout(() => {
          window.location.href = authRole === 'driver' ? './driver.html' : './code.html';
        }, 700);
      });
    });
  };

  const initDriverDashboard = () => {
    if (!elements.driverRequestList) {
      return;
    }

    const currentRole = localStorage.getItem(roleStorageKey);
    if (currentRole && currentRole !== 'driver') {
      toast('Passenger account detected. Sign in with a driver account to manage this dashboard.');
    }

    const driverState = {
      online: true,
      autoAccept: false,
      trips: 12,
      earnings: 186,
      activeRides: 1,
      queue: [
        { id: 'rq1', rider: 'Ama', from: 'East Legon', to: 'Circle', distance: 0.8, fare: 6.4, eta: 3 },
        { id: 'rq2', rider: 'Kojo', from: 'Madina', to: 'Accra Central', distance: 1.6, fare: 8.2, eta: 6 },
        { id: 'rq3', rider: 'Efua', from: 'Adenta', to: 'Tema Station', distance: 2.2, fare: 9.9, eta: 8 }
      ]
    };

    const formatMoney = (value) => `GHS ${value.toFixed(2)}`;

    const syncDriverStats = () => {
      if (elements.todayTrips) {
        elements.todayTrips.textContent = String(driverState.trips);
      }
      if (elements.todayEarnings) {
        elements.todayEarnings.textContent = formatMoney(driverState.earnings);
      }
      if (elements.activeRideCount) {
        elements.activeRideCount.textContent = String(driverState.activeRides);
      }
      if (elements.queueSize) {
        const pending = driverState.queue.length;
        elements.queueSize.textContent = `${pending} pending`;
      }
      if (elements.nextStop) {
        const next = driverState.queue[0];
        elements.nextStop.textContent = next ? `${next.from} Pickup` : 'No Pending Pickups';
      }
      if (elements.driverMapLabel) {
        const next = driverState.queue[0];
        elements.driverMapLabel.textContent = next ? `Heat Zone: ${next.from} → ${next.to}` : 'Heat Zone: Queue Clear';
      }
      if (elements.driverMapNote) {
        elements.driverMapNote.textContent = driverState.online
          ? 'Live dispatch enabled for nearby riders'
          : 'Offline mode enabled. No dispatch actions sent';
      }
    };

    const setDriverOnlineState = (online) => {
      driverState.online = online;
      if (elements.driverStatusPill) {
        elements.driverStatusPill.textContent = online ? 'Online' : 'Offline';
        elements.driverStatusPill.classList.toggle('pending', !online);
        elements.driverStatusPill.classList.toggle('confirmed', online);
      }
      if (elements.shiftToggle) {
        elements.shiftToggle.textContent = online ? 'Go Offline' : 'Go Online';
      }
      toast(online ? 'Driver is online and receiving requests.' : 'Driver is offline. Dispatch is paused.');
      syncDriverStats();
    };

    const removeRequestById = (requestId) => {
      driverState.queue = driverState.queue.filter((request) => request.id !== requestId);
    };

    const renderRequestQueue = () => {
      elements.driverRequestList.replaceChildren();

      if (!driverState.queue.length) {
        const empty = document.createElement('article');
        empty.className = 'driver-request-empty';
        empty.innerHTML = '<strong>Queue Is Clear</strong><p>No pending rider requests at this time.</p>';
        elements.driverRequestList.appendChild(empty);
        syncDriverStats();
        return;
      }

      driverState.queue.forEach((request) => {
        const card = document.createElement('article');
        card.className = 'driver-request-card';
        card.innerHTML = `
          <div class="driver-request-head">
            <strong>${request.rider}</strong>
            <span class="mini-pill">${request.distance.toFixed(1)} km</span>
          </div>
          <p>${request.from} → ${request.to}</p>
          <div class="driver-request-meta">
            <span>ETA ${request.eta} min</span>
            <span>${formatMoney(request.fare)}</span>
          </div>
          <div class="driver-request-actions">
            <button class="cta" type="button" data-driver-accept="${request.id}">Accept</button>
            <button class="ghost" type="button" data-driver-decline="${request.id}">Decline</button>
          </div>
        `;

        card.querySelector('[data-driver-accept]')?.addEventListener('click', () => {
          if (!driverState.online) {
            toast('Please go online to accept requests.');
            return;
          }

          saveActiveTrip({
            id: request.id,
            rider: request.rider,
            from: request.from,
            to: request.to,
            fare: request.fare,
            eta: request.eta,
            vehicle: 'GR-214 · Toyota Hiace',
            driver: 'Justice Opoku',
            status: 'Driver accepted your trip.',
            progress: 22,
            seats: 1,
            updatedAt: new Date().toISOString()
          });

          driverState.activeRides += 1;
          driverState.trips += 1;
          driverState.earnings += request.fare;
          removeRequestById(request.id);
          toast(`Request accepted: ${request.rider} from ${request.from}.`);
          renderRequestQueue();
        });

        card.querySelector('[data-driver-decline]')?.addEventListener('click', () => {
          removeRequestById(request.id);
          toast(`Request declined: ${request.rider}.`);
          renderRequestQueue();
        });

        elements.driverRequestList.appendChild(card);
      });

      syncDriverStats();
    };

    elements.shiftToggle?.addEventListener('click', () => {
      setDriverOnlineState(!driverState.online);
    });

    elements.completeRide?.addEventListener('click', () => {
      if (driverState.activeRides === 0) {
        toast('No active ride to complete.');
        return;
      }
      driverState.activeRides -= 1;
      saveActiveTrip(null);
      toast('Active ride marked complete.');
      syncDriverStats();
    });

    elements.autoAccept?.addEventListener('change', () => {
      driverState.autoAccept = Boolean(elements.autoAccept?.checked);
      if (!driverState.autoAccept) {
        toast('Auto-accept has been disabled.');
        return;
      }

      const candidate = driverState.queue.find((request) => request.distance <= 1.8);
      if (!candidate) {
        toast('No nearby request is available for auto-accept.');
        return;
      }

      if (!driverState.online) {
        toast('Please go online before using auto-accept.');
        return;
      }

      driverState.activeRides += 1;
      driverState.trips += 1;
      driverState.earnings += candidate.fare;
      removeRequestById(candidate.id);
      toast(`Auto-accepted request: ${candidate.rider} (${candidate.distance.toFixed(1)} km away).`);
      renderRequestQueue();
    });

    setDriverOnlineState(true);
    renderRequestQueue();
  };

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem(themeStorageKey);
    setTheme(savedTheme === 'light' ? 'light' : 'dark');

    elements.themeToggles.forEach((button) => {
      button.addEventListener('click', () => {
        setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
      });
    });
  };

  const initializeMotionHooks = () => {
    requestAnimationFrame(() => {
      document.body.classList.add('is-ready');
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeMotionHooks();
    initDashboard();
    initAuthForms();
    initDriverDashboard();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === activeTripStorageKey) {
      syncPassengerLiveTrip();
    }
  });
})();
