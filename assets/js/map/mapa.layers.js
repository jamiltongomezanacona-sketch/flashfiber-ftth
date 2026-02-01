/* =========================================================
   FlashFiber FTTH | mapa.layers.js
   Carga dinámica de capas GeoJSON FTTH (desde árbol children)
   + AutoZoom inteligente
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) {
    console.error("❌ App no disponible en mapa.layers.js");
    return;
  }

  const ROOT_INDEX = "../geojson/index.json";
  let restoring = false;

  App.__ftthLayerIds = App.__ftthLayerIds || [];

  /* ===============================
     🎯 AUTO ZOOM GEOJSON
  =============================== */
  function autoZoomToGeoJSON(geojson) {
    const map = App.map;
    if (!map || !geojson?.features?.length) return;

    const coords = [];

    geojson.features.forEach(f => {
      if (f.geometry.type === "Point") {
        // Extraer [lng, lat] de Point (puede tener altura)
        const [lng, lat] = f.geometry.coordinates;
        coords.push([lng, lat]);
      }
      if (f.geometry.type === "LineString") {
        coords.push(...f.geometry.coordinates);
      }
      if (f.geometry.type === "MultiLineString") {
        f.geometry.coordinates.forEach(line => {
          coords.push(...line);
        });
      }
    });

    if (!coords.length) return;

    // Crear bounds desde el primer punto
    const firstCoord = Array.isArray(coords[0][0]) ? coords[0][0] : coords[0];
    const bounds = new mapboxgl.LngLatBounds(firstCoord, firstCoord);

    // Extender bounds con todos los puntos
    coords.forEach(c => {
      const coord = Array.isArray(c[0]) ? c : [c];
      coord.forEach(point => {
        bounds.extend(point);
      });
    });

    // 🛡️ Delay para evitar conflictos de render
    setTimeout(() => {
      map.fitBounds(bounds, {
        padding: 80,
        duration: 900
      });
      console.log("🎯 AutoZoom aplicado");
    }, 300);
  }

  /* ===============================
     Cargar árbol raíz
  =============================== */
  async function loadFTTHTree() {
    try {
      console.log("📂 Cargando árbol FTTH...");
      const res = await fetch(ROOT_INDEX, { cache: "no-store" });
      const root = await res.json();

      await walkNode(root, "../geojson/");

      console.log("🌳 Árbol FTTH procesado");
    } catch (err) {
      console.error("❌ Error cargando árbol FTTH", err);
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

        // 👉 CASO 1: hijo es capa directa
        if (child.type === "layer") {
          await createLayer(child, basePath);
          continue;
        }

        // 👉 CASO 2: hijo es carpeta con index.json
        if (child.index) {
          try {
            const url = basePath + child.index;
            const res = await fetch(url, { cache: "no-store" });
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
  =============================== */
  async function createLayer(layer, basePath) {
    const map = App.map;
    if (!map || !map.isStyleLoaded()) {
      console.warn("⚠️ Mapa no disponible o estilo no cargado para:", layer.id);
      return;
    }

    const id  = layer.id;
    const url = basePath + layer.path;
    
    console.log(`🔍 Creando capa: ${id}, URL: ${url}, basePath: ${basePath}, path: ${layer.path}`);

    if (map.getSource(id)) {
      console.log(`⚠️ Source ${id} ya existe, omitiendo`);
      return;
    }

    try {
      console.log(`📥 Fetching GeoJSON desde: ${url}`);
      const res = await fetch(url, { cache: "no-store" });
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
        // Función para generar pin SVG estilo Google Maps para centrales (igual que cierres)
        function createCentralPinIcon(color, label = "", size = 50) {
          const pinHeight = size;
          const pinWidth = size * 0.6;
          const labelSize = label ? 12 : 0;
          
          // SVG simplificado sin filtros complejos (igual que tool.cierres.js)
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
              
              <!-- Sombra del pin -->
              <ellipse cx="${size / 2}" cy="${pinHeight - 2}" rx="${pinWidth * 0.4}" ry="4" 
                       fill="#000" opacity="0.2" filter="url(#shadow)"/>
              
              <!-- Cuerpo del pin (forma de gota estilo Google Maps) -->
              <path d="M ${size / 2} 0 
                       L ${size / 2 - pinWidth / 2} ${pinHeight * 0.6}
                       Q ${size / 2 - pinWidth / 2} ${pinHeight * 0.85} ${size / 2} ${pinHeight * 0.9}
                       Q ${size / 2 + pinWidth / 2} ${pinHeight * 0.85} ${size / 2 + pinWidth / 2} ${pinHeight * 0.6}
                       Z" 
                    fill="${color}" 
                    stroke="#FFFFFF" 
                    stroke-width="2"
                    filter="url(#shadow)"/>
              
              <!-- Etiqueta con texto (si se proporciona) -->
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
          
          return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }

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

        // Cargar iconos personalizados si existen, sino usar pins generados
        const iconPaths = new Set();
        const iconMap = new Map(); // Mapear nombre/ruta → ID de icono
        
        geojson.features.forEach(f => {
          if (f.properties?.icon) {
            iconPaths.add(f.properties.icon);
          }
        });

        // Cargar iconos personalizados desde rutas
        for (const iconPath of iconPaths) {
          const iconId = `icon-${id}-${iconPath.replace(/[^a-zA-Z0-9]/g, "_")}`;
          iconMap.set(iconPath, iconId);
          
          if (!map.hasImage(iconId)) {
            try {
              const iconUrl = iconPath.startsWith("http") 
                ? iconPath 
                : `../${iconPath}`;
              
              await new Promise((resolve) => {
                map.loadImage(iconUrl, (error, image) => {
                  if (error) {
                    console.warn(`⚠️ No se pudo cargar icono: ${iconPath}`, error);
                    resolve();
                  } else {
                    map.addImage(iconId, image);
                    console.log(`✅ Icono cargado: ${iconId} desde ${iconPath}`);
                    resolve();
                  }
                });
              });
            } catch (err) {
              console.warn(`⚠️ Error cargando icono ${iconPath}:`, err);
            }
          }
        }

        // Generar pins SVG para cada central
        console.log(`📌 Generando pins para ${centralNames.size} centrales únicas`);
        const iconPromises = [];
        
        for (const centralName of centralNames) {
          const safeName = centralName.replace(/[^a-zA-Z0-9]/g, "_");
          const iconId = `${id}-pin-${safeName}`;
          
          // Mapear nombre de central a ID de icono (hacerlo ANTES de cargar)
          iconMap.set(centralName, iconId);
          
          if (!map.hasImage(iconId)) {
            // Usar nombre completo de la central (o abreviado si es muy largo)
            const label = centralName.length > 8 
              ? centralName.substring(0, 8).toUpperCase() 
              : centralName.toUpperCase();
            
            const pinUrl = createCentralPinIcon(CENTRAL_COLOR, label, 50); // Tamaño más grande para mejor visibilidad
            
            // Cargar icono de forma asíncrona (igual que tool.cierres.js)
            const iconPromise = new Promise((resolve, reject) => {
              map.loadImage(pinUrl, (error, image) => {
                if (error) {
                  console.error(`❌ Error cargando pin para ${centralName}:`, error);
                  reject(error);
                  return;
                }
                
                // Agregar imagen al mapa
                if (!map.hasImage(iconId)) {
                  try {
                    map.addImage(iconId, image);
                    console.log(`✅ Pin agregado: ${iconId} para "${centralName}"`);
                  } catch (addError) {
                    console.error(`❌ Error agregando imagen ${iconId}:`, addError);
                    reject(addError);
                    return;
                  }
                } else {
                  console.log(`ℹ️ Pin ya existe: ${iconId}`);
                }
                
                resolve(true);
              });
            });
            
            iconPromises.push(iconPromise);
          } else {
            console.log(`ℹ️ Pin ya existe en mapa: ${iconId}`);
          }
        }
        
        // Esperar a que TODOS los iconos se carguen y se agreguen al mapa
        try {
          const results = await Promise.allSettled(iconPromises);
          const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
          const failed = results.filter(r => r.status === 'rejected').length;
          console.log(`✅ Mapeo de iconos: ${successful} exitosos, ${failed} fallidos de ${iconPromises.length} totales`);
          
          // Verificación final: todos los iconos deben estar en el mapa
          let missingIcons = [];
          for (const [name, iconId] of iconMap.entries()) {
            if (!map.hasImage(iconId)) {
              missingIcons.push({name, iconId});
            }
          }
          
          if (missingIcons.length > 0) {
            console.error(`❌ ERROR: ${missingIcons.length} iconos NO están en el mapa, recargando...`);
            // Recargar los iconos faltantes de forma síncrona
            const reloadPromises = [];
            for (const {name, iconId} of missingIcons) {
              const label = name.length > 8 ? name.substring(0, 8).toUpperCase() : name.toUpperCase();
              const pinUrl = createCentralPinIcon(CENTRAL_COLOR, label, 50);
              
              const reloadPromise = new Promise((resolve) => {
                map.loadImage(pinUrl, (error, image) => {
                  if (error) {
                    console.error(`❌ Error recargando ${iconId}:`, error);
                    resolve(false);
                    return;
                  }
                  
                  if (image) {
                    try {
                      if (!map.hasImage(iconId)) {
                        map.addImage(iconId, image);
                        console.log(`✅ Icono recargado: ${iconId} para "${name}"`);
                        resolve(true);
                      } else {
                        console.log(`ℹ️ Icono ${iconId} ya existe`);
                        resolve(true);
                      }
                    } catch (addError) {
                      console.error(`❌ Error agregando icono recargado ${iconId}:`, addError);
                      resolve(false);
                    }
                  } else {
                    resolve(false);
                  }
                });
              });
              
              reloadPromises.push(reloadPromise);
            }
            
            // Esperar a que todos los iconos se recarguen
            await Promise.allSettled(reloadPromises);
            
            // Verificar nuevamente
            let stillMissing = [];
            for (const {name, iconId} of missingIcons) {
              if (!map.hasImage(iconId)) {
                stillMissing.push(iconId);
              }
            }
            
            if (stillMissing.length > 0) {
              console.error(`❌ Aún faltan ${stillMissing.length} iconos después de recargar:`, stillMissing);
            } else {
              console.log(`✅ Todos los iconos recargados correctamente`);
            }
          } else {
            console.log(`✅ Verificación: Todos los ${iconMap.size} iconos están en el mapa`);
          }
        } catch (err) {
          console.error(`❌ Error cargando algunos iconos:`, err);
        }
        
        // Pequeño delay adicional para asegurar que los iconos estén completamente disponibles
        await new Promise(resolve => setTimeout(resolve, 200));

        // Actualizar propiedades de features para usar IDs de iconos
        let featuresWithIcons = 0;
        geojson.features.forEach(f => {
          const name = f.properties?.name;
          if (name) {
            // Normalizar nombre igual que al crear el icono
            const normalizedName = name.trim();
            
            // Buscar el icono en el mapa
            if (iconMap.has(normalizedName)) {
              const iconId = iconMap.get(normalizedName);
              // Verificar que el icono realmente existe en el mapa
              if (map.hasImage(iconId)) {
                f.properties.iconId = iconId;
                featuresWithIcons++;
                console.log(`  ✓ Feature "${name}" → iconId: ${iconId}`);
              } else {
                console.warn(`⚠️ Icono ${iconId} no existe en el mapa para "${name}"`);
                // Intentar usar el iconId de todas formas (puede estar cargándose)
                f.properties.iconId = iconId;
                featuresWithIcons++;
              }
            } else {
              // Si no está en el mapa, intentar construir el iconId directamente
              const safeName = normalizedName.replace(/[^a-zA-Z0-9]/g, "_");
              const iconId = `${id}-pin-${safeName}`;
              if (map.hasImage(iconId)) {
                f.properties.iconId = iconId;
                featuresWithIcons++;
                console.log(`  ✓ Feature "${name}" → iconId encontrado directamente: ${iconId}`);
              } else {
                console.warn(`⚠️ Feature "${name}" no tiene icono mapeado ni encontrado (iconId: ${iconId})`);
                // Asignar de todas formas para que intente cargarlo
                f.properties.iconId = iconId;
                featuresWithIcons++;
              }
            }
          } else if (f.properties?.icon && iconMap.has(f.properties.icon)) {
            const iconId = iconMap.get(f.properties.icon);
            f.properties.iconId = iconId;
            featuresWithIcons++;
          }
        });
        console.log(`✅ ${featuresWithIcons} de ${geojson.features.length} features tienen iconos asignados`);

        // Agregar listener para iconos faltantes (fallback)
        const imageMissingHandler = (e) => {
          if (e.id && e.id.startsWith(`${id}-pin-`)) {
            console.warn(`⚠️ Icono faltante detectado: ${e.id}, intentando cargar...`);
            // Extraer el nombre de la central del iconId
            const match = e.id.match(new RegExp(`${id}-pin-(.+)`));
            if (match) {
              const safeName = match[1];
              // Buscar el nombre original en el mapa de iconos
              let found = false;
              for (const [name, storedIconId] of iconMap.entries()) {
                if (storedIconId === e.id) {
                  found = true;
                  const label = name.length > 8 ? name.substring(0, 8).toUpperCase() : name.toUpperCase();
                  const pinUrl = createCentralPinIcon(CENTRAL_COLOR, label, 50);
                  
                  // Cargar el icono inmediatamente
                  map.loadImage(pinUrl, (error, image) => {
                    if (error) {
                      console.error(`❌ Error cargando icono bajo demanda ${e.id}:`, error);
                      return;
                    }
                    
                    if (image) {
                      try {
                        // Verificar nuevamente antes de agregar
                        if (!map.hasImage(e.id)) {
                          map.addImage(e.id, image);
                          console.log(`✅ Icono cargado bajo demanda: ${e.id} para "${name}"`);
                        } else {
                          console.log(`ℹ️ Icono ${e.id} ya existe (cargado por otro proceso)`);
                        }
                      } catch (addError) {
                        console.error(`❌ Error agregando icono ${e.id}:`, addError);
                      }
                    }
                  });
                  break;
                }
              }
              
              // Si no se encontró en el mapa, intentar construir el nombre desde el safeName
              if (!found) {
                // Intentar reconstruir el nombre (reemplazar _ con espacios y buscar)
                const possibleName = safeName.replace(/_/g, " ");
                const label = possibleName.length > 8 ? possibleName.substring(0, 8).toUpperCase() : possibleName.toUpperCase();
                const pinUrl = createCentralPinIcon(CENTRAL_COLOR, label, 50);
                
                map.loadImage(pinUrl, (error, image) => {
                  if (!error && image) {
                    try {
                      if (!map.hasImage(e.id)) {
                        map.addImage(e.id, image);
                        console.log(`✅ Icono cargado bajo demanda (reconstruido): ${e.id}`);
                      }
                    } catch (addError) {
                      console.error(`❌ Error agregando icono reconstruido ${e.id}:`, addError);
                    }
                  }
                });
              }
            }
          }
        };
        map.on("styleimagemissing", imageMissingHandler);
        
        // Crear source DESPUÉS de cargar todos los iconos y asignar iconId
        console.log(`📦 Creando source para ${id} con ${geojson.features.length} features`);
        map.addSource(id, {
          type: "geojson",
          data: geojson
        });
        console.log(`✅ Source ${id} creado con datos actualizados`);
        
        // Verificar que los iconId están en las features
        const sampleFeature = geojson.features[0];
        if (sampleFeature?.properties?.iconId) {
          console.log(`✅ Verificación: Feature de ejemplo tiene iconId: ${sampleFeature.properties.iconId}`);
        } else {
          console.error(`❌ ERROR: Feature de ejemplo NO tiene iconId`);
          console.log(`   Propiedades disponibles:`, Object.keys(sampleFeature?.properties || {}));
        }

        // Configurar layout para símbolos con iconos y etiquetas
        const layerConfig = {
          id,
          type: layerType,
          source: id,
          layout: {
            visibility: "visible", // ✅ Capas habilitadas por defecto
            ...(layer.layout || {}),
            // Icono desde propiedades (usar iconId generado del pin)
            "icon-image": [
              "coalesce",
              ["get", "iconId"],
              "marker-15" // Fallback a marcador de Mapbox
            ],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 0.8,  // Zoom 10: 80% del tamaño
            15, 1.0,  // Zoom 15: 100% del tamaño
            20, 1.2   // Zoom 20: 120% del tamaño
          ],
          "icon-opacity": 1, // Opacidad fija (icon-opacity no es una propiedad válida en layout)
          "icon-offset": [
            "coalesce",
            ["get", "icon-offset"],
            [0, 0]
          ],
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          // Etiqueta desde propiedades
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": [
            "coalesce",
            ["*", ["get", "label-scale"], 12],
            12
          ],
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-allow-overlap": true,
          "text-ignore-placement": true
        },
        paint: {
          "text-color": [
            "coalesce",
            ["get", "label-color"],
            "#000000"
          ],
          "text-opacity": [
            "coalesce",
            ["get", "label-opacity"],
            1
          ]
        }
        };

        map.addLayer(layerConfig);
        console.log(`✅ Capa symbol agregada: ${id} con ${geojson.features.length} features`);
        
        // Verificar que la capa se creó correctamente
        if (map.getLayer(id)) {
          const visibility = map.getLayoutProperty(id, "visibility");
          const iconImageExpr = map.getLayoutProperty(id, "icon-image");
          console.log(`✅ Verificación: Capa ${id} existe, visibilidad: ${visibility}`);
          console.log(`   Expresión icon-image:`, JSON.stringify(iconImageExpr));
          
          // Verificar que el source tiene datos
          const source = map.getSource(id);
          if (source && source._data) {
            const sourceFeatures = source._data.features || [];
            const featuresWithIconId = sourceFeatures.filter(f => f.properties?.iconId);
            console.log(`   Source tiene ${sourceFeatures.length} features, ${featuresWithIconId.length} con iconId`);
            if (featuresWithIconId.length > 0) {
              console.log(`   Ejemplo iconId: ${featuresWithIconId[0].properties.iconId}`);
            }
          }
        } else {
          console.error(`❌ ERROR: Capa ${id} NO se creó correctamente`);
        }
      } else {
        // Configuración para líneas y otros tipos
        map.addSource(id, {
          type: "geojson",
          data: geojson
        });

        const layerConfig = {
          id,
          type: layerType,
          source: id,
          layout: {
            visibility: "visible" // ✅ Capas habilitadas por defecto
          },
          paint: layer.paint || {
            "line-color": "#00ff90",
            "line-width": 4
          }
        };

        map.addLayer(layerConfig);
      }

      App.__ftthLayerIds.push(id);

      console.log("✅ Capa cargada y habilitada:", id, `(${geojson.features.length} features, tipo: ${layerType})`);

      // 🎯 Auto zoom automático al cargar (solo si hay datos)
      if (geojson.features.length > 0) {
        autoZoomToGeoJSON(geojson);
      }

    } catch (err) {
      console.error("❌ Error creando capa:", id, err);
    }
  }

  /* ===============================
     Restaurar al cambiar estilo
  =============================== */
  function restoreLayers() {
    if (restoring) return;
    restoring = true;

    console.log("🔄 Restaurando capas FTTH...");
    setTimeout(() => {
      loadFTTHTree();
      restoring = false;
    }, 400);
  }

  /* ===============================
     Eventos
  =============================== */
  App.map?.on("load", loadFTTHTree);
  App.map?.on("style.load", restoreLayers);

  /* ===============================
     API pública
  =============================== */
  App.loadFTTHTree = loadFTTHTree;

})();
