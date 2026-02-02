// Script para procesar directamente los datos GeoJSON proporcionados
const fs = require('fs');
const path = require('path');

// Aquí van los datos que el usuario proporcionó
// Se leerán desde un archivo o se pasarán como argumento
const OUTPUT_BASE = path.join(__dirname, 'geojson', 'FTTH', 'SANTA_INES');

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
  if (upper.includes('CENTRAL')) return 'centrales';
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
  const label = filename.replace('.geojson', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
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

function processGeoJSON(inputFile) {
  console.log('📊 Procesando datos GeoJSON...\n');
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Archivo no encontrado: ${inputFile}`);
    console.log('\n💡 Uso: node process_geojson_direct.js <archivo.json>');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const features = data.features || [];
  
  console.log(`📦 Total features: ${features.length}\n`);
  
  const organized = {};
  
  features.forEach(f => {
    const name = f.properties?.name || '';
    const mol = getMolecule(name) || 'UNKNOWN';
    const type = classifyFeature(name);
    
    if (!organized[mol]) organized[mol] = { cierres: [], eventos: [], otros: [] };
    organized[mol][type].push(f);
  });
  
  console.log('📋 Resumen:\n');
  Object.entries(organized)
    .filter(([mol]) => mol !== 'UNKNOWN')
    .sort()
    .forEach(([mol, data]) => {
      const total = Object.values(data).reduce((s, a) => s + a.length, 0);
      if (total > 0) {
        console.log(`  ${mol}: ${data.cierres.length} cierres, ${data.eventos.length} eventos, ${data.otros.length} otros`);
      }
    });
  
  console.log('\n💾 Guardando archivos...\n');
  
  Object.entries(organized).forEach(([mol, data]) => {
    if (mol === 'UNKNOWN') return;
    
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
      console.log(`✅ ${file} (${data.cierres.length} features)`);
      updateIndex(molPath, 'cierres', filename);
    }
    
    if (data.eventos.length > 0) {
      const filename = `${mol}_eventos.geojson`;
      const file = path.join(molPath, 'eventos', filename);
      fs.writeFileSync(file, JSON.stringify({
        type: "FeatureCollection",
        features: data.eventos
      }, null, 2));
      console.log(`✅ ${file} (${data.eventos.length} features)`);
      updateIndex(molPath, 'eventos', filename);
    }
  });
  
  console.log('\n✅ Procesamiento completado!');
}

// Ejecutar
const inputFile = process.argv[2];
if (!inputFile) {
  console.log('💡 Uso: node process_geojson_direct.js <archivo.json>');
  console.log('\n📝 Pasos:');
  console.log('1. Guarda los datos GeoJSON en un archivo (ej: datos.json)');
  console.log('2. Ejecuta: node process_geojson_direct.js datos.json');
  process.exit(1);
}

processGeoJSON(inputFile);
