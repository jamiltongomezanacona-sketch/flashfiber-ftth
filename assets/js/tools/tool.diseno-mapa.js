/* =========================================================
   FlashFiber FTTH | Crear diseño de mapa
   Exportar vista actual del mapa como imagen PNG y PDF
========================================================= */

(function () {
  "use strict";

  function init() {
    var App = window.__FTTH_APP__;
    if (!App || !App.map) {
      setTimeout(init, 250);
      return;
    }
    var map = App.map;
    if (!map.getCanvas()) {
      setTimeout(init, 250);
      return;
    }

    var btnDisenoMapa = document.getElementById("btnDisenoMapa");
    var disenoMapaPanel = document.getElementById("disenoMapaPanel");
    var btnCloseDisenoMapa = document.getElementById("btnCloseDisenoMapa");
    var btnDescargarImagen = document.getElementById("btnDescargarImagenMapa");
    var btnDescargarPdf = document.getElementById("btnDescargarPdfMapa");
    var sidebar = document.getElementById("sidebar");

    if (!btnDisenoMapa || !disenoMapaPanel) {
      console.warn("🖼️ Crear diseño de mapa: no se encontraron btnDisenoMapa o disenoMapaPanel");
      return;
    }

    function openPanel() {
      if (sidebar && !sidebar.classList.contains("hidden")) {
        sidebar.classList.add("hidden");
        var overlay = document.querySelector(".sidebar-overlay");
        if (overlay) overlay.classList.remove("active");
      }
      disenoMapaPanel.classList.remove("hidden");
    }

    function closePanel() {
      disenoMapaPanel.classList.add("hidden");
    }

    function getMapDataURL(callback) {
      var map = App.map;
      if (!map || !map.getCanvas()) {
        if (callback) callback(null);
        return;
      }
      function doCapture() {
        try {
          map.repaint();
          var dataUrl = map.getCanvas().toDataURL("image/png");
          if (callback) callback(dataUrl);
        } catch (e) {
          console.warn("Export mapa:", e);
          if (callback) callback(null);
        }
      }
      if (map.isStyleLoaded()) {
        doCapture();
      } else {
        map.once("idle", doCapture);
        map.once("load", doCapture);
      }
    }

    function downloadImage() {
      btnDescargarImagen.disabled = true;
      btnDescargarImagen.textContent = " Generando...";
      getMapDataURL(function (dataUrl) {
        btnDescargarImagen.disabled = false;
        btnDescargarImagen.innerHTML = "<i class=\"fas fa-image\"></i> Descargar imagen (PNG)";
        if (!dataUrl) {
          alert("No se pudo generar la imagen. Recarga la página e inténtalo de nuevo.");
          return;
        }
        var a = document.createElement("a");
        a.href = dataUrl;
        a.download = "mapa-flashfiber-" + new Date().toISOString().slice(0, 10) + ".png";
        a.click();
      });
    }

    function downloadPdf() {
      var JsPDFClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jspdf || window.jsPDF);
      if (!JsPDFClass) {
        alert("Librería PDF no cargada. Recarga la página.");
        return;
      }
      btnDescargarPdf.disabled = true;
      btnDescargarPdf.textContent = " Generando PDF...";
      getMapDataURL(function (dataUrl) {
        btnDescargarPdf.disabled = false;
        btnDescargarPdf.innerHTML = "<i class=\"fas fa-file-pdf\"></i> Descargar PDF";
        if (!dataUrl) {
          alert("No se pudo generar el mapa para PDF. Recarga la página e inténtalo de nuevo.");
          return;
        }
        try {
          var canvas = App.map.getCanvas();
          var w = canvas.width;
          var h = canvas.height;
          var pdf = new JsPDFClass({
            orientation: w > h ? "landscape" : "portrait",
            unit: "mm",
            format: "a4"
          });
          var pdfW = pdf.internal.pageSize.getWidth();
          var pdfH = pdf.internal.pageSize.getHeight();
          var ratio = Math.min(pdfW / w, pdfH / h) * 0.95;
          var imgW = w * ratio;
          var imgH = h * ratio;
          pdf.addImage(dataUrl, "PNG", (pdfW - imgW) / 2, (pdfH - imgH) / 2, imgW, imgH);
          pdf.save("mapa-flashfiber-" + new Date().toISOString().slice(0, 10) + ".pdf");
        } catch (err) {
          console.error("PDF:", err);
          alert("Error al generar el PDF: " + (err.message || err));
        }
      });
    }

    btnDisenoMapa.addEventListener("click", openPanel);
    if (btnCloseDisenoMapa) btnCloseDisenoMapa.addEventListener("click", closePanel);
    if (btnDescargarImagen) btnDescargarImagen.addEventListener("click", downloadImage);
    if (btnDescargarPdf) btnDescargarPdf.addEventListener("click", downloadPdf);

    console.log("🖼️ Crear diseño de mapa listo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
