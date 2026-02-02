// Script para importar y procesar datos GeoJSON de Santa Inés
const fs = require('fs');
const path = require('path');

// Datos proporcionados por el usuario (se leerán desde un archivo)
const GEODATA_PATH = path.join(__dirname, 'datos_santa_ines.json');
const OUTPUT_BASE = path.join(__dirname, 'geojson', 'FTTH', 'SANTA_INES');

// Función para extraer molécula del nombre
function getMolecule(name) {
  if (!name) return null;
  const match = name.match(/SI(\d+)/i);
  return match ? `SI${match[1].padStart(2, '0')}` : null;
}

// Función para clasificar el tipo de feature
function classifyFeature(name) {
  if (!name) return 'otros';
  const upper = name.toUpperCase();
  
  // Cierres: E0, E1, E2, etc.
  if (upper.match(/^E[0-9]/) || upper.match(/E[0-9]SI/)) {
    return 'cierres';
  }
  
  // Eventos: CORTE, TENDIDO, DAÑO, CIERRE
  if (upper.includes('CORTE') || 
      upper.includes('TENDIDO') || 
      upper.includes('DAÑO') || 
      upper.includes('CIERRE POR') ||
      upper.includes('INICIO') ||
      upper.includes('FINAL')) {
    return 'eventos';
  }
  
  // Centrales
  if (upper.includes('CENTRAL')) {
    return 'centrales';
  }
  
  return 'otros';
}

// Función para actualizar index.json de cierres
function updateCierresIndex(moleculePath, filename) {
  const indexPath = path.join(moleculePath, 'cierres', 'index.json');
  let indexData = { label: "Cierres", children: [] };
  
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }
  
  const layerId = `FTTH_SANTA_INES_${moleculePath.split(path.sep).pop()}_${filename.replace('.geojson', '')}`;
  const label = filename.replace('.geojson', '').replace(/_/g, ' ');
  
  // Verificar si ya existe
  const exists = indexData.children.some(child => child.path === filename);
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
    console.log(`  📝 Actualizado: ${indexPath}`);
  }
}

// Función para actualizar index.json de eventos
function updateEventosIndex(moleculePath, filename) {
  const indexPath = path.join(moleculePath, 'eventos', 'index.json');
  let indexData = { label: "Eventos", children: [] };
  
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }
  
  const layerId = `FTTH_SANTA_INES_${moleculePath.split(path.sep).pop()}_${filename.replace('.geojson', '')}`;
  const label = filename.replace('.geojson', '').replace(/_/g, ' ');
  
  // Verificar si ya existe
  const exists = indexData.children.some(child => child.path === filename);
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
    console.log(`  📝 Actualizado: ${indexPath}`);
  }
}

// Función para actualizar el index.json principal de la molécula
function updateMoleculeIndex(molecule) {
  const indexPath = path.join(OUTPUT_BASE, molecule, 'index.json');
  let indexData = {
    label: molecule,
    children: [
      { type: "folder", label: "Cables", index: "cables/index.json" },
      { type: "folder", label: "Cierres", index: "cierres/index.json" },
      { type: "folder", label: "Rutas", index: "rutas/index.json" },
      { type: "folder", label: "Eventos", index: "eventos/index.json" },
      { type: "folder", label: "Mantenimientos", index: "mantenimientos/index.json" }
    ]
  };
  
  if (fs.existsSync(indexPath)) {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } else {
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    console.log(`  📝 Creado: ${indexPath}`);
  }
}

// Función para actualizar el index.json principal de Santa Inés
function updateSantaInesIndex() {
  const indexPath = path.join(OUTPUT_BASE, 'index.json');
  let indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  
  // Obtener todas las moléculas existentes
  const molecules = fs.readdirSync(OUTPUT_BASE)
    .filter(f => fs.statSync(path.join(OUTPUT_BASE, f)).isDirectory())
    .filter(f => f.startsWith('SI'))
    .sort();
  
  // Actualizar children con todas las moléculas
  indexData.children = molecules.map(mol => ({
    type: "folder",
    label: mol,
    index: `${mol}/index.json`
  }));
  
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  console.log(`\n📝 Actualizado index principal: ${indexPath}`);
}

