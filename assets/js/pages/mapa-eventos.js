/* =========================================================
   FlashFiber FTTH | Mapa unificado de eventos (FTTH + Corporativo)
   - Carga eventos y eventos_corporativo con getDocs
   - Filtro por rango de fechas (createdAt)
   - Pinta pines en un solo mapa con total
========================================================= */

import { db } from "../services/firebase.db.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const CONFIG = window.__FTTH_CONFIG__ || {};
const TOKEN = CONFIG.MAPBOX_TOKEN || "";
const MAP_CENTER = CONFIG.MAP?.CENTER || [-74.1, 4.65];
const MAP_ZOOM = CONFIG.MAP?.ZOOM ?? 12;
const MAP_STYLE = CONFIG.MAP?.STYLE_DEFAULT || "mapbox://styles/mapbox/dark-v11";

const SOURCE_ID = "eventos-unificado-src";
const LAYER_ID = "eventos-unificado-layer";

const EVENTOS_COLLECTION = "eventos";
const EVENTOS_CORP_COLLECTION = "eventos_corporativo";

function colorByEstado(estado) {
  if (estado === "CRITICO") return "#e53935";
  if (estado === "PROVISIONAL") return "#fbc02d";
  if (estado === "RESUELTO") return "#43a047";
  return "#9e9e9e";
}

