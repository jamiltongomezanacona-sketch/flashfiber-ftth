/* =========================================================
   FlashFiber FTTH | Error Handler
   Sistema centralizado de manejo de errores
========================================================= */

class ErrorHandler {
  /**
   * Maneja un error y lo registra
   * @param {Error} error - El error a manejar
   * @param {string} context - Contexto donde ocurrió el error
   * @param {Object} metadata - Metadatos adicionales
   */
  static handle(error, context = "", metadata = {}) {
    const errorInfo = {
      message: error.message || "Error desconocido",
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
      ...metadata
    };

    // Log detallado en desarrollo
    const isDev = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1";

    if (isDev) {
      console.group(`❌ [${context}]`);
      console.error("Mensaje:", errorInfo.message);
      console.error("Stack:", errorInfo.stack);
      if (Object.keys(metadata).length > 0) {
        console.error("Metadata:", metadata);
      }
      console.groupEnd();
    } else {
      // Solo mensaje en producción
      console.error(`❌ [${context}] ${errorInfo.message}`);
    }

    // ✅ Aquí puedes enviar a servicio de monitoreo (Sentry, etc.)
    // this.reportToSentry(errorInfo);

    return errorInfo;
  }

  /**
   * Ejecuta una función async de forma segura
   * @param {Function} fn - Función async a ejecutar
   * @param {string} context - Contexto para logging
   * @param {*} fallback - Valor a retornar en caso de error
   * @returns {Promise<*>}
   */
  static async safeAsync(fn, context, fallback = null) {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  /**
   * Ejecuta una función sync de forma segura
   * @param {Function} fn - Función a ejecutar
   * @param {string} context - Contexto para logging
   * @param {*} fallback - Valor a retornar en caso de error
   * @returns {*}
   */
  static safeSync(fn, context, fallback = null) {
    try {
      return fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  /**
   * Valida y maneja errores de validación
   * @param {Function} validator - Función de validación
   * @param {*} value - Valor a validar
   * @param {string} fieldName - Nombre del campo
   * @returns {Object} { valid: boolean, error?: string }
   */
  static validate(validator, value, fieldName) {
    try {
      const result = validator(value);
      if (!result.valid) {
        this.handle(
          new Error(result.error || `Validación fallida: ${fieldName}`),
          `validate:${fieldName}`
        );
      }
      return result;
    } catch (error) {
      this.handle(error, `validate:${fieldName}`);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Crea un mensaje de error amigable para el usuario
   * @param {Error} error - El error original
   * @returns {string} Mensaje amigable
   */
  static getUserMessage(error) {
    const errorMessages = {
      "NetworkError": "Error de conexión. Verifica tu internet.",
      "QuotaExceededError": "Se ha excedido el límite de almacenamiento.",
      "PermissionDenied": "No tienes permisos para realizar esta acción.",
      "NotFound": "El recurso solicitado no existe.",
      "InvalidArgument": "Los datos proporcionados son inválidos."
    };

    // Buscar mensaje específico
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.message.includes(key) || error.name === key) {
        return message;
      }
    }

    // Mensaje genérico
    return "Ocurrió un error inesperado. Por favor, intenta nuevamente.";
  }
}

// ✅ Exportar para uso en módulos ES6
if (typeof module !== "undefined" && module.exports) {
  module.exports = ErrorHandler;
}

// ✅ Exponer globalmente para compatibilidad
if (typeof window !== "undefined") {
  window.ErrorHandler = ErrorHandler;
}

export default ErrorHandler;