// Función principal para procesar datos
function processData() {
  console.log('📊 Procesando datos GeoJSON de Santa Inés...\n');
  
  // Leer datos
  if (!fs.existsSync(GEODATA_PATH)) {
    console.error(`❌ No se encuentra el archivo: ${GEODATA_PATH}`);
    console.log('💡 Por favor, guarda los datos GeoJSON en: datos_santa_ines.json');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(GEODATA_PATH, 'utf-8'));
  const features = data.features || [];
  
  if (features.length === 0) {
    console.error('❌ El archivo no contiene features');
    process.exit(1);
  }
  
  console.log(`📦 Total de features: ${features.length}\n`);
  
  // Organizar por molécula y tipo
  const organized = {};
  
  features.forEach(f => {
    const name = f.properties?.name || '';
    const mol = getMolecule(name);
    
    if (!mol) {
      // Features sin molécula clara
      if (!organized['UNKNOWN']) organized['UNKNOWN'] = { cierres: [], eventos: [], otros: [] };
      const type = classifyFeature(name);
      organized['UNKNOWN'][type].push(f);
      return;
    }
    
    if (!organized[mol]) {
      organized[mol] = { cierres: [], eventos: [], otros: [] };
    }
    
    const type = classifyFeature(name);
    organized[mol][type].push(f);
  });
  
  // Mostrar resumen
  console.log('📋 Resumen por molécula:\n');
  Object.entries(organized)
    .filter(([mol]) => mol !== 'UNKNOWN')
    .sort()
    .forEach(([mol, data]) => {
      const total = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
      if (total > 0) {
        console.log(`  ${mol}:`);
        if (data.cierres.length > 0) console.log(`    - Cierres: ${data.cierres.length}`);
        if (data.eventos.length > 0) console.log(`    - Eventos: ${data.eventos.length}`);
        if (data.otros.length > 0) console.log(`    - Otros: ${data.otros.length}`);
      }
    });
  
  if (organized['UNKNOWN']) {
    const unk = organized['UNKNOWN'];
    const totalUnk = Object.values(unk).reduce((sum, arr) => sum + arr.length, 0);
    if (totalUnk > 0) {
      console.log(`\n  ⚠️  UNKNOWN: ${totalUnk} features sin molécula identificada`);
    }
  }
  
  // Guardar archivos
  console.log('\n💾 Guardando archivos...\n');
  
  Object.entries(organized).forEach(([mol, data]) => {
    if (mol === 'UNKNOWN') {
      console.log(`⚠️  Saltando ${mol} - necesita clasificación manual`);
      return;
    }
    
    const molPath = path.join(OUTPUT_BASE, mol);
    
    // Crear directorios si no existen
    ['cierres', 'eventos'].forEach(dir => {
      const dirPath = path.join(molPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    
    // Actualizar index de molécula
    updateMoleculeIndex(mol);
    
    // Guardar cierres
    if (data.cierres.length > 0) {
      const cierresDir = path.join(molPath, 'cierres');
      const filename = `${mol}_cierres.geojson`;
      const file = path.join(cierresDir, filename);
      
      fs.writeFileSync(file, JSON.stringify({
        type: "FeatureCollection",
        features: data.cierres
      }, null, 2));
      
      console.log(`✅ ${file}`);
      console.log(`   ${data.cierres.length} features de cierres`);
      
      // Actualizar index.json
      updateCierresIndex(molPath, filename);
    }
    
    // Guardar eventos
    if (data.eventos.length > 0) {
      const eventosDir = path.join(molPath, 'eventos');
      const filename = `${mol}_eventos.geojson`;
      const file = path.join(eventosDir, filename);
      
      fs.writeFileSync(file, JSON.stringify({
        type: "FeatureCollection",
        features: data.eventos
      }, null, 2));
      
      console.log(`✅ ${file}`);
      console.log(`   ${data.eventos.length} features de eventos`);
      
      // Actualizar index.json
      updateEventosIndex(molPath, filename);
    }
  });
  
  // Actualizar index principal
  updateSantaInesIndex();
  
  console.log('\n✅ Procesamiento completado!\n');
}

// Ejecutar
if (require.main === module) {
  processData();
}

module.exports = { processData };
