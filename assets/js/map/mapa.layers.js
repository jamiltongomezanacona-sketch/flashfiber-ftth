/* =========================================================
   FlashFiber FTTH | mapa.layers.js
   Carga dinámica de capas GeoJSON FTTH (desde árbol children)
   + AutoZoom inteligente
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  const CONFIG = window.__FTTH_CONFIG__ || {};
  if (!App) {
    console.error("❌ App no disponible en mapa.layers.js");
    return;
  }

  const ROOT_INDEX = (typeof window !== "undefined" && window.__GEOJSON_INDEX__) || "../geojson/index.json";
  let restoring = false;
  let loadingTree = false; // ✅ Bloqueo para evitar cargas duplicadas

  App.__ftthLayerIds = App.__ftthLayerIds || [];
  
  // 🎯 Sistema global de registro de iconos por capa
  const layerIconRegistry = new Map(); // layerId → { iconMap, CENTRAL_COLOR }
  
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
  // Evita problemas de decodificación SVG en Mapbox
  function createCentralPinIcon(color, label = "", size = 50) {
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
  
  // ❌ DESHABILITADO: Handler global de iconos faltantes (genera errores)
  function initGlobalImageMissingHandler() {
    // ❌ DESHABILITADO: No inicializar handler de iconos faltantes
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
          console.warn(`⚠️ Icono faltante detectado: ${e.id} (capa: ${layerId}), cargando bajo demanda...`);
          
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
                    console.log(`✅ Icono cargado bajo demanda: ${e.id} para "${centralName}"`);
                    
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
                    console.log(`ℹ️ Icono ${e.id} ya existe (cargado por otro proceso)`);
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
    console.log("✅ Handler global de iconos faltantes inicializado");
    */
  }
  
  // Función para limpiar el handler global
  function cleanupGlobalImageMissingHandler() {
    const map = App.map;
    if (map && globalImageMissingHandler) {
      map.off("styleimagemissing", globalImageMissingHandler);
      globalImageMissingHandler = null;
      console.log("🧹 Handler global de iconos faltantes limpiado");
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
        setTimeout(() => zoomToSantaInes(), 100);
      });
      return;
    }
    
    // Verificar que el mapa tenga dimensiones válidas
    const container = map.getContainer();
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn("⚠️ Mapa sin dimensiones válidas, omitiendo zoom");
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
        setTimeout(zoomToSantaInes, 500);
        return;
      }

      // Aplicar zoom con padding para mejor visualización
      map.fitBounds(santaInesBounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1000,
        maxZoom: 15 // Zoom más cercano para ver el sector en detalle
      });
      console.log("🎯 Zoom a Santa Inés aplicado");
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
      console.log("🎯 Zoom a Bogotá aplicado");
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
      console.log("📦 Consolidando SOLO CABLES y CIERRES E1...");
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
            console.log(`⏭️ Omitiendo capa (solo cables y cierres): ${node.id}, path: ${fullPath}`);
            return;
          }
          
          console.log(`✅ Incluyendo capa: ${node.id}, tipo: ${isCable ? 'CABLE' : 'CIERRE'}, path: ${fullPath}`);
          
          try {
            // ✅ Normalizar URL para evitar duplicados
            let url = basePath + node.path;
            url = url.replace(/\/+/g, "/");
            if (!url.startsWith("../geojson/")) {
              if (url.startsWith("geojson/")) {
                url = "../" + url;
              } else {
                url = "../geojson/" + url.replace(/^\.\.\/geojson\//, "");
              }
            }
            
            // ✅ Verificar si ya se cargó este archivo
            if (loadedUrls.has(url)) {
              console.log(`⏭️ Archivo ya cargado (cache): ${url}`);
              return;
            }
            loadedUrls.add(url);
            
            const res = await fetch(url, { cache: "default" });
            if (!res.ok) {
              console.warn(`⚠️ No se pudo cargar: ${url}`);
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
                  console.log(`⏭️ Omitiendo cierres (ninguno E1/E0): ${node.id}`);
                  return;
                }
                
                // Agregar metadata de la capa a cada feature
                cierreFeatures.forEach(feature => {
                  if (!feature.properties) feature.properties = {};
                  feature.properties._layerId = node.id;
                  feature.properties._layerLabel = node.label;
                  feature.properties._layerType = node.typeLayer || "symbol";
                  const moleculaMatch = (node.id || "").match(/([A-Z]{2}\d+)/);
                  if (moleculaMatch) feature.properties._molecula = moleculaMatch[1];
                });
                
                allFeatures.push(...cierreFeatures);
                console.log(`✅ ${cierreFeatures.length} cierres (E1+E0) de ${node.id} (de ${geojson.features.length} totales)`);
              } else {
                // Es cable, incluir todos los features (y _molecula para filtrar como en Corporativo)
                const moleculaMatch = (node.id || "").match(/([A-Z]{2}\d+)/);
                const _molecula = moleculaMatch ? moleculaMatch[1] : "";
                geojson.features.forEach(feature => {
                  if (!feature.properties) feature.properties = {};
                  feature.properties._layerId = node.id;
                  feature.properties._layerLabel = node.label;
                  feature.properties._layerType = node.typeLayer || "line";
                  if (_molecula) feature.properties._molecula = _molecula;
                });
                
                allFeatures.push(...geojson.features);
                console.log(`✅ ${geojson.features.length} features de cable ${node.id}`);
              }
            }
          } catch (err) {
            console.warn(`⚠️ Error cargando ${node.id}:`, err);
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
                    console.warn(`⚠️ No se pudo cargar: ${child.index}`);
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
      await collectGeoJSON(root, "../geojson/", "");
      
      // Crear FeatureCollection consolidado
      const consolidated = {
        type: "FeatureCollection",
        features: allFeatures
      };
      
      console.log(`✅ GeoJSON consolidado: ${allFeatures.length} features (SOLO CABLES y CIERRES E1)`);
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
      console.warn("⚠️ Mapa no disponible para cargar GeoJSON consolidado");
      return;
    }
    
    // ✅ Esperar a que el estilo esté completamente cargado
    if (!map.isStyleLoaded()) {
      console.log("⏳ Esperando a que el estilo del mapa se cargue...");
      map.once("style.load", () => {
        setTimeout(() => loadConsolidatedGeoJSONToBaseMap(), 100);
      });
      return;
    }
    
    try {
      const consolidated = await consolidateAllGeoJSON();
      
      if (!consolidated.features || consolidated.features.length === 0) {
        console.warn("⚠️ No hay features para cargar en mapa base");
        return;
      }
      
      // Verificar si el source ya existe
      if (map.getSource("geojson-consolidado")) {
        console.log("🔄 Actualizando GeoJSON consolidado existente");
        map.getSource("geojson-consolidado").setData(consolidated);
      } else {
        // Crear source consolidado
        map.addSource("geojson-consolidado", {
          type: "geojson",
          data: consolidated
        });
        console.log("✅ Source consolidado creado");
      }
      
      // Separar features por tipo de geometría
      const lineFeatures = consolidated.features.filter(f => 
        f.geometry && f.geometry.type === "LineString"
      );
      const pointFeatures = consolidated.features.filter(f => 
        f.geometry && f.geometry.type === "Point"
      );
      const polygonFeatures = consolidated.features.filter(f => 
        f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
      );
      
      // Capa de líneas (cables, rutas, etc.)
      if (lineFeatures.length > 0 && !map.getLayer("geojson-lines")) {
        map.addLayer({
          id: "geojson-lines",
          type: "line",
          source: "geojson-consolidado",
          filter: ["==", ["geometry-type"], "LineString"],
          layout: {
            visibility: "none" // ✅ Iniciar oculto - sin cables visibles
          },
          paint: {
            "line-color": "#000099",
            "line-width": 4,
            "line-opacity": 0.8
          }
        });
        console.log(`✅ Capa de líneas creada: ${lineFeatures.length} features`);
        
        // ✅ Registrar en el sistema de capas FTTH
        if (!App.__ftthLayerIds) {
          App.__ftthLayerIds = [];
        }
        if (!App.__ftthLayerIds.includes("geojson-lines")) {
          App.__ftthLayerIds.push("geojson-lines");
          console.log(`✅ Capa geojson-lines registrada en sistema FTTH`);
        }
      }
      
      // Capa de puntos (oculta por defecto; solo visible desde árbol de capas o buscador)
      if (pointFeatures.length > 0 && !map.getLayer("geojson-points")) {
        map.addLayer({
          id: "geojson-points",
          type: "circle",
          source: "geojson-consolidado",
          filter: ["==", ["geometry-type"], "Point"],
          layout: { visibility: "none" },
          paint: {
            "circle-radius": 6,
            "circle-color": "#ffaa00",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#000",
            "circle-opacity": 0.9
          }
        });
        if (!App.__ftthLayerIds.includes("geojson-points")) App.__ftthLayerIds.push("geojson-points");
        console.log(`✅ Capa de puntos creada: ${pointFeatures.length} features (oculta por defecto)`);
      }
      
      // Capa de polígonos (oculta por defecto; solo visible desde árbol de capas o buscador)
      if (polygonFeatures.length > 0 && !map.getLayer("geojson-polygons")) {
        map.addLayer({
          id: "geojson-polygons",
          type: "fill",
          source: "geojson-consolidado",
          filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
          layout: { visibility: "none" },
          paint: {
            "fill-color": "#00e5ff",
            "fill-opacity": 0.3
          }
        });
        if (!App.__ftthLayerIds.includes("geojson-polygons")) App.__ftthLayerIds.push("geojson-polygons");
        
        map.addLayer({
          id: "geojson-polygons-outline",
          type: "line",
          source: "geojson-consolidado",
          filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
          layout: { visibility: "none" },
          paint: {
            "line-color": "#00e5ff",
            "line-width": 2
          }
        });
        if (!App.__ftthLayerIds.includes("geojson-polygons-outline")) App.__ftthLayerIds.push("geojson-polygons-outline");
        console.log(`✅ Capa de polígonos creada: ${polygonFeatures.length} features (oculta por defecto)`);
      }
      
      console.log(`✅ GeoJSON consolidado cargado en mapa base: ${consolidated.features.length} features totales`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ftth-consolidated-layers-ready"));
      }
      setTimeout(enforceOnlyCentralesVisible, 150);
    } catch (err) {
      console.error("❌ Error cargando GeoJSON consolidado en mapa base:", err);
    }
  }

  /* ===============================
     Cargar árbol raíz
  =============================== */
  async function loadFTTHTree() {
    // ✅ GIS FTTH: misma estructura que Corporativo = una sola capa consolidada (geojson-lines); no crear N capas
    if (!window.__GEOJSON_INDEX__) {
      console.log("📂 FTTH: uso de capa única consolidada (geojson-lines), omitiendo carga de árbol de capas");
      return;
    }
    // ✅ Evitar cargas duplicadas simultáneas
    if (loadingTree) {
      console.log("⚠️ loadFTTHTree ya está en ejecución, omitiendo llamada duplicada");
      return;
    }
    
    loadingTree = true;
    try {
      console.log("📂 Cargando árbol FTTH...");
      const res = await fetch(ROOT_INDEX, { cache: "default" });
      const root = await res.json();

      await walkNode(root, "../geojson/");

      console.log("🌳 Árbol FTTH procesado");
      // Forzar que solo centrales queden visibles tras cargar capas
      setTimeout(enforceOnlyCentralesVisible, 150);
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
            console.warn("⚠️ No se pudo cargar:", child.index);
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
    if (id === "CORPORATIVO_CENTRALES_ETB" || 
        id?.toLowerCase().includes("centrales") && id?.toLowerCase().includes("corporativo")) {
      console.log("ℹ️ Centrales se cargan de forma fija, omitiendo carga desde árbol");
      return;
    }
    // ✅ Construir URL correcta - normalizar rutas para que funcionen en dominio
    let url = basePath + layer.path;
    
    // Normalizar la ruta: eliminar dobles barras
    url = url.replace(/\/+/g, "/");
    
    // Si la basePath ya tiene ../geojson/, no duplicar
    if (url.startsWith("../geojson/")) {
      // Ya está bien formada
    } else if (url.startsWith("geojson/")) {
      url = "../" + url;
    } else if (!url.startsWith("../")) {
      // Asegurar que comience con ../geojson/
      url = "../geojson/" + url.replace(/^\.\.\/geojson\//, "");
    }
    
    // ✅ PERMITIR cargar todas las capas individuales (cables, cierres, eventos)
    // Esto permite control granular desde el árbol de capas
    
    console.log(`🔍 Creando capa: ${id}, URL: ${url}, basePath: ${basePath}, path: ${layer.path}`);

    // ✅ Verificar si el source o la layer ya existen (evitar duplicados)
    if (map.getSource(id)) {
      console.log(`⚠️ Source ${id} ya existe, omitiendo creación`);
      // Si el source existe pero la layer no, crear la layer
      if (!map.getLayer(id)) {
        console.log(`⚠️ Source existe pero layer no, creando layer: ${id}`);
        // Continuar para crear la layer
      } else {
        return; // Ambos existen, omitir completamente
      }
    }
    
    // ✅ Verificar si la layer ya existe
    if (map.getLayer(id)) {
      console.log(`⚠️ Layer ${id} ya existe, omitiendo`);
      return;
    }

    try {
      console.log(`📥 Fetching GeoJSON desde: ${url}`);
      const res = await fetch(url, { cache: "default" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const geojson = await res.json();
      console.log(`✅ GeoJSON cargado: ${geojson.features?.length || 0} features`);

      // ✅ Validar que el GeoJSON tenga datos
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.warn("⚠️ GeoJSON vacío, omitiendo:", id);
        return;
      }

      // ✅ Validar estructura GeoJSON
      if (geojson.type !== "FeatureCollection") {
        console.warn("⚠️ GeoJSON inválido (no es FeatureCollection):", id);
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
        console.log(`📋 Centrales encontradas: ${Array.from(centralNames).join(", ")}`);

        // ❌ DESHABILITADO: Carga de iconos personalizados (genera errores 404)
        // const iconPaths = new Set();
        const iconMap = new Map(); // Mapear nombre/ruta → ID de icono
        
        // ❌ DESHABILITADO: No cargar iconos personalizados
        // geojson.features.forEach(f => {
        //   if (f.properties?.icon) {
        //     iconPaths.add(f.properties.icon);
        //   }
        // });

        // Separar iconos personalizados de pins generados
        const customIconIds = new Set(); // IDs de iconos personalizados (PNG externos)
        const generatedPinIds = new Set(); // IDs de pins generados (Canvas)
        
        // ❌ DESHABILITADO: Carga de iconos personalizados desde rutas (genera errores 404)
        // Los iconos personalizados están deshabilitados para evitar errores 404
        // Solo se usarán pins generados dinámicamente
        
        // Registrar esta capa en el sistema global ANTES de cargar iconos
        layerIconRegistry.set(id, {
          iconMap,
          CENTRAL_COLOR
        });
        
        // ❌ DESHABILITADO: Handler global de iconos faltantes
        // initGlobalImageMissingHandler();
        
        // Generar pins SVG para cada central
        console.log(`📌 Generando pins para ${centralNames.size} centrales únicas`);
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
                    console.log(`✅ Pin agregado: ${iconId} para "${centralName}"`);
                  } catch (addError) {
                    console.error(`❌ Error agregando imagen ${iconId}:`, addError);
                    throw addError;
                  }
                } else {
                  console.log(`ℹ️ Pin ya existe: ${iconId}`);
                }
                
                return true;
              })
              .catch((error) => {
                console.error(`❌ Error cargando pin para ${centralName}:`, error);
                throw error;
              });
            
            iconPromises.push(iconPromise);
          } else {
            console.log(`ℹ️ Pin ya existe en mapa: ${iconId}`);
          }
        }
        
        // SOLUCIÓN RADICAL: No bloquear la creación de capa esperando iconos
        // Los iconos se cargarán bajo demanda cuando el mapa los necesite
        // Usar Promise.race con timeout para no esperar indefinidamente
        try {
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000)); // Max 2 segundos
          const loadPromise = Promise.allSettled(iconPromises);
          
          await Promise.race([loadPromise, timeoutPromise]);
          
          // Reportar resultados sin bloquear
          const results = await loadPromise.catch(() => []);
          const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
          const failed = results.filter(r => r.status === 'rejected').length;
          console.log(`✅ Iconos: ${successful} cargados, ${failed} fallidos de ${iconPromises.length} totales`);
          
          // NO VERIFICAR iconos faltantes - confiar en el handler de styleimagemissing
          // El handler global cargará los iconos bajo demanda cuando el mapa los necesite
          console.log(`ℹ️ Los iconos faltantes se cargarán automáticamente cuando el mapa los necesite`);
          
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
        console.log(`✅ ${featuresWithIcons} de ${geojson.features.length} features tienen iconId asignado (carga bajo demanda activa)`);
        
        // Crear source DESPUÉS de cargar todos los iconos y asignar iconId
        // El mapa ya está verificado al inicio de la función
        console.log(`📦 Creando source para ${id} con ${geojson.features.length} features`);
        try {
          // Verificar que el source no exista ya
          if (map.getSource(id)) {
            console.log(`⚠️ Source ${id} ya existe, omitiendo creación`);
          } else {
            map.addSource(id, {
              type: "geojson",
              data: geojson
            });
            console.log(`✅ Source ${id} creado con datos actualizados`);
          }
        } catch (sourceError) {
          console.error(`❌ Error creando source ${id}:`, sourceError);
          // Si el error es que ya existe, continuar
          if (!sourceError.message?.includes('already exists')) {
            return;
          }
        }
        
        // Verificar que los iconId están en las features
        const sampleFeature = geojson.features[0];
        if (sampleFeature?.properties?.iconId) {
          console.log(`✅ Verificación: Feature de ejemplo tiene iconId: ${sampleFeature.properties.iconId}`);
        } else {
          console.error(`❌ ERROR: Feature de ejemplo NO tiene iconId`);
          console.log(`   Propiedades disponibles:`, Object.keys(sampleFeature?.properties || {}));
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

        // Agregar la capa directamente - el mapa está garantizado que está listo
        try {
          // Verificar que la capa no exista ya
          if (map.getLayer(id)) {
            console.log(`⚠️ Capa ${id} ya existe, omitiendo`);
          } else {
            map.addLayer(layerConfig);
            console.log(`✅ Capa symbol agregada: ${id} con ${geojson.features.length} features`);
          }
          
          // Verificar que la capa se creó correctamente
          if (map.getLayer(id)) {
            const visibility = map.getLayoutProperty(id, "visibility");
            const textFieldExpr = map.getLayoutProperty(id, "text-field");
            const textColor = map.getPaintProperty(id, "text-color");
            console.log(`✅ Verificación: Capa ${id} existe, visibilidad: ${visibility}`);
            console.log(`   Expresión text-field:`, JSON.stringify(textFieldExpr));
            console.log(`   Color del texto: ${textColor}`);
            
            // Verificar que el source tiene datos
            const source = map.getSource(id);
            if (source && source._data) {
              const sourceFeatures = source._data.features || [];
              const featuresWithName = sourceFeatures.filter(f => f.properties?.name);
              console.log(`   Source tiene ${sourceFeatures.length} features, ${featuresWithName.length} con nombre`);
              if (featuresWithName.length > 0) {
                console.log(`   Ejemplo nombre: ${featuresWithName[0].properties.name}`);
              }
            }
          } else {
            console.error(`❌ ERROR: Capa ${id} NO se creó correctamente`);
          }
        } catch (layerError) {
          console.error(`❌ Error agregando capa ${id}:`, layerError);
          // Limpiar el registro si falla
          layerIconRegistry.delete(id);
        }
      } else {
        // Configuración para líneas y otros tipos
        // ✅ Verificar nuevamente antes de agregar (evitar race conditions)
        if (!map.getSource(id)) {
          map.addSource(id, {
            type: "geojson",
            data: geojson
          });
        } else {
          console.log(`⚠️ Source ${id} ya existe al intentar agregar, usando existente`);
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

        // ✅ Verificar nuevamente antes de agregar layer (evitar duplicados)
        if (!map.getLayer(id)) {
          map.addLayer(layerConfig);
        } else {
          console.log(`⚠️ Layer ${id} ya existe, omitiendo agregar`);
        }
      }
      
      // ✅ Solo agregar a la lista si no está ya registrado
      if (!App.__ftthLayerIds.includes(id)) {
        App.__ftthLayerIds.push(id);
      }

      const visibility = map.getLayoutProperty(id, "visibility");
      console.log(`✅ Capa cargada: ${id} (${geojson.features.length} features, tipo: ${layerType}, visibilidad: ${visibility})`);

      // 🎯 Zoom a Santa Inés después de cargar la primera capa importante
      // Solo hacer zoom una vez cuando se carga la capa de centrales
      if (id === "CORPORATIVO_CENTRALES_ETB" && geojson.features.length > 0) {
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
  function enforceOnlyCentralesVisible() {
    const map = App?.map;
    if (!map || !map.isStyleLoaded()) return;
    const ids = App.__ftthLayerIds || [];
    let enforced = 0;
    const isCorporativo = !!window.__GEOJSON_INDEX__;
    const filterCentrales = typeof document !== "undefined" ? document.getElementById("filterCentrales") : null;
    const centralesVisible = !filterCentrales || filterCentrales.checked;
    const pinsLayerIds = [CONFIG.LAYERS?.CIERRES, CONFIG.LAYERS?.EVENTOS].filter(Boolean);
    if (pinsLayerIds.length === 0) pinsLayerIds.push("cierres-layer", "eventos-layer");
    pinsLayerIds.forEach(layerId => {
      if (isCorporativo && (layerId === "eventos-layer" || layerId === (CONFIG.LAYERS?.EVENTOS))) return;
      if (map.getLayer(layerId)) {
        try {
          map.setLayoutProperty(layerId, "visibility", "none");
          enforced++;
        } catch (e) {}
      }
    });
    const cablesExplicitlyVisible = !!App.__cablesExplicitlyVisible;
    ids.forEach(id => {
      if (!id || !map.getLayer(id)) return;
      if (id.startsWith("muzu-")) return; // MUZU siempre respeta su visibilidad, no ocultar
      const isCentral = id.includes("CENTRALES") || id.includes("CORPORATIVO");
      if (isCentral) {
        const current = map.getLayoutProperty(id, "visibility");
        const want = centralesVisible ? "visible" : "none";
        if (current !== want) {
          try { map.setLayoutProperty(id, "visibility", want); enforced++; } catch (e) {}
        }
        return;
      }
      if (cablesExplicitlyVisible && (id === "geojson-lines" || id === "geojson-points")) return;
      const current = map.getLayoutProperty(id, "visibility");
      if (current !== "none") {
        try { map.setLayoutProperty(id, "visibility", "none"); enforced++; } catch (e) {}
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
      if (cablesExplicitlyVisible && (id === "geojson-lines" || id === "geojson-points")) return;
      const current = map.getLayoutProperty(id, "visibility");
      if (current !== "none") {
        try { map.setLayoutProperty(id, "visibility", "none"); enforced++; } catch (e) {}
      }
    });
    if (enforced > 0) console.log(`🔒 enforceOnlyCentralesVisible: ${enforced} capas forzadas a oculto`);
  }

  /* ===============================
     Restaurar al cambiar estilo
  =============================== */
  function restoreLayers() {
    if (restoring) return;
    restoring = true;

    console.log("🔄 Restaurando capas FTTH...");
    
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
      console.warn("⚠️ Mapa no disponible, reintentando...", retryCount);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => loadCentralesFijas(retryCount + 1), 500);
      }
      return;
    }
    
    // Esperar a que el estilo esté cargado
    if (!map.isStyleLoaded()) {
      console.log("⏳ Esperando que el estilo del mapa esté cargado...", retryCount);
      if (retryCount < MAX_RETRIES) {
        map.once("style.load", () => {
          setTimeout(() => loadCentralesFijas(0), 200);
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
    
    const CENTRALES_ID = "CORPORATIVO_CENTRALES_ETB";
    const CENTRALES_SOURCE = "centrales-etb-source";
    
    // Si ya está cargado, asegurar que esté visible
    if (map.getLayer(CENTRALES_ID)) {
      map.setLayoutProperty(CENTRALES_ID, "visibility", "visible");
      console.log("✅ Centrales ya cargadas, asegurando visibilidad");
      return;
    }
    
    try {
      console.log("🏢 Cargando centrales ETB (fijas)...");
      
      // Cargar GeoJSON de centrales
      const res = await fetch("../geojson/CORPORATIVO/centrales-etb.geojson", { cache: "default" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const geojson = await res.json();
      
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        console.warn("⚠️ No hay centrales para cargar");
        return;
      }
      
      console.log(`📊 GeoJSON cargado: ${geojson.features.length} centrales`);
      
      // Crear source si no existe
      if (!map.getSource(CENTRALES_SOURCE)) {
        try {
          map.addSource(CENTRALES_SOURCE, {
            type: "geojson",
            data: geojson
          });
          console.log("✅ Source creado:", CENTRALES_SOURCE);
        } catch (err) {
          // Si el source ya existe, actualizar datos
          if (err.message && err.message.includes("already exists")) {
            console.log("⚠️ Source ya existe, actualizando datos...");
            map.getSource(CENTRALES_SOURCE).setData(geojson);
          } else {
            throw err;
          }
        }
      } else {
        // Actualizar datos si el source ya existe
        map.getSource(CENTRALES_SOURCE).setData(geojson);
        console.log("✅ Source actualizado:", CENTRALES_SOURCE);
      }
      
      // Crear layer si no existe (solo texto, sin iconos)
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
          });
          
          console.log("✅ Layer creado:", CENTRALES_ID);
          
          // Registrar en el sistema
          if (!App.__ftthLayerIds.includes(CENTRALES_ID)) {
            App.__ftthLayerIds.push(CENTRALES_ID);
          }
        } catch (err) {
          console.error("❌ Error creando layer:", err);
          // Si el layer ya existe, solo asegurar visibilidad
          if (map.getLayer(CENTRALES_ID)) {
            map.setLayoutProperty(CENTRALES_ID, "visibility", "visible");
          }
        }
      } else {
        // Asegurar que esté visible
        map.setLayoutProperty(CENTRALES_ID, "visibility", "visible");
        console.log("✅ Layer ya existe, asegurando visibilidad");
      }
      
      // Verificar que el layer esté visible
      const layer = map.getLayer(CENTRALES_ID);
      if (layer) {
        const visibility = map.getLayoutProperty(CENTRALES_ID, "visibility");
        console.log(`✅ Centrales ETB cargadas (fijas): ${geojson.features.length} centrales, visibilidad: ${visibility}`);
      } else {
        console.warn("⚠️ Layer no encontrado después de crearlo");
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
      console.error("❌ Error cargando centrales fijas:", err);
      // Reintentar si no se ha excedido el límite
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Reintentando carga de centrales... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => loadCentralesFijas(retryCount + 1), 1000);
      }
    }
  }

  /* ===============================
     Eventos
  =============================== */
  App.map?.on("load", () => {
    // Inicializar handler global cuando el mapa esté listo
    initGlobalImageMissingHandler();
    
    // ✅ CARGAR CENTRALES DE FORMA FIJA E INDEPENDIENTE (PRIMERO)
    setTimeout(() => {
      loadCentralesFijas();
    }, 300);
    
    // ✅ CARGAR TODO EL GEOJSON CONSOLIDADO EN EL MAPA BASE
    loadConsolidatedGeoJSONToBaseMap();
    
    // También cargar el árbol individual (para compatibilidad)
    loadFTTHTree();
    
    // 🔒 Forzar solo centrales visibles tras todo (incl. mapa.ftth.js que corre ~300ms)
    setTimeout(enforceOnlyCentralesVisible, 2800);
  });
  App.map?.on("style.load", () => {
    restoreLayers();
    setTimeout(() => {
      initGlobalImageMissingHandler();
      loadCentralesFijas();
      setTimeout(() => {
        loadConsolidatedGeoJSONToBaseMap();
      }, 300);
      // 🔒 Forzar solo centrales visibles después de recargar
      setTimeout(enforceOnlyCentralesVisible, 1500);
    }, 500);
  });
  
  // Limpiar cuando el mapa se destruye
  App.map?.on("remove", () => {
    cleanupGlobalImageMissingHandler();
    layerIconRegistry.clear();
  });

  /* ===============================
     MUZU – capa desde KML convertido a GeoJSON (cada cable con color distinto)
  =============================== */
  var MUZU_LINE_PALETTE = [
    "#009c38", "#e63946", "#0066cc", "#f4a261", "#2a9d8f", "#9b59b6",
    "#e9c46a", "#e76f51", "#264653", "#00e5ff", "#ff6b6b", "#4ecdc4",
    "#d62828", "#06d6a0", "#ffd166", "#118ab2", "#ef476f", "#073b4c"
  ];
  function addMuzuColors(geojson) {
    if (!geojson || !geojson.features) return geojson;
    var lineIndex = 0;
    var nameToColor = {};
    geojson.features.forEach(function (f) {
      if (!f.properties) f.properties = {};
      if (f.geometry && f.geometry.type === "LineString") {
        var name = (f.properties.name || "cable") + "";
        if (nameToColor[name] === undefined) {
          nameToColor[name] = MUZU_LINE_PALETTE[lineIndex % MUZU_LINE_PALETTE.length];
          lineIndex++;
        }
        f.properties.color = nameToColor[name];
      }
    });
    return geojson;
  }
  async function loadMuzuLayer() {
    const map = App.map;
    if (!map || !map.getStyle()) return;
    const url = "../geojson/MUZU/muzu.geojson";
    try {
      const res = await fetch(url, { cache: "default" });
      if (!res.ok) {
        console.warn("⚠️ MUZU: no se pudo cargar " + url);
        return;
      }
      const geojson = await res.json();
      if (!geojson.features || geojson.features.length === 0) {
        console.warn("⚠️ MUZU: GeoJSON sin features");
        return;
      }
      addMuzuColors(geojson);
      if (map.getSource("muzu-src")) {
        map.getSource("muzu-src").setData(geojson);
        console.log("✅ MUZU actualizado: " + geojson.features.length + " features");
        return;
      }
      map.addSource("muzu-src", { type: "geojson", data: geojson });
      const hasLines = geojson.features.some(f => f.geometry && f.geometry.type === "LineString");
      const hasPoints = geojson.features.some(f => f.geometry && f.geometry.type === "Point");
      if (hasLines) {
        map.addLayer({
          id: "muzu-lines",
          type: "line",
          source: "muzu-src",
          filter: ["==", ["geometry-type"], "LineString"],
          layout: { visibility: "none" },
          paint: {
            "line-color": ["get", "color"],
            "line-width": 4,
            "line-opacity": 0.9
          }
        });
      }
      if (hasPoints) {
        map.addLayer({
          id: "muzu-points",
          type: "circle",
          source: "muzu-src",
          filter: ["==", ["geometry-type"], "Point"],
          layout: { visibility: "none" },
          paint: {
            "circle-radius": 7,
            "circle-color": "#00e5ff",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
            "circle-opacity": 0.95
          }
        });
      }
      if (!App.__ftthLayerIds) App.__ftthLayerIds = [];
      if (hasLines && !App.__ftthLayerIds.includes("muzu-lines")) App.__ftthLayerIds.push("muzu-lines");
      if (hasPoints && !App.__ftthLayerIds.includes("muzu-points")) App.__ftthLayerIds.push("muzu-points");
      console.log("✅ MUZU cargado: " + geojson.features.length + " features (líneas + puntos)");
    } catch (err) {
      console.warn("⚠️ MUZU:", err.message || err);
    }
  }

  /* ===============================
     API pública
  =============================== */
  App.loadFTTHTree = loadFTTHTree;
  App.consolidateAllGeoJSON = consolidateAllGeoJSON;
  App.loadConsolidatedGeoJSONToBaseMap = loadConsolidatedGeoJSONToBaseMap;
  App.loadCentralesFijas = loadCentralesFijas;
  App.loadMuzuLayer = loadMuzuLayer;
  App.enforceOnlyCentralesVisible = enforceOnlyCentralesVisible; // 🔒 Solo centrales visibles por defecto

})();
