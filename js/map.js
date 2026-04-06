// Leaflet map for alumni first job locations on Career Statistics view

const LOCATION_ALIASES = {
  'Salt Lake City': [
    'salt lake city, utah', 'salt lake city metropolitan area', 'salt lake city, ut',
    'salt lake city, ut', 'salt lake city, utah', 'salt lake city, utah, usa', 'salt lake city, usa',
    'salt lake city, utah, us', 'salt lake city, us',
    'greater salt lake city area', 'salt lake county, utah',
    'salt lake city, utah, united states', 'salt lake county, utah', 'salt lake county, utah, united states',
    'salt lake city, ut, united states', 'salt lake city area', 'salt lake area', 'slc, utah',
    'salt lake city, utah area', 'salt lake county', 'salt lake city metro area',
  ],
  'Provo': [
    'provo, utah', 'provo, ut', 'provo-orem metro', 'provo, utah, united states',
    'orem, utah, united states', 'utah county, utah', 'utah county, utah, united states',
    'highland, utah, united states',
  ],
  'Lehi': ['lehi, utah', 'lehi, ut', 'lehi, utah, united states', 'draper, utah, united states'],
  'Washington D.C.': [
    'washington d.c.', 'washington dc', 'washington, dc', 'washington district of columbia',
    'washington, district of columbia, united states',
  ],
  'New York City': [
    'new york city', 'new york, ny', 'nyc', 'new york metropolitan area',
    'new york city metropolitan area', 'new york, new york, united states',
    'new york, united states',
  ],
  'San Francisco Bay Area': [
    'san francisco bay area', 'san francisco, california', 'palo alto, california, united states',
    'san jose, california, united states',
  ],
  'Greater Chicago Area': ['greater chicago area', 'chicago, illinois, united states'],
  'Boston': ['boston, massachusetts', 'boston, massachusetts, united states', 'greater boston area'],
  'Los Angeles': ['los angeles', 'los angeles, california', 'los angeles metropolitan area', 'los angeles, california, united states'],
  'Houston': ['houston, texas', 'houston, texas, united states'],
  'Dallas': [
    'dallas, texas', 'dallas, texas, united states', 'dallas-fort worth', 'dallas-fort worth metroplex',
    'fort worth, texas', 'fort worth, texas, united states',
  ],
  'Austin': ['austin, texas', 'austin, texas, united states', 'austin metro area'],
  'Phoenix': ['phoenix, arizona', 'phoenix, az', 'phoenix, arizona, united states', 'phoenix metro area'],
  'Denver': ['denver, colorado', 'denver, co', 'denver, colorado, united states', 'denver metro area'],
  'Seattle': ['seattle, washington', 'seattle, wa', 'seattle, washington, united states', 'seattle metropolitan area'],
  'Atlanta': ['atlanta, georgia', 'atlanta, ga', 'atlanta, georgia, united states', 'atlanta metropolitan area'],
  'Miami': ['miami, florida', 'miami, fl', 'miami, florida, united states', 'miami metropolitan area'],
  'Philadelphia': ['philadelphia, pennsylvania', 'philadelphia, pa', 'philadelphia, pennsylvania, united states'],
  'San Diego': ['san diego, california', 'san diego, ca', 'san diego, california, united states'],
  'Charlotte': ['charlotte, north carolina', 'charlotte, nc', 'charlotte, north carolina, united states'],
  'Minneapolis': ['minneapolis, minnesota', 'minneapolis, mn', 'minneapolis, minnesota, united states', 'twin cities', 'minneapolis-st. paul'],
  'Detroit': ['detroit, michigan', 'detroit, mi', 'detroit, michigan, united states'],
  'Portland': ['portland, oregon', 'portland, or', 'portland, oregon, united states'],

  // Non‑US hubs (first job locations seen in dataset)
  'London': ['london', 'london, england, united kingdom'],
  'Leeds': ['leeds, england, united kingdom', 'leeds, england'],
  'Hong Kong': ['hong kong'],
  'Seoul': ['icheon-si, gyeonggi, south korea', 'south korea'],
  'Bogotá': ['bogota', 'bogota,d.c., capital district, colombia', 'bogotá'],
  'Jakarta': ['jakarta metropolitan area', 'jakarta'],
  'Kyiv': ['kyiv, kyiv city, ukraine', 'kyiv'],
  'Mannheim': ['mannheim, baden-württemberg, germany', 'mannheim'],
  'Porto Velho': ['porto velho, rondônia, brazil', 'porto velho'],
};

const LOWER_TO_CANONICAL = {};
Object.entries(LOCATION_ALIASES).forEach(([canonical, variants]) => {
  LOWER_TO_CANONICAL[canonical.toLowerCase()] = canonical;
  variants.forEach((v) => {
    LOWER_TO_CANONICAL[v.toLowerCase().trim()] = canonical;
  });
});