function createEventoPinIconSVG(color, estado = "") {
  const size = 48;
  let emoji = "🚨";
  if (estado === "CRITICO") emoji = "🔴";
  else if (estado === "PROVISIONAL") emoji = "🟡";
  else if (estado === "RESUELTO") emoji = "🟢";
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${String(color).replace("#", "")}">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="M ${size/2} ${size*0.15} Q ${size*0.2} ${size*0.15} ${size*0.2} ${size*0.4} L ${size*0.2} ${size*0.7} Q ${size*0.2} ${size*0.85} ${size*0.35} ${size*0.85} L ${size*0.5} ${size} L ${size*0.65} ${size*0.85} Q ${size*0.8} ${size*0.85} ${size*0.8} ${size*0.7} L ${size*0.8} ${size*0.4} Q ${size*0.8} ${size*0.15} ${size*0.5} ${size*0.15} Z" fill="${color}" stroke="#000" stroke-width="1.5" filter="url(#shadow-${String(color).replace("#", "")})"/>
      <circle cx="${size/2}" cy="${size*0.4}" r="${size*0.25}" fill="#fff" stroke="${color}" stroke-width="2"/>
      <text x="${size/2}" y="${size*0.48}" font-size="${size*0.25}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold">${emoji}</text>
    </svg>
  `;
  return svg;
}

function loadEventoIcon(map, estado) {
  const iconId = `evento-${(estado || "").toLowerCase() || "default"}`;
  if (map.hasImage(iconId)) return;
  const color = colorByEstado(estado);
  const svg = createEventoPinIconSVG(color, estado);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  img.onload = () => {
    if (!map.hasImage(iconId)) map.addImage(iconId, img);
    URL.revokeObjectURL(url);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function toDateOnly(d) {
  if (!d) return null;
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

async function fetchEventos(fechaDesde, fechaHasta, origenFilter) {
  const desde = toDateOnly(fechaDesde);
  const hasta = fechaHasta ? toDateOnly(fechaHasta) + 86400000 - 1 : null;
  const origen = origenFilter === "FTTH" || origenFilter === "Corporativo" ? origenFilter : "FTTH-Corporativo";

  const list = [];

  if (origen === "FTTH" || origen === "FTTH-Corporativo") {
    const snapFtth = await getDocs(collection(db, EVENTOS_COLLECTION));
    snapFtth.forEach((doc) => {
      const d = doc.data();
      const createdAt = parseDate(d.createdAt);
      const t = createdAt ? toDateOnly(createdAt) : null;
      if (t != null && (desde == null || t >= desde) && (hasta == null || t <= hasta)) {
        if (d.lat != null && d.lng != null) {
          list.push({
            id: `ftth-${doc.id}`,
            ...d,
            origen: "FTTH"
          });
        }
      }
    });
  }

  if (origen === "Corporativo" || origen === "FTTH-Corporativo") {
    const snapCorp = await getDocs(collection(db, EVENTOS_CORP_COLLECTION));
    snapCorp.forEach((doc) => {
      const d = doc.data();
      const createdAt = parseDate(d.createdAt);
      const t = createdAt ? toDateOnly(createdAt) : null;
      if (t != null && (desde == null || t >= desde) && (hasta == null || t <= hasta)) {
        if (d.lat != null && d.lng != null) {
          list.push({
            id: `corp-${doc.id}`,
            ...d,
            origen: "Corporativo"
          });
        }
      }
    });
  }

  return list;
}

function toGeoJSON(eventos) {
  const features = eventos.map((e) => ({
    type: "Feature",
    id: e.id,
    geometry: { type: "Point", coordinates: [Number(e.lng), Number(e.lat)] },
    properties: {
      id: e.id,
      tipo: e.tipo,
      estado: e.estado || "",
      notas: e.notas,
      createdAt: e.createdAt,
      createdBy: e.createdBy,
      origen: e.origen,
      central: e.central,
      molecula: e.molecula,
      cable: e.cable
    }
  }));
  return { type: "FeatureCollection", features };
}

function setTotal(el, n) {
  if (!el) return;
  el.textContent = n === 1 ? "1 evento" : `${n} eventos`;
}

function showPopup(map, props, lngLat) {
  const escape = (s) => (s == null ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  const fecha = props.createdAt ? new Date(props.createdAt).toLocaleString() : "—";
  const lineMol = props.molecula ? `<p><strong>Molécula:</strong> ${escape(props.molecula)}</p>` : "";
  const lineCentral = props.central ? `<p><strong>Central:</strong> ${escape(props.central)}</p>` : "";
  const lineCable = props.cable ? `<p><strong>Cable:</strong> ${escape(props.cable)}</p>` : "";
  const html = `
    <h3>${escape(props.tipo || "Evento")}</h3>
    <p><strong>Estado:</strong> ${escape(props.estado) || "—"}</p>
    ${lineMol}
    ${lineCentral}
    ${lineCable}
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Creado por:</strong> ${escape(props.createdBy) || "—"}</p>
    ${props.notas ? `<p><strong>Notas:</strong> ${escape(props.notas)}</p>` : ""}
    <p class="popup-origen">Origen: ${escape(props.origen)}</p>
  `;
  new mapboxgl.Popup({ closeButton: true })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);
}

function initMap() {
  if (!TOKEN) {
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("loading").innerHTML = "Configura MAPBOX_TOKEN en config.";
    return null;
  }

  mapboxgl.accessToken = TOKEN;
  const map = new mapboxgl.Map({
    container: "map",
    style: MAP_STYLE,
    center: MAP_CENTER,
    zoom: MAP_ZOOM
  });

  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  ["CRITICO", "PROVISIONAL", "RESUELTO", ""].forEach((e) => loadEventoIcon(map, e));

  map.on("load", () => {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      promoteId: "id"
    });
    map.addLayer({
      id: LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      layout: {
        "icon-image": [
          "match",
          ["get", "estado"],
          "CRITICO", "evento-critico",
          "PROVISIONAL", "evento-provisional",
          "RESUELTO", "evento-resuelto",
          "evento-default"
        ],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 15, 1.0, 20, 1.4],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-anchor": "bottom",
        "icon-pitch-alignment": "viewport"
      }
    });

    map.on("click", LAYER_ID, (e) => {
      const f = e.features && e.features[0];
      if (f && f.properties) {
        showPopup(map, f.properties, e.lngLat);
      }
    });
    map.getCanvas().style.cursor = "pointer";
    map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
  });

  return map;
}

async function applyFilter(map, fechaDesde, fechaHasta, origenFilter, totalEl, loadingEl) {
  if (loadingEl) loadingEl.classList.remove("hidden");
  try {
    const eventos = await fetchEventos(fechaDesde, fechaHasta, origenFilter);
    const geojson = toGeoJSON(eventos);
    setTotal(totalEl, eventos.length);
    if (map && map.getSource(SOURCE_ID)) {
      map.getSource(SOURCE_ID).setData(geojson);
    }
  } catch (err) {
    console.error("Error cargando eventos:", err);
    setTotal(totalEl, 0);
  } finally {
    if (loadingEl) loadingEl.classList.add("hidden");
  }
}

function setDefaultDates() {
  const hoy = new Date();
  const hace30 = new Date(hoy);
  hace30.setDate(hace30.getDate() - 30);
  const id = (d) => d.toISOString().slice(0, 10);
  const desde = document.getElementById("fechaDesde");
  const hasta = document.getElementById("fechaHasta");
  if (desde && !desde.value) desde.value = id(hace30);
  if (hasta && !hasta.value) hasta.value = id(hoy);
}

function getFiltroValues() {
  return {
    fechaDesde: document.getElementById("fechaDesde")?.value || "",
    fechaHasta: document.getElementById("fechaHasta")?.value || "",
    origen: (document.getElementById("filtroOrigen")?.value || "FTTH-Corporativo").trim()
  };
}

(async () => {
  const loadingEl = document.getElementById("loading");
  const totalEl = document.getElementById("totalEventos");
  loadingEl.classList.remove("hidden");
  setDefaultDates();

  const map = initMap();
  if (!map) return;

  function onFiltrar() {
    const v = getFiltroValues();
    applyFilter(map, v.fechaDesde, v.fechaHasta, v.origen, totalEl, loadingEl);
  }

  document.getElementById("btnFiltrar").addEventListener("click", onFiltrar);

  map.once("load", async () => {
    const v = getFiltroValues();
    await applyFilter(map, v.fechaDesde, v.fechaHasta, v.origen, totalEl, loadingEl);
  });
})();
