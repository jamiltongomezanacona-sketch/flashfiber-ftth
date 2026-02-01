/* =========================================================
   FlashFiber FTTH | Initializer
   Sistema de inicialización robusto sin setInterval
========================================================= */

class FTTHInitializer {
  constructor() {
    this.ready = false;
    this.listeners = [];
    this.maxAttempts = 50; // 5 segundos máximo (50 * 100ms)
  }

  /**
   * Inicializa el sistema esperando dependencias
   */
  async init() {
    try {
      // Esperar a que Firebase esté listo
      await this.waitForFirebase();
      
      // Configurar alias
      this.setupAliases();
      
      // Notificar que está listo
      this.ready = true;
      this.notifyListeners();
      
      console.log("✅ FTTH Initializer: Sistema inicializado");
    } catch (error) {
      console.error("❌ FTTH Initializer: Error inicializando", error);
    }
  }

  /**
   * Espera a que Firebase esté disponible
   */
  async waitForFirebase(maxAttempts = null) {
    const attempts = maxAttempts || this.maxAttempts;
    
    for (let i = 0; i < attempts; i++) {
      // Verificar si Firebase está disponible
      const db = this.getFirebaseDB();
      if (db) {
        return db;
      }
      
      // Esperar antes de intentar de nuevo
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error("Firebase no se inicializó a tiempo");
  }

  /**
   * Obtiene la instancia de DB de Firebase
   */
  getFirebaseDB() {
    // Prioridad: alias global → objeto principal → core
    return window.__FTTH_DB__ || 
           window.FTTH_FIREBASE?.db || 
           window.FTTH_CORE?.db || 
           null;
  }

  /**
   * Configura alias globales
   */
  setupAliases() {
    const db = this.getFirebaseDB();
    
    // ✅ Crear alias __FTTH_DB__ si no existe
    if (db && !window.__FTTH_DB__) {
      window.__FTTH_DB__ = db;
      console.log("✅ Alias __FTTH_DB__ creado");
    }
  }

  /**
   * Registra un callback para cuando el sistema esté listo
   */
  onReady(callback) {
    if (this.ready) {
      callback();
    } else {
      this.listeners.push(callback);
    }
  }

  /**
   * Notifica a todos los listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("❌ Error en listener de inicialización:", error);
      }
    });
    this.listeners = [];
  }

  /**
   * Verifica si el sistema está listo
   */
  isReady() {
    return this.ready;
  }
}

// ✅ Singleton
let initializerInstance = null;

export function getInitializer() {
  if (!initializerInstance) {
    initializerInstance = new FTTHInitializer();
  }
  return initializerInstance;
}

// ✅ Auto-inicializar cuando el DOM esté listo
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      getInitializer().init();
    });
  } else {
    // DOM ya está listo
    getInitializer().init();
  }
}

// ✅ Exponer globalmente para compatibilidad
if (typeof window !== "undefined") {
  window.__FTTH_INITIALIZER__ = getInitializer();
}

export default getInitializer;
