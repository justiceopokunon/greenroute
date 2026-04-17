(() => {
  'use strict';

  const themeStorageKey = 'greenroute-theme';
  const roleStorageKey = 'greenroute-user-role';
  const lastOriginStorageKey = 'greenroute-last-origin';
  const lastDestinationStorageKey = 'greenroute-last-destination';
  const lastRecentPlacesStorageKey = 'greenroute-recent-places';
  const activeTripStorageKey = 'greenroute-active-trip';
  const fleetStateStorageKey = 'greenroute-fleet-state';
  const trackedRouteStorageKey = 'greenroute-tracked-route-id';
  const dispatchQueueStorageKey = 'greenroute-dispatch-queue';
  const easyModeStorageKey = 'greenroute-easy-mode';
  const languageStorageKey = 'greenroute-language';
  const noStressStorageKey = 'greenroute-no-stress-mode';
  const followRouteStorageKey = 'greenroute-follow-route-mode';
  const root = document.documentElement;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const routes = [
    {
      id: 1,
      serviceType: 'trotro',
      from: 'Madina',
      to: 'Circle',
      fare: 2.5,
      eta: 6,
      seats: 2,
      capacity: 14,
      onboard: 12,
      vehicleLat: 5.616,
      vehicleLon: -0.196,
      vehicle: 'GR-214 · Toyota Hiace',
      driverName: 'Kwame Mensah',
      driverPhone: '+233201234567',
      plate: 'GR-214',
      driverPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&fit=crop',
      trustScore: 4.8,
      status: 'On-Route',
      note: '2 seats left',
      progress: 82,
      timeline: [['Madina', 'Departed'], ['37 Junction', 'In transit'], ['Airport', '2 mins'], ['Circle', 'ETA 6 mins']]
    },
    {
      id: 2,
      serviceType: 'trotro',
      from: 'Adenta',
      to: 'Accra Central',
      fare: 3.2,
      eta: 12,
      seats: 8,
      capacity: 18,
      onboard: 10,
      vehicleLat: 5.634,
      vehicleLon: -0.181,
      vehicle: 'GR-301 · Hyundai County',
      driverName: 'Yaw Boateng',
      driverPhone: '+233244567890',
      plate: 'GR-301',
      driverPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&q=80&fit=crop',
      trustScore: 4.6,
      status: 'Departing',
      note: 'Plenty space',
      progress: 44,
      timeline: [['Adenta', 'Boarding'], ['Madina', 'Upcoming'], ['Circle', 'Upcoming'], ['Accra Central', 'ETA 12 mins']]
    },
    {
      id: 3,
      serviceType: 'trotro',
      from: 'Kaneshie',
      to: 'Tema Station',
      fare: 3.8,
      eta: 9,
      seats: 4,
      capacity: 16,
      onboard: 12,
      vehicleLat: 5.584,
      vehicleLon: -0.214,
      vehicle: 'GR-119 · Ford Transit',
      driverName: 'Kojo Asare',
      driverPhone: '+233277654321',
      plate: 'GR-119',
      driverPhoto: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&q=80&fit=crop',
      trustScore: 4.7,
      status: 'Confirmed',
      note: 'Boarding soon',
      progress: 67,
      timeline: [['Kaneshie', 'Departed'], ['Odorkor', 'In transit'], ['Abossey Okai', 'In transit'], ['Tema Station', 'ETA 9 mins']]
    },
    {
      id: 101,
      serviceType: 'taxi',
      from: 'East Legon',
      to: 'Airport',
      fare: 24,
      eta: 5,
      seats: 4,
      capacity: 4,
      onboard: 1,
      vehicleLat: 5.628,
      vehicleLon: -0.166,
      vehicle: 'TX-501 · Toyota Corolla',
      driverName: 'Esi Arthur',
      driverPhone: '+233208889900',
      plate: 'TX-501',
      driverPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80&fit=crop',
      trustScore: 4.9,
      status: 'Available',
      note: 'Private ride',
      progress: 30,
      timeline: [['Driver nearby', 'En route to pickup'], ['Pickup', 'Pending'], ['Drop-off', 'Direct route']]
    },
    {
      id: 102,
      serviceType: 'taxi',
      from: 'Madina',
      to: 'Accra Central',
      fare: 27,
      eta: 7,
      seats: 4,
      capacity: 4,
      onboard: 1,
      vehicleLat: 5.664,
      vehicleLon: -0.176,
      vehicle: 'TX-213 · Kia Rio',
      driverName: 'Ama Ofori',
      driverPhone: '+233206667788',
      plate: 'TX-213',
      driverPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80&fit=crop',
      trustScore: 4.8,
      status: 'Available',
      note: 'Private ride',
      progress: 26,
      timeline: [['Driver nearby', 'En route to pickup'], ['Pickup', 'Pending'], ['Drop-off', 'Direct route']]
    },
    {
      id: 103,
      serviceType: 'taxi',
      from: 'Kaneshie',
      to: 'Circle',
      fare: 21,
      eta: 6,
      seats: 4,
      capacity: 4,
      onboard: 1,
      vehicleLat: 5.578,
      vehicleLon: -0.224,
      vehicle: 'TX-118 · Hyundai Elantra',
      driverName: 'Nana Adu',
      driverPhone: '+233209991122',
      plate: 'TX-118',
      driverPhoto: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=120&q=80&fit=crop',
      trustScore: 4.6,
      status: 'Available',
      note: 'Private ride',
      progress: 34,
      timeline: [['Driver nearby', 'En route to pickup'], ['Pickup', 'Pending'], ['Drop-off', 'Direct route']]
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
    mapDistanceLabel: document.getElementById('map-distance-label'),
    mapFrame: document.querySelector('.map-frame'),
    mapOverlay: document.querySelector('.map-overlay'),
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
    voiceDestination: document.getElementById('voice-destination'),
    languageToggle: document.getElementById('language-toggle'),
    easyModeToggle: document.getElementById('easy-mode-toggle'),
    noStressControls: document.querySelector('.no-stress-controls'),
    noStressToggle: document.getElementById('no-stress-toggle'),
    followRouteToggle: document.getElementById('follow-route-toggle'),
    panicButton: document.getElementById('panic-button'),
    callDriver: document.getElementById('call-driver'),
    quickRouteButtons: Array.from(document.querySelectorAll('[data-quick-route-to]')),
    scheduleStack: document.querySelector('.schedule-stack'),
    choiceGrid: document.querySelector('.choice-grid'),
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
    serviceModeButtons: Array.from(document.querySelectorAll('[data-service-mode]')),
    serviceModePill: document.getElementById('service-mode-pill'),
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
    driverMapOverlay: document.querySelector('.driver-map-overlay'),
    driverServiceModeButtons: Array.from(document.querySelectorAll('[data-driver-service-mode]')),
    driverServiceModePill: document.getElementById('driver-service-mode-pill'),
    driverFareInput: document.getElementById('driver-fare-input'),
    driverFareLabel: document.getElementById('driver-fare-label'),
    driverRouteSelect: document.getElementById('driver-route-select'),
    driverStartPoint: document.getElementById('driver-start-point'),
    driverTelemetryCard: document.getElementById('driver-telemetry-card'),
    trackingCount: document.getElementById('tracking-count'),
    boardingDemand: document.getElementById('boarding-demand'),
    driverAvailableSeats: document.getElementById('driver-available-seats'),
    onboardDisplay: document.getElementById('onboard-display'),
    onboardMinus: document.getElementById('onboard-minus'),
    onboardPlus: document.getElementById('onboard-plus'),
    onboardCountInput: document.getElementById('onboard-count-input'),
    syncOnboard: document.getElementById('sync-onboard'),
    liveTripTitle: document.getElementById('live-trip-title'),
    liveTripCopy: document.getElementById('live-trip-copy'),
    approachAlertTitle: document.getElementById('approach-alert-title'),
    approachAlertCopy: document.getElementById('approach-alert-copy'),
    vehicleAlertTitle: document.getElementById('vehicle-alert-title'),
    vehicleAlertCopy: document.getElementById('vehicle-alert-copy'),
    activityAlertTitle: document.getElementById('activity-alert-title'),
    activityAlertCopy: document.getElementById('activity-alert-copy'),
    trustScorePill: document.getElementById('trust-score-pill'),
    crowdMoodPill: document.getElementById('crowd-mood-pill'),
    driverTrustScore: document.getElementById('driver-trust-score'),
    driverDemandZone: document.getElementById('driver-demand-zone'),
    driverVoiceSummary: document.getElementById('driver-voice-summary')
  };

  const state = {
    selectedRouteId: routes[0].id,
    passengers: 1,
    filteredRoutes: routes.slice(),
    serviceMode: 'trotro',
    language: 'en',
    easyMode: true,
    noStressMode: localStorage.getItem(noStressStorageKey) === '1',
    followRouteMode: localStorage.getItem(followRouteStorageKey) !== '0',
    lastAnnouncementAt: 0,
    spotlightEnabled: false,
    mapSelectionMode: 'origin',
    locationWatchId: null,
    fallbackNoticeShown: false,
    userPosition: null
  };

  const mapBounds = {
    minLon: -0.244,
    maxLon: -0.124,
    minLat: 5.529,
    maxLat: 5.686
  };

  const stopCoordinates = {
    madina: { latitude: 5.678, longitude: -0.165 },
    circle: { latitude: 5.56, longitude: -0.205 },
    adenta: { latitude: 5.701, longitude: -0.166 },
    kaneshie: { latitude: 5.57, longitude: -0.234 },
    'tema station': { latitude: 5.614, longitude: -0.072 },
    'accra central': { latitude: 5.55, longitude: -0.206 },
    airport: { latitude: 5.605, longitude: -0.171 },
    'east legon': { latitude: 5.64, longitude: -0.148 },
    odorkor: { latitude: 5.592, longitude: -0.25 },
    kasoa: { latitude: 5.534, longitude: -0.416 }
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

    const fromKnownStops = stopCoordinates[normalizedPlace];
    if (fromKnownStops) {
      return fromKnownStops;
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

  const createInitialDispatchQueue = () => ([
    { id: 'rq1', serviceType: 'trotro', rider: 'Ama', from: 'Madina', to: 'Circle', distance: 0.8, eta: 3, lat: 5.678, lon: -0.165 },
    { id: 'rq2', serviceType: 'taxi', rider: 'Kojo', from: 'Adenta', to: 'Accra Central', distance: 1.3, eta: 5, lat: 5.701, lon: -0.166 },
    { id: 'rq3', serviceType: 'trotro', rider: 'Efua', from: 'Kaneshie', to: 'Tema Station', distance: 2.2, eta: 8, lat: 5.57, lon: -0.234 },
    { id: 'rq4', serviceType: 'taxi', rider: 'Yaw', from: 'Circle', to: 'Madina', distance: 1.1, eta: 4, lat: 5.56, lon: -0.205 }
  ]);

  const readDispatchQueue = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(dispatchQueueStorageKey) || 'null');
      if (!Array.isArray(parsed)) {
        const initial = createInitialDispatchQueue();
        localStorage.setItem(dispatchQueueStorageKey, JSON.stringify(initial));
        return initial;
      }
      return parsed;
    } catch {
      const initial = createInitialDispatchQueue();
      localStorage.setItem(dispatchQueueStorageKey, JSON.stringify(initial));
      return initial;
    }
  };

  const saveDispatchQueue = (queue) => {
    localStorage.setItem(dispatchQueueStorageKey, JSON.stringify(queue));
  };

  const buildRouteTelemetry = (route) => ({
    routeId: route.id,
    capacity: route.capacity || Math.max(route.seats || 0, 1),
    onboard: route.onboard || 0,
    availableSeats: route.seats,
    trackingCount: 0,
    boardingByStop: {},
    seatClaims: [],
    trustScore: route.trustScore || 4.5
  });

  const createInitialFleetState = () => ({
    routes: routes.reduce((acc, route) => {
      acc[route.id] = buildRouteTelemetry(route);
      return acc;
    }, {})
  });

  const readFleetState = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(fleetStateStorageKey) || 'null');
      if (!parsed || !parsed.routes) {
        const initial = createInitialFleetState();
        localStorage.setItem(fleetStateStorageKey, JSON.stringify(initial));
        return initial;
      }
      let hasUpdates = false;
      routes.forEach((route) => {
        if (!parsed.routes[route.id]) {
          parsed.routes[route.id] = buildRouteTelemetry(route);
          hasUpdates = true;
        }
      });
      if (hasUpdates) {
        localStorage.setItem(fleetStateStorageKey, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      const initial = createInitialFleetState();
      localStorage.setItem(fleetStateStorageKey, JSON.stringify(initial));
      return initial;
    }
  };

  const saveFleetState = (fleetState) => {
    localStorage.setItem(fleetStateStorageKey, JSON.stringify(fleetState));
  };

  const getRouteFleetState = (routeId) => {
    const fleetState = readFleetState();
    const entry = fleetState.routes?.[routeId];
    if (entry) {
      return entry;
    }
    const route = routes.find((item) => item.id === routeId);
    if (!route) {
      return null;
    }
    const nextEntry = buildRouteTelemetry(route);
    fleetState.routes[routeId] = nextEntry;
    saveFleetState(fleetState);
    return nextEntry;
  };

  const getActiveClaims = (telemetry, now = Date.now()) => {
    const claims = Array.isArray(telemetry?.seatClaims) ? telemetry.seatClaims : [];
    return claims.filter((claim) => Number(claim?.expiresAt || 0) > now);
  };

  const getDemandByStop = (mode = state.serviceMode) => {
    const fleetState = readFleetState();
    const demand = new Map();

    routes.filter((route) => (route.serviceType || 'trotro') === mode).forEach((route) => {
      const telemetry = fleetState.routes?.[route.id];
      const trackingCount = Number(telemetry?.trackingCount || 0);
      const claimedSeats = getActiveClaims(telemetry).reduce((sum, claim) => sum + Number(claim.amount || 0), 0);
      const stopWeight = 1 + trackingCount + (route.seats <= 2 ? 1 : 0) + Math.min(2, claimedSeats);

      if (route.from) {
        demand.set(route.from, (demand.get(route.from) || 0) + stopWeight);
      }

      Object.entries(telemetry?.boardingByStop || {}).forEach(([stop, count]) => {
        demand.set(stop, (demand.get(stop) || 0) + Number(count || 0));
      });
    });

    return Array.from(demand.entries())
      .map(([stop, count]) => ({ stop, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getBestStopPrediction = (route) => {
    const demand = getDemandByStop(route?.serviceType || state.serviceMode);
    if (!demand.length) {
      return route?.from || 'Nearby stop';
    }

    const preferred = demand.find((item) => String(item.stop || '').toLowerCase() === String(route?.from || '').toLowerCase());
    return preferred?.stop || demand[0].stop;
  };

  const getRouteTrustScore = (route, telemetry) => {
    const base = Number(route?.trustScore || telemetry?.trustScore || 4.5);
    const trackingBonus = Math.min(0.2, Number(telemetry?.trackingCount || 0) * 0.02);
    const claimPenalty = getActiveClaims(telemetry).reduce((sum, claim) => sum + Number(claim.amount || 0), 0) > 2 ? 0.1 : 0;
    return Math.max(3.9, Math.min(5, base + trackingBonus - claimPenalty));
  };

  const getCrowdMood = (route, telemetry) => {
    const claimed = getActiveClaims(telemetry).reduce((sum, claim) => sum + Number(claim.amount || 0), 0);
    const seatsLeft = Number(route?.seats || 0);
    const pressure = claimed + Math.max(0, 4 - seatsLeft);

    if (pressure >= 5) {
      return { label: 'Crowded', emoji: '😤', tone: 'crowded' };
    }
    if (pressure >= 2) {
      return { label: 'Okay', emoji: '🙂', tone: 'okay' };
    }
    return { label: 'Comfortable', emoji: '😎', tone: 'comfortable' };
  };

  const getRouteHeatLevel = (route, telemetry) => {
    const demand = Number(telemetry?.trackingCount || 0) + getActiveClaims(telemetry).length + Number(route?.seats <= 2 ? 2 : 0);
    if (demand >= 5) {
      return 'red';
    }
    if (demand >= 2) {
      return 'yellow';
    }
    return 'green';
  };

  const syncRoutesFromFleetState = () => {
    const fleetState = readFleetState();
    const now = Date.now();
    routes.forEach((route) => {
      const telemetry = fleetState.routes?.[route.id];
      if (!telemetry) {
        return;
      }
      const capacity = Number(telemetry.capacity || route.capacity || 0);
      const onboard = Number(telemetry.onboard || 0);
      const activeClaims = getActiveClaims(telemetry, now);
      const claimCount = activeClaims.reduce((sum, claim) => sum + Number(claim.amount || 0), 0);
      const availableSeats = Number.isFinite(telemetry.availableSeats)
        ? Number(telemetry.availableSeats)
        : Math.max(0, capacity - onboard - claimCount);

      route.capacity = capacity;
      route.onboard = clamp(onboard, 0, capacity || onboard);
      route.seats = clamp(Math.max(0, capacity - route.onboard - claimCount), 0, capacity || availableSeats);
      route.claimedSeats = claimCount;
      route.trustScore = getRouteTrustScore(route, telemetry);
      telemetry.seatClaims = activeClaims;
      telemetry.availableSeats = Math.max(0, capacity - route.onboard - claimCount);
      telemetry.trustScore = route.trustScore;
    });

    saveFleetState(fleetState);
  };

  const getRouteDistanceKm = (route) => {
    if (!route || !state.userPosition) {
      return null;
    }
    if (!Number.isFinite(route.vehicleLat) || !Number.isFinite(route.vehicleLon)) {
      return null;
    }
    return distanceKm(state.userPosition.latitude, state.userPosition.longitude, route.vehicleLat, route.vehicleLon);
  };

  const estimateEtaFromDistance = (distance) => {
    if (!Number.isFinite(distance)) {
      return null;
    }
    const avgSpeedKmPerHour = 24;
    const minutes = (distance / avgSpeedKmPerHour) * 60;
    return Math.max(2, Math.round(minutes));
  };

  const formatDistance = (distance) => {
    if (!Number.isFinite(distance)) {
      return '—';
    }
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
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

  const renderHeatZones = (overlayElement, mode) => {
    if (!overlayElement) {
      return;
    }

    const layer = overlayElement.querySelector('.entity-layer');
    if (!layer) {
      return;
    }

    layer.querySelectorAll('.map-heat').forEach((node) => node.remove());

    getDemandByStop(mode).slice(0, 5).forEach((item) => {
      const hotspot = elements.mapHotspots.find((node) => (node.dataset.place || '').trim().toLowerCase() === String(item.stop || '').trim().toLowerCase());
      if (!hotspot) {
        return;
      }

      const latitude = Number(hotspot.dataset.lat || '0');
      const longitude = Number(hotspot.dataset.lon || '0');
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const point = coordinatesFromLatLon(latitude, longitude);
      const heat = document.createElement('div');
      const level = item.count >= 5 ? 'red' : item.count >= 2 ? 'yellow' : 'green';
      heat.className = `map-heat zone-${level}`;
      heat.style.left = `${point.x}%`;
      heat.style.top = `${point.y}%`;
      heat.style.setProperty('--heat-scale', String(Math.min(1.8, 0.9 + item.count * 0.16)));
      heat.title = `${item.stop}: ${item.count} waiting`;
      heat.innerHTML = `<span>${item.count}</span>`;
      layer.appendChild(heat);
    });
  };

  const updateContextAlerts = (route, trip) => {
    if (!elements.approachAlertTitle || !elements.approachAlertCopy || !elements.vehicleAlertTitle || !elements.vehicleAlertCopy || !elements.activityAlertTitle || !elements.activityAlertCopy) {
      return;
    }

    const current = trip || route;
    if (!current) {
      elements.approachAlertTitle.textContent = 'Car is near';
      elements.approachAlertCopy.textContent = 'Your car is getting close to your stop.';
      elements.vehicleAlertTitle.textContent = 'Seat update';
      elements.vehicleAlertCopy.textContent = 'Seats can fill quickly, so check before boarding.';
      elements.activityAlertTitle.textContent = 'Trip update';
      elements.activityAlertCopy.textContent = 'New changes will show up here automatically.';
      return;
    }

    const eta = Number(current.eta);
    const seats = Number(current.seats);
    const destination = current.to || 'destination';
    const origin = current.from || 'pickup point';
    const vehicle = current.vehicle || 'Vehicle assigned';
    const telemetry = route ? getRouteFleetState(route.id) : null;
    const trustScore = getRouteTrustScore(route || current, telemetry);
    const crowdMood = getCrowdMood(route || current, telemetry);

    const approachDistanceMeters = Number.isFinite(eta) ? Math.max(200, Math.round(eta * 85)) : null;
    const approachText = approachDistanceMeters
      ? `${vehicle} is about ${approachDistanceMeters}m away from ${origin}.`
      : `${vehicle} is moving toward your pickup point at ${origin}.`;

    elements.approachAlertTitle.textContent = `${origin} Pickup`;
    elements.approachAlertCopy.textContent = `${approachText} ${Number.isFinite(eta) ? `ETA ${eta} min.` : 'Live tracking is active.'}`;

    if (Number.isFinite(seats)) {
      if (seats <= 2) {
        elements.vehicleAlertTitle.textContent = 'Seat alert';
        elements.vehicleAlertCopy.textContent = `Vehicle almost full. Only ${seats} seat${seats === 1 ? '' : 's'} remaining.`;
      } else if (seats <= 5) {
        elements.vehicleAlertTitle.textContent = 'Seat update';
        elements.vehicleAlertCopy.textContent = `${seats} seats are available on ${vehicle}.`;
      } else {
        elements.vehicleAlertTitle.textContent = 'Seats available';
        elements.vehicleAlertCopy.textContent = `${seats} seats open from ${origin} to ${destination}.`;
      }
    } else {
      elements.vehicleAlertTitle.textContent = 'Vehicle Assignment';
      elements.vehicleAlertCopy.textContent = `${vehicle} is assigned for ${origin} to ${destination}.`;
    }

    elements.activityAlertTitle.textContent = trip ? 'Trip update' : 'Route update';
    elements.activityAlertCopy.textContent = trip
      ? `${trip.status || 'The driver accepted your trip'}. ${origin} to ${destination} is now tracked in real time.`
      : `${origin} to ${destination} updates are reflected on the map and tracker.`;

    if (elements.trustScorePill) {
      const activeServiceType = (route?.serviceType || trip?.serviceType || state.serviceMode || 'trotro');
      const showRating = activeServiceType === 'taxi';
      elements.trustScorePill.hidden = !showRating;
      if (showRating) {
        elements.trustScorePill.textContent = `⭐ ${trustScore.toFixed(1)} Reliable driver`;
      }
    }
    if (elements.crowdMoodPill) {
      elements.crowdMoodPill.textContent = `${crowdMood.emoji} Crowd ${crowdMood.label}`;
      elements.crowdMoodPill.dataset.mood = crowdMood.tone;
    }
  };

  const updateMapDistanceSummary = (route) => {
    if (!elements.mapDistanceLabel) {
      return;
    }

    if (!route) {
      elements.mapDistanceLabel.textContent = 'Distance — · ETA — · Seats —';
      return;
    }

    const distance = getRouteDistanceKm(route);
    const eta = estimateEtaFromDistance(distance) || route.eta;
    const seatCount = Number.isFinite(route.seats) ? route.seats : '—';
    elements.mapDistanceLabel.textContent = `Distance ${formatDistance(distance)} · ETA ${eta ? `${eta} min` : '—'} · Seats ${seatCount}`;
  };

  const renderEntityMarkers = (overlayElement, mode) => {
    if (!overlayElement) {
      return;
    }

    let layer = overlayElement.querySelector('.entity-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'entity-layer';
      overlayElement.appendChild(layer);
    }

    layer.replaceChildren();

    const visibleVehicles = routes.filter((route) => (route.serviceType || 'trotro') === mode);
    visibleVehicles.forEach((route) => {
      if (!Number.isFinite(route.vehicleLat) || !Number.isFinite(route.vehicleLon)) {
        return;
      }

      const point = coordinatesFromLatLon(route.vehicleLat, route.vehicleLon);
      const marker = document.createElement('div');
      marker.className = 'map-entity map-entity-vehicle';
      marker.style.left = `${point.x}%`;
      marker.style.top = `${point.y}%`;
      marker.title = `${route.vehicle} (${route.from} to ${route.to})`;
      marker.innerHTML = '<span>C</span>';
      layer.appendChild(marker);
    });

    const visiblePassengers = readDispatchQueue().filter((request) => (request.serviceType || 'trotro') === mode);
    visiblePassengers.forEach((request) => {
      if (!Number.isFinite(request.lat) || !Number.isFinite(request.lon)) {
        return;
      }

      const point = coordinatesFromLatLon(request.lat, request.lon);
      const marker = document.createElement('div');
      marker.className = 'map-entity map-entity-passenger';
      marker.style.left = `${point.x}%`;
      marker.style.top = `${point.y}%`;
      marker.title = `${request.rider} waiting at ${request.from}`;
      marker.innerHTML = '<span>P</span>';
      layer.appendChild(marker);
    });

    const fleetState = readFleetState();
    const visibleBooked = routes.filter((route) => (route.serviceType || 'trotro') === mode);
    visibleBooked.forEach((route) => {
      const telemetry = fleetState.routes?.[route.id];
      const bookedSeats = getActiveClaims(telemetry).reduce((sum, claim) => sum + Number(claim.amount || 0), 0);
      if (bookedSeats <= 0) {
        return;
      }

      const stopPoint = placeToCoordinates(route.from);
      if (!stopPoint) {
        return;
      }

      const point = coordinatesFromLatLon(stopPoint.latitude, stopPoint.longitude);
      const marker = document.createElement('div');
      marker.className = 'map-entity map-entity-booked';
      marker.style.left = `${point.x}%`;
      marker.style.top = `${point.y}%`;
      marker.title = `${bookedSeats} booked seat${bookedSeats === 1 ? '' : 's'} at ${route.from}`;
      marker.innerHTML = `<span>${bookedSeats}</span>`;
      layer.appendChild(marker);
    });
  };

  const renderPassengerMapEntities = () => {
    renderEntityMarkers(elements.mapOverlay, state.serviceMode);
    renderHeatZones(elements.mapOverlay, state.serviceMode);
  };

  const renderDriverMapEntities = (mode) => {
    renderEntityMarkers(elements.driverMapOverlay, mode || 'trotro');
    renderHeatZones(elements.driverMapOverlay, mode || 'trotro');
  };

  const registerTrackingInterest = (route) => {
    if (!route || (route.serviceType || 'trotro') !== 'trotro') {
      return;
    }

    const previousTrackedRoute = Number(localStorage.getItem(trackedRouteStorageKey) || '0');
    if (previousTrackedRoute === route.id) {
      return;
    }

    const fleetState = readFleetState();
    if (previousTrackedRoute && fleetState.routes?.[previousTrackedRoute]) {
      const previousEntry = fleetState.routes[previousTrackedRoute];
      previousEntry.trackingCount = Math.max(0, (previousEntry.trackingCount || 0) - 1);
      const previousStop = (elements.origin?.value || '').trim();
      if (previousStop && previousEntry.boardingByStop?.[previousStop]) {
        previousEntry.boardingByStop[previousStop] = Math.max(0, previousEntry.boardingByStop[previousStop] - 1);
      }
    }

    const entry = fleetState.routes?.[route.id];
    if (entry) {
      entry.trackingCount = Number(entry.trackingCount || 0) + 1;
      const stop = (elements.origin?.value || route.from || '').trim();
      if (stop) {
        entry.boardingByStop = entry.boardingByStop || {};
        entry.boardingByStop[stop] = Number(entry.boardingByStop[stop] || 0) + 1;
      }
      saveFleetState(fleetState);
      localStorage.setItem(trackedRouteStorageKey, String(route.id));
      syncRoutesFromFleetState();
    }
  };

  const clearTrackingInterest = () => {
    if (isTaxiMode()) {
      localStorage.removeItem(trackedRouteStorageKey);
      return;
    }

    const trackedRouteId = Number(localStorage.getItem(trackedRouteStorageKey) || '0');
    if (!trackedRouteId) {
      return;
    }

    const fleetState = readFleetState();
    const entry = fleetState.routes?.[trackedRouteId];
    if (entry) {
      entry.trackingCount = Math.max(0, Number(entry.trackingCount || 0) - 1);
      const stop = (elements.origin?.value || '').trim();
      if (stop && entry.boardingByStop?.[stop]) {
        entry.boardingByStop[stop] = Math.max(0, Number(entry.boardingByStop[stop]) - 1);
      }
      saveFleetState(fleetState);
      syncRoutesFromFleetState();
    }

    localStorage.removeItem(trackedRouteStorageKey);
  };

  const syncPassengerLiveTrip = () => {
    const activeTrip = readActiveTrip();
    syncRoutesFromFleetState();

    updateLiveTripCard(activeTrip);
    updateContextAlerts(getSelectedRoute(), activeTrip);
    renderPassengerMapEntities();
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
    updateMapDistanceSummary(getSelectedRoute());
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
      button.textContent = theme === 'dark' ? 'Light Theme' : 'Dark Theme';
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

  const t = {
    en: {
      findCar: 'Find a car',
      destination: 'Where are you going?',
      origin: 'Your location',
      availableSeats: 'Seats left',
      carsNearYou: 'Cars near you',
      easyModeOn: 'Easy Mode: On',
      easyModeOff: 'Easy Mode: Off'
    },
    twi: {
      findCar: 'Hwe kaar',
      destination: 'Worek? ',
      origin: 'Wo beae',
      availableSeats: 'Akonwa a aka',
      carsNearYou: 'Kaar a ɛbɛn wo',
      easyModeOn: 'Easy Mode: On',
      easyModeOff: 'Easy Mode: Off'
    }
  };

  const announce = (message) => {
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }
    if ('speechSynthesis' in window && state.easyMode) {
      const utter = new SpeechSynthesisUtterance(message);
      utter.rate = 0.95;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    }
  };

  const applyEasyModeUI = () => {
    document.body.classList.toggle('easy-mode', state.easyMode);
    if (elements.easyModeToggle) {
      elements.easyModeToggle.textContent = state.easyMode
        ? t[state.language].easyModeOn
        : t[state.language].easyModeOff;
    }
    if (elements.noStressToggle) {
      elements.noStressToggle.textContent = state.noStressMode ? 'Avoid crowded cars: On' : 'Avoid crowded cars: Off';
    }
    if (elements.followRouteToggle) {
      elements.followRouteToggle.textContent = state.followRouteMode ? 'Auto alerts: On' : 'Auto alerts: Off';
    }
  };

  const applyLanguageUI = () => {
    const words = t[state.language] || t.en;
    const destinationLabel = document.getElementById('destination-label');
    const originLabel = document.getElementById('origin-label');
    const resultsTitle = document.getElementById('results-title');

    if (destinationLabel) {
      destinationLabel.textContent = words.destination;
    }
    if (originLabel) {
      originLabel.textContent = words.origin;
    }
    if (elements.searchRoutes) {
      elements.searchRoutes.textContent = words.findCar;
    }
    if (resultsTitle) {
      resultsTitle.textContent = words.carsNearYou;
    }
  };

  const isTaxiMode = () => state.serviceMode === 'taxi';

  const isRouteInActiveMode = (route) => (route.serviceType || 'trotro') === state.serviceMode;

  const getSeatRequestLabel = () =>
    isTaxiMode()
      ? `${state.passengers} passenger${state.passengers === 1 ? '' : 's'} for a private ride`
      : `${state.passengers} seat${state.passengers === 1 ? '' : 's'} requested`;

  const applyServiceModeUI = () => {
    elements.serviceModeButtons.forEach((button) => {
      const isActive = button.dataset.serviceMode === state.serviceMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (elements.serviceModePill) {
      elements.serviceModePill.textContent = isTaxiMode() ? 'Taxi mode' : 'Trotro mode';
    }

    if (elements.searchRoutes) {
      const words = t[state.language] || t.en;
      elements.searchRoutes.textContent = isTaxiMode() ? 'Find taxi' : words.findCar;
    }

    if (elements.scheduleStack) {
      const showSchedule = isTaxiMode();
      elements.scheduleStack.hidden = !showSchedule;
      elements.scheduleStack.setAttribute('aria-hidden', showSchedule ? 'false' : 'true');
      elements.scheduleStack.style.display = showSchedule ? 'grid' : 'none';
    }

    if (elements.choiceGrid) {
      const showChoiceGrid = isTaxiMode();
      elements.choiceGrid.hidden = !showChoiceGrid;
      elements.choiceGrid.setAttribute('aria-hidden', showChoiceGrid ? 'false' : 'true');
      elements.choiceGrid.style.display = showChoiceGrid ? 'grid' : 'none';
    }

    if (elements.noStressControls) {
      const showRouteAssistControls = isTaxiMode();
      elements.noStressControls.hidden = !showRouteAssistControls;
      elements.noStressControls.setAttribute('aria-hidden', showRouteAssistControls ? 'false' : 'true');
      elements.noStressControls.style.display = showRouteAssistControls ? 'flex' : 'none';
    }

    renderPassengerMapEntities();
    applyLanguageUI();

    setBookButtonState(getSelectedRoute());
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
        button.textContent = isTaxiMode() ? 'No taxi available' : 'No route available';
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
      button.textContent = state.passengers > route.seats
        ? (isTaxiMode() ? 'Taxi capacity exceeded' : 'Not enough seats')
        : (isTaxiMode() ? 'Book taxi' : "I'm boarding");
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
      state.userPosition = null;
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
      state.userPosition = { latitude, longitude };

      updateUserDot(latitude, longitude);
      if (elements.userLocationChip) {
        const nearestPlace = nearestHotspot(latitude, longitude)?.dataset.place || 'your area';
        elements.userLocationChip.textContent = `You are at ${nearestPlace}`;
      }

      const nearest = nearestHotspot(latitude, longitude);
      if (nearest && elements.origin && !elements.origin.value.trim()) {
        elements.origin.value = nearest.dataset.place || '';
      }

      filterRoutes();
      saveLastInputs();
      updateMapSelectionState();
      updateMapDistanceSummary(getSelectedRoute());
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

  const updateCallDriverAction = (route) => {
    if (!elements.callDriver) {
      return;
    }

    if (route?.serviceType === 'trotro') {
      elements.callDriver.textContent = 'No direct call for trotro';
      elements.callDriver.disabled = true;
      return;
    }

    if (!route?.driverPhone) {
      elements.callDriver.textContent = 'Driver unavailable';
      elements.callDriver.disabled = true;
      return;
    }

    elements.callDriver.disabled = false;
    elements.callDriver.textContent = `Call ${route.driverPhone}`;
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
      elements.selectedSeatNote.textContent = getSeatRequestLabel();
    }
    if (elements.routeProgress) {
      elements.routeProgress.style.width = '0%';
    }
    if (elements.timeline) {
      elements.timeline.innerHTML = '<div class="timeline-item"><strong>No Stops</strong><span>Try different search criteria</span></div>';
    }

    updateContextAlerts(null, null);
    updateMapDistanceSummary(null);
    updateCallDriverAction(null);

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

    syncRoutesFromFleetState();
    const distanceFromUser = getRouteDistanceKm(route);
    const computedEta = estimateEtaFromDistance(distanceFromUser) || route.eta;
    const fleetTelemetry = getRouteFleetState(route.id);
    const trackingCount = Number(fleetTelemetry?.trackingCount || 0);

    if (elements.selectedRouteName) {
      elements.selectedRouteName.textContent = `${route.from} → ${route.to}`;
    }
    if (elements.selectedFare) {
      elements.selectedFare.textContent = `GHS ${route.fare.toFixed(2)}`;
    }
    if (elements.selectedEta) {
      elements.selectedEta.textContent = `${computedEta} min`;
    }
    if (elements.vehicle) {
      elements.vehicle.textContent = route.vehicle;
    }

    const driverName = document.getElementById('driver-name');
    const driverPlate = document.getElementById('driver-plate');
    const driverPhoto = document.getElementById('driver-photo');
    if (driverName) {
      driverName.textContent = `Driver: ${route.driverName || 'Assigned driver'}`;
    }
    if (driverPlate) {
      driverPlate.textContent = `Plate: ${route.plate || route.vehicle.split('·')[0].trim()}`;
    }
    if (driverPhoto && route.driverPhoto) {
      driverPhoto.src = route.driverPhoto;
    }
    updateCallDriverAction(route);
    if (elements.mapRouteLabel) {
      elements.mapRouteLabel.textContent = `${route.from} → ${route.to}`;
    }
    if (elements.mapVehicleLabel) {
      elements.mapVehicleLabel.textContent = route.vehicle;
    }
    if (elements.selectedRouteNote) {
      elements.selectedRouteNote.textContent = isRouteInActiveMode(route) && route.serviceType === 'taxi'
        ? `Private taxi service · ${route.seats} seats max`
        : `${route.seats} seats available · ${trackingCount} tracking · ${route.claimedSeats || 0} claimed ahead`;
    }
    if (elements.selectedSeatNote) {
      elements.selectedSeatNote.textContent = getSeatRequestLabel();
    }
    if (elements.routeProgress) {
      elements.routeProgress.style.width = `${route.progress}%`;
    }

    if (elements.driverTrustScore) {
      const showDriverRating = (route.serviceType || 'trotro') === 'taxi';
      elements.driverTrustScore.hidden = !showDriverRating;
      if (showDriverRating) {
        elements.driverTrustScore.textContent = `⭐ ${getRouteTrustScore(route, fleetTelemetry).toFixed(1)} Reliable`;
      }
    }
    if (elements.driverDemandZone) {
      const heatLevel = getRouteHeatLevel(route, fleetTelemetry);
      elements.driverDemandZone.textContent = heatLevel === 'red'
        ? 'Demand: Red zone'
        : heatLevel === 'yellow'
          ? 'Demand: Busy zone'
          : 'Demand: Green zone';
    }

    renderTimeline(route);
    updateMapDistanceSummary(route);
    updateContextAlerts(route, readActiveTrip());
    setBookButtonState(route);

    const now = Date.now();
    if (now - state.lastAnnouncementAt > 20000) {
      if (computedEta <= 3) {
        toast('Get ready, your car is arriving.');
        announce('Your car is near. Get ready.');
        state.lastAnnouncementAt = now;
      } else if (computedEta <= 5) {
        announce(`${computedEta} minutes away.`);
        state.lastAnnouncementAt = now;
      } else if (route.seats <= 2) {
        announce('Seats almost full.');
        state.lastAnnouncementAt = now;
      }
    }
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
      const distanceKmFromUser = getRouteDistanceKm(route);
      const computedEta = estimateEtaFromDistance(distanceKmFromUser) || route.eta;
      const isTaxiRoute = route.serviceType === 'taxi';
      const telemetry = getRouteFleetState(route.id);
      const trackingCount = Number(telemetry?.trackingCount || 0);
      const seatSignal = route.seats <= 0 ? 'seat-full' : (route.seats <= 2 ? 'seat-low' : 'seat-open');
      const trustScore = getRouteTrustScore(route, telemetry);
      const crowdMood = getCrowdMood(route, telemetry);
      const heatLevel = getRouteHeatLevel(route, telemetry);
      const routeIntelRating = isTaxiRoute ? `<span>⭐ ${trustScore.toFixed(1)}</span>` : '';
      card.innerHTML = `
        <div class="route-top simple-route-top">
          <h3>${route.to}</h3>
          <div class="status ${seatSignal}">${route.seats <= 0 ? 'Full' : route.seats <= 2 ? 'Few seats' : 'Seats open'}</div>
        </div>
        <div class="route-meta">
          <span>${computedEta} mins away</span>
          <strong>${route.seats} seats</strong>
        </div>
        <div class="route-intel">
          ${routeIntelRating}
          <span>${crowdMood.emoji} ${crowdMood.label}</span>
          <span>${heatLevel === 'red' ? 'Red zone' : heatLevel === 'yellow' ? 'Busy zone' : 'Green zone'}</span>
        </div>
        <div class="tiny">${trackingCount} people tracking</div>
        <button class="route-cta" type="button">${isTaxiRoute ? 'Select Taxi' : 'Select Trotro'}</button>
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
        if (!isTaxiRoute) {
          registerTrackingInterest(route);
        }
        toast(`${isTaxiRoute ? 'Taxi' : 'Trotro'} selected: ${route.from} → ${route.to}.`);
        if (state.followRouteMode && computedEta <= 5) {
          announce(`A matching route is near ${route.to}.`);
        }
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
    renderPassengerMapEntities();
  };

  const filterRoutes = () => {
    syncRoutesFromFleetState();
    const destinationValue = (elements.destination?.value || '').trim().toLowerCase();
    const modeRoutes = routes.filter(isRouteInActiveMode).filter((route) => {
      if (!state.noStressMode) {
        return true;
      }
      return Number(route.seats || 0) >= Math.max(1, state.passengers);
    });

    const strictMatches = modeRoutes.filter((route) => {
      const matchesDestination = !destinationValue || route.to.toLowerCase().includes(destinationValue);
      return matchesDestination;
    });

    const ranked = (strictMatches.length ? strictMatches : modeRoutes)
      .slice()
      .sort((a, b) => {
        const distanceA = getRouteDistanceKm(a);
        const distanceB = getRouteDistanceKm(b);
        if (Number.isFinite(distanceA) && Number.isFinite(distanceB)) {
          return distanceA - distanceB;
        }
        if (Number.isFinite(distanceA)) {
          return -1;
        }
        if (Number.isFinite(distanceB)) {
          return 1;
        }
        return scoreRoute(a, elements.origin?.value || '', elements.destination?.value || '') -
          scoreRoute(b, elements.origin?.value || '', elements.destination?.value || '');
      });

    if (strictMatches.length) {
      state.filteredRoutes = ranked;
      state.fallbackNoticeShown = false;
    } else {
      state.filteredRoutes = ranked.slice(0, 3);

      if (destinationValue && !state.fallbackNoticeShown) {
        toast('No direct destination match was found. Showing the closest available vehicles nearby.');
        state.fallbackNoticeShown = true;
      }
    }

    state.selectedRouteId = state.filteredRoutes[0]?.id || modeRoutes[0]?.id || routes[0].id;
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
      elements.selectedSeatNote.textContent = getSeatRequestLabel();
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
      toast(isTaxiMode() ? `Only ${selectedRoute.seats} passengers can be accommodated in this taxi.` : `Only ${selectedRoute.seats} seats remaining.`);
      return;
    }

    const fleetState = readFleetState();
    const telemetry = fleetState.routes?.[selectedRoute.id];
    if (telemetry) {
      telemetry.seatClaims = Array.isArray(telemetry.seatClaims) ? telemetry.seatClaims : [];
      telemetry.seatClaims.push({ amount: state.passengers, expiresAt: Date.now() + (2 * 60 * 1000) });
      saveFleetState(fleetState);
      syncRoutesFromFleetState();
    }
    rememberRecentPlace(selectedRoute.to);
    saveLastInputs();
    toast(isTaxiMode()
      ? `Taxi reserved for ${selectedRoute.from} → ${selectedRoute.to}.`
      : `Seat held for 2 minutes on ${selectedRoute.from} → ${selectedRoute.to}.`);
    renderRoutes();
    updatePassengerCount(state.passengers);
  };

  const initDashboard = () => {
    if (!elements.routeList) {
      return;
    }

    syncRoutesFromFleetState();

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

    elements.noStressToggle?.addEventListener('click', () => {
      state.noStressMode = !state.noStressMode;
      localStorage.setItem(noStressStorageKey, state.noStressMode ? '1' : '0');
      if (elements.noStressToggle) {
        elements.noStressToggle.textContent = state.noStressMode ? 'Avoid crowded cars: On' : 'Avoid crowded cars: Off';
      }
      filterRoutes();
      toast(state.noStressMode ? 'Only vehicles with enough seats are shown.' : 'All vehicles are shown again.');
    });

    elements.followRouteToggle?.addEventListener('click', () => {
      state.followRouteMode = !state.followRouteMode;
      localStorage.setItem(followRouteStorageKey, state.followRouteMode ? '1' : '0');
      if (elements.followRouteToggle) {
        elements.followRouteToggle.textContent = state.followRouteMode ? 'Auto alerts: On' : 'Auto alerts: Off';
      }
      toast(state.followRouteMode ? 'Auto alerts are on.' : 'Auto alerts are off.');
    });

    elements.panicButton?.addEventListener('click', async () => {
      const route = getSelectedRoute();
      const message = route ? `Green Route safety check: ${route.from} to ${route.to}` : 'Green Route safety check';
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Green Route Safety', text: message });
          toast('Safety information shared.');
          return;
        } catch {
          // Fall through to the toast below.
        }
      }
      toast('Safety check ready to share with family.');
    });

    elements.callDriver?.addEventListener('click', async () => {
      const route = getSelectedRoute();
      if (route?.serviceType === 'trotro') {
        toast('Direct calling is disabled for trotro routes.');
        return;
      }

      if (!route?.driverPhone) {
        toast('Driver phone is unavailable right now.');
        return;
      }

      const phone = String(route.driverPhone).trim();
      const normalizedPhone = phone.replace(/\s+/g, '');

      try {
        window.location.href = `tel:${normalizedPhone}`;
        setTimeout(async () => {
          const isMobileDevice = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || '');
          if (isMobileDevice) {
            return;
          }

          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(phone);
              toast(`Dial ${phone}. Number copied to clipboard.`);
              return;
            } catch {
              // Fall back to plain toast below.
            }
          }

          toast(`Dial this driver: ${phone}`);
        }, 250);
      } catch {
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(phone);
            toast(`Unable to open dialer. Number copied: ${phone}`);
            return;
          } catch {
            // Fall through.
          }
        }
        toast(`Unable to open dialer. Driver number: ${phone}`);
      }
    });

    elements.quickRouteButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const from = button.dataset.quickRouteFrom || '';
        const to = button.dataset.quickRouteTo || '';
        if (elements.origin) {
          elements.origin.value = from;
        }
        if (elements.destination) {
          elements.destination.value = to;
        }
        filterRoutes();
        saveLastInputs();
      });
    });

    elements.voiceDestination?.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast('Voice input is not supported on this phone.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = state.language === 'twi' ? 'en-GH' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const spoken = String(event.results?.[0]?.[0]?.transcript || '').trim();
        if (spoken && elements.destination) {
          elements.destination.value = spoken;
          filterRoutes();
          saveLastInputs();
          toast(`Destination set to ${spoken}.`);
        }
      };
      recognition.onerror = () => toast('Could not hear destination. Please try again.');
      recognition.start();
    });

    elements.easyModeToggle?.addEventListener('click', () => {
      state.easyMode = !state.easyMode;
      localStorage.setItem(easyModeStorageKey, state.easyMode ? '1' : '0');
      applyEasyModeUI();
    });

    elements.languageToggle?.addEventListener('change', () => {
      const next = elements.languageToggle?.value === 'twi' ? 'twi' : 'en';
      state.language = next;
      localStorage.setItem(languageStorageKey, next);
      applyLanguageUI();
      applyEasyModeUI();
      filterRoutes();
    });

    elements.choiceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveChoice(button.dataset.choice || 'greenx');
        const passengers = Number(button.dataset.passengers || '1');
        updatePassengerCount(passengers);
        filterRoutes();
        toast(`${button.textContent} option selected.`);
      });
    });

    elements.serviceModeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = button.dataset.serviceMode;
        if (!nextMode || nextMode === state.serviceMode) {
          return;
        }

        clearTrackingInterest();
        state.serviceMode = nextMode;
        applyServiceModeUI();
        filterRoutes();
        if (!isTaxiMode()) {
          registerTrackingInterest(getSelectedRoute());
        }
        toast(`${isTaxiMode() ? 'Taxi booking mode' : 'Trotro seat mode'} enabled.`);
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

    elements.driverVoiceSummary?.addEventListener('click', () => {
      const route = getSelectedRoute();
      const telemetry = route ? getRouteFleetState(route.id) : null;
      const message = route
        ? `Route ${route.from} to ${route.to}. ${route.seats} seats left.`
        : 'No active driver route selected.';
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = state.language === 'twi' ? 'en-GH' : 'en-US';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
      if (telemetry) {
        toast('Route summary announced.');
      }
    });

    if (elements.tripDate && !elements.tripDate.value) {
      elements.tripDate.value = new Date().toISOString().split('T')[0];
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          state.userPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          if (elements.userLocationChip) {
            const near = nearestHotspot(position.coords.latitude, position.coords.longitude);
            const nearPlace = near?.dataset.place || 'your current area';
            elements.userLocationChip.textContent = `You are at ${nearPlace}`;
            if (elements.origin) {
              elements.origin.value = nearPlace;
            }
          }
          filterRoutes();
          updateMapDistanceSummary(getSelectedRoute());
        },
        () => {
          if (elements.userLocationChip) {
            elements.userLocationChip.textContent = 'Location unavailable; showing all routes';
          }
          renderRoutes();
        },
        { maximumAge: 15000, timeout: 5000 }
      );
    }

    window.addEventListener('offline', () => {
      toast('Offline mode: updates may be slower, but you can still use saved data.');
      if (elements.userLocationChip) {
        elements.userLocationChip.textContent = 'Offline mode active';
      }
    });

    window.addEventListener('online', () => {
      toast('Connection restored. Live updates resumed.');
      if (elements.userLocationChip) {
        elements.userLocationChip.textContent = 'Online and tracking';
      }
    });

    initializeRememberedInputs();
    state.easyMode = localStorage.getItem(easyModeStorageKey) !== '0';
    state.language = localStorage.getItem(languageStorageKey) === 'twi' ? 'twi' : 'en';
    if (elements.languageToggle) {
      elements.languageToggle.value = state.language;
    }
    applyEasyModeUI();
    applyLanguageUI();
    setActiveChipFromOrigin();
    setActiveChoice('greenx');
    applyServiceModeUI();
    updateMapSelectionState();

    updatePassengerCount(1);
    filterRoutes();
    if (!isTaxiMode()) {
      registerTrackingInterest(getSelectedRoute());
    }
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
    if (document.querySelector('.simple-driver-shell')) {
      syncRoutesFromFleetState();

      const simpleState = {
        online: true,
        serviceMode: 'trotro',
        managedRouteId: 1
      };

      const isSimpleTaxiMode = () => simpleState.serviceMode === 'taxi';

      const getSimpleModeRoutes = () => routes.filter((route) => (route.serviceType || 'trotro') === simpleState.serviceMode);

      const applySimpleDriverServiceModeUI = () => {
        elements.driverServiceModeButtons.forEach((button) => {
          const isActive = button.dataset.driverServiceMode === simpleState.serviceMode;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        if (elements.driverServiceModePill) {
          elements.driverServiceModePill.textContent = isSimpleTaxiMode() ? 'Taxi mode' : 'Trotro mode';
          elements.driverServiceModePill.hidden = false;
        }
        if (elements.driverTrustScore) {
          const activeRoute = routes.find((route) => route.id === simpleState.managedRouteId) || getSimpleModeRoutes()[0] || null;
          const fleetTelemetry = activeRoute ? getRouteFleetState(activeRoute.id) : null;
          const showRating = isSimpleTaxiMode() && Boolean(activeRoute);
          elements.driverTrustScore.hidden = !showRating;
          if (showRating && activeRoute) {
            elements.driverTrustScore.textContent = `⭐ ${getRouteTrustScore(activeRoute, fleetTelemetry).toFixed(1)} Reliable`;
          }
        }
      };

      const populateSimpleRoutes = () => {
        if (!elements.driverRouteSelect) {
          return;
        }
        const modeRoutes = getSimpleModeRoutes();
        elements.driverRouteSelect.replaceChildren();
        modeRoutes.forEach((route) => {
          const option = document.createElement('option');
          option.value = String(route.id);
          option.textContent = `${route.from} to ${route.to}`;
          elements.driverRouteSelect.appendChild(option);
        });
        if (modeRoutes.length) {
          if (!modeRoutes.some((route) => route.id === simpleState.managedRouteId)) {
            simpleState.managedRouteId = modeRoutes[0].id;
          }
          elements.driverRouteSelect.value = String(simpleState.managedRouteId);
        }
      };

      const refreshSimpleDriver = () => {
        const telemetry = getRouteFleetState(simpleState.managedRouteId);
        const activeRoute = routes.find((route) => route.id === simpleState.managedRouteId) || null;
        const onboard = Number(telemetry?.onboard || 0);
        const available = Number(telemetry?.availableSeats || 0);
        if (elements.onboardCountInput) {
          elements.onboardCountInput.value = String(onboard);
        }
        if (elements.onboardDisplay) {
          elements.onboardDisplay.textContent = String(onboard);
        }
        if (elements.driverAvailableSeats) {
          elements.driverAvailableSeats.textContent = `Available seats: ${available}`;
        }
        if (elements.shiftToggle) {
          elements.shiftToggle.textContent = simpleState.online ? 'STOP ROUTE' : 'START ROUTE';
        }
        if (elements.driverMapLabel && activeRoute) {
          elements.driverMapLabel.textContent = `${activeRoute.from} → ${activeRoute.to}`;
        }
        if (elements.driverMapNote) {
          const claimed = getActiveClaims(telemetry).reduce((sum, claim) => sum + Number(claim.amount || 0), 0);
          elements.driverMapNote.textContent = claimed > 0
            ? `${claimed} seat${claimed === 1 ? '' : 's'} booked ahead`
            : 'No seat bookings yet';
        }
        renderDriverMapEntities(simpleState.serviceMode);
      };

      const updateSimpleOnboard = (nextCount) => {
        const fleetState = readFleetState();
        let telemetry = fleetState.routes?.[simpleState.managedRouteId];
        if (!telemetry) {
          const activeRoute = routes.find((route) => route.id === simpleState.managedRouteId);
          if (!activeRoute) {
            return;
          }
          telemetry = buildRouteTelemetry(activeRoute);
          fleetState.routes[simpleState.managedRouteId] = telemetry;
        }
        if (!telemetry) {
          return;
        }
        const capacity = Number(telemetry.capacity || 0);
        telemetry.onboard = clamp(Number(nextCount || 0), 0, capacity || Number(nextCount || 0));
        telemetry.availableSeats = Math.max(0, capacity - telemetry.onboard);
        saveFleetState(fleetState);
        syncRoutesFromFleetState();
        refreshSimpleDriver();
      };

      elements.shiftToggle?.addEventListener('click', () => {
        simpleState.online = !simpleState.online;
        refreshSimpleDriver();
        toast(simpleState.online ? 'Route started.' : 'Route stopped.');
      });

      elements.driverRouteSelect?.addEventListener('change', () => {
        simpleState.managedRouteId = Number(elements.driverRouteSelect?.value || '1');
        refreshSimpleDriver();
      });

      elements.driverServiceModeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const nextMode = button.dataset.driverServiceMode;
          if (!nextMode || nextMode === simpleState.serviceMode) {
            return;
          }
          simpleState.serviceMode = nextMode;
          populateSimpleRoutes();
          applySimpleDriverServiceModeUI();
          refreshSimpleDriver();
          toast(`${isSimpleTaxiMode() ? 'Taxi' : 'Trotro'} mode selected.`);
        });
      });

      elements.onboardPlus?.addEventListener('click', () => {
        const current = Number(elements.onboardCountInput?.value || '0');
        updateSimpleOnboard(current + 1);
      });

      elements.onboardMinus?.addEventListener('click', () => {
        const current = Number(elements.onboardCountInput?.value || '0');
        updateSimpleOnboard(Math.max(0, current - 1));
      });

      elements.syncOnboard?.addEventListener('click', () => {
        updateSimpleOnboard(Number(elements.onboardCountInput?.value || '0'));
      });

      applySimpleDriverServiceModeUI();
      populateSimpleRoutes();
      refreshSimpleDriver();
      return;
    }

    if (!elements.driverRequestList) {
      return;
    }

    syncRoutesFromFleetState();

    const currentRole = localStorage.getItem(roleStorageKey);
    if (currentRole && currentRole !== 'driver') {
      toast('This looks like a passenger account. Sign in as a driver to continue.');
    }

    const driverState = {
      online: true,
      autoAccept: false,
      serviceMode: 'trotro',
      managedRouteId: 1,
      trips: 12,
      earnings: 186,
      activeRides: 1,
      queue: readDispatchQueue()
    };

    const isDriverTaxiMode = () => driverState.serviceMode === 'taxi';

    const getModeRoutes = () => routes.filter((route) => (route.serviceType || 'trotro') === driverState.serviceMode);

    const getRouteForDriverMode = () => {
      const modeRoutes = getModeRoutes();
      return modeRoutes.find((route) => route.id === driverState.managedRouteId) || modeRoutes[0] || null;
    };

    const updateDriverRouteOptions = () => {
      if (!elements.driverRouteSelect) {
        return;
      }

      const modeRoutes = getModeRoutes();
      elements.driverRouteSelect.replaceChildren();
      modeRoutes.forEach((route) => {
        const option = document.createElement('option');
        option.value = String(route.id);
        option.textContent = `${route.from} to ${route.to}`;
        elements.driverRouteSelect.appendChild(option);
      });

      if (!modeRoutes.length) {
        return;
      }

      if (!modeRoutes.some((route) => route.id === driverState.managedRouteId)) {
        driverState.managedRouteId = modeRoutes[0].id;
      }

      elements.driverRouteSelect.value = String(driverState.managedRouteId);
      const activeRoute = getRouteForDriverMode();
      if (activeRoute && elements.driverStartPoint && !elements.driverStartPoint.value.trim()) {
        elements.driverStartPoint.value = activeRoute.from;
      }
    };

    const getDriverFareValue = () => {
      const rawValue = Number(elements.driverFareInput?.value || '0');
      if (!Number.isFinite(rawValue) || rawValue <= 0) {
        return null;
      }
      return rawValue;
    };

    const getManagedFleetTelemetry = () => {
      const fleetState = readFleetState();
      const telemetry = fleetState.routes?.[driverState.managedRouteId];
      if (!telemetry) {
        return {
          capacity: 0,
          onboard: 0,
          availableSeats: 0,
          trackingCount: 0,
          boardingByStop: {}
        };
      }
      return telemetry;
    };

    const formatMoney = (value) => `GHS ${value.toFixed(2)}`;

    const applyDriverServiceModeUI = () => {
      elements.driverServiceModeButtons.forEach((button) => {
        const isActive = button.dataset.driverServiceMode === driverState.serviceMode;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      if (elements.driverServiceModePill) {
        elements.driverServiceModePill.textContent = isDriverTaxiMode() ? 'Taxi mode' : 'Trotro mode';
      }

      if (elements.driverFareLabel) {
        elements.driverFareLabel.textContent = isDriverTaxiMode() ? 'Taxi fare per trip (GHS)' : 'Fare per seat (GHS)';
      }

      if (elements.driverFareInput && !elements.driverFareInput.value) {
        elements.driverFareInput.value = isDriverTaxiMode() ? '24' : '3.5';
      }

      if (elements.driverTrustScore) {
        const activeRoute = getRouteForDriverMode();
        const fleetTelemetry = activeRoute ? getRouteFleetState(activeRoute.id) : null;
        const showDriverRating = isDriverTaxiMode() && Boolean(activeRoute);
        elements.driverTrustScore.hidden = !showDriverRating;
        if (showDriverRating && activeRoute) {
          elements.driverTrustScore.textContent = `⭐ ${getRouteTrustScore(activeRoute, fleetTelemetry).toFixed(1)} Reliable`;
        }
      }

      if (elements.driverTelemetryCard) {
        elements.driverTelemetryCard.style.display = isDriverTaxiMode() ? 'none' : '';
      }

      updateDriverRouteOptions();
      renderDriverMapEntities(driverState.serviceMode);
    };

    const syncDriverStats = () => {
      const telemetry = getManagedFleetTelemetry();
      const managedRoute = getRouteForDriverMode();
      const startPoint = String(elements.driverStartPoint?.value || managedRoute?.from || '').trim().toLowerCase();
      const modeQueue = driverState.queue.filter((request) => {
        if ((request.serviceType || 'trotro') !== driverState.serviceMode) {
          return false;
        }
        if (!managedRoute) {
          return true;
        }
        const requestTo = String(request.to || '').trim().toLowerCase();
        const requestFrom = String(request.from || '').trim().toLowerCase();
        const routeTo = String(managedRoute.to || '').trim().toLowerCase();
        const routeFrom = String(managedRoute.from || '').trim().toLowerCase();
        const matchesRoute = requestTo === routeTo || requestFrom === routeFrom;
        const matchesStart = !startPoint || requestFrom === startPoint;
        return matchesRoute && matchesStart;
      });
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
        const pending = modeQueue.length;
        elements.queueSize.textContent = `${pending} pending`;
      }
      if (elements.nextStop) {
        const next = modeQueue[0];
        elements.nextStop.textContent = next
          ? `${next.from} Pickup`
          : (elements.driverStartPoint?.value ? `${elements.driverStartPoint.value} checkpoint` : 'No Pending Pickups');
      }
      if (elements.driverMapLabel) {
        const next = modeQueue[0];
        elements.driverMapLabel.textContent = next ? `Heat Zone: ${next.from} → ${next.to}` : 'Heat Zone: Queue Clear';
      }
      if (elements.driverMapNote) {
        elements.driverMapNote.textContent = driverState.online
          ? 'Live dispatch enabled for nearby riders'
          : 'Offline mode enabled. No dispatch actions sent';
      }
      if (elements.trackingCount) {
        elements.trackingCount.textContent = `${telemetry.trackingCount || 0} tracking`;
      }
      if (elements.driverAvailableSeats) {
        elements.driverAvailableSeats.textContent = `Available seats: ${telemetry.availableSeats || 0}`;
      }
      if (elements.onboardCountInput && document.activeElement !== elements.onboardCountInput) {
        elements.onboardCountInput.value = String(telemetry.onboard || 0);
      }
      if (elements.onboardDisplay) {
        elements.onboardDisplay.textContent = String(telemetry.onboard || 0);
      }
      if (elements.boardingDemand) {
        const next = modeQueue[0];
        const stopName = next?.from || routes.find((route) => route.id === driverState.managedRouteId)?.from || '';
        const stopDemand = stopName ? Number(telemetry.boardingByStop?.[stopName] || 0) : 0;
        elements.boardingDemand.textContent = isDriverTaxiMode()
          ? 'Taxi mode does not use trotro boarding telemetry.'
          : stopName
          ? `${stopDemand} passenger${stopDemand === 1 ? '' : 's'} want to board at ${stopName}.`
          : 'No active boarding demand at your next stop.';
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
        elements.shiftToggle.textContent = online ? 'STOP ROUTE' : 'START ROUTE';
      }
      toast(online ? 'Driver is online and receiving requests.' : 'Driver is offline. Dispatch is paused.');
      syncDriverStats();
    };

    const removeRequestById = (requestId) => {
      driverState.queue = driverState.queue.filter((request) => request.id !== requestId);
      saveDispatchQueue(driverState.queue);
    };

    const syncOnboardFromDevice = (onboardCountInput) => {
      const fleetState = readFleetState();
      const telemetry = fleetState.routes?.[driverState.managedRouteId];
      if (!telemetry) {
        toast('Unable to sync onboard count at the moment.');
        return;
      }

      const capacity = Number(telemetry.capacity || 0);
      const nextOnboard = clamp(Number(onboardCountInput || 0), 0, capacity || Number(onboardCountInput || 0));
      telemetry.onboard = nextOnboard;
      telemetry.availableSeats = Math.max(0, capacity - nextOnboard);
      saveFleetState(fleetState);
      syncRoutesFromFleetState();
      syncDriverStats();
      toast(`Onboard count synced. Available seats updated to ${telemetry.availableSeats}.`);
    };

    const adjustOnboardCountBy = (delta) => {
      const currentValue = Number(elements.onboardCountInput?.value || '0');
      const nextValue = Math.max(0, currentValue + delta);
      if (elements.onboardCountInput) {
        elements.onboardCountInput.value = String(nextValue);
      }
      syncOnboardFromDevice(String(nextValue));
    };

    const renderRequestQueue = () => {
      elements.driverRequestList.replaceChildren();

      const managedRoute = getRouteForDriverMode();
      const startPoint = String(elements.driverStartPoint?.value || managedRoute?.from || '').trim().toLowerCase();
      const modeQueue = driverState.queue.filter((request) => {
        if ((request.serviceType || 'trotro') !== driverState.serviceMode) {
          return false;
        }
        if (!managedRoute) {
          return true;
        }
        const requestTo = String(request.to || '').trim().toLowerCase();
        const requestFrom = String(request.from || '').trim().toLowerCase();
        const routeTo = String(managedRoute.to || '').trim().toLowerCase();
        const routeFrom = String(managedRoute.from || '').trim().toLowerCase();
        const matchesRoute = requestTo === routeTo || requestFrom === routeFrom;
        const matchesStart = !startPoint || requestFrom === startPoint;
        return matchesRoute && matchesStart;
      });

      if (!modeQueue.length) {
        const empty = document.createElement('article');
        empty.className = 'driver-request-empty';
        empty.innerHTML = `<strong>Queue Is Clear</strong><p>No pending ${isDriverTaxiMode() ? 'taxi' : 'trotro'} requests at this time.</p>`;
        elements.driverRequestList.appendChild(empty);
        syncDriverStats();
        renderDriverMapEntities(driverState.serviceMode);
        return;
      }

      modeQueue.forEach((request) => {
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
            <span>${isDriverTaxiMode() ? 'Taxi request' : 'Trotro request'}</span>
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

          const enteredFare = getDriverFareValue();
          if (enteredFare === null) {
            toast(`Enter a valid ${isDriverTaxiMode() ? 'taxi trip fare' : 'trotro seat fare'} first.`);
            elements.driverFareInput?.focus();
            return;
          }

          const fleetState = readFleetState();
          const telemetry = fleetState.routes?.[driverState.managedRouteId];
          if (telemetry && !isDriverTaxiMode()) {
            telemetry.trackingCount = Math.max(0, Number(telemetry.trackingCount || 0) - 1);
            telemetry.boardingByStop = telemetry.boardingByStop || {};
            const stopDemand = Number(telemetry.boardingByStop[request.from] || 0);
            telemetry.boardingByStop[request.from] = Math.max(0, stopDemand - 1);
            const capacity = Number(telemetry.capacity || 0);
            telemetry.onboard = clamp(Number(telemetry.onboard || 0) + 1, 0, capacity || Number(telemetry.onboard || 0) + 1);
            telemetry.availableSeats = Math.max(0, capacity - telemetry.onboard);
            saveFleetState(fleetState);
            syncRoutesFromFleetState();
          }

          saveActiveTrip({
            id: request.id,
            rider: request.rider,
            from: request.from,
            to: request.to,
            fare: enteredFare,
            eta: request.eta,
            serviceType: driverState.serviceMode,
            vehicle: getRouteForDriverMode()?.vehicle || 'Driver Assigned',
            driver: 'Justice Opoku',
            status: 'Driver accepted your trip.',
            progress: 22,
            seats: getRouteForDriverMode()?.seats || 1,
            updatedAt: new Date().toISOString()
          });

          driverState.activeRides += 1;
          driverState.trips += 1;
          driverState.earnings += enteredFare;
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
      renderDriverMapEntities(driverState.serviceMode);
    };

    elements.shiftToggle?.addEventListener('click', () => {
      setDriverOnlineState(!driverState.online);
    });

    elements.syncOnboard?.addEventListener('click', () => {
      syncOnboardFromDevice(elements.onboardCountInput?.value || '0');
    });

    elements.onboardPlus?.addEventListener('click', () => {
      adjustOnboardCountBy(1);
    });

    elements.onboardMinus?.addEventListener('click', () => {
      adjustOnboardCountBy(-1);
    });

    elements.onboardCountInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        syncOnboardFromDevice(elements.onboardCountInput?.value || '0');
      }
    });

    elements.driverRouteSelect?.addEventListener('change', () => {
      driverState.managedRouteId = Number(elements.driverRouteSelect?.value || '0') || driverState.managedRouteId;
      const activeRoute = getRouteForDriverMode();
      if (activeRoute && elements.driverStartPoint && !elements.driverStartPoint.value.trim()) {
        elements.driverStartPoint.value = activeRoute.from;
      }
      renderRequestQueue();
      syncDriverStats();
      toast(`Route set to ${activeRoute ? `${activeRoute.from} to ${activeRoute.to}` : 'selected route'}.`);
    });

    elements.driverStartPoint?.addEventListener('input', () => {
      renderRequestQueue();
      syncDriverStats();
    });

    elements.completeRide?.addEventListener('click', () => {
      if (driverState.activeRides === 0) {
        toast('No active ride to complete.');
        return;
      }
      driverState.activeRides -= 1;
      const fleetState = readFleetState();
      const telemetry = fleetState.routes?.[driverState.managedRouteId];
      if (telemetry && !isDriverTaxiMode()) {
        const capacity = Number(telemetry.capacity || 0);
        telemetry.onboard = clamp(Number(telemetry.onboard || 0) - 1, 0, capacity);
        telemetry.availableSeats = Math.max(0, capacity - telemetry.onboard);
        saveFleetState(fleetState);
        syncRoutesFromFleetState();
      }
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

      const enteredFare = getDriverFareValue();
      if (enteredFare === null) {
        toast(`Enter a valid ${isDriverTaxiMode() ? 'taxi trip fare' : 'trotro seat fare'} before enabling auto-accept.`);
        elements.driverFareInput?.focus();
        elements.autoAccept.checked = false;
        driverState.autoAccept = false;
        return;
      }

      const managedRoute = getRouteForDriverMode();
      const startPoint = String(elements.driverStartPoint?.value || managedRoute?.from || '').trim().toLowerCase();
      const candidate = driverState.queue.find((request) => {
        if ((request.serviceType || 'trotro') !== driverState.serviceMode || request.distance > 1.8) {
          return false;
        }
        if (!managedRoute) {
          return true;
        }
        const requestTo = String(request.to || '').trim().toLowerCase();
        const requestFrom = String(request.from || '').trim().toLowerCase();
        const routeTo = String(managedRoute.to || '').trim().toLowerCase();
        const routeFrom = String(managedRoute.from || '').trim().toLowerCase();
        const matchesRoute = requestTo === routeTo || requestFrom === routeFrom;
        const matchesStart = !startPoint || requestFrom === startPoint;
        return matchesRoute && matchesStart;
      });
      if (!candidate) {
        toast('No nearby request is available for auto-accept.');
        elements.autoAccept.checked = false;
        driverState.autoAccept = false;
        return;
      }

      if (!driverState.online) {
        toast('Please go online before using auto-accept.');
        return;
      }

      driverState.activeRides += 1;
      driverState.trips += 1;
      driverState.earnings += enteredFare;
      const fleetState = readFleetState();
      const telemetry = fleetState.routes?.[driverState.managedRouteId];
      if (telemetry && !isDriverTaxiMode()) {
        telemetry.trackingCount = Math.max(0, Number(telemetry.trackingCount || 0) - 1);
        telemetry.boardingByStop = telemetry.boardingByStop || {};
        telemetry.boardingByStop[candidate.from] = Math.max(0, Number(telemetry.boardingByStop[candidate.from] || 0) - 1);
        const capacity = Number(telemetry.capacity || 0);
        telemetry.onboard = clamp(Number(telemetry.onboard || 0) + 1, 0, capacity || Number(telemetry.onboard || 0) + 1);
        telemetry.availableSeats = Math.max(0, capacity - telemetry.onboard);
        saveFleetState(fleetState);
        syncRoutesFromFleetState();
      }
      removeRequestById(candidate.id);
      toast(`Auto-accepted request: ${candidate.rider} (${candidate.distance.toFixed(1)} km away).`);
      renderRequestQueue();
    });

    elements.driverServiceModeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = button.dataset.driverServiceMode;
        if (!nextMode || nextMode === driverState.serviceMode) {
          return;
        }

        driverState.serviceMode = nextMode;
        const managedRoute = getRouteForDriverMode();
        if (managedRoute) {
          driverState.managedRouteId = managedRoute.id;
        }

        applyDriverServiceModeUI();
        renderRequestQueue();
        toast(`${isDriverTaxiMode() ? 'Taxi' : 'Trotro'} dispatch mode enabled.`);
      });
    });

    setDriverOnlineState(true);
    applyDriverServiceModeUI();
    renderRequestQueue();
    renderDriverMapEntities(driverState.serviceMode);
  };

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem(themeStorageKey);
    setTheme(savedTheme === 'dark' ? 'dark' : 'light');

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
    if (event.key === fleetStateStorageKey) {
      syncRoutesFromFleetState();
      if (elements.routeList) {
        filterRoutes();
        updateRouteDetails(getSelectedRoute());
      }
    }
    if (event.key === dispatchQueueStorageKey) {
      if (elements.routeList) {
        renderPassengerMapEntities();
      }
      if (elements.driverMapOverlay) {
        const activeDriverMode = elements.driverServiceModeButtons.find((button) => button.classList.contains('active'))?.dataset.driverServiceMode || 'trotro';
        renderDriverMapEntities(activeDriverMode);
      }
    }
  });

  window.addEventListener('beforeunload', () => {
    if (elements.routeList) {
      clearTrackingInterest();
    }
  });
})();
