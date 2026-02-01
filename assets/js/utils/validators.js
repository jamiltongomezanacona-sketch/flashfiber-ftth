/* =========================================================
   FlashFiber FTTH | Validators
   Validaciones centralizadas y reutilizables
========================================================= */

export const validators = {
  /**
   * Valida coordenadas geográficas
   * @param {number} lng - Longitud
   * @param {number} lat - Latitud
   * @returns {Object} { valid: boolean, error?: string }
   */
  coordenadas(lng, lat) {
    // Validar tipos
    if (typeof lng !== "number" || typeof lat !== "number") {
      return { 
        valid: false, 
        error: "Las coordenadas deben ser números" 
      };
    }

    // Validar que sean números finitos
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return { 
        valid: false, 
        error: "Las coordenadas deben ser números válidos" 
      };
    }

    // Validar rangos
    if (lng < -180 || lng > 180) {
      return { 
        valid: false, 
        error: "Longitud fuera de rango válido (-180 a 180)" 
      };
    }

    if (lat < -90 || lat > 90) {
      return { 
        valid: false, 
        error: "Latitud fuera de rango válido (-90 a 90)" 
      };
    }

    return { valid: true, lng, lat };
  },

  /**
   * Valida un archivo de imagen
   * @param {File} file - Archivo a validar
   * @param {number} maxSize - Tamaño máximo en bytes (default: 5MB)
   * @returns {Object} { valid: boolean, error?: string }
   */
  archivo(file, maxSize = 5 * 1024 * 1024) {
    if (!file) {
      return { valid: false, error: "Archivo requerido" };
    }

    if (!(file instanceof File)) {
      return { valid: false, error: "Debe ser un objeto File válido" };
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      return { valid: false, error: "El archivo debe ser una imagen" };
    }

    // Validar tamaño
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      return { 
        valid: false, 
        error: `El tamaño máximo permitido es ${maxSizeMB}MB` 
      };
    }

    // Validar que el tamaño no sea 0
    if (file.size === 0) {
      return { valid: false, error: "El archivo está vacío" };
    }

    return { valid: true, file };
  },

  /**
   * Valida texto
   * @param {string} texto - Texto a validar
   * @param {number} minLength - Longitud mínima
   * @param {number} maxLength - Longitud máxima
   * @returns {Object} { valid: boolean, error?: string, value?: string }
   */
  texto(texto, minLength = 1, maxLength = 500) {
    if (!texto || typeof texto !== "string") {
      return { valid: false, error: "Texto requerido" };
    }

    const trimmed = texto.trim();

    if (trimmed.length < minLength) {
      return { 
        valid: false, 
        error: `El texto debe tener al menos ${minLength} caracteres` 
      };
    }

    if (trimmed.length > maxLength) {
      return { 
        valid: false, 
        error: `El texto no puede exceder ${maxLength} caracteres` 
      };
    }

    return { valid: true, value: trimmed };
  },

  /**
   * Valida email
   * @param {string} email - Email a validar
   * @returns {Object} { valid: boolean, error?: string }
   */
  email(email) {
    if (!email || typeof email !== "string") {
      return { valid: false, error: "Email requerido" };
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: "Email inválido" };
    }

    return { valid: true, value: trimmed };
  },

  /**
   * Valida que un valor no esté vacío
   * @param {*} value - Valor a validar
   * @param {string} fieldName - Nombre del campo
   * @returns {Object} { valid: boolean, error?: string }
   */
  requerido(value, fieldName = "Campo") {
    if (value === null || value === undefined || value === "") {
      return { valid: false, error: `${fieldName} es requerido` };
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return { valid: false, error: `${fieldName} no puede estar vacío` };
    }

    return { valid: true, value };
  },

  /**
   * Valida código de cierre (formato: E2BA01_A1)
   * @param {string} codigo - Código a validar
   * @returns {Object} { valid: boolean, error?: string }
   */
  codigoCierre(codigo) {
    const result = this.texto(codigo, 3, 20);
    if (!result.valid) return result;

    const codigoRegex = /^[EN]?\d?[A-Z]{2}\d{2}_[A-Z]?\d+$/i;
    if (!codigoRegex.test(result.value)) {
      return { 
        valid: false, 
        error: "Formato inválido. Ejemplo: E2BA01_A1" 
      };
    }

    return { valid: true, value: result.value.toUpperCase() };
  }
};

// ✅ Exportar para uso en módulos ES6
if (typeof module !== "undefined" && module.exports) {
  module.exports = validators;
}

// ✅ Exponer globalmente para compatibilidad
if (typeof window !== "undefined") {
  window.validators = validators;
}

export default validators;
