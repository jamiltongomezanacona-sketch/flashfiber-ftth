// Script para guardar datos GeoJSON desde stdin a archivo
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'datos_santa_ines.json');

console.log('📝 Guardando datos GeoJSON...');
console.log('💡 Pega los datos JSON completos y presiona Ctrl+Z + Enter (Windows) o Ctrl+D (Linux/Mac)\n');

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    // Intentar parsear como JSON
    const data = JSON.parse(input.trim());
    
    // Validar que sea un FeatureCollection
    if (data.type !== 'FeatureCollection') {
      console.error('❌ Error: El JSON debe ser de tipo "FeatureCollection"');
      process.exit(1);
    }
    
    if (!data.features || !Array.isArray(data.features)) {
      console.error('❌ Error: El JSON debe tener un array "features"');
      process.exit(1);
    }
    
    // Guardar archivo
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`\n✅ Archivo guardado: ${DATA_FILE}`);
    console.log(`📦 Features: ${data.features.length}`);
    console.log(`📏 Tamaño: ${(fs.statSync(DATA_FILE).size / 1024).toFixed(2)} KB\n`);
    console.log('🚀 Ahora ejecuta: node setup_and_process.js');
    
  } catch (e) {
    console.error('❌ Error parseando JSON:', e.message);
    console.error('\n💡 Asegúrate de que el JSON esté bien formateado.');
    process.exit(1);
  }
});

process.stdin.on('error', err => {
  console.error('❌ Error leyendo entrada:', err.message);
  process.exit(1);
});
