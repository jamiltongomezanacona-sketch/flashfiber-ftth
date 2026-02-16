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
      var canvas = map && map.getCanvas();
      if (!map || !canvas) {
        if (callback) callback(null, null);
        return;
      }
      function doCapture() {
        map.repaint();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            var dataUrl = null;
            var blob = null;
            try {
              dataUrl = canvas.toDataURL("image/png");
            } catch (e) {
              console.warn("toDataURL falló (canvas tainted?):", e.message || e);
            }
            if (dataUrl && dataUrl.length > 100) {
              if (callback) callback(dataUrl, null);
              return;
            }
            if (canvas.toBlob) {
              canvas.toBlob(function (b) {
                if (b && callback) callback(null, b);
                else if (callback) callback(null, null);
              }, "image/png");
            } else {
              if (callback) callback(null, null);
            }
          });
        });
      }
      if (map.isStyleLoaded()) {
        doCapture();
      } else {
        map.once("idle", doCapture);
        map.once("load", doCapture);
      }
    }

    function getMapImageForDownload(callback) {
      getMapDataURL(function (dataUrl, blob) {
        if (dataUrl) return callback({ type: "dataurl", data: dataUrl });
        if (blob) return callback({ type: "blob", data: blob });
        tryStaticMapFallback(callback);
      });
    }

    function tryStaticMapFallback(callback) {
      var map = App.map;
      var CONFIG = window.__FTTH_CONFIG__;
      var token = CONFIG && CONFIG.MAPBOX_TOKEN;
      if (!token || !map) {
        if (callback) callback(null);
        return;
      }
      var center = map.getCenter();
      var zoom = Math.round(map.getZoom());
      var bearing = Math.round(map.getBearing());
      var pitch = Math.round(map.getPitch());
      var canvas = map.getCanvas();
      var w = Math.min(canvas.width, 1280);
      var h = Math.min(canvas.height, 1280);
      var style = "mapbox/streets-v12";
      var url = "https://api.mapbox.com/styles/v1/" + style + "/static/" +
        center.lng + "," + center.lat + "," + zoom + "," + bearing + "," + pitch + "/" + w + "x" + h + "@2x?access_token=" + encodeURIComponent(token);
      fetch(url).then(function (r) { return r.blob(); }).then(function (blob) {
        if (callback) callback({ type: "blob", data: blob, fallback: true });
      }).catch(function (err) {
        console.warn("Static map fallback:", err);
        if (callback) callback(null);
      });
    }

    function downloadImage() {
      btnDescargarImagen.disabled = true;
      btnDescargarImagen.textContent = " Generando...";
      getMapImageForDownload(function (result) {
        btnDescargarImagen.disabled = false;
        btnDescargarImagen.innerHTML = "<i class=\"fas fa-image\"></i> Descargar imagen (PNG)";
        if (!result) {
          alert("No se pudo generar la imagen. Recarga la página e inténtalo de nuevo.");
          return;
        }
        var a = document.createElement("a");
        var filename = "mapa-flashfiber-" + new Date().toISOString().slice(0, 10) + ".png";
        if (result.type === "dataurl") {
          a.href = result.data;
          a.download = filename;
        } else if (result.type === "blob") {
          a.href = URL.createObjectURL(result.data);
          a.download = filename;
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 200);
        }
        a.click();
        if (result.fallback) {
          console.log("Se usó mapa estático (solo base). Capas propias no incluidas.");
        }
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
      getMapImageForDownload(function (result) {
        btnDescargarPdf.disabled = false;
        btnDescargarPdf.innerHTML = "<i class=\"fas fa-file-pdf\"></i> Descargar PDF";
        if (!result) {
          alert("No se pudo generar el mapa para PDF. Recarga la página e inténtalo de nuevo.");
          return;
        }
        function addPdfImage(imgData) {
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
          pdf.addImage(imgData, "PNG", (pdfW - imgW) / 2, (pdfH - imgH) / 2, imgW, imgH);
          pdf.save("mapa-flashfiber-" + new Date().toISOString().slice(0, 10) + ".pdf");
        }
        if (result.type === "dataurl") {
          try {
            addPdfImage(result.data);
          } catch (err) {
            console.error("PDF:", err);
            alert("Error al generar el PDF: " + (err.message || err));
          }
          return;
        }
        if (result.type === "blob") {
          var fr = new FileReader();
          fr.onload = function () {
            try {
              addPdfImage(fr.result);
            } catch (err) {
              console.error("PDF:", err);
              alert("Error al generar el PDF: " + (err.message || err));
            }
          };
          fr.onerror = function () { alert("Error al leer la imagen para PDF."); };
          fr.readAsDataURL(result.data);
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
