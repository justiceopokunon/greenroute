
(() => {
  'use strict';

  const config = {
    apiBase: '/api',
    mapCenter: [5.6037, -0.1870],
    defaultZoom: 13,
    pollingInterval: 10000,
    gpsTimeout: 10000,
    maxRetries: 3
  };

  const storage = {
    theme: 'greenroute-theme',
    userRole: 'greenroute-user-role',
    passengerId: 'passengerId',
    driverId: 'driverId',
    lastOrigin: 'greenroute-last-origin',
    lastDestination: 'greenroute-last-destination'
  };

  const utils = {
    getStorage: (key, fallback = null) => {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },

    setStorage: (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },

    removeStorage: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },

    parseJson: (value, fallback) => {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    },

    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),

    calculateDistance: (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    },

    calculateETA: (distance, speed = 25) => {
      return Math.max(2, Math.ceil((distance / speed) * 60));
    },

    reverseGeocode: async (lat, lng) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data.display_name || 'Current location';
      } catch {
        return 'Current location';
      }
    }
  };

  // Theme management
  const theme = {
    init: () => {
      const savedTheme = utils.getStorage(storage.theme, 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    },

    toggle: () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      utils.setStorage(storage.theme, newTheme);
    }
  };

  // Navigation
  const navigation = {
    init: () => {
      // Mobile menu toggle
      const hamburgerBtn = document.getElementById('hamburger-btn');
      const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
      
      if (hamburgerBtn && mobileNavOverlay) {
        hamburgerBtn.addEventListener('click', () => {
          mobileNavOverlay.classList.toggle('active');
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
          if (!hamburgerBtn.contains(e.target) && !mobileNavOverlay.contains(e.target)) {
            mobileNavOverlay.classList.remove('active');
          }
        });
      }

      // Theme toggle
      const themeToggle = document.getElementById('theme-toggle');
      if (themeToggle) {
        themeToggle.addEventListener('click', theme.toggle);
      }
    }
  };

  // Initialize application
  const init = () => {
    // Initialize theme
    theme.init();
    
    // Initialize navigation
    navigation.init();
    
    // Page-specific initialization
    if (document.querySelector('.passenger-v2-page')) {
      // Load passenger app with road-based routing and fare system
      const script = document.createElement('script');
      script.src = '../js/passenger.js';
      script.defer = true;
      document.head.appendChild(script);
    } else if (document.querySelector('.driver-page')) {
      // Load driver app with manual fare entry and road-based routing
      const script = document.createElement('script');
      script.src = '../js/driver.js';
      script.defer = true;
      document.head.appendChild(script);
    }
    
    };

  // Start application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose utilities globally
  window.GreenRoute = {
    config,
    utils,
    theme,
    storage
  };

})();