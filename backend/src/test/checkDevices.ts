import { db } from '../db/index.js';
import { DeviceManagerService } from '../services/DeviceManagerService.js';

async function main() {
  await db.initialize();
  const devices = await DeviceManagerService.getAllDevices();
  console.log(`Found ${devices.length} devices in DB:`);
  for (const d of devices) {
    console.log(`- ID: ${d.id}`);
    console.log(`  Name: ${d.name}`);
    console.log(`  IP: ${d.ip}:${d.port}`);
    console.log(`  Brand: ${d.brand}`);
    console.log(`  Model: ${d.model}`);
    console.log(`  ConnType: ${d.connectionType}`);
    console.log(`  Status: ${d.status}`);
    console.log(`  PowerState: ${d.powerState}`);
    console.log(`  Config:`, JSON.stringify(d.config));
    console.log('-------------------------------------------');
  }
}

main().catch(console.error);
