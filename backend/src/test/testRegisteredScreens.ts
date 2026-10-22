import { db } from '../db/index.js';
import { DeviceManagerService } from '../services/DeviceManagerService.js';
import { CommandExecutorService } from '../services/CommandExecutorService.js';
import { ScreenCaptureService } from '../services/ScreenCaptureService.js';

interface TestResult {
  deviceName: string;
  ip: string;
  cmd: string;
  success: boolean;
  hasScreenshot: boolean;
  screenshotLength: number;
  timeMs: number;
  message: string;
}

async function runRegisteredScreensValidation() {
  console.log('========================================================================');
  console.log('INICIANDO VALIDACIÓN EXHAUSTIVA DE PANTALLAS REGISTRADAS EN CONTROLTV');
  console.log('========================================================================\n');

  await db.initialize();
  const devices = await DeviceManagerService.getAllDevices();
  console.log(`Pantallas detectadas en base de datos: ${devices.length}`);

  if (devices.length === 0) {
    console.error('ERROR: No se encontraron pantallas registradas en la base de datos.');
    process.exit(1);
  }

  const results: TestResult[] = [];

  for (const device of devices) {
    console.log(`\n========================================================================`);
    console.log(`PROBANDO TELEVISIÓN: ${device.name}`);
    console.log(`IP: ${device.ip}:${device.port} | MAC: ${device.macAddress} | ID: ${device.id}`);
    console.log(`========================================================================`);

    const commandSuite = [
      { cmd: 'POWER_ON', payload: {} },
      { cmd: 'SET_VOLUME', payload: { volume: 35 } },
      { cmd: 'VOLUME_UP', payload: {} },
      { cmd: 'VOLUME_DOWN', payload: {} },
      { cmd: 'TOGGLE_MUTE', payload: {} },
      { cmd: 'UNMUTE', payload: {} },
      { cmd: 'SET_INPUT', payload: { input: 'HDMI1' } },
      { cmd: 'SET_CHANNEL', payload: { channel: '07.1' } },
      { cmd: 'KEY_PRESS', payload: { key: 'RIGHT' } },
      { cmd: 'KEY_PRESS', payload: { key: 'ENTER' } },
      { cmd: 'SEND_TEXT', payload: { text: 'NOC Monitoreo Operativo' } },
      { cmd: 'POWER_OFF', payload: {} },
    ];

    for (const { cmd, payload } of commandSuite) {
      const startTime = Date.now();
      try {
        const res = await CommandExecutorService.execute(
          device.id,
          cmd as any,
          payload,
          { id: 'admin-test', username: 'OperadorNOC', role: 'ADMIN' },
          '127.0.0.1'
        );

        const hasValidScreenshot =
          Boolean(res.screenshot) &&
          typeof res.screenshot === 'string' &&
          res.screenshot.startsWith('data:image/svg+xml');

        results.push({
          deviceName: device.name,
          ip: device.ip,
          cmd,
          success: res.success,
          hasScreenshot: hasValidScreenshot,
          screenshotLength: res.screenshot ? res.screenshot.length : 0,
          timeMs: res.executionTimeMs,
          message: res.message,
        });

        console.log(`  [OK] ${cmd.padEnd(12)} -> Éxito: ${res.success} | Captura TV: ${hasValidScreenshot ? 'SÍ (SVG 1080p)' : 'NO'} (${res.screenshot?.length || 0} bytes) | ${res.executionTimeMs}ms`);
      } catch (err: any) {
        results.push({
          deviceName: device.name,
          ip: device.ip,
          cmd,
          success: false,
          hasScreenshot: false,
          screenshotLength: 0,
          timeMs: Date.now() - startTime,
          message: err.message,
        });
        console.error(`  [FAIL] ${cmd.padEnd(12)} -> EXCEPCIÓN: ${err.message}`);
      }
    }

    // Verify captures stored in ScreenCaptureService buffer
    const history = ScreenCaptureService.getDeviceCaptures(device.id);
    const latest = ScreenCaptureService.getLatestCapture(device.id);
    console.log(`\nHistorial de capturas registradas en memoria para ${device.name}: ${history.length} capturas`);
    console.log(`Última captura disponible: Comando "${latest?.command}" a las ${latest?.timestamp}`);
  }

  console.log(`\n========================================================================`);
  console.log('RESUMEN DE PRUEBAS EN PANTALLAS REGISTRADAS:');
  console.log(`========================================================================`);

  let totalTests = results.length;
  let successfulTests = results.filter((r) => r.success && r.hasScreenshot).length;
  let failedTests = totalTests - successfulTests;

  console.log(`Total de acciones ejecutadas: ${totalTests}`);
  console.log(`Acciones exitosas con captura generada: ${successfulTests}`);
  console.log(`Acciones fallidas: ${failedTests}`);

  if (failedTests > 0) {
    console.error('\nSE DETECTARON FALLOS EN LAS SIGUIENTES ACCIONES:');
    results
      .filter((r) => !r.success || !r.hasScreenshot)
      .forEach((r) => console.error(` - [${r.deviceName}] ${r.cmd}: ${r.message}`));
    process.exit(1);
  } else {
    console.log('\n>>> TODAS LAS PRUEBAS EN AMBAS PANTALLAS REGISTRADAS PASARON EXITOSAMENTE (100%) <<<');
    process.exit(0);
  }
}

runRegisteredScreensValidation().catch((err) => {
  console.error('Fallo crítico en validación:', err);
  process.exit(1);
});
