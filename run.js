const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

console.log('\x1b[36m==============================================================\x1b[0m');
console.log('\x1b[36m   ControlTV NOC - Centro de Control Smart TV & Signage       \x1b[0m');
console.log('\x1b[36m==============================================================\x1b[0m\n');

// 1. Check and install backend dependencies if missing or requested
const backendModules = path.join(backendDir, 'node_modules');
if (!fs.existsSync(backendModules)) {
  console.log('\x1b[33m[1/3] Descargando e instalando dependencias del Backend...\x1b[0m');
  execSync('npm install', { cwd: backendDir, stdio: 'inherit', shell: true });
  console.log('\x1b[32m✔ Dependencias de Backend listas.\x1b[0m\n');
} else {
  console.log('\x1b[32m✔ Dependencias de Backend ya instaladas.\x1b[0m');
}

// 2. Check and install frontend dependencies if missing or requested
const frontendModules = path.join(frontendDir, 'node_modules');
if (!fs.existsSync(frontendModules)) {
  console.log('\x1b[33m[2/3] Descargando e instalando dependencias del Frontend...\x1b[0m');
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit', shell: true });
  console.log('\x1b[32m✔ Dependencias de Frontend listas.\x1b[0m\n');
} else {
  console.log('\x1b[32m✔ Dependencias de Frontend ya instaladas.\x1b[0m');
}

console.log('\n\x1b[35m[3/3] Iniciando Backend y Frontend simultáneamente...\x1b[0m');
console.log('\x1b[90m- Backend API & WebSockets en: http://localhost:5000\x1b[0m');
console.log('\x1b[90m- Frontend Consola NOC en:    http://localhost:3000\x1b[0m');
console.log('\x1b[90m- Presiona Ctrl + C en cualquier momento para detener todo.\x1b[0m\n');

// Prefix streams
function prefixStream(stream, prefix, colorCode) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep last incomplete line
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${colorCode}${prefix}\x1b[0m ${line}`);
      }
    }
  });
}

// 3. Spawn Backend
const backendProc = spawn('npm run dev', {
  cwd: backendDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
});
prefixStream(backendProc.stdout, '[BACKEND]', '\x1b[36m');
prefixStream(backendProc.stderr, '[BACKEND]', '\x1b[31m');

// 4. Spawn Frontend
const frontendProc = spawn('npm run dev', {
  cwd: frontendDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
});
prefixStream(frontendProc.stdout, '[FRONTEND]', '\x1b[32m');
prefixStream(frontendProc.stderr, '[FRONTEND]', '\x1b[31m');

// Automatically open browser after 3 seconds
setTimeout(() => {
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    execSync(`${startCmd} http://localhost:3000`, { stdio: 'ignore', shell: true });
  } catch (e) {
    // Ignore if headless
  }
}, 3000);

// Cleanup on exit
function cleanExit() {
  console.log('\n\x1b[33mDeteniendo procesos de ControlTV...\x1b[0m');
  try {
    if (process.platform === 'win32') {
      if (backendProc.pid) execSync(`taskkill /pid ${backendProc.pid} /T /F`, { stdio: 'ignore' });
      if (frontendProc.pid) execSync(`taskkill /pid ${frontendProc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      backendProc.kill('SIGINT');
      frontendProc.kill('SIGINT');
    }
  } catch (e) {
    // Already terminated
  }
  process.exit(0);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
