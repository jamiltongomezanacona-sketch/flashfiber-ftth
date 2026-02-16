/* =========================================================
   FlashFiber FTTH | Crear diseño de mapa
   Exportar vista actual del mapa como imagen PNG y PDF
========================================================= */

(function () {
  "use strict";

  function init() {
    const App = window.__FTTH_APP__;
    if (!App?.map) {
      setTimeout(init, 200);
      return;
    }

    const btnDisenoMapa = document.getElementById("btnDisenoMapa");
    const disenoMapaPanel = document.getElementById("disenoMapaPanel");
    const btnCloseDisenoMapa = document.getElementById("btnCloseDisenoMapa");
    const btnDescargarImagen = document.getElementById("btnDescargarImagenMapa");
    const btnDescargarPdf = document.getElementById("btnDescargarPdfMapa");
    const sidebar = document.getElementById("sidebar");

    if (!btnDisenoMapa || !disenoMapaPanel) return;

    function openPanel() {
      if (sidebar && !sidebar.classList.contains("hidden")) {
        sidebar.classList.add("hidden");
        const overlay = document.querySelector(".sidebar-overlay");
        if (overlay) overlay.classList.remove("active");
      }
      disenoMapaPanel.classList.remove("hidden");
    }

    function closePanel() {
      disenoMapaPanel.classList.add("hidden");
    }

    function getMapDataURL() {
      const map = App.map;
      if (!map || !map.getCanvas()) return null;
      try {
        return map.getCanvas().toDataURL("image/png");
      } catch (e) {
        console.warn("Export mapa:", e);
        return null;
      }
    }

    function downloadImage() {
      const dataUrl = getMapDataURL();
      if (!dataUrl) {
        alert("No se pudo generar la imagen. Asegúrate de que el mapa esté cargado.");
        return;
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "mapa-flashfiber-" + new Date().toISOString().slice(0, 10) + ".png";
      a.click();
    }

    function downloadPdf() {
      const dataUrl = getMapDataURL();
      if (!dataUrl) {
        alert("No se pudo generar el mapa para PDF. Asegúrate de que el mapa esté cargado.");
        return;
      }
      var JsPDF = (typeof window !== "undefined" && (window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : window.jspdf || window.jsPDF));
      if (!JsPDF) {
        alert("Librería PDF no cargada. Recarga la página.");
        return;
      }
      try {
        var canvas = App.map.getCanvas();
        var w = canvas.width;
        var h = canvas.height;
        var pdf = new JsPDF({
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
        alert("Error al generar el PDF.");
      }
    }

    btnDisenoMapa.addEventListener("click", openPanel);
    btnCloseDisenoMapa?.addEventListener("click", closePanel);
    btnDescargarImagen?.addEventListener("click", downloadImage);
    btnDescargarPdf?.addEventListener("click", downloadPdf);

    console.log("🖼️ Crear diseño de mapa listo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
