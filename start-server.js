const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Iniciando servidor para Dashboard...');

// Verificar se as dependências estão instaladas
const requiredPackages = ['pg', 'cors', 'express', 'multer'];
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const installedPackages = Object.keys(packageJson.dependencies || {});

const missingPackages = requiredPackages.filter(pkg => !installedPackages.includes(pkg));

if (missingPackages.length > 0) {
  console.log('📦 Instalando dependências faltantes:', missingPackages.join(', '));
  
  const npmInstall = spawn('npm', ['install', ...missingPackages], {
    stdio: 'inherit',
    shell: true
  });
  
  npmInstall.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependências instaladas com sucesso!');
      startServer();
    } else {
      console.error('❌ Erro ao instalar dependências');
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('🔄 Iniciando servidor...');
  
  const serverProcess = spawn('node', ['src/entities/server.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Servidor encerrado com código: ${code}`);
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Erro ao iniciar servidor:', error);
  });
}