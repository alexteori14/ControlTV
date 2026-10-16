import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  public connect(): Socket {
    if (this.socket) return this.socket;

    this.socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('[Socket] Connected to ControlTV NOC Hub, ID:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('[Socket] Disconnected from ControlTV Hub');
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  public subscribeDevice(deviceId: string): void {
    if (this.socket) {
      this.socket.emit('subscribe_device', deviceId);
    }
  }

  public unsubscribeDevice(deviceId: string): void {
    if (this.socket) {
      this.socket.emit('unsubscribe_device', deviceId);
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
