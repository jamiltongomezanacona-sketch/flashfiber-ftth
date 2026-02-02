// Script para verificar y corregir la estructura de archivos
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'datos_santa_ines.json');
const OUTPUT_BASE = path.join(__dirname, 'geojson', 'FTTH', 'SANTA_INES');

console.log('🔍 Verificando estructura de archivos...\n');

// Verificar archivo de datos
if (!fs.existsSync(DATA_FILE)) {
  console.log('❌ Archivo datos_santa_ines.json NO existe');
  console.log('💡 Necesitas crear el archivo primero con los datos JSON');
} else {
  const stats = fs.statSync(DATA_FILE);
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const featuresCount = data.features?.length || 0;
  
  console.log(`📄 Archivo datos_santa_ines.json:`);
  console.log(`   Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Features: ${featuresCount}`);
  
  if (featuresCount === 0) {
    console.log('   ⚠️  El archivo está VACÍO - Necesitas agregar los datos\n');
  } else {
    console.log('   ✅ El archivo tiene datos\n');
  }
}

// Verificar archivos GeoJSON creados
console.log('📁 Verificando archivos GeoJSON creados...\n');

const molecules = fs.readdirSync(OUTPUT_BASE)
  .filter(f => fs.statSync(path.join(OUTPUT_BASE, f)).isDirectory())
  .filter(f => f.startsWith('SI'))
  .sort();

let totalCierres = 0;
let totalEventos = 0;

molecules.forEach(mol => {
  const molPath = path.join(OUTPUT_BASE, mol);
  const cierresPath = path.join(molPath, 'cierres');
  const eventosPath = path.join(molPath, 'eventos');
  
  // Buscar archivos .geojson
  const cierresFiles = fs.existsSync(cierresPath) 
    ? fs.readdirSync(cierresPath).filter(f => f.endsWith('.geojson'))
    : [];
  const eventosFiles = fs.existsSync(eventosPath)
    ? fs.readdirSync(eventosPath).filter(f => f.endsWith('.geojson'))
    : [];
  
  if (cierresFiles.length > 0 || eventosFiles.length > 0) {
    console.log(`  ${mol}:`);
    if (cierresFiles.length > 0) {
      cierresFiles.forEach(f => {
        const filePath = path.join(cierresPath, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const count = data.features?.length || 0;
        totalCierres += count;
        console.log(`    ✓ ${f} (${count} features)`);
      });
    }
    if (eventosFiles.length > 0) {
      eventosFiles.forEach(f => {
        const filePath = path.join(eventosPath, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const count = data.features?.length || 0;
        totalEventos += count;
        console.log(`    ✓ ${f} (${count} features)`);
      });
    }
  }
});

if (totalCierres === 0 && totalEventos === 0) {
  console.log('  ⚠️  No se encontraron archivos GeoJSON\n');
  console.log('💡 SOLUCIÓN:');
  console.log('   1. Asegúrate de que datos_santa_ines.json tenga los datos');
  console.log('   2. Ejecuta: node setup_and_process.js\n');
} else {
  console.log(`\n📊 Total: ${totalCierres} cierres, ${totalEventos} eventos\n`);
}

// Verificar índices
console.log('📋 Verificando índices...\n');

molecules.forEach(mol => {
  const molPath = path.join(OUTPUT_BASE, mol);
  
  // Verificar index de cierres
  const cierresIndex = path.join(molPath, 'cierres', 'index.json');
  if (fs.existsSync(cierresIndex)) {
    const index = JSON.parse(fs.readFileSync(cierresIndex, 'utf-8'));
    if (index.children && index.children.length > 0) {
      console.log(`  ✅ ${mol}/cierres/index.json (${index.children.length} capas)`);
    } else {
      console.log(`  ⚠️  ${mol}/cierres/index.json está VACÍO`);
    }
  }
  
  // Verificar index de eventos
  const eventosIndex = path.join(molPath, 'eventos', 'index.json');
  if (fs.existsSync(eventosIndex)) {
    const index = JSON.parse(fs.readFileSync(eventosIndex, 'utf-8'));
    if (index.children && index.children.length > 0) {
      console.log(`  ✅ ${mol}/eventos/index.json (${index.children.length} capas)`);
    } else {
      console.log(`  ⚠️  ${mol}/eventos/index.json está VACÍO`);
    }
  }
});

// Verificar index principal
const santaInesIndex = path.join(OUTPUT_BASE, 'index.json');
if (fs.existsSync(santaInesIndex)) {
  const index = JSON.parse(fs.readFileSync(santaInesIndex, 'utf-8'));
  console.log(`\n📑 ${santaInesIndex}:`);
  console.log(`   Moléculas registradas: ${index.children?.length || 0}`);
  if (index.children && index.children.length > 0) {
    console.log(`   ${index.children.map(c => c.label).join(', ')}`);
  }
}

console.log('\n✅ Verificación completada\n');
