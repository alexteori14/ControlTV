import { db } from '../db/index.js';
import { DeviceManagerService } from '../services/DeviceManagerService.js';
import { DriverFactory } from '../protocols/DriverFactory.js';

async function testPing() {
  console.log('====================================================');
  console.log('PROBANDO PING / CONECTIVIDAD EN PANTALLAS REGISTRADAS');
  console.log('====================================================\n');

  await db.initialize();
  
  // Set all devices to ONLINE
  await db.query("UPDATE devices SET status = 'ONLINE'");

  const devices = await DeviceManagerService.getAllDevices();
  console.log(`Pantallas encontradas: ${devices.length}\n`);

  for (const device of devices) {
    console.log(`----------------------------------------------------`);
    console.log(`Dispositivo: ${device.name}`);
    console.log(`IP: ${device.ip}:${device.port} | MAC: ${device.macAddress} | Estado Actual: ${device.status}`);

    const driver = DriverFactory.getDriver(device);
    const start = Date.now();
    const conn = await driver.checkConnectivity(device, 2000);
    const elapsed = Date.now() - start;

    console.log(`Resultado checkConnectivity:`, {
      reachable: conn.reachable,
      latencyMs: conn.latencyMs,
      details: conn.details,
      error: conn.error,
      timeTaken: `${elapsed}ms`,
    });

    // Update status based on connectivity
    await DeviceManagerService.updateDeviceState(device.id, {
      status: conn.reachable ? 'ONLINE' : 'OFFLINE',
    });

    const updated = await DeviceManagerService.getDeviceById(device.id);
    console.log(`Estado persistido en Base de Datos: ${updated?.status}`);
    console.log(`Prueba enlace en Frontend: ${conn.reachable ? '✓ ENLACE ACTIVO (' + conn.latencyMs + 'ms)' : '✗ SIN ENLACE'}`);
  }

  console.log('\n====================================================');
  console.log('VALIDACIÓN COMPLETADA EXITOSAMENTE');
  console.log('====================================================');
}

testPing().catch(console.error);
