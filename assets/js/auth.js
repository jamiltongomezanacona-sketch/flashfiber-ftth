/* =========================================
   FlashFiber FTTH | auth.js
   Control de login temporal por sesión
========================================= */

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  if (!form) return;

  /* ==========================
     Envío del formulario
  ========================== */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    errorMessage.textContent = "";

    // ⚠️ Validación temporal (luego irá a backend)
    if (username === "admin" && password === "1234567") {

      // Guardar sesión SOLO mientras el navegador esté abierto
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("user", JSON.stringify({
        username,
        role: "admin"
      }));

      // Redirección segura
      window.location.href = "pages/home.html";

    } else {
      errorMessage.textContent = "Usuario o contraseña incorrectos";
    }
  });

  /* ==========================
     Auto-redirección SOLO si
     ya hay sesión activa
  ========================== */
  const isLogged = sessionStorage.getItem("isLoggedIn");

  if (isLogged === "true") {
    window.location.href = "pages/home.html";
  }

});
