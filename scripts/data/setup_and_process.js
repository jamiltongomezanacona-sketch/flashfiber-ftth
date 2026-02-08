// Script completo para guardar y procesar datos GeoJSON de Santa Inés
// Ejecutar desde la raíz del proyecto: node scripts/data/setup_and_process.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_FILE = path.join(ROOT, 'datos_santa_ines.json');
const OUTPUT_BASE = path.join(ROOT, 'geojson', 'FTTH', 'SANTA_INES');

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

function main() {
  console.log('🚀 Procesador de datos GeoJSON para Santa Inés\n');

  if (!fs.existsSync(DATA_FILE)) {
    console.log('❌ No se encuentra el archivo: datos_santa_ines.json\n');
    console.log('📝 Instrucciones:');
    console.log('1. Guarda los datos GeoJSON en un archivo: datos_santa_ines.json (en la raíz del proyecto)');
    console.log('2. O ejecuta: node scripts/data/create_data_file.js (pega datos y Ctrl+Z + Enter)');
    console.log('3. Luego: node scripts/data/setup_and_process.js\n');
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

main();
