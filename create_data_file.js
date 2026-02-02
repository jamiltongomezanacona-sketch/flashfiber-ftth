// Script para crear el archivo de datos desde stdin
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'datos_santa_ines.json');

console.log('📝 Creando archivo de datos...');
console.log('💡 Pega los datos GeoJSON y presiona Ctrl+D (Linux/Mac) o Ctrl+Z + Enter (Windows)\n');

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    // Intentar parsear como JSON
    const data = JSON.parse(input);
    
    // Validar que sea un FeatureCollection
    if (data.type !== 'FeatureCollection') {
      console.error('❌ Error: El JSON debe ser de tipo "FeatureCollection"');
      process.exit(1);
    }
    
    // Guardar archivo
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`\n✅ Archivo guardado: ${DATA_FILE}`);
    console.log(`📦 Features: ${data.features?.length || 0}\n`);
    console.log('🚀 Ahora ejecuta: node setup_and_process.js');
    
  } catch (e) {
    console.error('❌ Error parseando JSON:', e.message);
    process.exit(1);
  }
});

process.stdin.on('error', err => {
  console.error('❌ Error leyendo entrada:', err.message);
  process.exit(1);
});
