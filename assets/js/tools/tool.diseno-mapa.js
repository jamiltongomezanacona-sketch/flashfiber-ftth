/* =========================================================
   FlashFiber FTTH | Crear diseño de mapa
   Exportar vista actual con márgenes, título y notas (diseño profesional)
========================================================= */

(function () {
  "use strict";

  var MARGIN_PX = 40;
  var TOP_AREA_PX = 68;
  var BOTTOM_AREA_PX = 92;
  var MARGIN_MM = 15;
  var TITLE_FONT_PX = 24;
  var NOTES_FONT_PX = 16;
  var DATE_FONT_PX = 13;

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

    function getDesignOptions() {
      var tituloEl = document.getElementById("disenoMapaTitulo");
      var notasEl = document.getElementById("disenoMapaNotas");
      var fechaEl = document.getElementById("disenoMapaIncluirFecha");
      return {
        titulo: (tituloEl && tituloEl.value) ? String(tituloEl.value).trim() : "",
        notas: (notasEl && notasEl.value) ? String(notasEl.value).trim() : "",
        incluirFecha: fechaEl ? !!fechaEl.checked : true
      };
    }

    function formatDate() {
      var d = new Date();
      return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function wrapText(ctx, text, maxWidth) {
      var words = text.split(/\s+/);
      var lines = [];
      var line = "";
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + " " + words[i] : words[i];
        var m = ctx.measureText(test);
        if (m.width > maxWidth && line) {
          lines.push(line);
          line = words[i];
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    function buildCompositeCanvas(mapDataURL, mapW, mapH, options, callback) {
      var titulo = options.titulo || "Mapa FlashFiber FTTH";
      var notas = options.notas || "";
      var incluirFecha = options.incluirFecha;
      var fechaStr = formatDate();

      var totalW = mapW + 2 * MARGIN_PX;
      var totalH = TOP_AREA_PX + mapH + BOTTOM_AREA_PX;

      var canvas = document.createElement("canvas");
      canvas.width = totalW;
      canvas.height = totalH;
      var ctx = canvas.getContext("2d");
      if (!ctx) {
        if (callback) callback(null);
        return;
      }
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, totalW, totalH);

      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        ctx.drawImage(img, MARGIN_PX, TOP_AREA_PX, mapW, mapH);
        ctx.fillStyle = "#e0e0e0";
        ctx.font = "bold " + TITLE_FONT_PX + "px sans-serif";
        ctx.textBaseline = "top";
        var titleY = 16;
        var maxTitleW = totalW - 2 * MARGIN_PX;
        var titleLines = wrapText(ctx, titulo, maxTitleW);
        var titleLineHeight = TITLE_FONT_PX + 6;
        for (var t = 0; t < titleLines.length && t < 3; t++) {
          ctx.fillText(titleLines[t], MARGIN_PX, titleY + t * titleLineHeight);
        }
        var nextY = titleY + titleLines.length * titleLineHeight;
        if (incluirFecha) {
          ctx.font = DATE_FONT_PX + "px sans-serif";
          ctx.fillStyle = "#9ca3af";
          ctx.fillText("Fecha: " + fechaStr, MARGIN_PX, nextY + 6);
        }
        if (notas) {
          ctx.font = NOTES_FONT_PX + "px sans-serif";
          ctx.fillStyle = "#b0b0b0";
          var notesLines = wrapText(ctx, notas, maxTitleW);
          var notesStartY = TOP_AREA_PX + mapH + 18;
          var notesLineHeight = NOTES_FONT_PX + 5;
          for (var n = 0; n < notesLines.length && n < 7; n++) {
            ctx.fillText(notesLines[n], MARGIN_PX, notesStartY + n * notesLineHeight);
          }
        }
        try {
          if (callback) callback(canvas.toDataURL("image/png"));
        } catch (e) {
          if (callback) callback(null);
        }
      };
      img.onerror = function () {
        if (callback) callback(null);
      };
      img.src = mapDataURL;
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
        try {
          if (map.triggerRepaint) map.triggerRepaint();
        } catch (e) {}
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

    function ensureDataURL(result, callback) {
      if (!result) return callback(null);
      if (result.type === "dataurl") return callback(result.data);
      if (result.type === "blob") {
        var fr = new FileReader();
        fr.onload = function () { callback(fr.result || null); };
        fr.onerror = function () { callback(null); };
        fr.readAsDataURL(result.data);
        return;
      }
      callback(null);
    }

    function downloadImage() {
      btnDescargarImagen.disabled = true;
      btnDescargarImagen.textContent = " Generando...";
      var canvas = App.map.getCanvas();
      var mapW = canvas ? canvas.width : 800;
      var mapH = canvas ? canvas.height : 600;
      getMapImageForDownload(function (result) {
        if (!result) {
          btnDescargarImagen.disabled = false;
          btnDescargarImagen.innerHTML = "<i class=\"fas fa-image\"></i> Descargar imagen (PNG)";
          alert("No se pudo generar la imagen. Recarga la página e inténtalo de nuevo.");
          return;
        }
        ensureDataURL(result, function (dataURL) {
          if (!dataURL) {
            btnDescargarImagen.disabled = false;
            btnDescargarImagen.innerHTML = "<i class=\"fas fa-image\"></i> Descargar imagen (PNG)";
            alert("No se pudo procesar la imagen.");
            return;
          }
          var opts = getDesignOptions();
          buildCompositeCanvas(dataURL, mapW, mapH, opts, function (compositeDataURL) {
            btnDescargarImagen.disabled = false;
            btnDescargarImagen.innerHTML = "<i class=\"fas fa-image\"></i> Descargar imagen (PNG)";
            if (!compositeDataURL) {
              alert("No se pudo generar el diseño.");
              return;
            }
            var a = document.createElement("a");
            a.href = compositeDataURL;
            a.download = "mapa-flashfiber-" + new Date().toISOString().slice(0, 10) + ".png";
            a.click();
            if (result.fallback) {
              console.log("Se usó mapa estático (solo base). Capas propias no incluidas.");
            }
          });
        });
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
      var canvas = App.map.getCanvas();
      var mapW = canvas ? canvas.width : 800;
      var mapH = canvas ? canvas.height : 600;
      getMapImageForDownload(function (result) {
        if (!result) {
          btnDescargarPdf.disabled = false;
          btnDescargarPdf.innerHTML = "<i class=\"fas fa-file-pdf\"></i> Descargar PDF";
          alert("No se pudo generar el mapa para PDF. Recarga la página e inténtalo de nuevo.");
          return;
        }
        ensureDataURL(result, function (dataURL) {
          if (!dataURL) {
            btnDescargarPdf.disabled = false;
            btnDescargarPdf.innerHTML = "<i class=\"fas fa-file-pdf\"></i> Descargar PDF";
            alert("No se pudo procesar la imagen.");
            return;
          }
          var opts = getDesignOptions();
          buildCompositeCanvas(dataURL, mapW, mapH, opts, function (compositeDataURL) {
            btnDescargarPdf.disabled = false;
            btnDescargarPdf.innerHTML = "<i class=\"fas fa-file-pdf\"></i> Descargar PDF";
            if (!compositeDataURL) {
              alert("No se pudo generar el diseño para PDF.");
              return;
            }
            try {
              var totalW = mapW + 2 * MARGIN_PX;
              var totalH = TOP_AREA_PX + mapH + BOTTOM_AREA_PX;
              var pdf = new JsPDFClass({
                orientation: totalW > totalH ? "landscape" : "portrait",
                unit: "mm",
                format: "a4"
              });
              var pdfW = pdf.internal.pageSize.getWidth();
              var pdfH = pdf.internal.pageSize.getHeight();
              var ratio = Math.min((pdfW - 2 * MARGIN_MM) / totalW, (pdfH - 2 * MARGIN_MM) / totalH);
              var imgW = totalW * ratio;
              var imgH = totalH * ratio;
              pdf.addImage(compositeDataURL, "PNG", (pdfW - imgW) / 2, (pdfH - imgH) / 2, imgW, imgH);
              pdf.save("mapa-flashfiber-" + new Date().toISOString().slice(0, 10) + ".pdf");
            } catch (err) {
              console.error("PDF:", err);
              alert("Error al generar el PDF: " + (err.message || err));
            }
          });
        });
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
