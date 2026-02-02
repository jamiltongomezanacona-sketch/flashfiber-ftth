// Script para procesar y organizar los datos GeoJSON proporcionados
const fs = require('fs');
const path = require('path');

// Los datos GeoJSON proporcionados por el usuario
const geojsonData = {
  "type": "FeatureCollection",
  "features": [
    // Aquí irían todos los features del usuario
  ]
};

// Función para extraer la molécula del nombre
function extractMolecule(name) {
  if (!name) return 'UNKNOWN';
  
  // Buscar patrones como SI01, SI02, etc.
  const match = name.match(/SI(\d+)/i);
  if (match) {
    return 'SI' + match[1].padStart(2, '0');
  }
  
  // Si contiene "CENTRAL SANTA INES", podría ser de cualquier molécula
  if (name.includes('CENTRAL SANTA INES')) {
    return 'CENTRAL';
  }
  
  return 'UNKNOWN';
}

// Función para determinar el tipo de feature
function getFeatureType(name, properties) {
  if (!name) return 'otros';
  
  const nameUpper = name.toUpperCase();
  
  // Eventos
  if (nameUpper.includes('CORTE') || 
      nameUpper.includes('INICIO') || 
      nameUpper.includes('FINAL') || 
      nameUpper.includes('TENDIDO') ||
      nameUpper.includes('CIERRE POR CORTE') ||
      nameUpper.includes('DAÑO') ||
      nameUpper.includes('CABLE EN DAÑO')) {
    return 'eventos';
  }
  
  // Cierres (E0, E1, E2, etc.)
  if (nameUpper.match(/^E[0-9]/) || nameUpper.match(/^E[0-9]SI/)) {
    return 'cierres';
  }
  
  // Centrales
  if (nameUpper.includes('CENTRAL')) {
    return 'centrales';
  }
  
  return 'otros';
}

// Función para organizar los features
function organizeFeatures(features) {
  const organized = {};
  
  features.forEach(feature => {
    const name = feature.properties?.name || '';
    const molecule = extractMolecule(name);
    const type = getFeatureType(name, feature.properties);
    
    if (!organized[molecule]) {
      organized[molecule] = {
        cierres: [],
        eventos: [],
        centrales: [],
        otros: []
      };
    }
    
    organized[molecule][type].push(feature);
  });
  
  return organized;
}

// Función para crear un FeatureCollection
function createFeatureCollection(features) {
  return {
    type: "FeatureCollection",
    features: features
  };
}

// Función para guardar archivos GeoJSON
function saveGeoJSONFiles(organized, basePath) {
  Object.entries(organized).forEach(([molecule, data]) => {
    if (molecule === 'UNKNOWN' || molecule === 'CENTRAL') {
      console.log(`⚠️  Saltando ${molecule} - necesita clasificación manual`);
      return;
    }
    
    const moleculePath = path.join(basePath, molecule);
    
    // Crear directorios si no existen
    ['cierres', 'eventos'].forEach(dir => {
      const dirPath = path.join(moleculePath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    
    // Guardar cierres
    if (data.cierres.length > 0) {
      const cierresFile = path.join(moleculePath, 'cierres', `${molecule}_cierres.geojson`);
      fs.writeFileSync(cierresFile, JSON.stringify(createFeatureCollection(data.cierres), null, 2));
      console.log(`✅ Guardado: ${cierresFile} (${data.cierres.length} features)`);
    }
    
    // Guardar eventos
    if (data.eventos.length > 0) {
      const eventosFile = path.join(moleculePath, 'eventos', `${molecule}_eventos.geojson`);
      fs.writeFileSync(eventosFile, JSON.stringify(createFeatureCollection(data.eventos), null, 2));
      console.log(`✅ Guardado: ${eventosFile} (${data.eventos.length} features)`);
    }
  });
}

// Función principal
function processGeoJSON(inputFile, outputBasePath) {
  console.log('📊 Procesando datos GeoJSON...\n');
  
  // Leer el archivo de entrada
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  
  if (!data.features || data.features.length === 0) {
    console.error('❌ El archivo no contiene features');
    return;
  }
  
  console.log(`📦 Total de features: ${data.features.length}\n`);
  
  // Organizar features
  const organized = organizeFeatures(data.features);
  
  // Mostrar resumen
  console.log('📋 Resumen por molécula:\n');
  Object.entries(organized).sort().forEach(([mol, data]) => {
    const total = data.cierres.length + data.eventos.length + data.centrales.length + data.otros.length;
    if (total > 0) {
      console.log(`  ${mol}:`);
      if (data.cierres.length > 0) console.log(`    - Cierres: ${data.cierres.length}`);
      if (data.eventos.length > 0) console.log(`    - Eventos: ${data.eventos.length}`);
      if (data.centrales.length > 0) console.log(`    - Centrales: ${data.centrales.length}`);
      if (data.otros.length > 0) console.log(`    - Otros: ${data.otros.length}`);
    }
  });
  
  // Guardar archivos
  console.log('\n💾 Guardando archivos...\n');
  saveGeoJSONFiles(organized, outputBasePath);
  
  console.log('\n✅ Procesamiento completado!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Uso: node process_geojson_data.js <archivo_entrada.json> <directorio_salida>');
    console.log('Ejemplo: node process_geojson_data.js datos.json geojson/FTTH/SANTA_INES');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputPath = args[1];
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ El archivo ${inputFile} no existe`);
    process.exit(1);
  }
  
  processGeoJSON(inputFile, outputPath);
}

module.exports = { processGeoJSON, organizeFeatures, extractMolecule, getFeatureType };
