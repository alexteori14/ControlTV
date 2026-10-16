import net from 'net';
import { CONFIG } from '../config/index.js';

export class SimulatedTvServer {
  private static server: net.Server | null = null;
  private static state = {
    power: 'ON',
    volume: 25,
    muted: false,
    input: 'HDMI1',
    brightness: 80,
  };

  public static start(): void {
    if (this.server) return;

    this.server = net.createServer((socket) => {
      console.log(`[Simulated TV Socket] Client connected from ${socket.remoteAddress}:${socket.remotePort}`);

      // PJLink initial handshake challenge
      socket.write('PJLINK 0\r');

      socket.on('data', (data) => {
        const text = data.toString('utf8').trim();
        console.log(`[Simulated TV Socket] Received: "${text}"`);

        // Handle PJLink commands
        if (text.startsWith('%1POWR')) {
          if (text.includes('1')) {
            this.state.power = 'ON';
            socket.write('%1POWR=OK\r');
          } else if (text.includes('0')) {
            this.state.power = 'OFF';
            socket.write('%1POWR=OK\r');
          } else if (text.includes('?')) {
            socket.write(`%1POWR=${this.state.power === 'ON' ? '1' : '0'}\r`);
          }
        } else if (text.startsWith('%1INPT')) {
          const code = text.split(' ')[1] || '31';
          socket.write('%1INPT=OK\r');
        } else if (text.startsWith('%1AVMT')) {
          this.state.muted = text.includes('21') || text.includes('31');
          socket.write('%1AVMT=OK\r');
        } else if (text.startsWith('ka 01')) {
          // LG command
          socket.write('a 01 OK01x\r');
        } else {
          // Generic ACK
          socket.write('ACK OK\r\n');
        }
      });

      socket.on('error', (err) => {
        // Socket closed/error
      });
    });

    this.server.listen(CONFIG.SIMULATOR_PORT, '127.0.0.1', () => {
      console.log(`[Simulated TV Server] Listening on 127.0.0.1:${CONFIG.SIMULATOR_PORT} (PJLink & Raw TCP simulator)`);
    });
  }
}
