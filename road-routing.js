/**
 * Road Routing System for GreenRoute
 * Provides realistic road-based routing between known stops
 */

(() => {
  'use strict';

  // Known stops with coordinates
  const STOPS = {
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

  // Road connections between stops (simplified road network)
  const ROAD_CONNECTIONS = {
    'madina': ['adenta', 'circle', 'airport'],
    'circle': ['madina', 'accra central', 'kaneshie'],
    'adenta': ['madina', 'airport'],
    'kaneshie': ['circle', 'accra central', 'tema station'],
    'tema station': ['kaneshie', 'accra central'],
    'accra central': ['circle', 'kaneshie', 'tema station', 'labone', 'osu'],
    'airport': ['madina', 'adenta', 'east legon'],
    'east legon': ['airport', 'labone'],
    'labone': ['east legon', 'accra central', 'osu'],
    'osu': ['labone', 'accra central']
  };

  /**
   * Get road path between two stops
   */
  const getRoadPath = (fromStop, toStop) => {
    if (!STOPS[fromStop] || !STOPS[toStop]) {
      console.warn('Unknown stop:', fromStop, toStop);
      return null;
    }

    if (fromStop === toStop) {
      return [STOPS[fromStop]];
    }

    // Use BFS to find shortest path through road network
    const path = findPath(fromStop, toStop);
    if (!path) {
      console.warn('No path found between stops:', fromStop, toStop);
      return null;
    }

    // Convert path to coordinates
    return path.map(stop => STOPS[stop]);
  };

  /**
   * Find shortest path between two stops using BFS
   */
  const findPath = (start, end) => {
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === end) {
        return path;
      }

      const connections = ROAD_CONNECTIONS[current] || [];
      for (const next of connections) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([...path, next]);
        }
      }
    }

    return null;
  };

  /**
   * Calculate road distance following the path
   */
  const calculateRoadDistance = (path) => {
    if (!path || path.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const point1 = path[i];
      const point2 = path[i + 1];
      
      // Handle both array [lat, lng] and object {lat, lng} formats
      const lat1 = Array.isArray(point1) ? point1[0] : point1.lat;
      const lng1 = Array.isArray(point1) ? point1[1] : point1.lng;
      const lat2 = Array.isArray(point2) ? point2[0] : point2.lat;
      const lng2 = Array.isArray(point2) ? point2[1] : point2.lng;
      
      totalDistance += calculateDistance(lat1, lng1, lat2, lng2);
    }

    return totalDistance;
  };

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /**
   * Find nearest stop to coordinates
   */
  const findNearestStop = (lat, lng) => {
    let nearestStop = null;
    let minDistance = Infinity;

    for (const [name, coords] of Object.entries(STOPS)) {
      const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
      if (distance < minDistance && distance < 2.0) { // Within 2km
        minDistance = distance;
        nearestStop = name;
      }
    }

    return nearestStop;
  };

  /**
   * Get all available stops
   */
  const getAllStops = () => {
    return STOPS;
  };

  /**
   * Check if two stops are directly connected
   */
  const areDirectlyConnected = (stop1, stop2) => {
    const connections = ROAD_CONNECTIONS[stop1] || [];
    return connections.includes(stop2);
  };

  // Expose to global scope
  window.RoadRouting = {
    getRoadPath,
    calculateRoadDistance,
    findNearestStop,
    getAllStops,
    areDirectlyConnected,
    calculateDistance,
    getRoute: async (fromLat, fromLng, toLat, toLng) => {
      const fromStop = findNearestStop(fromLat, fromLng);
      const toStop = findNearestStop(toLat, toLng);
      
      if (!fromStop || !toStop) {
        // Fallback to straight line if outside known network
        return {
          path: [[fromLat, fromLng], [toLat, toLng]],
          distance: calculateDistance(fromLat, fromLng, toLat, toLng)
        };
      }
      
      const roadPath = getRoadPath(fromStop, toStop);
      if (!roadPath) {
        return {
          path: [[fromLat, fromLng], [toLat, toLng]],
          distance: calculateDistance(fromLat, fromLng, toLat, toLng)
        };
      }
      
      const coordsPath = roadPath.map(p => [p.lat, p.lng]);
      
      // Add precise start and end points
      coordsPath.unshift([fromLat, fromLng]);
      coordsPath.push([toLat, toLng]);
      
      return {
        path: coordsPath,
        distance: calculateRoadDistance(coordsPath)
      };
    }
  };

  console.log('Road routing system loaded');
})();
