/**
 * Entry point para bundle Vite - mapa FTTH
 * Orden: initializer → Firebase → auth → servicios → app → storage → mapa → tools → ui
 * Cargar después de: Mapbox, Turf, config.js, devtools-guard.js
 */

// Core
import "./core/initializer.js";
import "./services/firebase.js";
import "./services/firebase.db.js";
import "./core/auth.guard.js";
import "./services/firebase.cierres.js";
import "./services/firebase.eventos.js";
import "./services/firebase.rutas.js";
import "./services/firebase.storage.js";

// App + storage + utils
import "./app.js";
import "./storage.js";
import "./storage.cierres.js";
import "./utils/centrales.js";
import "./ui/ui.menu.js";

// Mapa
import "./map/mapa.init.js";
import "./map/mapa.controls.js";
import "./map/mapa.layers.js";
import "./map/mapa.ftth.js";

// Tools
import "./tools/tool.medicion.js";
import "./tools/tool.gps.js";
import "./tools/tool.navegacion.js";
import "./tools/tool.capas.js";
import "./tools/tool.rutas.js";
import "./tools/tool.cierres.js";
import "./tools/tool.eventos.js";
import "./tools/tool.diseno-mapa.js";

// UI
import "./ui/ui.panel.js";
import "./ui/ui.layers.tree.js";
import "./ui/ui.buscador.js";
