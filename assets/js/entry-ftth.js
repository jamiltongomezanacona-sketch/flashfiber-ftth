/**
 * Entry point para bundle Vite - mapa FTTH.
 *
 * Orden de carga (respetar dependencias):
 * 1. config (externo: config.js) → __FTTH_CONFIG__, __FTTH_SECRETS__
 * 2. initializer → Supabase → auth → servicios
 * 3. app → storage → utils (centrales)
 * 4. mapa (init → controls → layers → ftth)
 * 5. tools (medicion, gps, navegacion, capas, rutas, cierres, eventos, diseno-mapa)
 * 6. ui (panel, layers.tree, buscador)
 *
 * Dependencias globales esperadas: Mapbox GL, Turf, config.js, devtools-guard.js.
 * App y mapa: window.__FTTH_APP__, App.setMap(), App.map.
 */

// Core
import "./core/initializer.js";
import "../../supabase.js";
import "./services/supabase.core.js";
import "./services/supabase.db.js";
import "./core/auth.guard.js";
import "./services/supabase.cierres.js";
import "./services/supabase.eventos.js";
import "./services/supabase.eventosCorp.js";
import "./services/supabase.rutas.js";
import "./services/supabase.storage.js";

// Utils (exponer para tools que no son ESM: cierres, eventos)
import ErrorHandler from "./utils/errorHandler.js";
import { validators } from "./utils/validators.js";
if (typeof window !== "undefined") {
  window.ErrorHandler = ErrorHandler;
  window.__FTTH_VALIDATORS__ = validators;
}

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
import "./ui/ui.rutas.js";
