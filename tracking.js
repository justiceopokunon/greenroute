// Live driver tracking with OpenStreetMap + Leaflet (FREE - no API key needed)
const Tracking = (() => {
  let map = null;
  let driverMarker = null;
  let passengerMarker = null;
  let polyline = null;
  let activeRideId = null;
  let activeBookingId = null;
  let trackingInterval = null;
  let passLat = 5.616, passLon = -0.196; // Default fallback to Accra

  const getGeolocation = () => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            passLat = position.coords.latitude;
            passLon = position.coords.longitude;
            console.log('Got user geolocation:', passLat, passLon);
            resolve({ lat: passLat, lon: passLon });
          },
          (error) => {
            console.warn('Geolocation denied, using default Accra location');
            resolve({ lat: passLat, lon: passLon });
          },
          { timeout: 5000 }
        );
      } else {
        console.warn('Geolocation not available');
        resolve({ lat: passLat, lon: passLon });
      }
    });
  };

  const initMap = () => {
    if (map) return;

    const mapElement = document.getElementById('tracking-map');
    if (!mapElement) {
      console.warn('tracking-map element not found');
      return;
    }

    // Initialize Leaflet map with user location or default
    map = L.map(mapElement).setView([passLat, passLon], 14);

    // Add OpenStreetMap tiles (completely FREE - no API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    console.log('Leaflet map initialized at', passLat, passLon);
  };

  const updateMapMarkers = (driverLat, driverLon, passengerLat, passengerLon) => {
    if (!map) return;

    // Update or create driver marker
    if (driverMarker) {
      driverMarker.setLatLng([driverLat, driverLon]);
    } else {
      const driverIcon = L.divIcon({
        html: '<div style="background: #3b82f6; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><span style="font-weight: bold; color: white; font-size: 16px;">🚗</span></div>',
        iconSize: [32, 32],
        className: 'driver-marker'
      });
      driverMarker = L.marker([driverLat, driverLon], { icon: driverIcon })
        .addTo(map)
        .bindPopup('Driver location');
    }

    // Update or create passenger marker
    if (passengerMarker) {
      passengerMarker.setLatLng([passengerLat, passengerLon]);
    } else {
      const passengerIcon = L.divIcon({
        html: '<div style="background: #22c55e; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><span style="font-weight: bold; color: white; font-size: 16px;">📍</span></div>',
        iconSize: [32, 32],
        className: 'passenger-marker'
      });
      passengerMarker = L.marker([passengerLat, passengerLon], { icon: passengerIcon })
        .addTo(map)
        .bindPopup('Your location');
    }

    // Draw line between driver and passenger
    if (polyline) {
      polyline.setLatLngs([
        [driverLat, driverLon],
        [passengerLat, passengerLon]
      ]);
    } else {
      polyline = L.polyline([
        [driverLat, driverLon],
        [passengerLat, passengerLon]
      ], {
        color: '#5CE07A',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 5'
      }).addTo(map);
    }

    // Fit map to show both markers
    const bounds = L.latLngBounds([
      [driverLat, driverLon],
      [passengerLat, passengerLon]
    ]);
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const updateDriverInfo = (ride) => {
    // Update header avatar and name
    const header = document.getElementById('tracking-driver-header');
    if (header) {
      const avatar = header.querySelector('div:first-child');
      const name = header.querySelector('h2');
      const status = header.querySelector('small');
      
      if (avatar) avatar.textContent = (ride.driverName || 'D')[0].toUpperCase();
      if (name) name.textContent = ride.driverName || 'Driver';
      if (status) status.innerHTML = '<span class="tracking-status">●</span> En route';
    }

    // Update route info
    const route = document.getElementById('tracking-route');
    if (route) route.textContent = `${ride.origin || '?'} → ${ride.destination || '?'}`;

    // Update vehicle info
    const vehicle = document.getElementById('tracking-vehicle');
    if (vehicle) vehicle.textContent = `${ride.licensePlate || 'N/A'} · ${ride.vehicleModel || 'Vehicle'}`;

    // Update call/message links
    const callBtn = document.querySelector('a[href^="tel:"]');
    const msgBtn = document.querySelector('a[href^="sms:"]');
    if (callBtn) callBtn.href = `tel:${ride.driverPhone || '+233000000000'}`;
    if (msgBtn) msgBtn.href = `sms:${ride.driverPhone || '+233000000000'}`;

    // Update rating display
    const rating = document.querySelector('.tracking-bottom-panel div:last-child');
    if (rating) {
      rating.innerHTML = `
        <small style="opacity: 0.7;">Driver Rating</small>
        <div style="font-size: 1.3rem; margin-top: 0.25rem;">⭐ ${ride.rating || '-'} <span style="font-size: 0.9rem; opacity: 0.7;">· ${ride.trustScore || '-'} trust score</span></div>
      `;
    }
  };

  const updateETA = (eta, distance) => {
    const distanceEl = document.getElementById('tracking-distance');
    const etaBigEl = document.getElementById('tracking-eta-big');

    if (distanceEl) {
      distanceEl.textContent = `${distance.toFixed(2)} km`;
    }
    if (etaBigEl) {
      if (eta <= 0) {
        etaBigEl.textContent = 'Arriving now';
        etaBigEl.style.color = '#22c55e';
      } else if (eta === 1) {
        etaBigEl.textContent = '1 min';
      } else {
        etaBigEl.textContent = `${eta} mins`;
      }
    }
  };

  const updateDriverLocation = async () => {
    if (!activeRideId) return;

    try {
      const ride = await window.api.getRide(activeRideId);
      if (!ride) {
        console.warn('Ride not found:', activeRideId);
        return;
      }

      const driverLat = ride.latitude || 5.616;
      const driverLon = ride.longitude || -0.196;

      // Update map with driver marker
      updateMapMarkers(driverLat, driverLon, passLat, passLon);

      // Update driver info card
      updateDriverInfo(ride);

      // Calculate ETA
      const distance = getDistance(driverLat, driverLon, passLat, passLon);
      const eta = Math.ceil(distance / 0.5); // Assume 30km/h = 0.5km/min
      updateETA(eta, distance);
    } catch (err) {
      console.error('Error updating driver location:', err);
    }
  };

  const showTrackingModal = () => {
    const modal = document.getElementById('tracking-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  };

  const hideTrackingModal = () => {
    const modal = document.getElementById('tracking-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    stopTracking();
  };

  const startTracking = async (rideId, bookingId, userId) => {
    activeRideId = rideId;
    activeBookingId = bookingId;

    console.log('Starting tracking for ride:', rideId);

    // Get user's geolocation
    await getGeolocation();

    // Show tracking modal
    showTrackingModal();

    // Initialize map
    setTimeout(() => {
      initMap();
      updateDriverLocation();
    }, 100);

    // Poll driver location every 3 seconds
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(updateDriverLocation, 3000);
  };

  const stopTracking = () => {
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = null;
    activeRideId = null;
    if (map) {
      map.remove();
      map = null;
      driverMarker = null;
      passengerMarker = null;
      polyline = null;
    }
  };

  // Expose public API
  return {
    startTracking,
    stopTracking,
    hideTrackingModal
  };
})();

// Create and inject tracking modal HTML into the page
document.addEventListener('DOMContentLoaded', () => {
  const trackingModal = document.createElement('div');
  trackingModal.id = 'tracking-modal';
  trackingModal.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--tracking-overlay-bg, rgba(0,0,0,0.85));
    z-index: 10000;
    flex-direction: column;
    align-items: stretch;
    animation: fadeIn 0.3s ease-out;
    color: var(--text);
  `;

  trackingModal.innerHTML = `
    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      
      #tracking-map { border-radius: 0; }
      #tracking-map .leaflet-container { border-radius: 0; }
      
      .tracking-status {
        animation: pulse 2s ease-in-out infinite;
      }
      
      .tracking-bottom-panel {
        animation: slideUp 0.4s ease-out 0.1s both;
      }
      
      /* Theme-aware CSS variables */
      html[data-theme="light"] {
        --tracking-overlay-bg: rgba(255, 255, 255, 0.95);
        --tracking-header-bg: linear-gradient(135deg, rgba(246, 249, 243, 0.98) 0%, rgba(236, 241, 232, 0.95) 100%);
        --tracking-panel-bg: linear-gradient(180deg, rgba(236, 241, 232, 0.8) 0%, rgba(246, 249, 243, 0.95) 100%);
        --tracking-box-bg: rgba(23, 157, 71, 0.08);
        --tracking-box-border: rgba(23, 157, 71, 0.2);
        --tracking-button-bg: linear-gradient(135deg, #0f8237 0%, #095c2a 100%);
        --tracking-secondary-bg: rgba(38, 48, 38, 0.1);
        --tracking-secondary-border: rgba(38, 48, 38, 0.15);
        --tracking-map-bg: linear-gradient(135deg, #e8efe4 0%, #f3f6ef 100%);
      }
      
      html[data-theme="dark"] {
        --tracking-overlay-bg: rgba(0, 0, 0, 0.85);
        --tracking-header-bg: linear-gradient(135deg, #1a1a1a 0%, #262626 100%);
        --tracking-panel-bg: linear-gradient(180deg, rgba(13, 13, 13, 0.6) 0%, #1a1a1a 100%);
        --tracking-box-bg: rgba(92, 224, 122, 0.1);
        --tracking-box-border: rgba(92, 224, 122, 0.2);
        --tracking-button-bg: linear-gradient(135deg, #5CE07A 0%, #4ab365 100%);
        --tracking-secondary-bg: rgba(255, 255, 255, 0.1);
        --tracking-secondary-border: rgba(255, 255, 255, 0.15);
        --tracking-map-bg: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
      }
    </style>

    <!-- Header with driver info -->
    <div style="padding: 1.25rem; background: var(--tracking-header-bg); border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
      <div id="tracking-driver-header" style="flex: 1; display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; color: white; flex-shrink: 0;">K</div>
        <div style="color: var(--text);">
          <h2 style="margin: 0; font-size: 1.1rem; font-weight: 600;">Kwame Mensah</h2>
          <small style="opacity: 0.7; display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; color: var(--muted);">
            <span class="tracking-status">●</span> En route
          </small>
        </div>
      </div>
      <button id="close-tracking-btn" style="background: var(--tracking-secondary-bg); border: 1px solid var(--tracking-secondary-border); font-size: 1.8rem; cursor: pointer; padding: 0.5rem 0.75rem; border-radius: 8px; color: var(--text); transition: all 0.2s; display: flex; align-items: center; justify-content: center;">×</button>
    </div>

    <!-- Map container -->
    <div id="tracking-map" style="flex: 1; background: var(--tracking-map-bg); position: relative; overflow: hidden;"></div>

    <!-- Bottom info panel -->
    <div class="tracking-bottom-panel" style="padding: 1.5rem; background: var(--tracking-panel-bg); backdrop-filter: blur(10px); border-top: 1px solid var(--line); max-height: 40vh; overflow-y: auto; color: var(--text);">
      
      <!-- Distance and ETA row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        <div style="text-align: center; padding: 1rem; background: var(--tracking-box-bg); border-radius: 12px; border: 1px solid var(--tracking-box-border);">
          <small style="opacity: 0.6; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted);">Distance</small>
          <div id="tracking-distance" style="font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem; color: var(--primary);">--</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: var(--tracking-box-bg); border-radius: 12px; border: 1px solid var(--tracking-box-border);">
          <small style="opacity: 0.6; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted);">Estimated Time</small>
          <div id="tracking-eta-big" style="font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem; color: var(--primary);">--</div>
        </div>
      </div>

      <!-- Route and vehicle info -->
      <div style="padding: 1rem; background: var(--tracking-secondary-bg); border-radius: 12px; border: 1px solid var(--tracking-secondary-border); margin-bottom: 1.5rem; color: var(--text);">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <span style="font-size: 1.2rem;">📍</span>
          <div style="flex: 1;">
            <div id="tracking-route" style="font-size: 0.95rem; font-weight: 500;">Madina → Circle</div>
            <small style="opacity: 0.6; color: var(--muted);">Route</small>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.2rem;">🚗</span>
          <div style="flex: 1;">
            <div id="tracking-vehicle" style="font-size: 0.95rem; font-weight: 500;">GR-214 · Toyota Hiace</div>
            <small style="opacity: 0.6; color: var(--muted);">Vehicle</small>
          </div>
        </div>
      </div>

      <!-- Contact buttons -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <a href="tel:+233201234567" class="btn-primary" style="padding: 1rem; background: var(--tracking-button-bg); border: none; border-radius: 10px; color: white; text-decoration: none; font-weight: 600; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 1rem;">
          <span>📞</span> Call Driver
        </a>
        <a href="sms:+233201234567" class="btn-secondary" style="padding: 1rem; background: var(--tracking-secondary-bg); border: 1px solid var(--tracking-secondary-border); border-radius: 10px; color: var(--text); text-decoration: none; font-weight: 600; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 1rem;">
          <span>💬</span> Message
        </a>
      </div>

      <!-- Driver rating -->
      <div style="text-align: center; padding: 1rem; background: var(--tracking-secondary-bg); border-radius: 10px; border: 1px solid var(--tracking-secondary-border); color: var(--text);">
        <small style="opacity: 0.7; color: var(--muted);">Driver Rating</small>
        <div style="font-size: 1.3rem; margin-top: 0.25rem;">⭐ 4.8 <span style="font-size: 0.9rem; opacity: 0.7;">· 4.8 trust score</span></div>
      </div>
    </div>
  `;
        </div>
      </div>

      <!-- Contact buttons -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <a href="tel:+233201234567" class="btn-primary" style="padding: 1rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; border-radius: 10px; color: white; text-decoration: none; font-weight: 600; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 1rem;">
          <span>📞</span> Call Driver
        </a>
        <a href="sms:+233201234567" class="btn-secondary" style="padding: 1rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: white; text-decoration: none; font-weight: 600; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 1rem;">
          <span>💬</span> Message
        </a>
      </div>

      <!-- Driver rating -->
      <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 10px;">
        <small style="opacity: 0.7;">Driver Rating</small>
        <div style="font-size: 1.3rem; margin-top: 0.25rem;">⭐ 4.8 <span style="font-size: 0.9rem; opacity: 0.7;">· 4.8 trust score</span></div>
      </div>
    </div>
  `;

  // Add hover effects for buttons
  const style = document.createElement('style');
  style.textContent = `
    html[data-theme="dark"] #tracking-modal .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(92, 224, 122, 0.3);
    }
    html[data-theme="light"] #tracking-modal .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(15, 130, 55, 0.3);
    }
    #tracking-modal .btn-secondary:hover {
      opacity: 1;
      transform: translateY(-2px);
    }
    html[data-theme="dark"] #tracking-modal .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.3);
    }
    html[data-theme="light"] #tracking-modal .btn-secondary:hover {
      background: rgba(38, 48, 38, 0.15);
      border-color: rgba(38, 48, 38, 0.25);
    }
    #tracking-modal #close-tracking-btn:hover {
      transform: rotate(90deg);
      opacity: 1;
    }
    html[data-theme="dark"] #tracking-modal #close-tracking-btn:hover {
      background: rgba(255,255,255,0.15);
    }
    html[data-theme="light"] #tracking-modal #close-tracking-btn:hover {
      background: rgba(38, 48, 38, 0.15);
    }
    #tracking-modal #close-tracking-btn {
      transition: all 0.3s;
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(trackingModal);

  // Close button handler
  const closeBtn = document.getElementById('close-tracking-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      Tracking.hideTrackingModal();
    });
  }

  console.log('Tracking modal injected into page');
});

// Expose Tracking to window global
window.Tracking = Tracking;
