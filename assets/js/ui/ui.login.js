/* =========================================================
   FlashFiber FTTH | Login UI Handler
========================================================= */

(() => {
  "use strict";

  // Esperar a que Firebase esté listo
  const waitForFirebase = setInterval(() => {
    if (window.FTTH_CORE?.login) {
      clearInterval(waitForFirebase);
      initLogin();
    }
  }, 100);

  function initLogin() {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const loginButtonText = document.getElementById("loginButtonText");
    const errorMessage = document.getElementById("errorMessage");
    const installAppBtn = document.getElementById("installAppBtn");
    const installIosHint = document.getElementById("installIosHint");
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // Verificar si ya está autenticado
    checkAuthState();

    // Botón Instalar app (PWA): solo si el navegador lo permite y no está ya instalada
    if (installAppBtn) {
      if (isStandalone) {
        installAppBtn.classList.add("hidden");
      } else {
        window.addEventListener("beforeinstallprompt", (e) => {
          e.preventDefault();
          window.__ftthDeferredInstall = e;
          installAppBtn.classList.remove("hidden");
          if (installIosHint) installIosHint.classList.remove("show");
        });
        installAppBtn.addEventListener("click", async () => {
          const deferred = window.__ftthDeferredInstall;
          if (!deferred) return;
          deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === "accepted") installAppBtn.classList.add("hidden");
          window.__ftthDeferredInstall = null;
        });
      }
    }

    // En iPhone/iPad no hay beforeinstallprompt: mostrar indicación para instalar desde Compartir
    if (installIosHint && isIos && !isStandalone) {
      installIosHint.classList.add("show");
    }

    // Manejar envío del formulario
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleLogin();
    });

    async function handleLogin() {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      // Validación básica
      if (!email || !password) {
        showError("Por favor, completa todos los campos");
        return;
      }

      // Deshabilitar botón y mostrar loading
      loginButton.disabled = true;
      loginButtonText.innerHTML = '<span class="loading"></span>Iniciando sesión...';

      try {
        // Intentar login con Firebase
        await window.FTTH_CORE.login(email, password);
        
        // El onAuthStateChanged en firebase.js manejará la redirección
        // Si llegamos aquí, el login fue exitoso
        console.log("✅ Login exitoso");
        
      } catch (error) {
        console.error("❌ Error en login:", error);
        
        // Mostrar mensaje de error amigable
        let errorMsg = "Error al iniciar sesión";
        
        switch (error.code) {
          case "auth/user-not-found":
            errorMsg = "Usuario no encontrado";
            break;
          case "auth/wrong-password":
            errorMsg = "Contraseña incorrecta";
            break;
          case "auth/invalid-email":
            errorMsg = "Correo electrónico inválido";
            break;
          case "auth/user-disabled":
            errorMsg = "Usuario deshabilitado";
            break;
          case "auth/too-many-requests":
            errorMsg = "Demasiados intentos. Intenta más tarde";
            break;
          case "auth/network-request-failed":
            errorMsg = "Error de conexión. Verifica tu internet";
            break;
          default:
            errorMsg = error.message || "Error al iniciar sesión";
        }
        
        showError(errorMsg);
        
        // Rehabilitar botón
        loginButton.disabled = false;
        loginButtonText.textContent = "Iniciar Sesión";
      }
    }

    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.classList.add("show");
      
      // Ocultar después de 5 segundos
      setTimeout(() => {
        errorMessage.classList.remove("show");
      }, 5000);
    }

    // Escuchar cambios de autenticación
    window.FTTH_CORE.onUserChange((user) => {
      if (user && window.__USER__) {
        // Usuario autenticado y perfil cargado
        console.log("✅ Usuario autenticado, redirigiendo...");
        window.location.href = "pages/home.html";
      }
    });
  }

  async function checkAuthState() {
    // Verificar si ya hay un usuario autenticado
    if (window.FTTH_CORE?.auth) {
      const { onAuthStateChanged } = await import(
        "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js"
      );
      
      onAuthStateChanged(window.FTTH_CORE.auth, (user) => {
        if (user) {
          // Ya hay un usuario autenticado, redirigir
          console.log("✅ Usuario ya autenticado, redirigiendo...");
          window.location.href = "pages/home.html";
        }
      });
    }
  }
})();
