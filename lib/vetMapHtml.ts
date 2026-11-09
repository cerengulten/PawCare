import { VetResult } from '../types';

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeCoord(n: unknown): number {
  const val = Number(n);
  return Number.isFinite(val) ? val : 0;
}

export type VetMapOptions = {
  /** Full interactive map (default) vs a static preview tile with gestures disabled. */
  interactive?: boolean;
  /** 'alert' tints the user marker red; used by the Home screen's alert-state preview. */
  variant?: 'normal' | 'alert';
  /** In 'alert' variant, this vet's marker is highlighted; all others are dimmed. */
  highlightVetId?: string;
};

export function buildVetMapHtml(
  userLocation: { lat: number; lon: number },
  vets: VetResult[],
  options: VetMapOptions = {}
): string {
  const { interactive = true, variant = 'normal', highlightVetId } = options;

  const userLat = safeCoord(userLocation?.lat);
  const userLon = safeCoord(userLocation?.lon);

  const markersJs = vets
    .map((v) => {
      const id = escapeHtml(v.id);
      const name = escapeHtml(v.name);
      const address = v.address ? escapeHtml(v.address) : '';
      const vLat = safeCoord(v.lat);
      const vLon = safeCoord(v.lon);
      const kmVal = safeCoord(v.distanceKm);
      const kmText = `${kmVal.toFixed(1)} km`;
      const popup = `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:2px 0;"><strong style="font-size:13px;color:#1F1A17;">${name}</strong><br/><span style="font-size:11px;color:#3A6B4C;font-weight:600;">${kmText}</span>${address ? `<br/><span style="font-size:11px;color:#6E655F;">${address}</span>` : ''}</div>`;
      const isHighlighted = (variant === 'alert' || highlightVetId != null) && highlightVetId === v.id;
      const isDimmed = variant === 'alert' && highlightVetId != null && !isHighlighted;
      const iconVar = isHighlighted ? 'vetIconHighlight' : isDimmed ? 'vetIconDim' : 'vetIcon';
      return `
      (function() {
        const m = L.marker([${vLat}, ${vLon}], { icon: ${iconVar} }).addTo(map).bindPopup(${JSON.stringify(popup)});
        markerMap[${JSON.stringify(id)}] = m;
        m.on('click', function() {
          highlightVetMarker(${JSON.stringify(id)});
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_VET', id: ${JSON.stringify(id)} }));
          }
        });
      })();
      `;
    })
    .join('\n');

  const userIconColor = variant === 'alert' ? '#DC2626' : '#2563EB';
  const userHaloColor = variant === 'alert' ? 'rgba(220,38,38,0.22)' : 'rgba(37,99,235,0.22)';

  const interactionOptions = interactive
    ? ''
    : 'dragging: false, zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, tap: false,';

  const pinSvgNormal = `<svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.28));"><path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 34 14 34C14 34 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#3A6B4C"/><circle cx="14" cy="14" r="8.5" fill="#FFFFFF"/><path d="M14 10V18M10 14H18" stroke="#3A6B4C" stroke-width="2.3" stroke-linecap="round"/></svg>`;

  const pinSvgHighlight = `<svg width="34" height="42" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 8px rgba(38,74,51,0.5));"><path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 34 14 34C14 34 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#264A33"/><circle cx="14" cy="14" r="9" fill="#FFFFFF"/><path d="M14 9.5V18.5M9.5 14H18.5" stroke="#264A33" stroke-width="2.5" stroke-linecap="round"/></svg>`;

  const pinSvgDim = `<svg width="24" height="30" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.55;"><path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 34 14 34C14 34 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#3A6B4C"/><circle cx="14" cy="14" r="8" fill="#FFFFFF"/><path d="M14 10V18M10 14H18" stroke="#3A6B4C" stroke-width="2.2" stroke-linecap="round"/></svg>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-control-attribution { font-size: 8px; }
    .leaflet-popup-content-wrapper { border-radius: 12px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { ${interactionOptions} attributionControl: true }).setView([${userLat}, ${userLon}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const userIcon = L.divIcon({
      className: '',
      html: '<div style="width:28px;height:28px;border-radius:50%;background:${userHaloColor};display:flex;align-items:center;justify-content:center;"><div style="width:14px;height:14px;border-radius:50%;background:${userIconColor};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const vetIcon = L.divIcon({
      className: '',
      html: ${JSON.stringify(pinSvgNormal)},
      iconSize: [28, 34],
      iconAnchor: [14, 34],
      popupAnchor: [0, -32],
    });
    const vetIconHighlight = L.divIcon({
      className: '',
      html: ${JSON.stringify(pinSvgHighlight)},
      iconSize: [34, 42],
      iconAnchor: [17, 42],
      popupAnchor: [0, -38],
    });
    const vetIconDim = L.divIcon({
      className: '',
      html: ${JSON.stringify(pinSvgDim)},
      iconSize: [24, 30],
      iconAnchor: [12, 30],
      popupAnchor: [0, -28],
    });

    const markerMap = {};
    L.marker([${userLat}, ${userLon}], { icon: userIcon }).addTo(map).bindPopup('You are here');
    ${markersJs}

    function highlightVetMarker(selectedId) {
      Object.keys(markerMap).forEach(function(k) {
        if (k === String(selectedId)) {
          markerMap[k].setIcon(vetIconHighlight);
          markerMap[k].setZIndexOffset(1000);
        } else {
          markerMap[k].setIcon(vetIcon);
          markerMap[k].setZIndexOffset(0);
        }
      });
    }

    function handlePan(data) {
      if (data && data.type === 'PAN_TO' && typeof data.lat === 'number' && typeof data.lon === 'number') {
        map.setView([data.lat, data.lon], 15, { animate: true });
        if (data.id) {
          highlightVetMarker(data.id);
        }
      }
    }
    window.addEventListener('message', function(e) {
      try { handlePan(typeof e.data === 'string' ? JSON.parse(e.data) : e.data); } catch(err) {}
    });
    document.addEventListener('message', function(e) {
      try { handlePan(typeof e.data === 'string' ? JSON.parse(e.data) : e.data); } catch(err) {}
    });
  </script>
</body>
</html>
`;
}
