// Script completo: Crea el archivo y procesa los datos automáticamente
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'datos_santa_ines.json');
const OUTPUT_BASE = path.join(__dirname, 'geojson', 'FTTH', 'SANTA_INES');

// Los datos GeoJSON que el usuario proporcionó al inicio
// Nota: Como los datos son muy grandes, este script los leerá desde stdin
// o desde un archivo temporal

function getMolecule(name) {
  if (!name) return null;
  const match = name.match(/SI(\d+)/i);
  return match ? `SI${match[1].padStart(2, '0')}` : null;
}

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

function processData(data) {
  console.log('📊 Procesando datos GeoJSON...\n');
  
  const features = data.features || [];
  if (features.length === 0) {
    console.error('❌ No se encontraron features');
    return;
  }
  
  console.log(`📦 Total de features: ${features.length}\n`);
  
  const organized = {};
  
  features.forEach(f => {
    const name = f.properties?.name || '';
    const mol = getMolecule(name) || 'UNKNOWN';
    const type = classifyFeature(name);
    
    if (!organized[mol]) organized[mol] = { cierres: [], eventos: [], otros: [] };
    organized[mol][type].push(f);
  });
  
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
  
  console.log('\n💾 Guardando archivos...\n');
  
  molecules.forEach(([mol, data]) => {
    const molPath = path.join(OUTPUT_BASE, mol);
    
    ['cierres', 'eventos'].forEach(dir => {
      const dirPath = path.join(molPath, dir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    });
    
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
  
  // Actualizar index principal
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
  
  console.log(`\n✅ ${santaInesIndex} actualizado`);
  console.log('\n🎉 ¡Procesamiento completado exitosamente!\n');
}

// Leer datos desde stdin o archivo
const args = process.argv.slice(2);

if (args.length > 0 && args[0] === '--file') {
  // Leer desde archivo
  const filePath = args[1];
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  processData(data);
} else {
  // Leer desde stdin
  console.log('📝 Esperando datos GeoJSON...');
  console.log('💡 Pega los datos JSON completos y presiona Ctrl+Z + Enter\n');
  
  let input = '';
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', chunk => {
    input += chunk;
  });
  
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(input.trim());
      
      // Guardar archivo primero
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Archivo guardado: ${DATA_FILE}\n`);
      
      // Procesar
      processData(data);
    } catch (e) {
      console.error('❌ Error:', e.message);
      process.exit(1);
    }
  });
}
