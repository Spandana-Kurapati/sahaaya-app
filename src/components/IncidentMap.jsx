// src/components/IncidentMap.jsx
// ──────────────────────────────────────────────────────────
// Sahaya — Leaflet map with priority-colored incident pins
// ──────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';

const PRIORITY_COLORS = {
  high:   { fill: '#f87171', glow: '#ef4444', border: '#fca5a5' },
  medium: { fill: '#facc15', glow: '#eab308', border: '#fef08a' },
  low:    { fill: '#60a5fa', glow: '#3b82f6', border: '#93c5fd' },
};

function getPriLevel(priority) {
  return priority >= 7 ? 'high' : priority >= 4 ? 'medium' : 'low';
}

function makeIcon(level, highlighted = false, assigned = false) {
  const c = PRIORITY_COLORS[level];
  const size = highlighted ? 22 : 15;
  const ring = highlighted ? `box-shadow:0 0 0 3px white, 0 0 16px ${c.glow};` : '';
  const opacity = assigned ? '0.55' : '1';
  return window.L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${c.fill};border:2.5px solid ${c.border};
      box-shadow:0 0 ${highlighted ? 14 : 7}px ${c.glow};
      ${ring}opacity:${opacity};
      transition:all 0.3s;
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function IncidentMap({
  incidents = [],
  userCoords = null,
  highlightId = null,
  onPinClick = null,
  height = 420,
}) {
  const mapRef     = useRef(null);
  const leafletMap = useRef(null);
  const markers    = useRef({});
  const userMarker = useRef(null);

  // Init map once
  useEffect(() => {
    if (!window.L || leafletMap.current) return;
    leafletMap.current = window.L.map(mapRef.current, {
      center: userCoords || [17.39, 78.49],
      zoom: userCoords ? 12 : 11,
      zoomControl: true,
      attributionControl: false,
    });
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CARTO',
      maxZoom: 19,
    }).addTo(leafletMap.current);
    // Custom attribution
    window.L.control.attribution({ prefix: false, position: 'bottomleft' })
      .addAttribution('<span style="color:rgba(255,255,255,0.2);font-size:10px">©CARTO ©OSM</span>')
      .addTo(leafletMap.current);
  }, []);

  // User location marker
  useEffect(() => {
    if (!leafletMap.current || !window.L || !userCoords) return;
    if (userMarker.current) leafletMap.current.removeLayer(userMarker.current);
    const icon = window.L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#fb923c;border:2.5px solid white;box-shadow:0 0 12px #fb923c88;"></div>`,
      className: '', iconSize: [14, 14], iconAnchor: [7, 7],
    });
    userMarker.current = window.L.marker(userCoords, { icon, zIndexOffset: 1000 })
      .addTo(leafletMap.current)
      .bindPopup('<b style="color:#fb923c">📍 You are here</b>');
  }, [userCoords]);

  // Incident markers
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;
    // Remove old
    Object.values(markers.current).forEach(m => leafletMap.current.removeLayer(m));
    markers.current = {};
    // Add new
    incidents.forEach(inc => {
      if (inc.lat == null || inc.lng == null) return;
      const level = getPriLevel(inc.priority);
      const isHL  = inc.id === highlightId;
      const icon  = makeIcon(level, isHL, !!inc.assignedTo);
      const popup = `
        <div style="font-family:'DM Sans',sans-serif;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:18px">${{Flood:'🌊',Medical:'🏥',Rescue:'🚁',Food:'🍱',Shelter:'🏠',Fire:'🔥',Infrastructure:'🏗️',Other:'📋'}[inc.category]||'📋'}</span>
            <strong style="color:#f5f4f0;font-size:14px">${inc.category||'Incident'}</strong>
          </div>
          <p style="color:rgba(245,244,240,0.6);font-size:12px;line-height:1.5;margin-bottom:8px">${inc.autoSummary||inc.description||''}</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${level==='high'?'rgba(248,113,113,0.2)':level==='medium'?'rgba(250,204,21,0.2)':'rgba(96,165,250,0.2)'};color:${level==='high'?'#f87171':level==='medium'?'#facc15':'#60a5fa'}">P${inc.priority}</span>
            <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(255,255,255,0.08);color:rgba(245,244,240,0.6)">${inc.status}</span>
          </div>
        </div>`;
      const m = window.L.marker([inc.lat, inc.lng], { icon })
        .addTo(leafletMap.current)
        .bindPopup(popup, { maxWidth: 260 });
      if (onPinClick) m.on('click', () => onPinClick(inc));
      markers.current[inc.id] = m;
    });
  }, [incidents, highlightId]);

  // Pan to highlighted
  useEffect(() => {
    if (!leafletMap.current || !highlightId) return;
    const inc = incidents.find(i => i.id === highlightId);
    if (inc?.lat && inc?.lng) {
      leafletMap.current.flyTo([inc.lat, inc.lng], 14, { duration: 1 });
    }
  }, [highlightId]);

  return (
    <div ref={mapRef}
      className="w-full rounded-2xl overflow-hidden border border-white/7"
      style={{ height, minHeight: height }}
    />
  );
}
