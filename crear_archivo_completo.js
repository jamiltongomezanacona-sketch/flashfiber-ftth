// Script para crear el archivo datos_santa_ines.json completo
// Este script lee los datos desde stdin y los guarda en el archivo
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'datos_santa_ines.json');

console.log('📝 Creando archivo datos_santa_ines.json');
console.log('💡 Por favor, proporciona los datos GeoJSON completos');
console.log('   (Copia y pega el objeto FeatureCollection completo)');
console.log('   Presiona Ctrl+Z + Enter cuando termines\n');

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    // Limpiar y parsear
    const cleaned = input.trim();
    if (!cleaned) {
      console.error('❌ No se recibieron datos');
      process.exit(1);
    }
    
    const data = JSON.parse(cleaned);
    
    // Validar estructura
    if (data.type !== 'FeatureCollection') {
      console.error('❌ Error: El JSON debe ser de tipo "FeatureCollection"');
      process.exit(1);
    }
    
    if (!data.features || !Array.isArray(data.features)) {
      console.error('❌ Error: El JSON debe tener un array "features"');
      process.exit(1);
    }
    
    // Guardar archivo
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    
    const stats = fs.statSync(DATA_FILE);
    console.log(`\n✅ Archivo creado exitosamente: ${DATA_FILE}`);
    console.log(`📦 Features: ${data.features.length}`);
    console.log(`📏 Tamaño: ${(stats.size / 1024).toFixed(2)} KB\n`);
    console.log('🚀 Ahora ejecuta: node setup_and_process.js\n');
    
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    console.error('\n💡 Asegúrate de:');
    console.error('   - Que el JSON esté bien formateado');
    console.error('   - Que sea un objeto FeatureCollection válido');
    console.error('   - Que no haya caracteres extra al inicio o final');
    process.exit(1);
  }
});

process.stdin.on('error', err => {
  console.error('❌ Error leyendo entrada:', err.message);
  process.exit(1);
});
