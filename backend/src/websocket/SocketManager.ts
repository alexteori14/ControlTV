import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

export class SocketManager {
  private static io: SocketIOServer | null = null;
  public static lastFrames: Map<string, string> = new Map();

  public static initialize(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      // Allow client to subscribe to specific device updates
      socket.on('subscribe_device', (deviceId: string) => {
        socket.join(`device_${deviceId}`);
        console.log(`[WebSocket] Client ${socket.id} joined room device_${deviceId}`);
      });

      socket.on('unsubscribe_device', (deviceId: string) => {
        socket.leave(`device_${deviceId}`);
      });

      // WebRTC signaling for Screen Share / Interim PC video stream
      socket.on('webrtc_signal', (data: { deviceId: string; signal: any; type: string }) => {
        socket.to(`device_${data.deviceId}`).emit('webrtc_signal', {
          sender: socket.id,
          signal: data.signal,
          type: data.type,
        });
      });

      // Low-latency Screen Streaming (Laptop -> TV Mirroring)
      socket.on('broadcast_screen_frame', (data: { deviceId: string; frame: string }) => {
        SocketManager.lastFrames.set(data.deviceId, data.frame);
        socket.to(`stream_${data.deviceId}`).emit('screen_frame', data);
      });

      socket.on('join_stream', (deviceId: string) => {
        socket.join(`stream_${deviceId}`);
        const last = SocketManager.lastFrames.get(deviceId);
        if (last) {
          socket.emit('screen_frame', { deviceId, frame: last });
        }
      });

      socket.on('leave_stream', (deviceId: string) => {
        socket.leave(`stream_${deviceId}`);
      });

      socket.on('disconnect', () => {
        // Client disconnected
      });
    });

    console.log('[WebSocket] Socket.IO hub initialized');
    return this.io;
  }

  public static broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  public static emitToRoom(room: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }
}
