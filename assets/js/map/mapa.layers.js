/* =========================================================
   FlashFiber FTTH | mapa.layers.js
   Carga dinámica de capas GeoJSON FTTH (desde árbol children)
   + AutoZoom inteligente
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  const CONFIG = window.__FTTH_CONFIG__ || {};
  const log = window.__FTTH_LOG__;
  if (!App) {
    console.error("❌ App no disponible en mapa.layers.js");
    return;
  }

  const ROOT_INDEX = (typeof window !== "undefined" && window.__GEOJSON_INDEX__) || "/geojson/index.json";
  const CONSOLIDADO_PREGENERADO = (typeof window !== "undefined" && window.__GEOJSON_CONSOLIDADO__) ||
    (ROOT_INDEX.replace(/index\.json$/i, "consolidado-ftth.geojson"));
  let restoring = false;

  /** Obtiene un layer id del estilo para insertar capas de datos debajo de etiquetas (beforeId) */
  function getBeforeIdForDataLayers(map) {
    try {
      const style = map.getStyle();
      if (!style || !Array.isArray(style.layers)) return undefined;
      const labelLayer = style.layers.find(function (l) {
        return l.type === "symbol" && l.id && /label/i.test(l.id);
      });
      return labelLayer ? labelLayer.id : undefined;
    } catch (_) {
      return undefined;
    }
  }
  let loadingTree = false; // ✅ Bloqueo para evitar cargas duplicadas

  App.__ftthLayerIds = App.__ftthLayerIds || [];
  
  // 🎯 Sistema global de registro de iconos por capa
  const layerIconRegistry = new Map(); // layerId → { iconMap, CENTRAL_COLOR }
  
  // 🎯 Cache global de iconos de pins (color|label|size → Promise<Image>) para evitar regenerar
  const pinIconCache = new Map();
  const PIN_ICON_CACHE_MAX = 200; // Límite para no crecer sin control en sesiones largas
  const pinCacheKey = (color, label, size) => `${String(color)}|${String(label)}|${Number(size)}`;

  // 🎯 Handler global único para iconos faltantes (evita múltiples handlers)
  let globalImageMissingHandler = null;
  
  // Función para crear pin SVG (extraída para reutilización)
  function createCentralPinIconSVG(color, label = "", size = 50) {
    const pinHeight = size;
    const pinWidth = size * 0.6;
    const labelSize = label ? 12 : 0;
    
    const svg = `
      <svg width="${size}" height="${pinHeight + labelSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <ellipse cx="${size / 2}" cy="${pinHeight - 2}" rx="${pinWidth * 0.4}" ry="4" 
                 fill="#000" opacity="0.2" filter="url(#shadow)"/>
        
        <path d="M ${size / 2} 0 
                 L ${size / 2 - pinWidth / 2} ${pinHeight * 0.6}
                 Q ${size / 2 - pinWidth / 2} ${pinHeight * 0.85} ${size / 2} ${pinHeight * 0.9}
                 Q ${size / 2 + pinWidth / 2} ${pinHeight * 0.85} ${size / 2 + pinWidth / 2} ${pinHeight * 0.6}
                 Z" 
              fill="${color}" 
              stroke="#FFFFFF" 
              stroke-width="2"
              filter="url(#shadow)"/>
        
        ${label ? `
          <rect x="${size / 2 - pinWidth / 2}" y="${pinHeight}" 
                width="${pinWidth}" height="${labelSize + 4}" 
                rx="3" fill="#FFFFFF" stroke="${color}" stroke-width="1.5"
                filter="url(#shadow)"/>
          <text x="${size / 2}" y="${pinHeight + labelSize + 1}" 
                font-family="Arial, sans-serif" 
                font-size="${labelSize}" 
                font-weight="bold"
                fill="${color}"
                text-anchor="middle"
                dominant-baseline="middle">${label}</text>
        ` : ''}
      </svg>
    `;
    
    return svg;
  }
  
  // Función para crear pin directamente en Canvas (método más robusto y compatible)
  // Evita problemas de decodificación SVG en Mapbox. Usa cache para no regenerar el mismo icono.
  function createCentralPinIcon(color, label = "", size = 50) {
    const key = pinCacheKey(color, label, size);
    const cached = pinIconCache.get(key);
    if (cached) return cached;
    if (pinIconCache.size >= PIN_ICON_CACHE_MAX) {
      const firstKey = pinIconCache.keys().next().value;
      if (firstKey != null) pinIconCache.delete(firstKey);
    }
    const p = createCentralPinIconUncached(color, label, size).then(
      (img) => { return img; },
      (err) => { pinIconCache.delete(key); throw err; }
    );
    pinIconCache.set(key, p);
    return p;
  }

  function createCentralPinIconUncached(color, label = "", size = 50) {
    return new Promise((resolve, reject) => {
      try {
        const pinHeight = size;
        const pinWidth = size * 0.6;
        const labelSize = label ? 12 : 0;
        const totalHeight = pinHeight + labelSize;
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');
        
        // Configurar calidad de renderizado
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Dibujar sombra del pin (ellipse)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(size / 2, pinHeight - 2, pinWidth * 0.4, 4, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Dibujar cuerpo del pin (forma de gota estilo Google Maps)
        ctx.fillStyle = color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(size / 2, 0); // Punto superior
        ctx.lineTo(size / 2 - pinWidth / 2, pinHeight * 0.6); // Lado izquierdo
        ctx.quadraticCurveTo(
          size / 2 - pinWidth / 2, pinHeight * 0.85,
          size / 2, pinHeight * 0.9
        ); // Curva inferior izquierda
        ctx.quadraticCurveTo(
          size / 2 + pinWidth / 2, pinHeight * 0.85,
          size / 2 + pinWidth / 2, pinHeight * 0.6
        ); // Curva inferior derecha
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Dibujar etiqueta si existe
        if (label) {
          const labelY = pinHeight;
          const labelHeight = labelSize + 4;
          
          // Fondo de etiqueta (rectángulo redondeado)
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // Usar roundRect si está disponible, sino usar arcos manuales
          if (ctx.roundRect) {
            ctx.roundRect(
              size / 2 - pinWidth / 2,
              labelY,
              pinWidth,
              labelHeight,
              3
            );
          } else {
            // Fallback para navegadores antiguos
            const x = size / 2 - pinWidth / 2;
            const y = labelY;
            const w = pinWidth;
            const h = labelHeight;
            const r = 3;
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
          }
          ctx.fill();
          ctx.stroke();
          
          // Texto de etiqueta
          ctx.fillStyle = color;
          ctx.font = `bold ${labelSize}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            label,
            size / 2,
            labelY + labelHeight / 2
          );
        }
        
        // Convertir canvas a imagen PNG
        const img = new Image();
        img.onload = () => {
          resolve(img);
        };
        img.onerror = (err) => {
          reject(new Error(`Error creando imagen desde canvas: ${err}`));
        };
        img.src = canvas.toDataURL('image/png');
        
      } catch (err) {
        reject(new Error(`Error en createCentralPinIcon: ${err.message}`));
      }
    });
  }
  
  // Handler de iconos faltantes deshabilitado (generaba errores en estilo).
  function initGlobalImageMissingHandler() {
    return;
    
    /*
    if (globalImageMissingHandler) return; // Ya está inicializado
    
    const map = App.map;
    if (!map) return;
    
    globalImageMissingHandler = (e) => {
      if (!e?.id || !map || !map.isStyleLoaded()) return;
      
      // Buscar en todos los registros de capas
      for (const [layerId, registry] of layerIconRegistry.entries()) {
        if (e.id.startsWith(`${layerId}-pin-`)) {
          if (log) log("warn", "⚠️ Icono faltante detectado:", e.id, "(capa:", layerId, "), cargando bajo demanda...");
          
          // Extraer el nombre de la central del iconId
          const match = e.id.match(new RegExp(`${layerId}-pin-(.+)`));
          if (!match) continue;
          
          const safeName = match[1];
          const { iconMap, CENTRAL_COLOR } = registry;
          
          // Buscar el nombre original en el mapa de iconos
          let found = false;
          let centralName = null;
          
          for (const [name, storedIconId] of iconMap.entries()) {
            if (storedIconId === e.id) {
              found = true;
              centralName = name;
              break;
            }
          }
          
          // Si no se encontró, intentar reconstruir desde safeName
          if (!found) {
            centralName = safeName.replace(/_/g, " ");
          }
          
          if (centralName) {
            const label = centralName.length > 8 
              ? centralName.substring(0, 8).toUpperCase() 
              : centralName.toUpperCase();
            
            // Crear y cargar el icono desde SVG (el mapa ya está verificado)
            createCentralPinIcon(CENTRAL_COLOR, label, 50)
              .then((img) => {
                try {
                  // El mapa ya está verificado al inicio
                  // Verificar nuevamente antes de agregar
                  if (!map.hasImage(e.id)) {
                    map.addImage(e.id, img);
                    if (log) log("log", "✅ Icono cargado bajo demanda:", e.id, "para", centralName);
                    
                  // Forzar actualización de la capa si existe (sin bloquear)
                  try {
                    if (map.getLayer(layerId)) {
                      // Trigger refresh de la capa de forma asíncrona
                      setTimeout(() => {
                        try {
                          const source = map.getSource(layerId);
                          if (source && source._data && map.isStyleLoaded()) {
                            map.getSource(layerId).setData(source._data);
                          }
                        } catch (refreshError) {
                          // Ignorar errores de refresh - no crítico
                        }
                      }, 100);
                    }
                  } catch (layerError) {
                    // Ignorar errores de capa - no crítico
                  }
                  } else {
                    if (log) log("log", "ℹ️ Icono ya existe (cargado por otro proceso):", e.id);
                  }
                } catch (addError) {
                  // Silenciar errores de iconos faltantes (404, etc.) - se usarán pins generados
                  if (!addError.message?.includes('404') && !addError.message?.includes('Not Found')) {
                    console.debug(`ℹ️ No se pudo agregar icono ${e.id}, se usará pin generado`);
                  }
                }
              })
              .catch((error) => {
                // Silenciar errores 404 de iconos faltantes - se usarán pins generados automáticamente
                if (!error.message?.includes('404') && !error.message?.includes('Not Found') && !error.message?.includes('Could not load image')) {
                  console.debug(`ℹ️ Icono ${e.id} no disponible, se usará pin generado`);
                }
              });
          }
          
          break; // Solo procesar una vez
        }
      }
    };
    
    map.on("styleimagemissing", globalImageMissingHandler);
    if (log) log("log", "✅ Handler global de iconos faltantes inicializado");
    */
  }
  
  // Función para limpiar el handler global
  function cleanupGlobalImageMissingHandler() {
    const map = App.map;
    if (map && globalImageMissingHandler) {
      map.off("styleimagemissing", globalImageMissingHandler);
      globalImageMissingHandler = null;
      if (log) log("log", "🧹 Handler global de iconos faltantes limpiado");
    }
  }

  /* ===============================
     🎯 ZOOM A SANTA INÉS
  =============================== */
  function zoomToSantaInes() {
    const map = App.map;
    if (!map) return;
    
    // ❌ Verificar que el mapa esté completamente cargado y tenga dimensiones válidas
    if (!map.isStyleLoaded() || !map.loaded()) {
      // Esperar a que el mapa esté listo
      map.once('load', () => {
        setTimeout(() => zoomToSantaInes(), CONFIG.MAP_TIMING?.ZOOM_RETRY_MS ?? 100);
      });
      return;
    }
    
    // Verificar que el mapa tenga dimensiones válidas
    const container = map.getContainer();
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      if (log) log("warn", "⚠️ Mapa sin dimensiones válidas, omitiendo zoom");
      return;
    }

    // Coordenadas de la central Santa Inés: [-74.088195, 4.562537]
    // Límites del sector Santa Inés (área alrededor de la central)
    // ✅ Validar que las coordenadas sean números válidos
    const swLng = -74.12;
    const swLat = 4.54;
    const neLng = -74.05;
    const neLat = 4.59;
    
    // Verificar que las coordenadas sean válidas
    if (!Number.isFinite(swLng) || !Number.isFinite(swLat) || 
        !Number.isFinite(neLng) || !Number.isFinite(neLat)) {
      console.error("❌ Coordenadas inválidas para zoom a Santa Inés");
      return;
    }
    
    try {
      const santaInesBounds = new mapboxgl.LngLatBounds(
        [swLng, swLat],  // Suroeste (límite oeste y sur)
        [neLng, neLat]   // Noreste (límite este y norte)
      );

      // ✅ Validar que los bounds sean válidos antes de aplicar zoom
      const sw = santaInesBounds.getSouthWest();
      const ne = santaInesBounds.getNorthEast();
      
      if (!Number.isFinite(sw.lng) || !Number.isFinite(sw.lat) || 
          !Number.isFinite(ne.lng) || !Number.isFinite(ne.lat)) {
        console.error("❌ Coordenadas de límites de Santa Inés no válidas (NaN). Omitiendo zoom.");
        return;
      }

      // Verificar que el mapa esté listo antes de aplicar zoom
      if (!map.isStyleLoaded() || !map.loaded()) {
        console.debug("ℹ️ Mapa no completamente cargado para zoom a Santa Inés. Reintentando...");
        setTimeout(zoomToSantaInes, CONFIG.MAP_TIMING?.ZOOM_SANTA_INES_MS ?? 500);
        return;
      }

      // Aplicar zoom con padding para mejor visualización
      map.fitBounds(santaInesBounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1000,
        maxZoom: 15 // Zoom más cercano para ver el sector en detalle
      });
      if (log) log("log", "🎯 Zoom a Santa Inés aplicado");
    } catch (error) {
      // Silenciar errores de zoom si el mapa no está completamente listo
      if (error.message?.includes('Invalid LngLat') || error.message?.includes('NaN')) {
        console.debug("ℹ️ Zoom a Santa Inés omitido (mapa no completamente listo)");
      } else {
        console.error("❌ Error aplicando zoom a Santa Inés:", error);
      }
    }
  }

  /* ===============================
     🎯 ZOOM A BOGOTÁ (función alternativa)
  =============================== */
  function zoomToBogota() {
    const map = App.map;
    if (!map) return;

    // Límites geográficos de Bogotá (coordenadas aproximadas)
    const bogotaBounds = new mapboxgl.LngLatBounds(
      [-74.25, 4.50],  // Suroeste
      [-73.90, 4.80]   // Noreste
    );

    setTimeout(() => {
      map.fitBounds(bogotaBounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 1000,
        maxZoom: 13
      });
      if (log) log("log", "🎯 Zoom a Bogotá aplicado");
    }, 500);
  }

  /* ===============================
     🎯 AUTO ZOOM GEOJSON (deshabilitado - usar zoom a Bogotá)
  =============================== */
  function autoZoomToGeoJSON(geojson) {
    // Deshabilitado - usar zoomToBogota() en su lugar
    // Esta función se mantiene por compatibilidad pero no hace nada
    return;
  }

  /* ===============================
     Consolidar SOLO CABLES y CIERRES E1
  =============================== */
  async function consolidateAllGeoJSON() {
    try {
      if (log) log("log", "📦 Consolidando SOLO CABLES y CIERRES E1...");
      const allFeatures = [];
      const loadedUrls = new Set(); // ✅ Cache para evitar cargar el mismo archivo múltiples veces
      
      // Función recursiva para recopilar GeoJSON
      async function collectGeoJSON(node, basePath, currentPath = "") {
        if (!node) return;
        
        // Actualizar ruta actual
        const newPath = currentPath + (node.label ? "/" + node.label : "");
        
        // Si este nodo es una capa, cargar su GeoJSON
        if (node.type === "layer") {
          // ✅ SOLO incluir si es de cables o cierres
          // Verificar en la ruta completa (currentPath + newPath)
          const fullPath = (currentPath + newPath).toLowerCase();
          const pathIncludesCables = fullPath.includes("cables") || 
                                     fullPath.includes("/cables/") ||
                                     fullPath.includes("/cables");
          const pathIncludesCierres = fullPath.includes("cierres") || 
                                      fullPath.includes("/cierres/") ||
                                      fullPath.includes("/cierres");
          
          // Verificar también en el ID y label del nodo
          const nodeIdLower = (node.id || "").toLowerCase();
          const nodeLabelLower = (node.label || "").toLowerCase();
          const nodePathLower = (node.path || "").toLowerCase();
          
          const isCable = (pathIncludesCables || 
                          nodeIdLower.includes("cable") ||
                          nodeLabelLower.includes("cable") ||
                          nodePathLower.includes("cable")) &&
                         !fullPath.includes("corporativo");
          
          const isCierre = (pathIncludesCierres || 
                          nodeIdLower.includes("cierre") ||
                          nodeLabelLower.includes("cierre") ||
                          nodePathLower.includes("cierre")) &&
                         !fullPath.includes("corporativo");
          
          // Excluir explícitamente CORPORATIVO, eventos, rutas, mantenimientos
          const isExcluded = fullPath.includes("corporativo") ||
                            fullPath.includes("eventos") ||
                            fullPath.includes("rutas") ||
                            fullPath.includes("mantenimientos") ||
                            nodeIdLower.includes("corporativo") ||
                            nodeIdLower.includes("evento") ||
                            nodeIdLower.includes("ruta") ||
                            nodeIdLower.includes("mantenimiento") ||
                            nodeIdLower.includes("central") ||
                            nodeIdLower.includes("centrales");
          
          if (isExcluded || (!isCable && !isCierre)) {
            if (log) log("log", "⏭️ Omitiendo capa (solo cables y cierres):", node.id, "path:", fullPath);
            return;
          }
          
          if (log) log("log", "✅ Incluyendo capa:", node.id, "tipo:", isCable ? "CABLE" : "CIERRE", "path:", fullPath);
          
          try {
            // ✅ Normalizar URL para evitar duplicados
            let url = basePath + node.path;
            url = url.replace(/\/+/g, "/");
            if (!url.startsWith("/geojson/") && !url.startsWith("../geojson/")) {
              if (url.startsWith("geojson/")) {
                url = "/" + url;
              } else {
                url = "/geojson/" + url.replace(/^\.\.\/geojson\//, "").replace(/^\/?geojson\//, "");
              }
            }
            
            // ✅ Verificar si ya se cargó este archivo
            if (loadedUrls.has(url)) {
              if (log) log("log", "⏭️ Archivo ya cargado (cache):", url);
              return;
            }
            loadedUrls.add(url);
            
            const res = await fetch(url, { cache: "default" });
            if (!res.ok) {
              if (log) log("warn", "⚠️ No se pudo cargar:", url);
              return;
            }
            const geojson = await res.json();
            
            // Validar que tenga features
            if (geojson && geojson.features && geojson.features.length > 0) {
              // Si es cierre, incluir E1 y E0 (por corte)
              if (isCierre) {
                const cierreFeatures = geojson.features.filter(feature => {
                  const tipo = feature.properties?.tipo || 
                              feature.properties?.type ||
                              feature.properties?.name?.toUpperCase();
                  const name = (feature.properties?.name || "").toUpperCase();
                  const codigo = feature.properties?.codigo || "";
                  const isE1 = tipo === "E1" || tipo?.includes("E1") || codigo.includes("E1") || name.includes("E1");
                  const isE0 = tipo === "E0" || tipo?.includes("E0") || name.includes("E0 POR CORTE");
                  return isE1 || isE0;
                });
                
                if (cierreFeatures.length === 0) {
                  if (log) log("log", "⏭️ Omitiendo cierres (ninguno E1/E0):", node.id);
                  return;
                }
                
                // Agregar metadata de la capa a cada feature (y id único para promoteId / render)
                cierreFeatures.forEach((feature, idx) => {
                  if (!feature.properties) feature.properties = {};
                  feature.properties._layerId = node.id;
                  feature.properties._layerLabel = node.label;
                  feature.properties._layerType = node.typeLayer || "symbol";
                  const moleculaMatch = (node.id || "").match(/([A-Z]{2}\d+)/);
                  if (moleculaMatch) feature.properties._molecula = moleculaMatch[1];
                  feature.properties.__id = feature.properties.id != null ? String(feature.properties.id) : node.id + "-c-" + idx;
                });
                
                allFeatures.push(...cierreFeatures);
                if (log) log("log", "✅ Cierres (E1+E0):", cierreFeatures.length, "de", node.id, "de", geojson.features.length, "totales");
              } else {
                // Es cable, incluir todos los features (y _molecula para filtrar como en Corporativo)
                const moleculaMatch = (node.id || "").match(/([A-Z]{2}\d+)/);
                const _molecula = moleculaMatch ? moleculaMatch[1] : "";
                geojson.features.forEach((feature, idx) => {
                  if (!feature.properties) feature.properties = {};
                  feature.properties._layerId = node.id;
                  feature.properties._layerLabel = node.label;
                  feature.properties._layerType = node.typeLayer || "line";
                  if (_molecula) feature.properties._molecula = _molecula;
                  feature.properties.__id = node.id + "-l-" + idx;
                });
                
                allFeatures.push(...geojson.features);
                if (log) log("log", "✅ Features de cable:", geojson.features.length, node.id);
              }
            }
          } catch (err) {
            if (log) log("warn", "⚠️ Error cargando:", node.id, err);
          }
          return;
        }
        
        // Si tiene hijos, recorrerlos
        if (node.children?.length) {
          // ✅ OPTIMIZACIÓN: Cargar índices en paralelo
          const indexPromises = [];
          const layerPromises = [];
          
          for (const child of node.children) {
            if (child.type === "layer") {
              // Agregar a promesas de capas para procesar en paralelo
              layerPromises.push(collectGeoJSON(child, basePath, newPath));
            } else if (child.index) {
              // Agregar a promesas de índices para cargar en paralelo
              indexPromises.push(
                (async () => {
                  try {
                    const url = basePath + child.index;
                    const res = await fetch(url, { cache: "default" });
                    const json = await res.json();
                    const nextBase = basePath + child.index.replace("index.json", "");
                    const updatedPath = newPath + (json.label ? "/" + json.label : "");
                    await collectGeoJSON(json, nextBase, updatedPath);
                  } catch (err) {
                    if (log) log("warn", "⚠️ No se pudo cargar:", child.index);
                  }
                })()
              );
            }
          }
          
          // ✅ Ejecutar todas las promesas en paralelo
          await Promise.all([...layerPromises, ...indexPromises]);
        }
      }
      
      // Cargar árbol raíz y consolidar
      const res = await fetch(ROOT_INDEX, { cache: "default" });
      const root = await res.json();
      await collectGeoJSON(root, "/geojson/", "");

      // ✅ Estandar: MUZU como el resto de centrales — incorporar cables al consolidado (mismo formato que FTTH)
      try {
        const muzuRes = await fetch("/geojson/FTTH/MUZU/muzu.geojson", { cache: "default" });
        if (muzuRes.ok) {
          const muzuGeo = await muzuRes.json();
          if (muzuGeo.features && muzuGeo.features.length > 0) {
            let muzuCount = 0;
            muzuGeo.features.forEach((feature, idx) => {
              if (!feature.geometry || feature.geometry.type !== "LineString") return;
              const name = (feature.properties && feature.properties.name) ? String(feature.properties.name).trim() : "";
              if (!name) return;
              const moleculaMatch = name.match(/(MU\d+)/i);
              const _molecula = moleculaMatch ? moleculaMatch[1].toUpperCase() : "";
              if (!_molecula) return;
              if (!feature.properties) feature.properties = {};
              feature.properties._layerId = "FTTH_MUZU_" + _molecula + "_" + name;
              feature.properties._layerLabel = name;
              feature.properties._layerType = "line";
              feature.properties._molecula = _molecula;
              feature.properties.__id = "muzu-l-" + idx;
              allFeatures.push(feature);
              muzuCount++;
            });
            if (muzuCount > 0 && log) log("log", "✅ MUZU en consolidado:", muzuCount, "cables (mismo método que resto de centrales)");
          }
        }
      } catch (e) {
        if (log) log("warn", "⚠️ MUZU no incorporado al consolidado:", e.message || e);
      }
      
      // Crear FeatureCollection consolidado
      const consolidated = {
        type: "FeatureCollection",
        features: allFeatures
      };
      
      if (log) log("log", "✅ GeoJSON consolidado:", allFeatures.length, "features (SOLO CABLES y CIERRES E1)");
      return consolidated;
    } catch (err) {
      console.error("❌ Error consolidando GeoJSON", err);
      return { type: "FeatureCollection", features: [] };
    }
  }

  /* ===============================
     Cargar GeoJSON consolidado en mapa base
  =============================== */
  async function loadConsolidatedGeoJSONToBaseMap() {
    const map = App?.map;
    if (!map) {
      if (log) log("warn", "⚠️ Mapa no disponible para cargar GeoJSON consolidado");
      return;
    }
    
    // ✅ Esperar a que el estilo esté completamente cargado
    if (!map.isStyleLoaded()) {
      if (log) log("log", "⏳ Esperando a que el estilo del mapa se cargue...");
      let done = false;
      const retry = () => {
        if (done) return;
        done = true;
        setTimeout(() => loadConsolidatedGeoJSONToBaseMap(), CONFIG.MAP_TIMING?.RETRY_LOAD_MS ?? 100);
      };
      map.once("load", retry);
      map.once("style.load", retry);
      return;
    }
    
    try {
      let consolidated = null;
      try {
        const res = await fetch(CONSOLIDADO_PREGENERADO, { cache: "default" });
        if (res.ok) {
          const pre = await res.json();
          if (pre && pre.type === "FeatureCollection" && Array.isArray(pre.features) && pre.features.length > 0) {
            consolidated = pre;
            if (log) log("log", "✅ Consolidado cargado desde archivo pre-generado:", pre.features.length, "features");
          }
        }
      } catch (_) { /* fallback a consolidar en runtime */ }
      if (!consolidated) {
        consolidated = await consolidateAllGeoJSON();
      }
      if (!consolidated.features || consolidated.features.length === 0) {
        if (log) log("warn", "⚠️ No hay features para cargar en mapa base");
        return;
      }

      // ✅ Simplificar geometrías cuando hay muchos features (mejor rendimiento; requiere Turf cargado en la página)
      const simplifyThreshold = CONFIG.RENDER_SIMPLIFY_WHEN_FEATURES_ABOVE;
      if (typeof simplifyThreshold === "number" && consolidated.features.length >= simplifyThreshold &&
          typeof window !== "undefined" && window.turf && typeof window.turf.simplify === "function") {
        try {
          const tol = CONFIG.RENDER_SIMPLIFY_TOLERANCE ?? 0.00005;
          consolidated = window.turf.simplify(consolidated, { tolerance: tol });
          if (log) log("log", "✅ Consolidado simplificado (tolerance " + tol + ") para mejor rendimiento:", consolidated.features.length, "features");
        } catch (e) {
          if (log) log("warn", "⚠️ Simplificación consolidado fallida:", e && e.message ? e.message : "");
        }
      }

      // ✅ Recomprobar estilo tras los await (evita "Style is not done loading")
      if (!map.isStyleLoaded()) {
        if (log) log("log", "⏳ Estilo dejó de estar listo tras cargar datos, esperando style.load...");
        const retry = () => setTimeout(() => loadConsolidatedGeoJSONToBaseMap(), CONFIG.MAP_TIMING?.RETRY_LOAD_MS ?? 100);
        map.once("load", retry);
        map.once("style.load", retry);
        return;
      }
      
      // ✅ Precalcular una sola vez (evita getStyle/filter en cada frame)
      const lineFeatures = consolidated.features.filter(f =>
        f.geometry && f.geometry.type === "LineString"
      );
      const pointFeatures = consolidated.features.filter(f =>
        f.geometry && f.geometry.type === "Point"
      );
      const polygonFeatures = consolidated.features.filter(f =>
        f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
      );
      const beforeId = getBeforeIdForDataLayers(map);
      const srcId = CONFIG.LAYERS?.GEOJSON_CONSOLIDADO_SOURCE || "geojson-consolidado";
      const linesId = CONFIG.LAYERS?.GEOJSON_LINES || "geojson-lines";
      const pointsId = CONFIG.LAYERS?.GEOJSON_POINTS || "geojson-points";
      const polygonsId = CONFIG.LAYERS?.GEOJSON_POLYGONS || "geojson-polygons";
      const polygonsOutlineId = CONFIG.LAYERS?.GEOJSON_POLYGONS_OUTLINE || "geojson-polygons-outline";

      let applied = false;
      const runWhenIdle = (fn) => {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(fn, { timeout: 300 });
        } else {
          setTimeout(fn, 0);
        }
      };

      const phase3AfterLayers = () => {
        if (log) log("log", "✅ GeoJSON consolidado cargado en mapa base:", consolidated.features.length, "features totales");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ftth-consolidated-layers-ready"));
        }
        runWhenIdle(() => {
          setTimeout(enforceOnlyCentralesVisible, CONFIG.MAP_TIMING?.ENFORCE_VISIBILITY_MS ?? 150);
        });
      };

      const phase2AddLayers = () => {
        if (applied) return;
        try {
          if (lineFeatures.length > 0 && !map.getLayer(linesId)) {
            map.addLayer({
              id: linesId,
              type: "line",
              source: srcId,
              filter: ["==", ["geometry-type"], "LineString"],
              layout: { visibility: "none" },
              paint: { "line-color": "#000099", "line-width": 4, "line-opacity": 0.8 }
            }, beforeId);
            if (!App.__ftthLayerIds) App.__ftthLayerIds = [];
            if (!App.__ftthLayerIds.includes(linesId)) App.__ftthLayerIds.push(linesId);
          }
          if (pointFeatures.length > 0 && !map.getLayer(pointsId)) {
            map.addLayer({
              id: pointsId,
              type: "circle",
              source: srcId,
              filter: ["==", ["geometry-type"], "Point"],
              layout: { visibility: "none" },
              paint: {
                "circle-radius": 6,
                "circle-color": ["match", ["get", "tipo"], "E2", "#FF8C00", "#9E9E9E"],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#000",
                "circle-opacity": 0.9
              }
            }, beforeId);
            if (!App.__ftthLayerIds.includes(pointsId)) App.__ftthLayerIds.push(pointsId);
          }
          if (polygonFeatures.length > 0 && !map.getLayer(polygonsId)) {
            map.addLayer({
              id: polygonsId,
              type: "fill",
              source: srcId,
              filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
              layout: { visibility: "none" },
              paint: { "fill-color": "#00e5ff", "fill-opacity": 0.3 }
            }, beforeId);
            if (!App.__ftthLayerIds.includes(polygonsId)) App.__ftthLayerIds.push(polygonsId);
            map.addLayer({
              id: polygonsOutlineId,
              type: "line",
              source: srcId,
              filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
              layout: { visibility: "none" },
              paint: { "line-color": "#00e5ff", "line-width": 2 }
            }, beforeId);
            if (!App.__ftthLayerIds.includes(polygonsOutlineId)) App.__ftthLayerIds.push(polygonsOutlineId);
          }
          applied = true;
          phase3AfterLayers();
        } catch (e) {
          const msg = (e && e.message) ? String(e.message) : "";
          if (/style is not done loading/i.test(msg)) {
            map.once("style.load", () => setTimeout(() => loadConsolidatedGeoJSONToBaseMap(), CONFIG.MAP_TIMING?.RETRY_AFTER_STYLE_MS ?? 50));
            return;
          }
          throw e;
        }
      };

      const phase1SourceOnly = () => {
        if (applied) return;
        try {
          if (!map.isStyleLoaded()) {
            if (log) log("log", "⏳ Estilo no listo en idle, reintentando...");
            map.once("style.load", () => setTimeout(() => loadConsolidatedGeoJSONToBaseMap(), CONFIG.MAP_TIMING?.RETRY_AFTER_STYLE_MS ?? 50));
            return;
          }
          if (map.getSource(srcId)) {
            if (log) log("log", "🔄 Actualizando GeoJSON consolidado existente");
            map.getSource(srcId).setData(consolidated);
          } else {
            map.addSource(srcId, {
              type: "geojson",
              data: consolidated,
              promoteId: "__id"
            });
            if (log) log("log", "✅ Source consolidado creado");
          }
          // ✅ Repartir: addLayer en el siguiente frame para no bloquear el paint
          requestAnimationFrame(phase2AddLayers);
        } catch (e) {
          const msg = (e && e.message) ? String(e.message) : "";
          if (/style is not done loading/i.test(msg)) {
            map.once("style.load", () => setTimeout(() => loadConsolidatedGeoJSONToBaseMap(), CONFIG.MAP_TIMING?.RETRY_AFTER_STYLE_MS ?? 50));
            return;
          }
          throw e;
        }
      };

      const defer = CONFIG.RENDER_DEFER_SETDATA_FRAME !== false;
      const scheduleApply = () => {
        if (applied) return;
        if (defer) {
          requestAnimationFrame(phase1SourceOnly);
        } else {
          phase1SourceOnly();
        }
      };
      map.once("idle", scheduleApply);
      setTimeout(() => { if (!applied && map.isStyleLoaded()) scheduleApply(); }, CONFIG.MAP_TIMING?.APPLY_FALLBACK_MS ?? 400);
      setTimeout(() => { if (!applied && map.isStyleLoaded()) scheduleApply(); }, CONFIG.MAP_TIMING?.APPLY_FALLBACK2_MS ?? 1200);
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : "";
      if (/style is not done loading/i.test(msg)) {
        if (log) log("log", "⏳ Style no listo al añadir source/layer, reintentando tras style.load...");
        const retry = () => setTimeout(() => loadConsolidatedGeoJSONToBaseMap(), CONFIG.MAP_TIMING?.RETRY_LOAD_MS ?? 100);
        if (map) {
          map.once("load", retry);
          map.once("style.load", retry);
        }
        return;
      }
      console.error("❌ Error cargando GeoJSON consolidado en mapa base:", err);
    }
  }

  /* ===============================
     Cargar árbol raíz
  =============================== */
  async function loadFTTHTree() {
    // ✅ GIS FTTH: misma estructura que Corporativo = una sola capa consolidada (geojson-lines); no crear N capas
    if (!window.__GEOJSON_INDEX__) {
      if (log) log("log", "📂 FTTH: uso de capa única consolidada (geojson-lines), omitiendo carga de árbol de capas");
      return;
    }
    // ✅ Evitar cargas duplicadas simultáneas
    if (loadingTree) {
      if (log) log("log", "⚠️ loadFTTHTree ya está en ejecución, omitiendo llamada duplicada");
      return;
    }
    
    loadingTree = true;
    try {
      if (log) log("log", "📂 Cargando árbol FTTH...");
      const res = await fetch(ROOT_INDEX, { cache: "default" });
      const root = await res.json();

      await walkNode(root, "/geojson/");

      if (log) log("log", "🌳 Árbol FTTH procesado");
      // Forzar que solo centrales queden visibles tras cargar capas
      setTimeout(enforceOnlyCentralesVisible, CONFIG.MAP_TIMING?.ENFORCE_VISIBILITY_MS ?? 150);
    } catch (err) {
      console.error("❌ Error cargando árbol FTTH", err);
    } finally {
      loadingTree = false; // ✅ Liberar bloqueo
    }
  }

  /* ===============================
     Recorrer nodos recursivamente
  =============================== */
  async function walkNode(node, basePath) {
    if (!node) return;

    // 🟢 Si ESTE nodo es una capa
    if (node.type === "layer") {
      await createLayer(node, basePath);
      return;
    }

    // 🟢 Si tiene hijos → recorrerlos
    if (node.children?.length) {
      for (const child of node.children) {
        // ✅ PERMITIR todas las carpetas, incluyendo cables
        // Los cables están en el consolidado pero también permitimos control individual
        if (child.index) {
          // No omitir ninguna carpeta - permitir carga de todas las capas
        }

        // 👉 CASO 1: hijo es capa directa
        if (child.type === "layer") {
          await createLayer(child, basePath);
          continue;
        }

        // 👉 CASO 2: hijo es carpeta con index.json
        if (child.index) {
          try {
            const url = basePath + child.index;
            const res = await fetch(url, { cache: "default" });
            const json = await res.json();

            const nextBase =
              basePath + child.index.replace("index.json", "");

            await walkNode(json, nextBase);

          } catch (err) {
            if (log) log("warn", "⚠️ No se pudo cargar:", child.index);
          }
        }
      }
    }
  }

  /* ===============================
     Crear capa Mapbox
     SOLUCIÓN SIMPLIFICADA: Confiar en eventos del mapa
  =============================== */
  async function createLayer(layer, basePath) {
    // Verificación simple - el mapa debe estar disponible porque solo se llama desde eventos
    const map = App.map;
    if (!map) {
      console.error(`❌ Mapa no disponible para: ${layer.id}`);
      return;
    }

    const id  = layer.id;
    
    // ✅ OMITIR centrales - se cargan de forma fija e independiente
    const centralesLayerId = CONFIG.LAYERS?.CENTRALES || "CORPORATIVO_CENTRALES_ETB";
    if (id === centralesLayerId ||
        id?.toLowerCase().includes("centrales") && id?.toLowerCase().includes("corporativo")) {
      if (log) log("log", "ℹ️ Centrales se cargan de forma fija, omitiendo carga desde árbol");
      return;
    }
    // ✅ Construir URL correcta - normalizar rutas para que funcionen en dominio
    let url = basePath + layer.path;
    
    // Normalizar la ruta: eliminar dobles barras
    url = url.replace(/\/+/g, "/");
    
    // Asegurar URL absoluta o relativa correcta (móvil: /geojson/ evita fallos por base)
    if (url.startsWith("/geojson/") || url.startsWith("../geojson/")) {
      // Ya está bien formada
    } else if (url.startsWith("geojson/")) {
      url = "/" + url;
    } else {
      url = "/geojson/" + url.replace(/^\/?geojson\//, "").replace(/^\.\.\/geojson\//, "");
    }
    
    // ✅ PERMITIR cargar todas las capas individuales (cables, cierres, eventos)
    // Esto permite control granular desde el árbol de capas
    
    if (log) log("log", "🔍 Creando capa:", id, "URL:", url, "basePath:", basePath, "path:", layer.path);

    // ✅ Verificar si el source o la layer ya existen (evitar duplicados)
    if (map.getSource(id)) {
      if (log) log("log", "⚠️ Source ya existe, omitiendo creación:", id);
      // Si el source existe pero la layer no, crear la layer
      if (!map.getLayer(id)) {
        if (log) log("log", "⚠️ Source existe pero layer no, creando layer:", id);
        // Continuar para crear la layer
      } else {
        return; // Ambos existen, omitir completamente
      }
    }
    
    // ✅ Verificar si la layer ya existe
    if (map.getLayer(id)) {
      if (log) log("log", "⚠️ Layer ya existe, omitiendo:", id);
      return;
    }

    try {
      if (log) log("log", "📥 Fetching GeoJSON desde:", url);
      const res = await fetch(url, { cache: "default" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const geojson = await res.json();
      if (log) log("log", "✅ GeoJSON cargado:", geojson.features?.length || 0, "features");

      // ✅ Validar que el GeoJSON tenga datos
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        if (log) log("warn", "⚠️ GeoJSON vacío, omitiendo:", id);
        return;
      }

      // ✅ Validar estructura GeoJSON
      if (geojson.type !== "FeatureCollection") {
        if (log) log("warn", "⚠️ GeoJSON inválido (no es FeatureCollection):", id);
        return;
      }

      const layerType = layer.typeLayer || "line";
      
      // 🎨 Configuración específica para capas de tipo "symbol" (puntos con iconos)
      // IMPORTANTE: Cargar iconos ANTES de crear el source y la capa
      if (layerType === "symbol") {
        // Color para centrales ETB (azul corporativo)
        const CENTRAL_COLOR = "#2196F3"; // Azul Material Design
        
        // Generar pins únicos por central (usando nombre como identificador)
        const centralNames = new Set();
        geojson.features.forEach(f => {
          if (f.properties?.name) {
            // Normalizar nombre: trim y guardar original
            const normalizedName = f.properties.name.trim();
            centralNames.add(normalizedName);
          }
        });
        if (log) log("log", "📋 Centrales encontradas:", Array.from(centralNames).join(", "));

        const iconMap = new Map(); // nombre central → ID de icono
        const customIconIds = new Set();
        const generatedPinIds = new Set(); // pins generados (Canvas). Iconos personalizados (404) deshabilitados.

        layerIconRegistry.set(id, {
          iconMap,
          CENTRAL_COLOR
        });
        
        // Generar pins SVG para cada central
        if (log) log("log", "📌 Generando pins para", centralNames.size, "centrales únicas");
        const iconPromises = [];
        
        for (const centralName of centralNames) {
          const safeName = centralName.replace(/[^a-zA-Z0-9]/g, "_");
          const iconId = `${id}-pin-${safeName}`;
          
          // Mapear nombre de central a ID de icono (hacerlo ANTES de cargar)
          iconMap.set(centralName, iconId);
          generatedPinIds.add(iconId); // Registrar como pin generado
          
          if (!map.hasImage(iconId)) {
            // Usar nombre completo de la central (o abreviado si es muy largo)
            const label = centralName.length > 8 
              ? centralName.substring(0, 8).toUpperCase() 
              : centralName.toUpperCase();
            
            // Cargar icono de forma asíncrona usando la nueva función
            const iconPromise = createCentralPinIcon(CENTRAL_COLOR, label, 50)
              .then((img) => {
                // Agregar imagen al mapa (el mapa ya está verificado)
                if (!map.hasImage(iconId)) {
                  try {
                    map.addImage(iconId, img);
                    if (log) log("log", "✅ Pin agregado:", iconId, "para", centralName);
                  } catch (addError) {
                    console.error(`❌ Error agregando imagen ${iconId}:`, addError);
                    throw addError;
                  }
                } else {
                  if (log) log("log", "ℹ️ Pin ya existe:", iconId);
                }
                
                return true;
              })
              .catch((error) => {
                console.error(`❌ Error cargando pin para ${centralName}:`, error);
                throw error;
              });
            
            iconPromises.push(iconPromise);
          } else {
            if (log) log("log", "ℹ️ Pin ya existe en mapa:", iconId);
          }
        }
        
        // SOLUCIÓN RADICAL: No bloquear la creación de capa esperando iconos
        // Los iconos se cargarán bajo demanda cuando el mapa los necesite
        // Usar Promise.race con timeout para no esperar indefinidamente
        try {
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, CONFIG.MAP_TIMING?.ICON_LOAD_TIMEOUT_MS ?? 2000));
          const loadPromise = Promise.allSettled(iconPromises);
          
          await Promise.race([loadPromise, timeoutPromise]);
          
          // Reportar resultados sin bloquear
          const results = await loadPromise.catch(() => []);
          const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
          const failed = results.filter(r => r.status === 'rejected').length;
          if (log) log("log", "✅ Iconos:", successful, "cargados,", failed, "fallidos de", iconPromises.length, "totales");
          
          // NO VERIFICAR iconos faltantes - confiar en el handler de styleimagemissing
          // El handler global cargará los iconos bajo demanda cuando el mapa los necesite
          if (log) log("log", "ℹ️ Los iconos faltantes se cargarán automáticamente cuando el mapa los necesite");
          
        } catch (err) {
          // Silenciar advertencias de iconos faltantes - se usarán pins generados automáticamente
          console.debug(`ℹ️ Algunos iconos personalizados no están disponibles, se usarán pins generados`);
        }
        
        // NO BLOQUEAR - Continuar inmediatamente con la creación de la capa
        // El mapa ya está verificado al inicio de la función

        // Actualizar propiedades de features para usar IDs de iconos
        // SOLUCIÓN RADICAL: NO VERIFICAR si existen - confiar 100% en el handler de styleimagemissing
        let featuresWithIcons = 0;
        geojson.features.forEach(f => {
          const name = f.properties?.name;
          if (name) {
            // Normalizar nombre igual que al crear el icono
            const normalizedName = name.trim();
            
            // Buscar el icono en el mapa o construir el ID
            let iconId = null;
            if (iconMap.has(normalizedName)) {
              iconId = iconMap.get(normalizedName);
            } else {
              // Construir el iconId directamente
              const safeName = normalizedName.replace(/[^a-zA-Z0-9]/g, "_");
              iconId = `${id}-pin-${safeName}`;
            }
            
            // SIEMPRE asignar el iconId - el handler global lo cargará automáticamente si falta
            f.properties.iconId = iconId;
            featuresWithIcons++;
          } else if (f.properties?.icon) {
            // Icono personalizado
            if (iconMap.has(f.properties.icon)) {
              f.properties.iconId = iconMap.get(f.properties.icon);
            } else {
              // Construir ID para icono personalizado
              const iconId = `icon-${id}-${f.properties.icon.replace(/[^a-zA-Z0-9]/g, "_")}`;
              f.properties.iconId = iconId;
            }
            featuresWithIcons++;
          }
        });
        if (log) log("log", "✅ Features con iconId:", featuresWithIcons, "de", geojson.features.length, "(carga bajo demanda activa)");
        
        // Crear source DESPUÉS de cargar todos los iconos y asignar iconId
        if (log) log("log", "📦 Creando source para", id, "con", geojson.features.length, "features");
        if (!map.isStyleLoaded()) {
          if (log) log("log", "⏳ Estilo no listo en createLayer (symbol), reintentando en style.load...");
          map.once("style.load", () => createLayer(layer, basePath));
          return;
        }
        try {
          if (map.getSource(id)) {
            if (log) log("log", "⚠️ Source ya existe, omitiendo creación:", id);
          } else {
            map.addSource(id, {
              type: "geojson",
              data: geojson,
              promoteId: "name"
            });
            if (log) log("log", "✅ Source creado con datos actualizados:", id);
          }
        } catch (sourceError) {
          const sm = (sourceError && sourceError.message) ? String(sourceError.message) : "";
          if (/style is not done loading/i.test(sm)) {
            map.once("style.load", () => createLayer(layer, basePath));
            return;
          }
          console.error(`❌ Error creando source ${id}:`, sourceError);
          if (!sm.includes('already exists')) return;
        }
        
        // Verificar que los iconId están en las features
        const sampleFeature = geojson.features[0];
        if (sampleFeature?.properties?.iconId) {
          if (log) log("log", "✅ Verificación: Feature de ejemplo tiene iconId:", sampleFeature.properties.iconId);
        } else {
          console.error(`❌ ERROR: Feature de ejemplo NO tiene iconId`);
          if (log) log("log", "   Propiedades disponibles:", Object.keys(sampleFeature?.properties || {}));
        }

        // Configurar layout para símbolos SOLO CON TEXTO (sin iconos)
        // ✅ Solo centrales visibles por defecto; el resto solo desde árbol de capas o buscador
        const isCableLayer = id?.toLowerCase().includes("cable") || 
                            basePath?.toLowerCase().includes("cables");
        const isCentral = id?.toLowerCase().includes("central") || 
                         id?.toLowerCase().includes("corporativo");
        const initialVisibility = isCentral ? "visible" : "none";
        
        const layerConfig = {
          id,
          type: layerType,
          source: id,
          layout: {
            visibility: initialVisibility, // ✅ Cables ocultos por defecto, otros visibles
            ...(layer.layout || {}),
            // SOLO TEXTO - Sin iconos
            "text-field": ["get", "name"],
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-size": [
              "coalesce",
              ["*", ["get", "label-scale"], 14],
              14
            ],
            "text-offset": [0, 0], // Centrado en el punto (sin offset porque no hay icono)
            "text-anchor": "center",
            "text-allow-overlap": true,
            "text-ignore-placement": true
          },
          paint: {
            "text-color": "#FF0000", // Color rojo para el texto
            "text-opacity": [
              "coalesce",
              ["get", "label-opacity"],
              1
            ],
            // Halo (borde) para mejor legibilidad
            "text-halo-color": "#FFFFFF",
            "text-halo-width": 2,
            "text-halo-blur": 1
          }
        };

        try {
          if (!map.isStyleLoaded()) {
            map.once("style.load", () => createLayer(layer, basePath));
            return;
          }
          if (map.getLayer(id)) {
            if (log) log("log", "⚠️ Capa ya existe, omitiendo:", id);
          } else {
            map.addLayer(layerConfig, getBeforeIdForDataLayers(map));
            if (log) log("log", "✅ Capa symbol agregada:", id, "con", geojson.features.length, "features");
          }
          if (map.getLayer(id)) {
            const visibility = map.getLayoutProperty(id, "visibility");
            const textFieldExpr = map.getLayoutProperty(id, "text-field");
            const textColor = map.getPaintProperty(id, "text-color");
            if (log) log("log", "✅ Verificación: Capa existe, visibilidad:", id, visibility);
            if (log) log("log", "   Expresión text-field:", JSON.stringify(textFieldExpr));
            if (log) log("log", "   Color del texto:", textColor);
            
            // Verificar que el source tiene datos
            const source = map.getSource(id);
            if (source && source._data) {
              const sourceFeatures = source._data.features || [];
              const featuresWithName = sourceFeatures.filter(f => f.properties?.name);
              if (log) log("log", "   Source tiene", sourceFeatures.length, "features,", featuresWithName.length, "con nombre");
              if (featuresWithName.length > 0) {
                if (log) log("log", "   Ejemplo nombre:", featuresWithName[0].properties.name);
              }
            }
          } else {
            console.error(`❌ ERROR: Capa ${id} NO se creó correctamente`);
          }
        } catch (layerError) {
          const lm = (layerError && layerError.message) ? String(layerError.message) : "";
          if (/style is not done loading/i.test(lm)) {
            map.once("style.load", () => createLayer(layer, basePath));
            return;
          }
          console.error(`❌ Error agregando capa ${id}:`, layerError);
          layerIconRegistry.delete(id);
        }
      } else {
        if (!map.isStyleLoaded()) {
          map.once("style.load", () => createLayer(layer, basePath));
          return;
        }
        if (!map.getSource(id)) {
          try {
            map.addSource(id, {
              type: "geojson",
              data: geojson,
              promoteId: "name"
            });
          } catch (sourceErr) {
            const em = (sourceErr && sourceErr.message) ? String(sourceErr.message) : "";
            if (/style is not done loading/i.test(em)) {
              map.once("style.load", () => createLayer(layer, basePath));
              return;
            }
            throw sourceErr;
          }
        } else {
          if (log) log("log", "⚠️ Source ya existe al intentar agregar, usando existente:", id);
          // Actualizar datos del source existente
          const source = map.getSource(id);
          if (source && source.setData) {
            source.setData(geojson);
          }
        }

        // ✅ Solo centrales visibles por defecto; el resto solo desde árbol de capas o buscador
        const isCableLayer = id?.toLowerCase().includes("cable") || 
                            basePath?.toLowerCase().includes("cables");
        const isCentral = id?.toLowerCase().includes("central") || 
                         id?.toLowerCase().includes("corporativo");
        const isCorporativoCables = (typeof window !== "undefined" && window.__GEOJSON_INDEX__) && id === "CABLES_KML";
        // GIS Corporativo: un solo cable a la vez; por defecto ninguno visible (filter imposible)
        const initialVisibility = isCentral ? "visible" : "none";
        
        const layerConfig = {
          id,
          type: layerType,
          source: id,
          layout: {
            visibility: isCorporativoCables ? "visible" : initialVisibility
          },
          paint: layer.paint || {
            "line-color": "#000099",
            "line-width": 4
          }
        };
        if (isCorporativoCables) {
          layerConfig.filter = ["==", ["get", "name"], "__none__"];
        }

        if (!map.getLayer(id)) {
          try {
            map.addLayer(layerConfig, getBeforeIdForDataLayers(map));
          } catch (layerErr) {
            const em = (layerErr && layerErr.message) ? String(layerErr.message) : "";
            if (/style is not done loading/i.test(em)) {
              map.once("style.load", () => createLayer(layer, basePath));
              return;
            }
            throw layerErr;
          }
        } else {
          if (log) log("log", "⚠️ Layer ya existe, omitiendo agregar:", id);
        }
      }
      
      // ✅ Solo agregar a la lista si no está ya registrado
      if (!App.__ftthLayerIds.includes(id)) {
        App.__ftthLayerIds.push(id);
      }

      const visibility = map.getLayoutProperty(id, "visibility");
      if (log) log("log", "✅ Capa cargada:", id, "(" + geojson.features.length + " features, tipo:", layerType, "visibilidad:", visibility + ")");

      // 🎯 Zoom a Santa Inés después de cargar la primera capa importante
      // Solo hacer zoom una vez cuando se carga la capa de centrales
      const centralesId = CONFIG.LAYERS?.CENTRALES || "CORPORATIVO_CENTRALES_ETB";
      if (id === centralesId && geojson.features.length > 0) {
        zoomToSantaInes();
      }
      
      // 🎯 Zoom a Santa Inés cuando se cargan capas de Santa Inés
      if (id.includes("SANTA_INES") || id.includes("FTTH_SANTA_INES")) {
        zoomToSantaInes();
      }

    } catch (err) {
      console.error("❌ Error creando capa:", id, err);
    }
  }

  /* ===============================
     Forzar solo centrales visibles (evitar que capas se activen sin selección)
  =============================== */
  /**
   * Fuerza la visibilidad de capas según el estado de los filtros del sidebar: solo centrales
   * visibles si el checkbox lo permite; cierres y eventos ocultos salvo que estén explícitamente
   * activados. Usa CONFIG.LAYERS para IDs de capas de cierres y eventos.
   */
  function enforceOnlyCentralesVisible() {
    const map = App?.map;
    if (!map || !map.isStyleLoaded()) return;
    const ids = App.__ftthLayerIds || [];
    let enforced = 0;
    const isCorporativo = !!window.__GEOJSON_INDEX__;
    const filterCentrales = typeof document !== "undefined" ? document.getElementById("filterCentrales") : null;
    const centralesVisible = !filterCentrales || filterCentrales.checked;
    const pinsLayerIds = [CONFIG.LAYERS?.CIERRES, CONFIG.LAYERS?.EVENTOS].filter(Boolean);
    if (pinsLayerIds.length === 0) pinsLayerIds.push(CONFIG.LAYERS?.CIERRES || "cierres-layer", CONFIG.LAYERS?.EVENTOS || "eventos-layer");
    const hasMoleculaSelected = App._selectedMoleculaForPins != null && String(App._selectedMoleculaForPins).trim() !== "";
    pinsLayerIds.forEach(layerId => {
      if (isCorporativo && (layerId === "eventos-layer" || layerId === (CONFIG.LAYERS?.EVENTOS))) return;
      if (hasMoleculaSelected) return;
      if (map.getLayer(layerId)) {
        try {
          map.setLayoutProperty(layerId, "visibility", "none");
          enforced++;
        } catch (e) {
          if (CONFIG?.DEBUG && log) log("warn", "enforceOnlyCentralesVisible pins", e?.message);
        }
      }
    });
    const cablesExplicitlyVisible = !!App.__cablesExplicitlyVisible;
    ids.forEach(id => {
      if (!id || !map.getLayer(id)) return;
      const isCentral = id.includes("CENTRALES") || id.includes("CORPORATIVO");
      if (isCentral) {
        const current = map.getLayoutProperty(id, "visibility");
        const want = centralesVisible ? "visible" : "none";
        if (current !== want) {
          try { map.setLayoutProperty(id, "visibility", want); enforced++; } catch (e) { if (CONFIG?.DEBUG && log) log("warn", "setLayoutProperty", id, e?.message); }
        }
        return;
      }
      if (cablesExplicitlyVisible && (id === (CONFIG.LAYERS?.GEOJSON_LINES || "geojson-lines") || id === (CONFIG.LAYERS?.GEOJSON_POINTS || "geojson-points"))) return;
      // ftth-cables (FTTH_COMPLETO) siempre oculto cuando no es la fuente activa: evita que persista CO36 u otro cable
      if (id === "ftth-cables" || id === "ftth-puntos") {
        try { map.setLayoutProperty(id, "visibility", "none"); enforced++; } catch (e) { if (CONFIG?.DEBUG && log) log("warn", "setLayoutProperty none", id, e?.message); }
        return;
      }
      const current = map.getLayoutProperty(id, "visibility");
      if (current !== "none") {
        try { map.setLayoutProperty(id, "visibility", "none"); enforced++; } catch (e) { if (CONFIG?.DEBUG && log) log("warn", "setLayoutProperty none", id, e?.message); }
        // Sincronizar árbol: desmarcar checkbox para que CO36 u otra capa no quede "activa" en la UI
        try {
          const tree = typeof document !== "undefined" && document.getElementById("layersTree");
          if (tree) {
            const cb = tree.querySelector('input[data-layer-id="' + id + '"]');
            if (cb && cb.checked) cb.checked = false;
          }
        } catch (e2) {}
      }
    });
    // También revisar capas del estilo que no estén en __ftthLayerIds
    const styleLayers = map.getStyle().layers || [];
    styleLayers.forEach(layer => {
      const id = layer.id;
      if (ids.includes(id)) return;
      const isFtth = id.startsWith("geojson-") || id.startsWith("ftth-") || id.startsWith("FTTH_");
      if (!isFtth) return;
      const isCentral = id.includes("CENTRALES") || id.includes("CORPORATIVO");
      if (isCentral) return;
      if (cablesExplicitlyVisible && (id === (CONFIG.LAYERS?.GEOJSON_LINES || "geojson-lines") || id === (CONFIG.LAYERS?.GEOJSON_POINTS || "geojson-points"))) return;
      // ftth-cables (FTTH_COMPLETO) siempre oculto cuando no es la fuente activa: evita que persista CO36 u otro cable
      if (id === "ftth-cables" || id === "ftth-puntos") {
        try { map.setLayoutProperty(id, "visibility", "none"); enforced++; } catch (e) { if (CONFIG?.DEBUG && log) log("warn", "setLayoutProperty none", id, e?.message); }
        return;
      }
      const current = map.getLayoutProperty(id, "visibility");
      if (current !== "none") {
        try { map.setLayoutProperty(id, "visibility", "none"); enforced++; } catch (e) { if (CONFIG?.DEBUG && log) log("warn", "setLayoutProperty none", id, e?.message); }
        try {
          const tree = typeof document !== "undefined" && document.getElementById("layersTree");
          if (tree) {
            const cb = tree.querySelector('input[data-layer-id="' + id + '"]');
            if (cb && cb.checked) cb.checked = false;
          }
        } catch (e2) {}
      }
    });
    if (enforced > 0 && log) log("log", "🔒 enforceOnlyCentralesVisible:", enforced, "capas forzadas a oculto");
  }

  /* ===============================
     Restaurar al cambiar estilo
  =============================== */
  function restoreLayers() {
    if (restoring) return;
    restoring = true;

    if (log) log("log", "🔄 Restaurando capas FTTH...");
    
    // Limpiar registro de iconos de capas anteriores
    layerIconRegistry.clear();
    
    // Limpiar handler global (se reinicializará cuando se carguen las nuevas capas)
    cleanupGlobalImageMissingHandler();
    
    setTimeout(() => {
      loadFTTHTree();
      restoring = false;
    }, 400);
  }

  /* ===============================
     Cargar centrales de forma fija e independiente
  =============================== */
  async function loadCentralesFijas(retryCount = 0) {
    const map = App?.map;
    const MAX_RETRIES = 5;
    
    if (!map) {
      if (log) log("warn", "⚠️ Mapa no disponible, reintentando...", retryCount);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => loadCentralesFijas(retryCount + 1), CONFIG.MAP_TIMING?.CENTRALES_RETRY_MS ?? 500);
      }
      return;
    }
    
    // Esperar a que el estilo esté cargado
    if (!map.isStyleLoaded()) {
      if (log) log("log", "⏳ Esperando que el estilo del mapa esté cargado...", retryCount);
      if (retryCount < MAX_RETRIES) {
        map.once("style.load", () => {
          setTimeout(() => loadCentralesFijas(0), CONFIG.MAP_TIMING?.CENTRALES_AFTER_STYLE_MS ?? 200);
        });
        // También intentar después de un timeout
        setTimeout(() => {
          if (!map.isStyleLoaded() && retryCount < MAX_RETRIES) {
            loadCentralesFijas(retryCount + 1);
          }
        }, 1000);
      }
      return;
    }
    
    const CENTRALES_ID = CONFIG.LAYERS?.CENTRALES || "CORPORATIVO_CENTRALES_ETB";
    const CENTRALES_SOURCE = "centrales-etb-source";
    
    // Si ya está cargado, asegurar que esté visible
    if (map.getLayer(CENTRALES_ID)) {
      map.setLayoutProperty(CENTRALES_ID, "visibility", "visible");
      if (log) log("log", "✅ Centrales ya cargadas, asegurando visibilidad");
      return;
    }
    
    try {
      if (log) log("log", "🏢 Cargando centrales ETB (fijas)...");
      
      // Cargar GeoJSON de centrales
      const res = await fetch("/geojson/CORPORATIVO/centrales-etb.geojson", { cache: "default" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const geojson = await res.json();
      
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        if (log) log("warn", "⚠️ No hay centrales para cargar");
        return;
      }
      
      if (log) log("log", "📊 GeoJSON cargado:", geojson.features.length, "centrales");
      
      if (!map.isStyleLoaded()) {
        if (log) log("log", "⏳ Estilo no listo tras fetch centrales, reintentando en style.load...");
        map.once("style.load", () => loadCentralesFijas(0));
        return;
      }
      
      if (!map.getSource(CENTRALES_SOURCE)) {
        try {
          map.addSource(CENTRALES_SOURCE, {
            type: "geojson",
            data: geojson,
            promoteId: "name"
          });
          if (log) log("log", "✅ Source creado:", CENTRALES_SOURCE);
        } catch (err) {
          const em = (err && err.message) ? String(err.message) : "";
          if (/style is not done loading/i.test(em)) {
            map.once("style.load", () => loadCentralesFijas(0));
            return;
          }
          if (em.includes("already exists")) {
            if (log) log("log", "⚠️ Source ya existe, actualizando datos...");
            map.getSource(CENTRALES_SOURCE).setData(geojson);
          } else {
            throw err;
          }
        }
      } else {
        // Actualizar datos si el source ya existe
        map.getSource(CENTRALES_SOURCE).setData(geojson);
        if (log) log("log", "✅ Source actualizado:", CENTRALES_SOURCE);
      }
      
      // Crear layer si no existe (solo texto, sin iconos); debajo de etiquetas del estilo
      if (!map.getLayer(CENTRALES_ID)) {
        try {
          map.addLayer({
            id: CENTRALES_ID,
            type: "symbol",
            source: CENTRALES_SOURCE,
            layout: {
              "text-field": ["get", "name"], // ✅ Solo mostrar el nombre
              "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              "text-size": 14,
              "text-anchor": "center",
              "text-offset": [0, 1.5], // Posicionar texto debajo del punto
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              "visibility": "visible" // ✅ SIEMPRE VISIBLE
            },
            paint: {
              "text-color": "#2196F3", // Azul corporativo
              "text-halo-color": "#FFFFFF",
              "text-halo-width": 2,
              "text-halo-blur": 1
            }
          }, getBeforeIdForDataLayers(map));
          
          if (log) log("log", "✅ Layer creado:", CENTRALES_ID);
          
          // Registrar en el sistema
          if (!App.__ftthLayerIds.includes(CENTRALES_ID)) {
            App.__ftthLayerIds.push(CENTRALES_ID);
          }
        } catch (err) {
          const em = (err && err.message) ? String(err.message) : "";
          if (/style is not done loading/i.test(em)) {
            map.once("style.load", () => loadCentralesFijas(0));
            return;
          }
          console.error("❌ Error creando layer:", err);
          if (map.getLayer(CENTRALES_ID)) {
            map.setLayoutProperty(CENTRALES_ID, "visibility", "visible");
          }
        }
      } else {
        // Asegurar que esté visible
        map.setLayoutProperty(CENTRALES_ID, "visibility", "visible");
        if (log) log("log", "✅ Layer ya existe, asegurando visibilidad");
      }
      
      // Verificar que el layer esté visible
      const layer = map.getLayer(CENTRALES_ID);
      if (layer) {
        const visibility = map.getLayoutProperty(CENTRALES_ID, "visibility");
        if (log) log("log", "✅ Centrales ETB cargadas (fijas):", geojson.features.length, "centrales, visibilidad:", visibility);
      } else {
        if (log) log("warn", "⚠️ Layer no encontrado después de crearlo");
      }
      
      // Zoom a Santa Inés después de cargar centrales (solo la primera vez)
      if (geojson.features.length > 0 && retryCount === 0) {
        setTimeout(() => {
          if (typeof zoomToSantaInes === "function") {
            zoomToSantaInes();
          }
        }, 500);
      }
      
    } catch (err) {
      const em = (err && err.message) ? String(err.message) : "";
      if (/style is not done loading/i.test(em)) {
        map.once("style.load", () => loadCentralesFijas(0));
        return;
      }
      console.error("❌ Error cargando centrales fijas:", err);
      if (retryCount < MAX_RETRIES) {
        if (log) log("log", "🔄 Reintentando carga de centrales...", retryCount + 1, "/", MAX_RETRIES);
        setTimeout(() => loadCentralesFijas(retryCount + 1), CONFIG.MAP_TIMING?.CENTRALES_ERROR_RETRY_MS ?? 1000);
      }
    }
  }

  /* ===============================
     Eventos
  =============================== */
  function handleStyleNotReady(err, retryFn) {
    const msg = (err && err.message) ? String(err.message) : "";
    if (!/style is not done loading/i.test(msg)) return false;
    const map = App?.map;
    if (map && typeof retryFn === "function") {
      if (log) log("log", "⏳ Style no listo (promesa), reintentando en style.load...");
      map.once("load", retryFn);
      map.once("style.load", retryFn);
    }
    return true;
  }

  App.map?.on("load", () => {
    initGlobalImageMissingHandler();
    setTimeout(() => {
      loadCentralesFijas().catch((err) => {
        if (!handleStyleNotReady(err, () => loadCentralesFijas())) console.error("❌", err);
      });
    }, 300);
    loadConsolidatedGeoJSONToBaseMap().catch((err) => {
      if (!handleStyleNotReady(err, () => loadConsolidatedGeoJSONToBaseMap())) console.error("❌", err);
    });
    loadFTTHTree().catch((err) => {
      if (!handleStyleNotReady(err, () => loadFTTHTree())) console.error("❌", err);
    });
    setTimeout(enforceOnlyCentralesVisible, CONFIG.MAP_TIMING?.ENFORCE_AFTER_LOAD_MS ?? 2800);
    setTimeout(() => {
      if (App?.map && !App.map.getLayer(CONFIG.LAYERS?.GEOJSON_LINES || "geojson-lines") && App.map.isStyleLoaded()) {
        if (log) log("log", "🔄 Capa geojson-lines ausente tras carga, reintentando...");
        loadConsolidatedGeoJSONToBaseMap().catch(() => {});
      }
    }, CONFIG.MAP_TIMING?.LAYER_MISSING_RETRY_MS ?? 3500);
  });
  App.map?.on("style.load", () => {
    restoreLayers();
    setTimeout(() => {
      initGlobalImageMissingHandler();
      loadCentralesFijas().catch((err) => {
        if (!handleStyleNotReady(err, () => loadCentralesFijas())) console.error("❌", err);
      });
      setTimeout(() => {
        loadConsolidatedGeoJSONToBaseMap().catch((err) => {
          if (!handleStyleNotReady(err, () => loadConsolidatedGeoJSONToBaseMap())) console.error("❌", err);
        });
      }, 300);
      setTimeout(enforceOnlyCentralesVisible, CONFIG.MAP_TIMING?.ENFORCE_AFTER_STYLE_LOAD_MS ?? 1500);
    }, 500);
  });
  
  // Limpiar cuando el mapa se destruye
  App.map?.on("remove", () => {
    cleanupGlobalImageMissingHandler();
    layerIconRegistry.clear();
  });

  /* MUZU y CHICO se cargan como el resto de centrales: MUZU se incorpora en consolidateAllGeoJSON (muzu.geojson → geojson-lines con _molecula). No hay capa muzu-lines ni loadMuzuLayer. */

  /* ===============================
     API pública
  =============================== */
  App.loadFTTHTree = loadFTTHTree;
  App.consolidateAllGeoJSON = consolidateAllGeoJSON;
  App.loadConsolidatedGeoJSONToBaseMap = loadConsolidatedGeoJSONToBaseMap;
  App.loadCentralesFijas = loadCentralesFijas;
  App.enforceOnlyCentralesVisible = enforceOnlyCentralesVisible; // 🔒 Solo centrales visibles por defecto
  App.getBeforeIdForDataLayers = getBeforeIdForDataLayers; // para insertar capas debajo de etiquetas (cierres, eventos, etc.)

})();
export {};
