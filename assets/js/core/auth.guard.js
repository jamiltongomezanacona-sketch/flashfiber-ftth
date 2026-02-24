/* =========================================================
   FlashFiber FTTH | Auth Guard - Protección de Rutas
========================================================= */

(() => {
  "use strict";

  // Esperar a que Firebase esté listo
  const waitForFirebase = setInterval(() => {
    if (window.FTTH_CORE?.auth) {
      clearInterval(waitForFirebase);
      initAuthGuard();
    }
  }, 100);

  function initAuthGuard() {
    const { onUserChange } = window.FTTH_CORE;
    
    if (!onUserChange) {
      console.error("❌ onUserChange no disponible");
      return;
    }
    
    // Verificar estado de autenticación
    onUserChange(async (user) => {
      if (!user) {
        // No hay usuario autenticado, redirigir a login
        console.log("🔒 No autenticado, redirigiendo a login...");
        window.location.href = "../index.html";
        return;
      }

      // Hay usuario, verificar perfil
      // Esperar un momento para que el perfil se cargue
      await waitForUserProfile();

      if (!window.__USER__) {
        // El perfil no se cargó o el usuario no está autorizado
        console.log("🔒 Usuario no autorizado, redirigiendo a login...");
        window.location.href = "../index.html";
        return;
      }

      console.log("✅ Usuario autenticado:", window.__USER__);
    });
  }

  function waitForUserProfile() {
    return new Promise((resolve) => {
      // Si ya está cargado, resolver inmediatamente
      if (window.__USER__) {
        resolve();
        return;
      }

      // Esperar hasta 5 segundos para que se cargue el perfil
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos (50 * 100ms)

      const checkInterval = setInterval(() => {
        attempts++;

        if (window.__USER__) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve(); // Resolver de todas formas para no bloquear
        }
      }, 100);
    });
  }
})();
export {};