const LOCATION_COORDS = {
  'Salt Lake City': { lat: 40.7608, lng: -111.891 },
  'Provo': { lat: 40.2338, lng: -111.6585 },
  'Lehi': { lat: 40.3916, lng: -111.8508 },
  'Washington D.C.': { lat: 38.9072, lng: -77.0369 },
  'New York City': { lat: 40.7128, lng: -74.006 },
  'San Francisco Bay Area': { lat: 37.7749, lng: -122.4194 },
  'Greater Chicago Area': { lat: 41.8781, lng: -87.6298 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Dallas': { lat: 32.7767, lng: -96.797 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'Phoenix': { lat: 33.4484, lng: -112.074 },
  'Denver': { lat: 39.7392, lng: -104.9903 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Atlanta': { lat: 33.749, lng: -84.388 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Philadelphia': { lat: 39.9526, lng: -75.1652 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'Charlotte': { lat: 35.2271, lng: -80.8431 },
  'Minneapolis': { lat: 44.9778, lng: -93.265 },
  'Detroit': { lat: 42.3314, lng: -83.0458 },
  'Portland': { lat: 45.5152, lng: -122.6784 },

  // Non‑US hubs
  'London': { lat: 51.5072, lng: -0.1276 },
  'Leeds': { lat: 53.8008, lng: -1.5491 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Bogotá': { lat: 4.7110, lng: -74.0721 },
  'Jakarta': { lat: -6.2088, lng: 106.8456 },
  'Kyiv': { lat: 50.4501, lng: 30.5234 },
  'Mannheim': { lat: 49.4875, lng: 8.4660 },
  'Porto Velho': { lat: -8.7608, lng: -63.8999 },
};

function normalizeLocation(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const lower = raw.toLowerCase().trim();

  // Standardize common Salt Lake variants (SLC, metro/area/county naming, UT abbreviations).
  if (
    /(^|\b)slc(\b|,)/.test(lower) ||
    (lower.includes('salt lake') && (
      lower.includes('city') ||
      lower.includes('county') ||
      lower.includes('metro') ||
      lower.includes('area')
    ))
  ) {
    return 'Salt Lake City';
  }

  if (LOWER_TO_CANONICAL[lower]) return LOWER_TO_CANONICAL[lower];
  for (const [canonical, variants] of Object.entries(LOCATION_ALIASES)) {
    if (lower.includes(canonical.toLowerCase())) return canonical;
    if (variants.some((v) => lower.includes(v))) return canonical;
  }
  return null;
}

function getLocationHubs() {
  const raw = DataManager.getFirstJobLocations();
  const hubs = {};
  raw.forEach(([location, count]) => {
    if (!location || typeof location !== 'string') return;
    const cleaned = location.toLowerCase().trim();
    // Skip records that are essentially just "USA" with no city/state detail
    if (
      cleaned === 'united states' ||
      cleaned === 'usa' ||
      cleaned === 'u.s.a.' ||
      cleaned === 'u.s.' ||
      cleaned === 'us'
    ) {
      return;
    }
    const normalized = normalizeLocation(location);
    if (normalized && LOCATION_COORDS[normalized]) {
      hubs[normalized] = (hubs[normalized] || 0) + count;
    }
  });
  return Object.entries(hubs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);
}

const MapManager = {
  map: null,
  markers: [],

  init() {
    const container = document.getElementById('alumni-map');
    if (!container) return;

    if (this.map) {
      // Ensure proper resize if returning to stats view
      setTimeout(() => this.map.invalidateSize(), 100);
      return;
    }

    this.map = L.map('alumni-map', {
      preferCanvas: true,
      // Keep the map from \"wrapping\" infinitely, but allow a global view.
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
      worldCopyJump: true,
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
      noWrap: true,
    }).addTo(this.map);

    const hubs = getLocationHubs();
    this.markers = hubs.map(([name, count]) => {
      const coords = LOCATION_COORDS[name];
      if (!coords) return null;
      const marker = L.marker([coords.lat, coords.lng])
        .addTo(this.map)
        .bindPopup(`<strong>${name}</strong><br>${count} alumni`);
      return marker;
    }).filter(Boolean);

    if (this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.15));
    }

    setTimeout(() => this.map.invalidateSize(), 100);

    const legendEl = document.getElementById('map-legend');
    if (legendEl) {
      legendEl.innerHTML = `
        <p><strong>Top hubs:</strong> ${hubs.slice(0, 10).map(([n, c]) => `${n} (${c})`).join(' · ')}</p>
      `;
    }
  },
};

window.MapManager = MapManager;

