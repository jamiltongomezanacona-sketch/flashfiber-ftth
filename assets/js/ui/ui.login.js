/* =========================================================
   FlashFiber FTTH | Login UI Handler
========================================================= */

(() => {
  "use strict";

  // Esperar a que Supabase/Firebase esté listo (máx 8s para no quedar pegados)
  const LOGIN_CORE_TIMEOUT = 8000;
  const startedAt = Date.now();
  const waitForFirebase = setInterval(() => {
    if (window.FTTH_CORE?.login) {
      clearInterval(waitForFirebase);
      initLogin();
      return;
    }
    if (Date.now() - startedAt > LOGIN_CORE_TIMEOUT) {
      clearInterval(waitForFirebase);
      console.error("❌ FTTH_CORE no cargó a tiempo. Comprueba la consola y que supabase-env.js exista.");
      var errEl = document.getElementById("errorMessage");
      if (errEl) {
        errEl.textContent = "La app no cargó a tiempo. Recarga la página o revisa tu conexión.";
        errEl.classList.add("show");
      }
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

    // Botón Instalar app (PWA): visible en login; si ya está instalada, ocultar
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
          if (deferred) {
            deferred.prompt();
            const { outcome } = await deferred.userChoice;
            if (outcome === "accepted") installAppBtn.classList.add("hidden");
            window.__ftthDeferredInstall = null;
          } else if (isIos && installIosHint) {
            installIosHint.scrollIntoView({ behavior: "smooth", block: "nearest" });
          } else {
            try {
              const msg = "Para instalar: en Chrome/Edge usa el menú (⋮) → \"Instalar Flash Fiber\" o \"Instalar aplicación\".";
              if (typeof alert === "function") alert(msg);
            } catch (_) {}
          }
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

      const LOGIN_TIMEOUT_MS = 15000;
      function loginWithTimeout() {
        return new Promise((resolve, reject) => {
          const t = setTimeout(() => {
            reject(new Error("TIMEOUT"));
          }, LOGIN_TIMEOUT_MS);
          window.FTTH_CORE.login(email, password).then((r) => { clearTimeout(t); resolve(r); }).catch((e) => { clearTimeout(t); reject(e); });
        });
      }

      try {
        await loginWithTimeout();
        console.log("✅ Login exitoso");
      } catch (error) {
        console.error("❌ Error en login:", error);
        
        // Mensaje amigable (Supabase usa error.message; Firebase usaba error.code)
        let errorMsg = "Error al iniciar sesión";
        const msg = (error && error.message) ? String(error.message).toLowerCase() : "";
        if (error?.message === "TIMEOUT" || msg.includes("timeout")) {
          errorMsg = "La conexión tardó demasiado. Revisa tu internet e intenta de nuevo.";
        } else if (msg.includes("invalid login") || msg.includes("invalid_credentials")) {
          errorMsg = "Correo o contraseña incorrectos";
        } else if (msg.includes("email") && msg.includes("invalid")) {
          errorMsg = "Correo electrónico inválido";
        } else if (msg.includes("network") || msg.includes("fetch")) {
          errorMsg = "Error de conexión. Verifica tu internet";
        } else if (error?.message) {
          errorMsg = error.message;
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
        window.location.href = (typeof window.__FTTH_REDIRECT_AFTER_LOGIN__ === "function" && window.__FTTH_REDIRECT_AFTER_LOGIN__()) || "pages/home.html";
      }
    });
  }

  async function checkAuthState() {
    // Supabase: comprobar si ya hay sesión (sin usar Firebase)
    if (!window.FTTH_CORE?.auth || !window.FTTH_CORE?.db) return;
    try {
      const { data: { session } } = await window.FTTH_CORE.db.auth.getSession();
      if (session?.user) {
        console.log("✅ Usuario ya autenticado, redirigiendo...");
        window.location.href = (typeof window.__FTTH_REDIRECT_AFTER_LOGIN__ === "function" && window.__FTTH_REDIRECT_AFTER_LOGIN__()) || "pages/home.html";
      }
    } catch (err) {
      console.warn("checkAuthState:", err);
    }
  }
})();
