// Script completo para guardar y procesar datos GeoJSON de Santa Inés
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'datos_santa_ines.json');
const OUTPUT_BASE = path.join(__dirname, 'geojson', 'FTTH', 'SANTA_INES');

// Función para extraer molécula
function getMolecule(name) {
  if (!name) return null;
  const match = name.match(/SI(\d+)/i);
  return match ? `SI${match[1].padStart(2, '0')}` : null;
}

// Función para clasificar
function classifyFeature(name) {
  if (!name) return 'otros';
  const upper = name.toUpperCase();
  if (upper.match(/^E[0-9]/) || upper.match(/E[0-9]SI/)) return 'cierres';
  if (upper.includes('CORTE') || upper.includes('TENDIDO') || upper.includes('DAÑO') || 
      upper.includes('CIERRE POR') || upper.includes('INICIO') || upper.includes('FINAL')) {
    return 'eventos';
  }
  return 'otros';
}

// Función para actualizar índices
function updateIndex(molPath, type, filename) {
  const indexPath = path.join(molPath, type, 'index.json');
  let indexData = { label: type === 'cierres' ? 'Cierres' : 'Eventos', children: [] };
  
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }
  
  const mol = path.basename(molPath);
  const layerId = `FTTH_SANTA_INES_${mol}_${filename.replace('.geojson', '')}`;
  const label = filename.replace('.geojson', '').replace(/_/g, ' ');
  
  const exists = indexData.children.some(c => c.path === filename);
  if (!exists) {
    indexData.children.push({
      type: "layer",
      id: layerId,
      label: label,
      path: filename,
      typeLayer: "symbol",
      layout: {
        "icon-image": "marker",
        "icon-size": 1,
        "icon-allow-overlap": true
      }
    });
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  }
}

// Función principal
function main() {
  console.log('🚀 Procesador de datos GeoJSON para Santa Inés\n');
  
  // Verificar si existe el archivo de datos
  if (!fs.existsSync(DATA_FILE)) {
    console.log('❌ No se encuentra el archivo: datos_santa_ines.json\n');
    console.log('📝 Instrucciones:');
    console.log('1. Guarda los datos GeoJSON que proporcionaste en un archivo llamado: datos_santa_ines.json');
    console.log('2. El archivo debe estar en la raíz del proyecto');
    console.log('3. Ejecuta este script nuevamente\n');
    console.log('💡 Alternativa: Pega los datos en la consola y presiona Ctrl+D (o Ctrl+Z en Windows)');
    process.exit(1);
  }
  
  console.log('📂 Leyendo datos...\n');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const features = data.features || [];
  
  if (features.length === 0) {
    console.error('❌ El archivo no contiene features');
    process.exit(1);
  }
  
  console.log(`📦 Total de features: ${features.length}\n`);
  
  // Organizar
  const organized = {};
  
  features.forEach(f => {
    const name = f.properties?.name || '';
    const mol = getMolecule(name) || 'UNKNOWN';
    const type = classifyFeature(name);
    
    if (!organized[mol]) organized[mol] = { cierres: [], eventos: [], otros: [] };
    organized[mol][type].push(f);
  });
  
  // Mostrar resumen
  console.log('📋 Resumen por molécula:\n');
  const molecules = Object.entries(organized)
    .filter(([mol]) => mol !== 'UNKNOWN')
    .sort();
  
  molecules.forEach(([mol, data]) => {
    const total = Object.values(data).reduce((s, a) => s + a.length, 0);
    if (total > 0) {
      console.log(`  ${mol}:`);
      if (data.cierres.length > 0) console.log(`    ✓ Cierres: ${data.cierres.length}`);
      if (data.eventos.length > 0) console.log(`    ✓ Eventos: ${data.eventos.length}`);
      if (data.otros.length > 0) console.log(`    ⚠ Otros: ${data.otros.length}`);
    }
  });
  
  if (organized['UNKNOWN']) {
    const unk = organized['UNKNOWN'];
    const totalUnk = Object.values(unk).reduce((s, a) => s + a.length, 0);
    if (totalUnk > 0) {
      console.log(`\n  ⚠️  UNKNOWN: ${totalUnk} features sin molécula identificada`);
    }
  }
  
  // Guardar archivos
  console.log('\n💾 Guardando archivos...\n');
  
  molecules.forEach(([mol, data]) => {
    const molPath = path.join(OUTPUT_BASE, mol);
    
    // Crear directorios
    ['cierres', 'eventos'].forEach(dir => {
      const dirPath = path.join(molPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    
    // Guardar cierres
    if (data.cierres.length > 0) {
      const filename = `${mol}_cierres.geojson`;
      const file = path.join(molPath, 'cierres', filename);
      fs.writeFileSync(file, JSON.stringify({
        type: "FeatureCollection",
        features: data.cierres
      }, null, 2));
      console.log(`✅ ${file}`);
      console.log(`   ${data.cierres.length} features`);
      updateIndex(molPath, 'cierres', filename);
    }
    
    // Guardar eventos
    if (data.eventos.length > 0) {
      const filename = `${mol}_eventos.geojson`;
      const file = path.join(molPath, 'eventos', filename);
      fs.writeFileSync(file, JSON.stringify({
        type: "FeatureCollection",
        features: data.eventos
      }, null, 2));
      console.log(`✅ ${file}`);
      console.log(`   ${data.eventos.length} features`);
      updateIndex(molPath, 'eventos', filename);
    }
  });
  
  // Actualizar index principal de Santa Inés
  console.log('\n📝 Actualizando índices principales...');
  const santaInesIndex = path.join(OUTPUT_BASE, 'index.json');
  const moleculesList = molecules.map(([mol]) => ({
    type: "folder",
    label: mol,
    index: `${mol}/index.json`
  }));
  
  fs.writeFileSync(santaInesIndex, JSON.stringify({
    label: "Santa Inés",
    children: moleculesList
  }, null, 2));
  
  console.log(`✅ ${santaInesIndex}`);
  
  console.log('\n🎉 ¡Procesamiento completado exitosamente!\n');
}

// Ejecutar
main();
