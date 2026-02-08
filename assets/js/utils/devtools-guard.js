/* =========================================================
   FlashFiber FTTH | Disuasión DevTools (F12)
   Nota: No es posible bloquear F12; este script solo muestra
   un aviso y opcionalmente desactiva clic derecho.
   Para mayor protección, usar ofuscación en build de producción.
========================================================= */

(function () {
  "use strict";

  var messageShown = false;
  var msg = "Uso reservado para el equipo técnico. No copies ni pegues código aquí.";

  function showWarning() {
    if (messageShown) return;
    messageShown = true;
    if (typeof console !== "undefined" && console.warn) {
      console.warn("%c\u26a0 " + msg, "color:#e65100;font-weight:bold;");
    }
    try {
      var toast = document.createElement("div");
      toast.setAttribute("role", "alert");
      toast.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#1e4976;color:#e6f7ff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:90%;text-align:center;";
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 4000);
    } catch (e) {}
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C"))) {
      e.preventDefault();
      showWarning();
    }
  });

  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && (e.key === "u" || e.key === "U")) e.preventDefault();
  });
})();
