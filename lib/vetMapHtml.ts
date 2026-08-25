import { VetResult } from '../types';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  const markersJs = vets.map(v => {
    const name = escapeHtml(v.name);
    const address = v.address ? escapeHtml(v.address) : 'Address unavailable';
    const phoneHtml = v.phone
      ? `<br/><a href="tel:${escapeHtml(v.phone)}">${escapeHtml(v.phone)}</a>`
      : '';
    const popup = `<b>${name}</b><br/>${address}${phoneHtml}`;
    const isHighlighted = variant === 'alert' && highlightVetId === v.id;
    const isDimmed = variant === 'alert' && highlightVetId != null && !isHighlighted;
    const iconVar = isHighlighted ? 'vetIconHighlight' : isDimmed ? 'vetIconDim' : 'vetIcon';
    return `L.marker([${v.lat}, ${v.lon}], { icon: ${iconVar} }).addTo(map).bindPopup(${JSON.stringify(popup)});`;
  }).join('\n');

  const userIconColor = variant === 'alert' ? '#8A1A1A' : '#2A5A9A';

  const interactionOptions = interactive
    ? ''
    : 'dragging: false, zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, tap: false,';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-control-attribution { font-size: 8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { ${interactionOptions} attributionControl: true }).setView([${userLocation.lat}, ${userLocation.lon}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const userIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:${userIconColor};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>',
      iconSize: [16, 16],
    });
    const vetIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#3A7A1A;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>',
      iconSize: [16, 16],
    });
    const vetIconHighlight = L.divIcon({
      className: '',
      html: '<div style="width:20px;height:20px;border-radius:50%;background:#8A1A1A;border:2px solid white;box-shadow:0 0 8px rgba(140,26,26,0.7);"></div>',
      iconSize: [20, 20],
    });
    const vetIconDim = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#3A7A1A;opacity:0.5;border:2px solid white;"></div>',
      iconSize: [16, 16],
    });

    L.marker([${userLocation.lat}, ${userLocation.lon}], { icon: userIcon }).addTo(map).bindPopup('You are here');
    ${markersJs}
  </script>
</body>
</html>
`;
}
