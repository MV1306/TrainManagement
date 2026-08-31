/**
 * Parse "lat, lng" string into { latitude, longitude } numbers.
 * Returns nulls if input is empty or invalid.
 */
export function parseCoordinates(value) {
  if (!value?.trim()) return { latitude: null, longitude: null };
  const parts = value.split(',').map((p) => p.trim());
  if (parts.length !== 2) return { latitude: null, longitude: null };
  const latitude = parseFloat(parts[0]);
  const longitude = parseFloat(parts[1]);
  if (isNaN(latitude) || isNaN(longitude)) return { latitude: null, longitude: null };
  return { latitude, longitude };
}

/**
 * Format lat/lng numbers back to "lat, lng" string for display in input.
 */
export function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) return '';
  return `${latitude}, ${longitude}`;
}

/**
 * Haversine distance in km between two lat/lng points.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Given an ordered array of stops and a stations lookup map { id -> station },
 * returns a new stops array with distanceFromOrigin recalculated using coordinates.
 * Stops without coordinates are left unchanged.
 */
export function recalcDistances(stops, stationsMap) {
  let cumulativeKm = 0;
  return stops.map((stop, i) => {
    if (i === 0) return { ...stop, distanceFromOrigin: 0 };
    const prev = stops[i - 1];
    const prevStation = stationsMap[prev.stationId];
    const currStation = stationsMap[stop.stationId];
    if (
      prevStation?.latitude != null && prevStation?.longitude != null &&
      currStation?.latitude != null && currStation?.longitude != null
    ) {
      cumulativeKm += haversineKm(
        prevStation.latitude, prevStation.longitude,
        currStation.latitude, currStation.longitude
      );
      return { ...stop, distanceFromOrigin: parseFloat(cumulativeKm.toFixed(2)) };
    }
    return stop;
  });
}
