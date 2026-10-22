import { ScreenCaptureService } from '../services/ScreenCaptureService.js';
import { CommandExecutorService } from '../services/CommandExecutorService.js';
import { DeviceManagerService } from '../services/DeviceManagerService.js';
import { db } from '../db/index.js';
import { Device } from '../types/index.js';

async function runTests() {
  await db.initialize();
  console.log('====================================================');
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS DE CAPTURAS DE TV');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  };

  // Create a realistic test device
  const mockTv: Device = {
    id: 'test-tv-capture-001',
    name: 'Samsung Smart TV NOC 50',
    ip: '10.25.121.140',
    port: 8001,
    brand: 'Samsung',
    model: 'UN5073CVT403309Z',
    connectionType: 'VIRTUAL',
    status: 'ONLINE',
    powerState: 'ON',
    volume: 25,
    isMuted: false,
    brightness: 80,
    currentInput: 'HDMI1',
    currentChannel: '05.1',
    temperature: 35.2,
    streamType: 'SIMULATED',
    config: {
      authCredentials: { token: '13423728' },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // TEST 1: Capture on POWER_OFF (STANDBY)
  console.log('\n--- 1. Prueba de Captura: Apagar Pantalla (STANDBY) ---');
  const capOff = await ScreenCaptureService.captureForDevice(mockTv, 'POWER_OFF');
  assert(Boolean(capOff.screenshot), 'La captura de POWER_OFF genera screenshot');
  assert(capOff.screenshot.startsWith('data:image/svg+xml'), 'El formato es Data URL SVG válido');
  assert(decodeURIComponent(capOff.screenshot).includes('MODO STANDBY'), 'Contiene indicador gráfico de Standby');
  assert(decodeURIComponent(capOff.screenshot).includes('#ff4455') || decodeURIComponent(capOff.screenshot).includes('ledRedGlow'), 'Incluye LED rojo de reposo físico de TV');

  // TEST 2: Capture on POWER_ON
  console.log('\n--- 2. Prueba de Captura: Encender Pantalla (POWER_ON) ---');
  mockTv.powerState = 'ON';
  const capOn = await ScreenCaptureService.captureForDevice(mockTv, 'POWER_ON');
  assert(Boolean(capOn.screenshot), 'La captura de POWER_ON genera screenshot');
  assert(decodeURIComponent(capOn.screenshot).includes('BARRA SMART HUB'), 'Contiene interfaz Smart Hub de Samsung');
  assert(decodeURIComponent(capOn.screenshot).includes('HDMI 1'), 'Muestra la entrada activa en el panel');

  // TEST 3: Capture on VOLUME_UP & VOLUME_DOWN
  console.log('\n--- 3. Prueba de Captura: Control de Volumen (OSD) ---');
  mockTv.volume = 40;
  const capVol = await ScreenCaptureService.captureForDevice(mockTv, 'VOLUME_UP', { volume: 40 });
  assert(decodeURIComponent(capVol.screenshot).includes('40'), 'Muestra el número 40 en el OSD de volumen');
  assert(decodeURIComponent(capVol.screenshot).includes('filter="url(#cyanGlow)"'), 'Renderiza overlay OSD de volumen con resplandor cian');

  // TEST 4: Capture on MUTE
  console.log('\n--- 4. Prueba de Captura: Silenciar Pantalla (MUTE) ---');
  mockTv.isMuted = true;
  const capMute = await ScreenCaptureService.captureForDevice(mockTv, 'MUTE');
  assert(decodeURIComponent(capMute.screenshot).includes('MUTE'), 'Muestra badge de MUTE activado');
  mockTv.isMuted = false;

  // TEST 5: Capture on SET_INPUT (HDMI2, TV)
  console.log('\n--- 5. Prueba de Captura: Conmutación de Entradas (HDMI 2) ---');
  mockTv.currentInput = 'HDMI2';
  const capInput = await ScreenCaptureService.captureForDevice(mockTv, 'SET_INPUT', { input: 'HDMI2' });
  assert(decodeURIComponent(capInput.screenshot).includes('ENTRADA SELECCIONADA: HDMI2'), 'Muestra banner OSD de entrada HDMI2');

  // TEST 6: Capture on SEND_TEXT (Laptop Keyboard typing)
  console.log('\n--- 6. Prueba de Captura: Escritura desde Laptop (SEND_TEXT) ---');
  const capText = await ScreenCaptureService.captureForDevice(mockTv, 'SEND_TEXT', { text: 'https://youtube.com/live' });
  assert(decodeURIComponent(capText.screenshot).includes('https://youtube.com/live'), 'Muestra el texto escrito en la barra Tizen IME de la TV');

  // TEST 7: Capture on KEY_PRESS (Navigation D-Pad)
  console.log('\n--- 7. Prueba de Captura: Navegación Cruceta D-Pad (KEY_PRESS) ---');
  const capKey = await ScreenCaptureService.captureForDevice(mockTv, 'KEY_PRESS', { key: 'RIGHT' });
  assert(decodeURIComponent(capKey.screenshot).includes('TECLA: RIGHT'), 'Muestra HUD de la tecla presionada');

  // TEST 8: History Ring Buffer management
  console.log('\n--- 8. Prueba de Historial de Capturas de Pantalla ---');
  const captures = ScreenCaptureService.getDeviceCaptures(mockTv.id);
  assert(captures.length >= 7, `El historial almacena capturas por acción (total: ${captures.length})`);
  const latest = ScreenCaptureService.getLatestCapture(mockTv.id);
  assert(latest?.id === capKey.id, 'getLatestCapture devuelve la captura más reciente');

  // TEST 9: CommandExecutor Integration with TV Capture
  console.log('\n--- 9. Prueba de Integración con CommandExecutorService ---');
  try {
    let dev = await DeviceManagerService.getDeviceById('dev_virtual_capture_test');
    if (!dev) {
      dev = await DeviceManagerService.createDevice({
        name: 'Smart TV Virtual Capture Test',
        ip: '127.0.0.1',
        port: 9099,
        brand: 'Samsung',
        model: 'UN5073CVT403309Z',
        connectionType: 'VIRTUAL',
        powerState: 'ON',
        status: 'ONLINE',
        volume: 25,
      });
    }

    if (dev) {
      const result = await CommandExecutorService.execute(
        dev.id,
        'SET_VOLUME',
        { volume: 45 },
        { id: 'tester', username: 'Tester', role: 'ADMIN' },
        '127.0.0.1'
      );
      assert(result.success, 'CommandExecutor ejecuta SET_VOLUME con éxito');
      assert(Boolean(result.screenshot), 'CommandResult incluye propiedad screenshot generada');
      assert(Boolean(result.screenshotTimestamp), 'CommandResult incluye timestamp de captura');
      assert(Boolean(result.screenshot?.startsWith('data:image/svg+xml')), 'El screenshot del CommandResult es un DataURL SVG válido');
      assert(decodeURIComponent(result.screenshot || '').includes('45'), 'El screenshot capturado refleja el nuevo volumen (45)');

      // Clean up test device
      await DeviceManagerService.deleteDevice(dev.id);
      assert(true, 'Dispositivo de prueba eliminado limpiamente tras test');
    }
  } catch (err: any) {
    console.error('Error en prueba integrada:', err);
    assert(false, 'Prueba de integración con CommandExecutorService falló', err.message);
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADOS FINALES: ${passed} PASADAS, ${failed} FALLADAS`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Error fatal en pruebas:', e);
  process.exit(1);
});
