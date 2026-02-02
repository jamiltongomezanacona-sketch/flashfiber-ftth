// Script para guardar y procesar datos GeoJSON
const fs = require('fs');
const path = require('path');

// Leer datos desde stdin o archivo
const args = process.argv.slice(2);
let geojsonData;

if (args.length > 0 && args[0] === '--file') {
  // Leer desde archivo
  const filePath = args[1];
  geojsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
} else {
  // Leer desde stdin
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    try {
      geojsonData = JSON.parse(input);
      processData(geojsonData);
    } catch (e) {
      console.error('Error parseando JSON:', e.message);
      process.exit(1);
    }
  });
  return;
}

// Si tenemos datos, procesarlos
if (geojsonData) {
  processData(geojsonData);
}

function processData(data) {
  const OUTPUT_BASE = path.join(__dirname, 'geojson', 'FTTH', 'SANTA_INES');
  const features = data.features || [];
  
  console.log(`📦 Procesando ${features.length} features...\n`);
  
  // Organizar
  const organized = {};
  
  features.forEach(f => {
    const name = f.properties?.name || '';
    const molMatch = name.match(/SI(\d+)/i);
    const mol = molMatch ? `SI${molMatch[1].padStart(2, '0')}` : 'UNKNOWN';
    const type = classifyFeature(name);
    
    if (!organized[mol]) organized[mol] = { cierres: [], eventos: [], otros: [] };
    organized[mol][type].push(f);
  });
  
  // Guardar
  Object.entries(organized).forEach(([mol, data]) => {
    if (mol === 'UNKNOWN') return;
    
    const molPath = path.join(OUTPUT_BASE, mol);
    ['cierres', 'eventos'].forEach(dir => {
      const dirPath = path.join(molPath, dir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    });
    
    if (data.cierres.length > 0) {
      const file = path.join(molPath, 'cierres', `${mol}_cierres.geojson`);
      fs.writeFileSync(file, JSON.stringify({ type: "FeatureCollection", features: data.cierres }, null, 2));
      console.log(`✅ ${file} (${data.cierres.length} cierres)`);
    }
    
    if (data.eventos.length > 0) {
      const file = path.join(molPath, 'eventos', `${mol}_eventos.geojson`);
      fs.writeFileSync(file, JSON.stringify({ type: "FeatureCollection", features: data.eventos }, null, 2));
      console.log(`✅ ${file} (${data.eventos.length} eventos)`);
    }
  });
  
  console.log('\n✅ Completado!');
}

function classifyFeature(name) {
  if (!name) return 'otros';
  const upper = name.toUpperCase();
  if (upper.match(/^E[0-9]/) || upper.match(/E[0-9]SI/)) return 'cierres';
  if (upper.includes('CORTE') || upper.includes('TENDIDO') || upper.includes('DAÑO') || upper.includes('CIERRE')) return 'eventos';
  return 'otros';
}
