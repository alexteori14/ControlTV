import { Device } from '../types/index.js';
import { IDeviceDriver } from './DeviceDriver.js';
import { PJLinkDriver } from './PJLinkDriver.js';
import { SamsungMDCDriver } from './SamsungMDCDriver.js';
import { LgSuperSignDriver } from './LgSuperSignDriver.js';
import { SonyBraviaDriver } from './SonyBraviaDriver.js';
import { TelnetDriver } from './TelnetDriver.js';
import { RestHttpDriver } from './RestHttpDriver.js';
import { SnmpDriver } from './SnmpDriver.js';
import { VirtualDriver } from './VirtualDriver.js';

export class DriverFactory {
  private static drivers: Map<string, IDeviceDriver> = new Map();

  public static getDriver(device: Device): IDeviceDriver {
    const brandLower = (device.brand || '').toLowerCase();
    const connType = device.connectionType;

    // 1. Virtual driver check
    if (connType === 'VIRTUAL' || device.ip === '127.0.0.1' || brandLower.includes('virtual') || brandLower.includes('emulator')) {
      if (!this.drivers.has('virtual')) {
        this.drivers.set('virtual', new VirtualDriver());
      }
      return this.drivers.get('virtual')!;
    }

    // 2. PJLink check
    if (connType === 'PJLINK' || device.port === 4352) {
      if (!this.drivers.has('pjlink')) {
        this.drivers.set('pjlink', new PJLinkDriver());
      }
      return this.drivers.get('pjlink')!;
    }

    // 3. Samsung check
    if (brandLower.includes('samsung') || device.port === 1515) {
      if (!this.drivers.has('samsung')) {
        this.drivers.set('samsung', new SamsungMDCDriver());
      }
      return this.drivers.get('samsung')!;
    }

    // 4. LG Commercial check
    if (brandLower.includes('lg') || device.port === 9761) {
      if (!this.drivers.has('lg')) {
        this.drivers.set('lg', new LgSuperSignDriver());
      }
      return this.drivers.get('lg')!;
    }

    // 5. Sony BRAVIA check
    if (brandLower.includes('sony') || connType === 'REST_API') {
      if (!this.drivers.has('sony')) {
        this.drivers.set('sony', new SonyBraviaDriver());
      }
      return this.drivers.get('sony')!;
    }

    // 6. SNMP check
    if (connType === 'SNMP' || device.port === 161) {
      if (!this.drivers.has('snmp')) {
        this.drivers.set('snmp', new SnmpDriver());
      }
      return this.drivers.get('snmp')!;
    }

    // 7. Generic Telnet
    if (connType === 'TELNET' || device.port === 23) {
      if (!this.drivers.has('telnet')) {
        this.drivers.set('telnet', new TelnetDriver());
      }
      return this.drivers.get('telnet')!;
    }

    // 8. Default to Generic HTTP / REST
    if (!this.drivers.has('http')) {
      this.drivers.set('http', new RestHttpDriver());
    }
    return this.drivers.get('http')!;
  }
}
