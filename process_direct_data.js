// Script para procesar directamente los datos GeoJSON proporcionados
const fs = require('fs');
const path = require('path');

// Los datos GeoJSON que el usuario proporcionó
const geojsonData = {"type":"FeatureCollection", "features": [
{"type":"Feature","geometry":{"type":"Point","coordinates":[-74.08814589693468,4.562510732351684,0]},"properties":{"name":"CENTRAL SANTA INES","visibility":false,"label-opacity":1,"label-color":"#0003fa","label-scale":0.875,"icon-opacity":1,"icon-color":"#ffffff","icon-scale":1,"icon-offset":[0.5,-0.5],"icon-offset-units":["fraction","fraction"],"icon":"SANTA INES_files/93bfe55b28746ff7_-16776961_9.png"}},
{"type":"Feature","geometry":{"type":"Point","coordinates":[-74.08402301332006,4.586133629047296,0]},"properties":{"name":"E1SI01_6","visibility":false,"label-opacity":1,"label-color":"#ffffff","label-scale":1,"icon-opacity":1,"icon-color":"#ffffff","icon-scale":1,"icon-offset":[0.5,-0.5],"icon-offset-units":["fraction","fraction"],"icon":"SANTA INES_files/93bfe55b28746ff7_-16776961_2_2_2_2.png"}},
{"type":"Feature","geometry":{"type":"Point","coordinates":[-74.08621479811272,4.582978553062955,9.313225746154785e-10]},"properties":{"name":"E1SI01_5","visibility":false,"label-opacity":1,"label-color":"#ffffff","label-scale":1,"icon-opacity":1,"icon-color":"#ffffff","icon-scale":1,"icon-offset":[0.5,-0.5],"icon-offset-units":["fraction","fraction"],"icon":"SANTA INES_files/93bfe55b28746ff7_-16776961_2_2_2_2.png"}},
{"type":"Feature","geometry":{"type":"Point","coordinates":[-74.08744598343971,4.581466727343726,0]},"properties":{"name":"E1SI01_4","visibility":false,"label-opacity":1,"label-color":"#ffffff","label-scale":1,"icon-opacity":1,"icon-color":"#ffffff","icon-scale":1,"icon-offset":[0.5,-0.5],"icon-offset-units":["fraction","fraction"],"icon":"SANTA INES_files/93bfe55b28746ff7_-16776961_2_2_2_2.png"}},
{"type":"Feature","geometry":{"type":"Point","coordinates":[-74.08736517398872,4.579542959978493,0]},"properties":{"name":"E1S01_3","visibility":false,"label-opacity":1,"label-color":"#ffffff","label-scale":1,"icon-opacity":1,"icon-color":"#ffffff","icon-scale":1,"icon-offset":[0.5,-0.5],"icon-offset-units":["fraction","fraction"],"icon":"SANTA INES_files/93bfe55b28746ff7_-16776961_2_2_2_2.png"}},
{"type":"Feature","geometry":{"type":"Point","coordinates":[-74.08532445690624,4.577594521397176,0]},"properties":{"name":"E1SI01_2","visibility":false,"label-opacity":1,"label-color":"#ffffff","label-scale":1,"icon-opacity":1,"icon-color":"#ffffff","icon-scale":1,"icon-offset":[0.5,-0.5],"icon-offset-units":["fraction","fraction"],"icon":"SANTA INES_files/93bfe55b28746ff7_-16776961_2_2_2_2.png"}},
{"type":"Feature","geometry":{"type":"Point","coordinates":[-74.082061318121,4.574800803723096,0]},"properties":{"name":"E1SI01_1","visibility":false,"label-opacity":1,"label-color":"#ffffff","label-scale":1,"icon-opacity":1,"icon-color":"#ffffff","icon-scale":1,"icon-offset":[0.5,-0.5],"icon-offset-units":["fraction","fraction"],"icon":"SANTA INES_files/93bfe55b28746ff7_-16776961_2_2_2_2.png"}}
]};

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

// Procesar directamente
console.log('📊 Procesando datos GeoJSON directamente...\n');

const features = geojsonData.features || [];
console.log(`📦 Total de features: ${features.length}\n`);

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
