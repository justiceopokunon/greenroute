(() => {
  'use strict';

  const themeStorageKey = 'urbanflow-theme';
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
    availableSeats: document.getElementById('available-seats'),
    selectedEta: document.getElementById('selected-eta'),
    selectedRouteName: document.getElementById('selected-route-name'),
    selectedFare: document.getElementById('selected-fare'),
    selectedRouteNote: document.getElementById('selected-route-note'),
    selectedSeatNote: document.getElementById('selected-seat-note'),
    mapRouteLabel: document.getElementById('map-route-label'),
    mapVehicleLabel: document.getElementById('map-vehicle-label'),
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
    authForms: Array.from(document.querySelectorAll('[data-auth-form]')),
    passwordToggles: Array.from(document.querySelectorAll('[data-password-toggle]')),
    formNotes: Array.from(document.querySelectorAll('[data-form-note]'))
  };

  const state = {
    selectedRouteId: routes[0].id,
    passengers: 1,
    filteredRoutes: routes.slice()
  };

  const setTheme = (theme) => {
    root.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
    elements.themeToggles.forEach((button) => {
      button.textContent = theme === 'dark' ? 'Dark theme' : 'Light theme';
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
    if (elements.availableSeats) {
      elements.availableSeats.textContent = String(seatCount);
    }
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
  };

  const renderRoutes = () => {
    if (!elements.routeList) {
      return;
    }

    elements.routeList.replaceChildren();

    state.filteredRoutes.forEach((route, index) => {
      const card = document.createElement('article');
      card.className = `route-card surface${route.id === state.selectedRouteId ? ' selected' : ''}`;
      card.style.setProperty('--route-delay', `${index * 60}ms`);
      card.innerHTML = `
        <div class="route-top">
          <div class="route-title">
            <div class="tiny">${route.status === 'On-Route' ? 'ON-ROUTE • 6 MINS AWAY' : route.status === 'Confirmed' ? 'CONFIRMED • 9 MINS AWAY' : 'DEPARTING • 12 MINS AWAY'}</div>
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
        <button class="route-cta" type="button">Select route</button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        state.selectedRouteId = route.id;
        renderRoutes();
        updateRouteDetails(route);
        toast(`Selected ${route.from} → ${route.to}`);
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

    state.filteredRoutes = routes.filter((route) => {
      const matchesOrigin = !originValue || route.from.toLowerCase().includes(originValue);
      const matchesDestination = !destinationValue || route.to.toLowerCase().includes(destinationValue);
      return matchesOrigin && matchesDestination;
    });

    state.selectedRouteId = state.filteredRoutes[0]?.id || routes[0].id;
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
      elements.bookRoute.textContent = state.passengers > selectedRoute.seats ? 'Not enough seats' : 'Reserve seat';
    }
  };

  const initDashboard = () => {
    if (!elements.routeList) {
      return;
    }

    elements.plus?.addEventListener('click', () => updatePassengerCount(state.passengers + 1));
    elements.minus?.addEventListener('click', () => updatePassengerCount(state.passengers - 1));
    elements.searchRoutes?.addEventListener('click', filterRoutes);
    elements.resetSearch?.addEventListener('click', () => {
      if (elements.origin) {
        elements.origin.value = 'East Legon';
      }
      if (elements.destination) {
        elements.destination.value = 'Circle';
      }
      state.filteredRoutes = routes.slice();
      state.selectedRouteId = routes[0].id;
      renderRoutes();
      toast('Route filters reset');
    });

    [elements.origin, elements.destination].forEach((input) => {
      input?.addEventListener('input', filterRoutes);
    });

    document.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (elements.origin) {
          elements.origin.value = chip.textContent || '';
        }
        filterRoutes();
      });
    });

    elements.bookRoute?.addEventListener('click', () => {
      const selectedRoute = getSelectedRoute();
      if (!selectedRoute) {
        return;
      }

      if (state.passengers > selectedRoute.seats) {
        toast(`Only ${selectedRoute.seats} seats remaining.`);
        return;
      }

      selectedRoute.seats -= state.passengers;
      toast(`Reservation created for ${selectedRoute.from} → ${selectedRoute.to}`);
      renderRoutes();
      updatePassengerCount(state.passengers);
    });

    updatePassengerCount(1);
    renderRoutes();
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
          toast('Please complete the required fields.');
          return;
        }

        if (form.dataset.authForm === 'signup' && values.password !== values.confirmPassword) {
          note.textContent = 'Passwords do not match.';
          toast('Passwords must match.');
          return;
        }

        note.textContent = form.dataset.authForm === 'signin' ? 'Signing you in...' : 'Creating your account...';
        toast(form.dataset.authForm === 'signin' ? 'Welcome back.' : 'Account created successfully.');

        window.setTimeout(() => {
          window.location.href = './code.html';
        }, 700);
      });
    });
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
  });
})();
