// Script para procesar datos GeoJSON de Santa Inés
const fs = require('fs');
const path = require('path');

// Función para extraer molécula del nombre
function getMolecule(name) {
  if (!name) return null;
  const match = name.match(/SI(\d+)/i);
  return match ? `SI${match[1].padStart(2, '0')}` : null;
}

// Función para clasificar el tipo
function classifyFeature(name) {
  if (!name) return 'otros';
  const upper = name.toUpperCase();
  
  if (upper.match(/^E[0-9]/) || upper.includes('E1SI') || upper.includes('E2SI')) {
    return 'cierres';
  }
  if (upper.includes('CORTE') || upper.includes('TENDIDO') || upper.includes('DAÑO') || upper.includes('CIERRE')) {
    return 'eventos';
  }
  if (upper.includes('CENTRAL')) {
    return 'centrales';
  }
  return 'otros';
}

// Procesar datos
function processData(inputPath, outputBase) {
  console.log('📊 Procesando datos...\n');
  
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const features = data.features || [];
  
  console.log(`Total features: ${features.length}\n`);
  
  // Organizar por molécula y tipo
  const organized = {};
  
  features.forEach(f => {
    const name = f.properties?.name || '';
    const mol = getMolecule(name) || 'UNKNOWN';
    const type = classifyFeature(name);
    
    if (!organized[mol]) organized[mol] = { cierres: [], eventos: [], otros: [] };
    organized[mol][type].push(f);
  });
  
  // Mostrar resumen
  Object.entries(organized).sort().forEach(([mol, data]) => {
    const total = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
    if (total > 0) {
      console.log(`${mol}: ${data.cierres.length} cierres, ${data.eventos.length} eventos, ${data.otros.length} otros`);
    }
  });
  
  // Guardar archivos
  console.log('\n💾 Guardando archivos...\n');
  
  Object.entries(organized).forEach(([mol, data]) => {
    if (mol === 'UNKNOWN') return;
    
    const molPath = path.join(outputBase, mol);
    
    // Guardar cierres
    if (data.cierres.length > 0) {
      const cierresDir = path.join(molPath, 'cierres');
      if (!fs.existsSync(cierresDir)) fs.mkdirSync(cierresDir, { recursive: true });
      
      const file = path.join(cierresDir, `${mol}_cierres.geojson`);
      fs.writeFileSync(file, JSON.stringify({
        type: "FeatureCollection",
        features: data.cierres
      }, null, 2));
      console.log(`✅ ${file} (${data.cierres.length} features)`);
    }
    
    // Guardar eventos
    if (data.eventos.length > 0) {
      const eventosDir = path.join(molPath, 'eventos');
      if (!fs.existsSync(eventosDir)) fs.mkdirSync(eventosDir, { recursive: true });
      
      const file = path.join(eventosDir, `${mol}_eventos.geojson`);
      fs.writeFileSync(file, JSON.stringify({
        type: "FeatureCollection",
        features: data.eventos
      }, null, 2));
      console.log(`✅ ${file} (${data.eventos.length} features)`);
    }
  });
  
  console.log('\n✅ Completado!');
}

// Ejecutar
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Uso: node process_santa_ines_data.js <entrada.json> <salida_base>');
    process.exit(1);
  }
  processData(args[0], args[1]);
}

module.exports = { processData, getMolecule, classifyFeature };
