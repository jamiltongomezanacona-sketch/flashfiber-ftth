// Script para crear el archivo datos_santa_ines.json desde el objeto proporcionado
const fs = require('fs');
const path = require('path');

// Los datos GeoJSON completos que el usuario proporcionó
// Nota: Este archivo contiene solo una muestra. Los datos completos deben ser proporcionados.
const geojsonData = {
  "type": "FeatureCollection",
  "features": []
};

console.log('📝 Este script necesita los datos completos.');
console.log('💡 Por favor, proporciona los datos GeoJSON completos.');
console.log('\nAlternativa: Usa el script create_data_file.js para crear el archivo desde stdin:');
console.log('  node create_data_file.js');
console.log('  (Pega los datos JSON y presiona Ctrl+Z + Enter)');
